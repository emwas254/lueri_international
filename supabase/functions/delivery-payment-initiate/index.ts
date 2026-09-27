import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const NCBA_TILL_SHORT_CODE = (Deno.env.get("NCBA_TILL_SHORT_CODE") ?? "PAYLUERIINT").trim();
const NCBA_TILL_PAYBILL = (Deno.env.get("NCBA_TILL_PAYBILL") ?? "880100").trim();
// NEW — geocoding is entirely optional. If this secret isn't set, geocoding
// is skipped silently and booking/payment behave exactly as before.
const LOCATIONIQ_API_KEY = Deno.env.get("LOCATIONIQ_API_KEY") ?? "";
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

// ============================================================
// NEW — best-effort landmark geocoding for confirmation-map
// display only. Never throws out of this function: any failure
// (missing key, LocationIQ down, unresolvable text) resolves to
// null fields and the booking proceeds exactly as it did before
// this patch. Pricing is computed separately via
// getAuthoritativePrice() above and is never affected by this.
// ============================================================
type GeocodeResult = {
  lat: number | null;
  lng: number | null;
  landmarkId: string | null;
};

async function resolveLandmark(rawText: string): Promise<GeocodeResult> {
  const empty: GeocodeResult = { lat: null, lng: null, landmarkId: null };
  if (!rawText) return empty;

  try {
    const cleaned = rawText.trim().toLowerCase();

    const { data: cached, error: cacheErr } = await supabaseAdmin
      .from("location_landmarks")
      .select("id, lat, lng")
      .contains("aliases", [cleaned])
      .limit(1);

    if (cacheErr) {
      console.error("location_landmarks lookup failed (non-blocking)", cacheErr);
      return empty;
    }
    if (cached && cached.length > 0) {
      return { lat: cached[0].lat, lng: cached[0].lng, landmarkId: cached[0].id };
    }

    if (!LOCATIONIQ_API_KEY) return empty; // not configured yet — skip quietly

    const url =
      `https://us1.locationiq.com/v1/search.php` +
      `?key=${LOCATIONIQ_API_KEY}` +
      `&q=${encodeURIComponent(rawText + ", Nairobi, Kenya")}` +
      `&format=json&limit=1`;

    const resp = await fetch(url);
    if (!resp.ok) return empty;

    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) return empty;

    const { lat, lon } = results[0];
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return empty;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("location_landmarks")
      .insert({
        name: rawText,
        aliases: [cleaned],
        lat: parsedLat,
        lng: parsedLng,
        verified: false,
        source: "locationiq"
      })
      .select("id")
      .single();

    if (insertErr) {
      // Geocoded successfully but couldn't cache it — still return the
      // coordinate for this booking, just skip the id reference.
      console.error("location_landmarks insert failed (non-blocking)", insertErr);
      return { lat: parsedLat, lng: parsedLng, landmarkId: null };
    }

    return { lat: parsedLat, lng: parsedLng, landmarkId: inserted.id };
  } catch (err) {
    console.error("resolveLandmark failed (non-blocking)", err);
    return empty;
  }
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

    // NEW — pricing failure no longer dead-ends the customer. get_delivery_price
    // deliberately fails closed for any route it doesn't have configured (see
    // its own "NO DEFAULT FALLBACK" comment) — that safety behavior is left
    // untouched. What changes is what THIS function does with that failure:
    // instead of rejecting the booking outright, it's saved as awaiting_quote
    // with no price and no payment record, and staff follow up with a real
    // number. This never invents a KES figure anywhere.
    let baseAmount: number | null = null;
    try {
      baseAmount = await getAuthoritativePrice(pickup, dropoff, details);
    } catch (pricingErr) {
      console.error("No configured price for this route — falling back to awaiting_quote", (pricingErr as Error).message);
    }

    // Until dedicated round/multi-trip tariff tables are configured, each trip uses the authoritative one-way route price. Round trip = 2 trips; multi-trip = requested number of trips.
    const effectiveTripCount = deliveryType === "round_trip" ? 2 : tripCount;
    const amount = baseAmount != null ? baseAmount * effectiveTripCount : null;
    const internalReference = "LR-DEL-" + Date.now() + "-" + crypto.randomUUID().slice(0, 8);

    // NEW — resolved in parallel, after pricing, never blocking on failure.
    // If either lookup fails or LOCATIONIQ_API_KEY isn't set yet, both
    // resolve to nulls and the insert below behaves exactly as before.
    const [pickupGeo, dropoffGeo] = await Promise.all([
      resolveLandmark(pickup),
      resolveLandmark(dropoff)
    ]);

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
        status: amount != null ? "pending_payment" : "awaiting_quote",
        quoted_amount_kes: amount,
        reference: internalReference,
        // NEW — best-effort, nullable, display-only:
        pickup_lat: pickupGeo.lat,
        pickup_lng: pickupGeo.lng,
        pickup_landmark_id: pickupGeo.landmarkId,
        dropoff_lat: dropoffGeo.lat,
        dropoff_lng: dropoffGeo.lng,
        dropoff_landmark_id: dropoffGeo.landmarkId
      })
      .select("id")
      .single();

    if (bookingInsertError || !booking) {
      console.error("booking insert failed", bookingInsertError);
      return json({ error: "Could not create the booking." }, 500);
    }

    // NEW — no price means nothing to charge yet. Skip the payments row
    // entirely (payments.amount is NOT NULL in this schema — inserting a
    // placeholder amount here would be worse than not inserting at all)
    // and tell the customer their booking is saved and awaiting a quote.
    if (amount == null) {
      return json({
        success: true,
        status: "awaiting_quote",
        bookingId: booking.id,
        bookingReference: internalReference,
        deliveryType,
        tripCount: effectiveTripCount,
        pickupLocation: pickupGeo.lat != null ? { lat: pickupGeo.lat, lng: pickupGeo.lng } : null,
        dropoffLocation: dropoffGeo.lat != null ? { lat: dropoffGeo.lat, lng: dropoffGeo.lng } : null,
        message: "This route isn't in our automatic pricing yet. Your booking is saved and a Lueri team member will confirm your price and follow up shortly."
      });
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
      // NEW — present only when resolved; frontend can render a confirmation
      // map when both are non-null, and should simply omit the map otherwise.
      pickupLocation: pickupGeo.lat != null ? { lat: pickupGeo.lat, lng: pickupGeo.lng } : null,
      dropoffLocation: dropoffGeo.lat != null ? { lat: dropoffGeo.lat, lng: dropoffGeo.lng } : null,
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
