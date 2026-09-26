import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const NCBA_TILL_SHORT_CODE = (Deno.env.get("NCBA_TILL_SHORT_CODE") ?? "").trim();
const NCBA_TILL_PAYBILL = (Deno.env.get("NCBA_TILL_PAYBILL") ?? "880100").trim();
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

function toLocalPhone(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.startsWith("254") && d.length === 12) return "0" + d.slice(3);
  return d;
}

function validPhone(v: string) {
  return /^0[17]\d{8}$/.test(v.replace(/\s/g, ""));
}

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

async function getAuthoritativePrice(pickup: string, dropoff: string, details: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service credentials unavailable");
  }

  const { data, error } = await supabaseAdmin.rpc("get_delivery_price", {
    p_pickup: pickup,
    p_dropoff: dropoff,
    p_details: details
  });

  if (error || data == null) {
    console.error("Pricing RPC failed", error);
    throw new Error("Failed to calculate authoritative price");
  }

  const row = Array.isArray(data) ? data[0] : data;
  const amount = Number(row?.amount_kes);

  if (row?.is_valid !== true || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(row?.error_message || "A confirmed price is required for this route before payment.");
  }

  return amount;
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !["https://lueriinternational.com", "https://www.lueriinternational.com"].includes(origin)) {
    return json({ error: "Invalid payment origin." }, 403);
  }

  try {
    if (!NCBA_TILL_SHORT_CODE) {
      console.error("NCBA_TILL_SHORT_CODE is not configured");
      return json({ error: "Lueri delivery payments are temporarily unavailable. Please try again shortly." }, 503);
    }

    const body = await req.json();
    const pickup = String(body?.pickup ?? "").trim();
    const dropoff = String(body?.dropoff ?? "").trim();
    const details = String(body?.details ?? "").trim();
    const customerName = String(body?.customer_name ?? "").trim();
    const phone = toLocalPhone(String(body?.phone ?? body?.customer_phone ?? "").trim());
    const preferredTime = body?.preferred_time ? String(body.preferred_time).trim() : null;
    const customerEmail = body?.customer_email ? String(body.customer_email).trim().toLowerCase() : null;
    const memberId = body?.member_id ? String(body.member_id).trim() : null;
    const parcelPhotoPath = body?.parcel_photo_path ? String(body.parcel_photo_path).trim() : null;
    const deliveryType = String(body?.delivery_type ?? "one_off").trim();
    const tripCount = Number(body?.trip_count ?? 1);

    if (!pickup || !dropoff || !customerName || !phone) {
      return json({ error: "Missing required booking fields." }, 400);
    }

    if (!["one_off","round_trip","multi_trip"].includes(deliveryType)) return json({ error: "Invalid delivery type." }, 400);
    if (!Number.isInteger(tripCount) || tripCount < 1 || tripCount > 100) return json({ error: "Invalid trip count." }, 400);
    if (deliveryType === "multi_trip" && tripCount < 2) return json({ error: "Multi-trip bookings require at least 2 trips." }, 400);
    if (deliveryType !== "multi_trip" && tripCount !== 1) return json({ error: "Invalid trip count for this delivery type." }, 400);

    if (parcelPhotoPath && !/^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(parcelPhotoPath)) {
      return json({ error: "Invalid parcel photo reference." }, 400);
    }

    if (pickup.length > 300 || dropoff.length > 300 || details.length > 1500 || customerName.length > 120) {
      return json({ error: "One of the fields is too long." }, 400);
    }

    if (!validPhone(phone)) return json({ error: "Invalid Kenyan phone number." }, 400);
    if (customerEmail && !validEmail(customerEmail)) return json({ error: "Invalid email address." }, 400);

    const baseAmount = await getAuthoritativePrice(pickup, dropoff, details);
    // Until dedicated round/multi-trip tariff tables are configured, each trip uses the authoritative one-way route price. Round trip = 2 trips; multi-trip = requested number of trips.
    const effectiveTripCount = deliveryType === "round_trip" ? 2 : tripCount;
    const amount = baseAmount * effectiveTripCount;
    const internalReference = "LR-DEL-" + Date.now() + "-" + crypto.randomUUID().slice(0, 8);

    const { data: booking, error: bookingInsertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        phone,
        pickup,
        dropoff,
        details: details || null,
        preferred_time: preferredTime,
        member_id: memberId,
        parcel_photo_path: parcelPhotoPath,
        delivery_type: deliveryType,
        trip_count: effectiveTripCount,
        status: "pending_payment",
        quoted_amount_kes: amount,
        reference: internalReference
      })
      .select("id")
      .single();

    if (bookingInsertError || !booking) {
      console.error("booking insert failed", bookingInsertError);
      return json({ error: "Could not create the booking." }, 500);
    }

    const { data: payment, error: paymentInsertError } = await supabaseAdmin
      .from("payments")
      .insert({
        internal_reference: internalReference,
        pesapal_tracking_id: null,
        booking_id: booking.id,
        member_id: memberId,
        organization_id: null,
        purpose: "delivery_fee",
        amount,
        currency: "KES",
        status: "pending",
        payment_method: "ncba_till"
      })
      .select("id")
      .single();

    if (paymentInsertError || !payment) {
      await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
      console.error("payment insert failed", paymentInsertError);
      return json({ error: "Could not create the payment record." }, 500);
    }

    return json({
      success: true,
      paymentMethod: "ncba_till",
      paymentId: payment.id,
      bookingId: booking.id,
      bookingReference: internalReference,
      amount,
      baseRouteAmount: baseAmount,
      deliveryType,
      tripCount: effectiveTripCount,
      currency: "KES",
      paybill: NCBA_TILL_PAYBILL,
      tillShortCode: NCBA_TILL_SHORT_CODE,
      paymentAccount: NCBA_TILL_SHORT_CODE,
      narration: internalReference,
      status: "pending",
      message: "Payment instructions created. The booking remains pending until NCBA payment confirmation is reconciled."
    });
  } catch (err) {
    console.error("delivery-payment-initiate error", err);
    return json({ error: "Unable to prepare the delivery payment." }, 500);
  }
}

Deno.serve(async (req) => {
  const res = await handle(req);
  const o = req.headers.get("origin");
  if (o && ["https://lueriinternational.com", "https://www.lueriinternational.com"].includes(o)) {
    res.headers.set("Access-Control-Allow-Origin", o);
  }
  res.headers.set("Vary", "Origin");
  return res;
});
