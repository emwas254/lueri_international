// supabase/functions/pesapal-ipn/index.ts
//
// Registered with Pesapal as the IPN URL. Calls GetTransactionStatus to
// get the real, Pesapal-confirmed amount paid, verifies it against what
// we locked in at initiate time (anti-tampering), then grants the
// correct kind of membership: apply_membership_payment for an
// individual (payment.member_id set) or
// apply_organization_membership_payment for a business
// (payment.organization_id set). Exactly one is ever set, enforced by
// the payments_member_xor_organization check constraint.
//
// v7: added email receipt on successful payment via Resend. Sending is
// wrapped in try/catch and never blocks or fails the IPN response — if
// email fails, the membership grant still stands and Pesapal still gets
// its 200. Requires RESEND_API_KEY and RESEND_FROM_EMAIL as Edge Function
// secrets (Supabase Dashboard -> Edge Functions -> pesapal-ipn -> Secrets).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://lueriinternational.com";
function isProductionUrl(url: string): boolean { try { return ["lueriinternational.com","www.lueriinternational.com"].includes(new URL(url).hostname); } catch { return false; } }
const PESAPAL_ENV = Deno.env.get("PESAPAL_ENV") ?? (isProductionUrl(SITE_URL) ? "live" : "sandbox");
const BASE_URL =
  PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3/api"
    : "https://cybqa.pesapal.com/pesapalv3/api";

const CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY")!;
const CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET")!;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Lueri International <receipts@lueriinternational.com>";

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
    JSON.stringify({ orderNotificationType, orderTrackingId, orderMerchantReference, status }),
    { headers: { "Content-Type": "application/json" } },
  );
}

function mapStatus(desc: string): "successful" | "failed" | "cancelled" {
  switch (desc) {
    case "Completed": return "successful";
    case "Reversed": return "cancelled";
    default: return "failed";
  }
}

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);
}

