// supabase/functions/pesapal-ipn/index.ts
//
// This is the URL you register with Pesapal as your IPN endpoint (one-time
// setup — see the curl command in the README below). Pesapal hits this
// with OrderTrackingId / OrderMerchantReference / OrderNotificationType
// as query params (GET) — it does NOT tell you the payment status here,
// that's deliberate on their end. You must call GetTransactionStatus
// yourself to get the real result. Never trust the callback alone.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PESAPAL_ENV = Deno.env.get("PESAPAL_ENV") ?? "sandbox";
const BASE_URL =
  PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3/api"
    : "https://cybqa.pesapal.com/pesapalv3/api";

const CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY")!;
const CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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

function ipnReply(orderNotificationType: string, orderTrackingId: string, orderMerchantReference: string, status: 200 | 500) {
  return new Response(
    JSON.stringify({
      orderNotificationType,
      orderTrackingId,
      orderMerchantReference,
      status,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const orderTrackingId = url.searchParams.get("OrderTrackingId") ?? "";
    const orderMerchantReference = url.searchParams.get("OrderMerchantReference") ?? "";
    const orderNotificationType = url.searchParams.get("OrderNotificationType") ?? "IPNCHANGE";

    if (!orderTrackingId) {
      return ipnReply(orderNotificationType, orderTrackingId, orderMerchantReference, 500);
    }

    const token = await getAuthToken();

    const statusRes = await fetch(
      `${BASE_URL}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
    );
    const result = await statusRes.json();

    // payment_status_description is typically "Completed", "Failed", "Invalid", "Reversed"
    const paidOk = result.payment_status_description === "Completed";

    const { data: paymentRow } = await supabase
      .from("payments")
      .update({
        status: paidOk ? "COMPLETED" : (result.payment_status_description || "FAILED").toUpperCase(),
        payment_method: result.payment_method,
        confirmation_code: result.confirmation_code,
        raw_response: result,
        updated_at: new Date().toISOString(),
      })
      .eq("order_tracking_id", orderTrackingId)
      .select()
      .single();

    if (paidOk && paymentRow) {
      // Wire this to your existing member/tier logic — mirrors the RPC
      // pattern already used by register_member / addTransaction.
      const { error: rpcError } = await supabase.rpc("apply_membership_payment", {
        p_phone_number: paymentRow.phone_number,
        p_plan_code: paymentRow.plan_code,
        p_amount: paymentRow.amount,
        p_order_tracking_id: orderTrackingId,
      });
      if (rpcError) console.error("apply_membership_payment failed:", rpcError);
    }

    return ipnReply(orderNotificationType, orderTrackingId, orderMerchantReference, 200);
  } catch (err) {
    console.error(err);
    const url = new URL(req.url);
    return ipnReply(
      url.searchParams.get("OrderNotificationType") ?? "IPNCHANGE",
      url.searchParams.get("OrderTrackingId") ?? "",
      url.searchParams.get("OrderMerchantReference") ?? "",
      500,
    );
  }
});
