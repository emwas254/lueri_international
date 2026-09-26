import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("NCBA_WEBHOOK_SECRET") ?? "";
const NCBA_PAYBILL = (Deno.env.get("NCBA_TILL_PAYBILL") ?? "880100").trim();
const NCBA_SHORT_CODE = (Deno.env.get("NCBA_TILL_SHORT_CODE") ?? "PAYLUERIINT").trim();
const db = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function normPhone(v: unknown) {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("254") && d.length === 12) return "0" + d.slice(3);
  return d;
}
function first(...v: unknown[]) {
  return v.find(x => x !== undefined && x !== null && String(x).trim() !== "");
}
function amountOf(v: unknown) {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
function extract(body: any) {
  const p = body?.payment ?? body?.transaction ?? body?.data ?? body;
  const narration = String(first(
    p?.narration, p?.remarks, p?.description, p?.accountReference, p?.account_reference,
    p?.reference, p?.billReference, p?.bill_reference, ""
  ) ?? "").trim();
  const refMatch = narration.match(/LR-DEL-\d{10,}-[A-Za-z0-9]{8}/i);
  return {
    providerReference: String(first(p?.transactionId, p?.transaction_id, p?.receipt, p?.receiptNumber, p?.receipt_number, p?.reference, "") ?? "").trim() || null,
    receipt: String(first(p?.receipt, p?.receiptNumber, p?.receipt_number, "") ?? "").trim() || null,
    amount: amountOf(first(p?.amount, p?.transactionAmount, p?.transaction_amount, p?.paidAmount, p?.paid_amount)),
    payerPhone: normPhone(first(p?.phone, p?.msisdn, p?.mobile, p?.payerPhone, p?.payer_phone)),
    account: String(first(p?.account, p?.accountNumber, p?.account_number, p?.shortCode, p?.short_code, "") ?? "").trim(),
    narration,
    reference: refMatch?.[0] ?? null,
    receivedAt: first(p?.transactionDate, p?.transaction_date, p?.paidAt, p?.paid_at, p?.timestamp) ?? null
  };
}
async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function verify(req: Request, raw: string) {
  if (!WEBHOOK_SECRET) return false;
  const supplied = (req.headers.get("x-ncba-signature") ?? req.headers.get("x-signature") ?? "").trim().toLowerCase().replace(/^sha256=/, "");
  if (!supplied) return false;
  const expected = await hmacHex(WEBHOOK_SECRET, raw);
  return supplied === expected;
}
Deno.serve(async (req) => {
  if (req.method === "GET") return json({ ok: true, service: "lueri-ncba-payment-reconciliation", paybill: NCBA_PAYBILL, account: NCBA_SHORT_CODE });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  if (!(await verify(req, raw))) return json({ error: "Unauthorized webhook" }, 401);

  try {
    const body = JSON.parse(raw);
    const tx = extract(body);
    if (!tx.providerReference || !tx.amount) return json({ error: "Missing transaction reference or amount" }, 400);

    const { data: duplicate } = await db.from("payments")
      .select("id,status,reconciliation_status,booking_id")
      .eq("provider_reference", tx.providerReference)
      .maybeSingle();
    if (duplicate) return json({ ok: true, duplicate: true, paymentId: duplicate.id, status: duplicate.status });

    if (tx.account && tx.account.toUpperCase() !== NCBA_SHORT_CODE.toUpperCase() && !tx.account.toUpperCase().startsWith(NCBA_SHORT_CODE.toUpperCase() + " ")) {
      return json({ error: "Account short code mismatch" }, 422);
    }

    let payment: any = null;
    if (tx.reference) {
      const { data } = await db.from("payments")
        .select("id,booking_id,amount,status,internal_reference")
        .eq("internal_reference", tx.reference)
        .eq("payment_method", "ncba_till")
        .maybeSingle();
      payment = data;
    }

    if (!payment && tx.payerPhone) {
      const { data: candidates } = await db.from("payments")
        .select("id,booking_id,amount,status,internal_reference,payer_phone")
        .eq("payment_method", "ncba_till")
        .eq("status", "pending")
        .eq("amount", tx.amount)
        .eq("payer_phone", tx.payerPhone)
        .order("created_at", { ascending: false })
        .limit(2);
      if (candidates?.length === 1) payment = candidates[0];
      else if ((candidates?.length ?? 0) > 1) return json({ ok: false, matched: false, reason: "ambiguous_payment", providerReference: tx.providerReference }, 409);
    }

    if (!payment) return json({ ok: false, matched: false, reason: "no_matching_pending_payment", providerReference: tx.providerReference }, 202);
    if (Number(payment.amount) !== Number(tx.amount)) return json({ ok: false, matched: false, reason: "amount_mismatch" }, 422);

    const now = new Date().toISOString();
    const { error: pe } = await db.from("payments").update({
      status: "successful",
      completed_at: now,
      provider_reference: tx.providerReference,
      provider_receipt: tx.receipt,
      payer_phone: tx.payerPhone || null,
      provider_received_at: tx.receivedAt ? new Date(tx.receivedAt).toISOString() : now,
      reconciliation_status: "matched",
      provider_payload: body
    }).eq("id", payment.id).eq("status", "pending");
    if (pe) throw pe;

    if (payment.booking_id) {
      const { error: be } = await db.from("bookings").update({ status: "paid", paid_at: now, updated_at: now }).eq("id", payment.booking_id);
      if (be) throw be;
    }

    return json({ ok: true, matched: true, paymentId: payment.id, bookingId: payment.booking_id, amount: tx.amount });
  } catch (err) {
    console.error("NCBA reconciliation error", err);
    return json({ error: "Reconciliation failed" }, 500);
  }
});