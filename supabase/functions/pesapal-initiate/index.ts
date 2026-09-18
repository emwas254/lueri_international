// supabase/functions/pesapal-initiate/index.ts
// Server-authoritative individual + corporate membership checkout.
// Production Lueri uses Pesapal LIVE unless PESAPAL_ENV=sandbox is explicitly set.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://lueriinternational.com";

function isProductionUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedHosts = ["lueriinternational.com", "www.lueriinternational.com"];
    return allowedHosts.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

const PESAPAL_ENV = Deno.env.get("PESAPAL_ENV") ?? (isProductionUrl(SITE_URL) ? "live" : "sandbox");
const BASE_URL = PESAPAL_ENV === "live"
  ? "https://pay.pesapal.com/v3/api"
  : "https://cybqa.pesapal.com/pesapalv3/api";

const CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY") ?? "";
const CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET") ?? "";
const IPN_ID = Deno.env.get("PESAPAL_IPN_ID") ?? "";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(raw); } catch (_) {}
  if (!res.ok || !data.token) {
    console.error("Pesapal auth failed", { status: res.status, response: raw.slice(0, 500), env: PESAPAL_ENV });
    throw new Error("Pesapal authentication failed.");
  }
  return String(data.token);
}

function safeNameParts(fullName: string | null | undefined) {
  const value = String(fullName ?? "").trim();
  if (!value) return { first_name: "Customer", last_name: "" };
  const parts = value.split(/\s+/);
  return { first_name: parts.shift() || "Customer", last_name: parts.join(" ") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const origin = req.headers.get("origin");
  if (origin && !["https://lueriinternational.com", "https://www.lueriinternational.com"].includes(origin)) {
    return jsonError("Invalid payment origin.", 403);
  }

  let body: { member_id?: string; organization_id?: string; plan_code?: string; email?: string; phone?: string };
  try { body = await req.json(); } catch { return jsonError("Invalid request body."); }

  const memberId = body.member_id?.trim();
  const organizationId = body.organization_id?.trim();
  const planCode = body.plan_code?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const isIndividual = Boolean(memberId);
  const isBusiness = Boolean(organizationId);

  if (isIndividual === isBusiness) return jsonError("Provide exactly one of member_id or organization_id.");
  if (!planCode) return jsonError("plan_code is required.");
  if (!CONSUMER_KEY || !CONSUMER_SECRET || !IPN_ID) {
    console.error("Missing Pesapal configuration", { hasKey: !!CONSUMER_KEY, hasSecret: !!CONSUMER_SECRET, hasIpn: !!IPN_ID, env: PESAPAL_ENV });
    return jsonError("Pesapal is not fully configured. Please contact Lueri International.", 500);
  }

  let billingEmail = "no-reply@lueriinternational.com";
  let billingPhone = "";
  let billingName = "Customer";
  let plan: { code: string; display_name: string; price_kes: number } | null = null;

  if (isIndividual) {
    const { data: member, error } = await supabase
      .from("members")
      .select("id, phone, email, full_name")
      .eq("id", memberId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !member) return jsonError("We couldn't find that Rewards account. Please join or look yourself up again.");
    if (email && String(member.email || "").trim().toLowerCase() !== email) return jsonError("The email does not match this Rewards account.", 403);
    if (phone && String(member.phone || "").replace(/\D/g, "") !== phone.replace(/\D/g, "")) return jsonError("The phone number does not match this Rewards account.", 403);

    const { data: membershipPlan, error: planError } = await supabase
      .from("membership_plans")
      .select("code, display_name, price_kes")
      .eq("code", planCode)
      .maybeSingle();
    if (planError || !membershipPlan || membershipPlan.price_kes === null) return jsonError("That membership plan isn't available for online purchase right now.");
    plan = { code: membershipPlan.code, display_name: membershipPlan.display_name, price_kes: Number(membershipPlan.price_kes) };
    billingEmail = member.email || billingEmail;
    billingPhone = member.phone || "";
    billingName = member.full_name || "Member";
  } else {
    const { data: organization, error } = await supabase
      .from("organizations")
      .select("id, name, contact_phone, contact_email, contact_person_name, plan_code, deleted_at")
      .eq("id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !organization) return jsonError("We couldn't find that corporate application. Please submit the application again.");
    if (!organization.plan_code || organization.plan_code !== planCode) return jsonError("The selected corporate plan does not match the registered application.");
    if (email && String(organization.contact_email || "").trim().toLowerCase() !== email) return jsonError("The email does not match the corporate application.", 403);
    if (phone && String(organization.contact_phone || "").replace(/\D/g, "") !== phone.replace(/\D/g, "")) return jsonError("The phone number does not match the corporate application.", 403);

    const { data: businessPlan, error: planError } = await supabase
      .from("business_plans")
      .select("code, display_name, price_kes")
      .eq("code", planCode)
      .maybeSingle();
    if (planError || !businessPlan || businessPlan.price_kes === null) return jsonError("That corporate plan isn't available for online payment right now.");
    plan = { code: businessPlan.code, display_name: businessPlan.display_name, price_kes: Number(businessPlan.price_kes) };
    billingEmail = organization.contact_email || billingEmail;
    billingPhone = organization.contact_phone || "";
    billingName = organization.contact_person_name || organization.name;
  }

  if (!plan || !Number.isFinite(plan.price_kes) || plan.price_kes <= 0) return jsonError("That plan's price is not configured correctly. Please contact Lueri International.", 500);

  const priceKes = plan.price_kes;
  const internalReference = isBusiness
    ? `LR-ORG-${plan.code}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    : `LR-${plan.code}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const paymentInsert = {
    internal_reference: internalReference,
    member_id: isIndividual ? memberId : null,
    organization_id: isBusiness ? organizationId : null,
    purpose: "membership",
    plan_code: plan.code,
    amount: priceKes,
    currency: "KES",
    status: "pending",
    payment_method: "pesapal",
  };

  const { data: paymentRow, error: paymentInsertError } = await supabase
    .from("payments")
    .insert(paymentInsert)
    .select("id")
    .single();
  if (paymentInsertError || !paymentRow) {
    console.error("pesapal-initiate: payment insert failed", paymentInsertError);
    return jsonError("Could not start your payment. Please try again.", 500);
  }

  try {
    const token = await getAuthToken();
    const nameParts = safeNameParts(billingName);
    const callbackPath = `/checkout.html?payment=complete&type=${isBusiness ? "corporate" : "membership"}`;
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
        description: `Lueri ${isBusiness ? "Business" : "Rewards"} — ${plan.display_name} membership`,
        redirect_mode: "PARENT_WINDOW",
        callback_url: `${SITE_URL}${callbackPath}`,
        notification_id: IPN_ID,
        billing_address: {
          email_address: billingEmail,
          phone_number: billingPhone,
          country_code: "KE",
          first_name: nameParts.first_name,
          last_name: nameParts.last_name,
        },
      }),
    });

    const raw = await orderRes.text();
    let order: Record<string, unknown> = {};
    try { order = JSON.parse(raw); } catch (_) {}
    if (!orderRes.ok || !order.redirect_url || !order.order_tracking_id) {
      console.error("Pesapal SubmitOrderRequest failed", { status: orderRes.status, response: raw.slice(0, 1000), env: PESAPAL_ENV });
      throw new Error("Pesapal did not return a valid checkout URL.");
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update({ pesapal_tracking_id: String(order.order_tracking_id) })
      .eq("id", paymentRow.id);
    if (updateError) console.error("pesapal-initiate: failed to save tracking id", updateError);

    return new Response(JSON.stringify({
      redirect_url: String(order.redirect_url),
      order_tracking_id: String(order.order_tracking_id),
      payment_id: paymentRow.id,
      internal_reference: internalReference,
      plan_display_name: plan.display_name,
      amount: priceKes,
      payment_type: isBusiness ? "organization" : "individual",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("pesapal-initiate: Pesapal call failed", err);
    await supabase
      .from("payments")
      .update({ status: "failed", failure_reason: "pesapal_initiate_error" })
      .eq("id", paymentRow.id);
    return jsonError("We couldn't start your Pesapal checkout. Please try again.", 502);
  }
});