async function sendReceiptEmail(opts: {
  toEmail: string;
  recipientName: string;
  planDisplayName: string;
  amount: number;
  internalReference: string;
  isBusiness: boolean;
}) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping receipt email");
    return;
  }
  if (!opts.toEmail) {
    console.warn("No recipient email on record — skipping receipt email", { ref: opts.internalReference });
    return;
  }

  const safeName = escapeHtml(opts.recipientName || "there");
  const safeTier = escapeHtml(opts.planDisplayName);
  const kes = formatKES(opts.amount);
  const label = opts.isBusiness ? "business membership" : "membership";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1B2620;">
      <h2 style="color:#B8321F;">Congratulations, ${safeName}!</h2>
      <p>You've successfully purchased the <strong>${safeTier} ${label}</strong> with Lueri International.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#4A5A52;">Plan</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${safeTier}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#4A5A52;">Amount paid</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${kes}</td></tr>
        <tr><td style="padding:8px 0;color:#4A5A52;">Reference</td><td style="padding:8px 0;text-align:right;">${escapeHtml(opts.internalReference)}</td></tr>
      </table>
      <p>We look forward to doing business with you — same-day dispatch, priority handling, and a team that answers.</p>
      <p style="color:#4A5A52;font-size:0.85rem;margin-top:32px;">Lueri International &middot; Nairobi, Kenya<br>Questions? Reply to this email or WhatsApp us at 0713 261 719.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [opts.toEmail],
        subject: `Payment confirmed — ${safeTier} ${label}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend send failed", await res.text());
    } else {
      console.log("Receipt email sent", { to: opts.toEmail, ref: opts.internalReference });
    }
  } catch (err) {
    console.error("Receipt email error (non-fatal)", err);
  }
}

const AMOUNT_EPSILON = 0.01;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderTrackingId = url.searchParams.get("OrderTrackingId") ?? "";
  const orderMerchantReference = url.searchParams.get("OrderMerchantReference") ?? "";
  const orderNotificationType = url.searchParams.get("OrderNotificationType") ?? "IPNCHANGE";

  try {
    if (!orderTrackingId) {
      return ipnReply(orderNotificationType, orderTrackingId, orderMerchantReference, 500);
    }

    const token = await getAuthToken();

    const statusRes = await fetch(
      `${BASE_URL}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
    );
    const result = await statusRes.json();
    const pesapalStatus = mapStatus(result.payment_status_description);
    const amountPaid = Number(result.amount);

    let { data: payment } = await supabase
      .from("payments")
      .select("id, plan_code, amount, status, member_id, organization_id, internal_reference")
      .eq("pesapal_tracking_id", orderTrackingId)
      .maybeSingle();

    if (!payment && orderMerchantReference) {
      const fallback = await supabase
        .from("payments")
        .select("id, plan_code, amount, status, member_id, organization_id, internal_reference")
        .eq("internal_reference", orderMerchantReference)
        .maybeSingle();
      payment = fallback.data;
    }

    if (!payment) {
      console.error("IPN for unknown payment", { orderTrackingId, orderMerchantReference });
      return ipnReply(orderNotificationType, orderTrackingId, orderMerchantReference, 500);
    }

    // Idempotency: only ever move forward from 'pending'. IPN calls repeat.
    if (payment.status !== "pending") {
      return ipnReply(orderNotificationType, orderTrackingId, orderMerchantReference, 200);
    }

    // --- Anti-tampering check ---
    const amountMatches = Math.abs(amountPaid - Number(payment.amount)) < AMOUNT_EPSILON;
    const finalStatus = pesapalStatus === "successful" && !amountMatches ? "failed" : pesapalStatus;
    const failureReason =
      pesapalStatus === "successful" && !amountMatches
        ? "amount_mismatch_suspected_tampering"
        : finalStatus !== "successful"
        ? (result.payment_status_description ?? "unknown")
        : null;

    if (pesapalStatus === "successful" && !amountMatches) {
      console.error("AMOUNT MISMATCH — refusing membership grant", {
        payment_id: payment.id,
        expected: payment.amount,
        paid: amountPaid,
        order_tracking_id: orderTrackingId,
      });
    }

    await supabase
      .from("payments")
      .update({
        status: finalStatus,
        completed_at: finalStatus === "successful" ? new Date().toISOString() : null,
        failure_reason: failureReason,
      })
      .eq("id", payment.id);

    if (finalStatus === "successful" && payment.plan_code) {
      // Branch: individual member vs business organization. Exactly one
      // of these is set, enforced by a DB check constraint — never both.
      const isBusiness = Boolean(payment.organization_id);
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        isBusiness ? "apply_organization_membership_payment" : "apply_membership_payment",
        isBusiness
          ? { p_payment_id: payment.id, p_plan_code: payment.plan_code }
          : { p_payment_id: payment.id, p_plan_code: payment.plan_code },
      );
      if (rpcError) {
        console.error(`${isBusiness ? "apply_organization_membership_payment" : "apply_membership_payment"} error:`, rpcError);
      } else {
        console.log("membership grant result:", rpcResult);

        // --- Receipt email, only after a real grant succeeded ---
        try {
          if (isBusiness) {
            const [{ data: org }, { data: plan }] = await Promise.all([
              supabase.from("organizations").select("contact_email, contact_person_name").eq("id", payment.organization_id).maybeSingle(),
              supabase.from("business_plans").select("display_name").eq("code", payment.plan_code).maybeSingle(),
            ]);
            await sendReceiptEmail({
              toEmail: org?.contact_email ?? "",
              recipientName: org?.contact_person_name ?? "",
              planDisplayName: plan?.display_name ?? payment.plan_code,
              amount: Number(payment.amount),
              internalReference: payment.internal_reference,
              isBusiness: true,
            });
          } else {
            const [{ data: member }, { data: plan }] = await Promise.all([
              supabase.from("members").select("email, full_name").eq("id", payment.member_id).maybeSingle(),
              supabase.from("membership_plans").select("display_name").eq("code", payment.plan_code).maybeSingle(),
            ]);
            await sendReceiptEmail({
              toEmail: member?.email ?? "",
              recipientName: member?.full_name ?? "",
              planDisplayName: plan?.display_name ?? payment.plan_code,
              amount: Number(payment.amount),
              internalReference: payment.internal_reference,
              isBusiness: false,
            });
          }
        } catch (emailErr) {
          console.error("Receipt email block failed (non-fatal)", emailErr);
        }
      }
    }

    return ipnReply(orderNotificationType, orderTrackingId, orderMerchantReference, 200);
  } catch (err) {
    console.error(err);
    return ipnReply(orderNotificationType, orderTrackingId, orderMerchantReference, 500);
  }
});
