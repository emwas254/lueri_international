// supabase/functions/pesapal-initiate/index.ts
//
// Called by rewards.html when a member clicks "Pay & Join" on a paid
// tier. Never exposes PESAPAL_CONSUMER_KEY/SECRET to the browser — they
// live here as Edge Function secrets only.
//
// v10: FIX — plan.price_kes comes back from PostgREST as a STRING (numeric
// columns are stringified to avoid JS float precision loss). Sending that
// string straight into the Pesapal SubmitOrderRequest body meant Pesapal
// couldn't parse it as an amount and silently treated it as 0.00, which
// Pesapal then rejected with "Invalid Transaction Amount". Cast to Number()
// at both the payments insert and the Pesapal request body.
//
// SECURITY: the client sends only { member_id, plan_code }. The price
// charged is always membership_plans.price_kes, looked up here — the
// client can never influence the amount. Phone/email/name used for
// Pesapal's billing_address are also looked up server-side from the
// members row, not trusted from the request body.
//
// PULLED VERBATIM FROM THE LIVE DEPLOYMENT 2026-09-14 — this is what is
// actually running. GitHub's copy of this function ("index (1).ts" at
// repo root) was a stale early draft that still had the price_kes
// string bug described above; see CHANGES_2026-09-14-edge-functions.md.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PESAPAL_ENV = Deno.env.get("PESAPAL_ENV") ?? "sandbox";
const BASE_URL =
  PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3/api"
    : "https://cybqa.pesapal.com/pesapalv3/api";

const CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY") ?? "";
const CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET") ?? "";
const IPN_ID = Deno.env.get("PESAPAL_IPN_ID") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://lueriinternational.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Pesapal auth failed: ${JSON.stringify(data)}`);
  return data.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: { member_id?: string; plan_code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const { member_id, plan_code } = body;
  if (!member_id || !plan_code) {
    return jsonError("member_id and plan_code are required.");
  }

  if (!CONSUMER_KEY || !CONSUMER_SECRET || !IPN_ID) {
    console.error("Missing Pesapal secrets — PESAPAL_CONSUMER_KEY/SECRET/IPN_ID not set.");
    return jsonError("Payments are not fully configured yet. Please contact Lueri International.", 500);
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, phone, email, full_name")
    .eq("id", member_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (memberError || !member) {
    console.error("pesapal-initiate: member lookup failed", memberError);
    return jsonError("We couldn't find that Rewards account. Please join or look yourself up again.");
  }

  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("code, display_name, price_kes")
    .eq("code", plan_code)
    .maybeSingle();

  if (planError || !plan || plan.price_kes === null) {
    return jsonError("That membership plan isn't available for online purchase right now.");
  }

  // FIX: PostgREST returns numeric columns as strings. Without this cast,
  // `plan.price_kes` is "15000" (a string), which Pesapal's API silently
  // read as 0.00 instead of erroring — the exact bug reported in production.
  const priceKes = Number(plan.price_kes);
  if (!Number.isFinite(priceKes) || priceKes <= 0) {
    console.error("pesapal-initiate: invalid plan price", plan.code, plan.price_kes);
    return jsonError("That membership plan's price is not configured correctly. Please contact Lueri International.", 500);
  }

  const internalReference = `LR-${plan.code}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: paymentRow, error: paymentInsertError } = await supabase
    .from("payments")
    .insert({
      internal_reference: internalReference,
      member_id: member.id,
      purpose: "membership",
      plan_code: plan.code,
      amount: priceKes,
      currency: "KES",
      status: "pending",
    })
    .select("id")
    .single();

  if (paymentInsertError || !paymentRow) {
    console.error("pesapal-initiate: payment insert failed", paymentInsertError);
    return jsonError("Could not start your payment. Please try again.", 500);
  }

  try {
    const token = await getAuthToken();

    const orderRes = await fetch(`${BASE_URL}/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: internalReference,
        currency: "KES",
        amount: priceKes,
        description: `Lueri Rewards — ${plan.display_name} membership`,
        callback_url: `${SITE_URL}/rewards.html?payment=complete`,
        notification_id: IPN_ID,
        billing_address: {
          email_address: member.email || "no-reply@lueriinternational.com",
          phone_number: member.phone,
          country_code: "KE",
          first_name: member.full_name || "Member",
          last_name: "",
        },
      }),
    });

    const order = await orderRes.json();
    if (!order.redirect_url || !order.order_tracking_id) {
      throw new Error(`SubmitOrderRequest failed: ${JSON.stringify(order)}`);
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update({ pesapal_tracking_id: order.order_tracking_id })
      .eq("id", paymentRow.id);
    if (updateError) console.error("pesapal-initiate: failed to save tracking id", updateError);

    return new Response(
      JSON.stringify({
        redirect_url: order.redirect_url,
        order_tracking_id: order.order_tracking_id,
        payment_id: paymentRow.id,
        internal_reference: internalReference,
        plan_display_name: plan.display_name,
        amount: priceKes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("pesapal-initiate: Pesapal call failed", err);
    await supabase
      .from("payments")
      .update({ status: "failed", failure_reason: "pesapal_initiate_error" })
      .eq("id", paymentRow.id);
    return jsonError("We couldn't start your payment. Please try again or contact Lueri International for assistance.", 502);
  }
});
