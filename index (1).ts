// supabase/functions/pesapal-initiate/index.ts
//
// Called by rewards.html when a member clicks "Pay for membership".
// Never exposes PESAPAL_CONSUMER_KEY/SECRET to the browser — they live
// here as Edge Function secrets only.
//
// Set these once in the Supabase dashboard (Project Settings > Edge Functions > Secrets)
// or via CLI:
//   supabase secrets set PESAPAL_CONSUMER_KEY=xxx PESAPAL_CONSUMER_SECRET=xxx
//   supabase secrets set PESAPAL_ENV=sandbox        # or "live"
//   supabase secrets set PESAPAL_IPN_ID=xxx          # from the one-time IPN registration, see README below
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
//   supabase secrets set SITE_URL=https://lueriinternational.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PESAPAL_ENV = Deno.env.get("PESAPAL_ENV") ?? "sandbox";
const BASE_URL =
  PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3/api"
    : "https://cybqa.pesapal.com/pesapalv3/api";

const CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY")!;
const CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET")!;
const IPN_ID = Deno.env.get("PESAPAL_IPN_ID")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://lueriinternational.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAuthToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Pesapal auth failed: ${JSON.stringify(data)}`);
  return data.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone_number, email, full_name, amount, plan_code } = await req.json();

    if (!phone_number || !amount || !plan_code) {
      return new Response(JSON.stringify({ error: "phone_number, amount and plan_code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getAuthToken();

    // merchant_reference must be unique per attempt — used to reconcile later
    const merchantReference = `LR-${plan_code}-${Date.now()}`;

    const orderRes = await fetch(`${BASE_URL}/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: merchantReference,
        currency: "KES",
        amount: amount,
        description: `Lueri Rewards membership — ${plan_code}`,
        callback_url: `${SITE_URL}/rewards.html?payment=complete`,
        notification_id: IPN_ID,
        billing_address: {
          email_address: email || "no-reply@lueriinternational.com",
          phone_number: phone_number,
          country_code: "KE",
          first_name: full_name || "Member",
          last_name: "",
        },
      }),
    });

    const order = await orderRes.json();
    if (!order.redirect_url) {
      throw new Error(`SubmitOrderRequest failed: ${JSON.stringify(order)}`);
    }

    // Record the pending payment BEFORE redirecting the customer, so the
    // IPN handler has a row to update even if the callback never fires.
    const { error: dbError } = await supabase.from("payments").insert({
      order_tracking_id: order.order_tracking_id,
      merchant_reference: merchantReference,
      phone_number,
      email,
      full_name,
      amount,
      plan_code,
      status: "PENDING",
    });
    if (dbError) console.error("payments insert failed:", dbError);

    return new Response(
      JSON.stringify({ redirect_url: order.redirect_url, order_tracking_id: order.order_tracking_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
