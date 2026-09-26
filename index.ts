// supabase/functions/lucy-create-booking/index.ts
//
// Called by Lucy once it has parsed a booking intent out of a
// customer conversation: who they are, what's moving (service_type),
// and where from/to (free text — building names, not addresses).
//
// Flow:
//   1. Resolve pickup + dropoff via known_locations cache first,
//      LocationIQ forward-geocoding only on a cache miss.
//   2. Get real driving distance/duration via LocationIQ Directions.
//   3. Price it via pricing_rules — flat categories get an instant
//      number, requires_manual_quote categories get NO number and
//      status=awaiting_quote instead.
//   4. Write the booking, notify staff.
//
// ENV VARS REQUIRED (set as Supabase Edge Function secrets):
//   LOCATIONIQ_API_KEY
//   SUPABASE_URL                (auto-injected by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY   (auto-injected by Supabase)
//   STAFF_NOTIFY_WEBHOOK_URL    (see notifyStaff() — NOT yet wired,
//                                 decide the channel first, see TODO)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOCATIONIQ_KEY = Deno.env.get("LOCATIONIQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type ResolvedLocation = {
  id?: string;
  name?: string;
  display_name?: string;
  lat: number;
  lng: number;
  source: "cache" | "locationiq";
};

/**
 * Cache-first location resolution. A cache hit costs nothing.
 * A miss costs one LocationIQ call and permanently grows the
 * gazetteer for next time.
 */
async function resolveLocation(rawText: string): Promise<ResolvedLocation> {
  const cleaned = rawText.trim().toLowerCase();

  const { data: known, error: lookupErr } = await supabase
    .from("known_locations")
    .select("*")
    .contains("aliases", [cleaned])
    .limit(1);

  if (lookupErr) throw new Error(`known_locations lookup failed: ${lookupErr.message}`);
  if (known && known.length > 0) {
    return { ...known[0], source: "cache" };
  }

  const url =
    `https://us1.locationiq.com/v1/search.php` +
    `?key=${LOCATIONIQ_KEY}` +
    `&q=${encodeURIComponent(rawText + ", Nairobi, Kenya")}` +
    `&format=json&limit=1`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`LocationIQ geocoding request failed (${resp.status}) for "${rawText}"`);
  }
  const results = await resp.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`Could not resolve location: "${rawText}" — ask the customer for a nearby landmark instead`);
  }

  const { lat, lon, display_name } = results[0];

  const { data: inserted, error: insertErr } = await supabase
    .from("known_locations")
    .insert({
      name: rawText,
      aliases: [cleaned],
      lat: parseFloat(lat),
      lng: parseFloat(lon),
      verified: false,
      source: "locationiq",
    })
    .select()
    .single();

  if (insertErr) throw new Error(`Failed to cache resolved location: ${insertErr.message}`);

  return { ...inserted, display_name, source: "locationiq" };
}

/** Real driving distance/duration, not straight-line — Nairobi's road layout makes straight-line useless. */
async function getRoute(pickup: ResolvedLocation, dropoff: ResolvedLocation) {
  const coords = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
  const url =
    `https://us1.locationiq.com/v1/directions/driving/${coords}` +
    `?key=${LOCATIONIQ_KEY}&overview=false`;

  const resp = await fetch(url);
  if (!resp.ok) {
    // Don't fail the whole booking over a routing miss — distance is
    // nice-to-have data collection, not a hard requirement to book.
    return { distance_km: null, duration_min: null };
  }
  const data = await resp.json();
  const route = data.routes?.[0];
  if (!route) return { distance_km: null, duration_min: null };

  return {
    distance_km: Math.round((route.distance / 1000) * 10) / 10,
    duration_min: Math.round(route.duration / 60),
  };
}

/** Prices come from the pricing_rules table, never hardcoded here. */
async function computePrice(serviceType: string, distanceKm: number | null) {
  const { data: rule, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("service_type", serviceType)
    .single();

  if (error || !rule) {
    throw new Error(`No pricing rule found for service_type "${serviceType}"`);
  }

  if (rule.requires_manual_quote) {
    return { price: null, status: "awaiting_quote" as const };
  }

  let price = Number(rule.base_price_kes);
  if (rule.price_per_km_kes && distanceKm) {
    price += Number(rule.price_per_km_kes) * distanceKm;
  }
  return { price, status: "pending_confirmation" as const };
}

/**
 * TODO — channel not yet decided. Two real options:
 *   A) Make.com webhook: this project already has Make wired up for
 *      Facebook/Instagram/LinkedIn publishing — if a WhatsApp module
 *      is available on the connected account, this is the fastest
 *      path (no new integration, just a new scenario + webhook URL).
 *   B) Meta WhatsApp Cloud API directly: needs Business verification
 *      and an approved message template before it can send freeform
 *      notifications — a multi-day setup, not a today thing.
 * Until one is chosen this just logs — bookings still get created
 * and priced correctly, they just don't page anyone yet.
 */
async function notifyStaff(booking: Record<string, unknown>) {
  const webhookUrl = Deno.env.get("STAFF_NOTIFY_WEBHOOK_URL");
  if (!webhookUrl) {
    console.log("STAFF_NOTIFY_WEBHOOK_URL not set — skipping notification for booking", booking.id);
    return;
  }
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  });
}

serve(async (req: Request) => {
  try {
    const {
      customer_name,
      customer_phone,
      service_type,
      pickup_text,
      dropoff_text,
    } = await req.json();

    if (!customer_phone || !service_type || !pickup_text || !dropoff_text) {
      return new Response(
        JSON.stringify({ error: "customer_phone, service_type, pickup_text, and dropoff_text are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const pickup = await resolveLocation(pickup_text);
    const dropoff = await resolveLocation(dropoff_text);
    const { distance_km, duration_min } = await getRoute(pickup, dropoff);
    const { price, status } = await computePrice(service_type, distance_km);

    const { data: booking, error: bookingErr } = await supabase
      .from("lucy_bookings")
      .insert({
        customer_name,
        customer_phone,
        service_type,
        pickup_location_id: pickup.id,
        pickup_raw_text: pickup_text,
        dropoff_location_id: dropoff.id,
        dropoff_raw_text: dropoff_text,
        distance_km,
        duration_min,
        quoted_price_kes: price,
        status,
      })
      .select()
      .single();

    if (bookingErr) throw new Error(`Failed to create booking: ${bookingErr.message}`);

    await notifyStaff(booking);
    if (booking) {
      await supabase
        .from("lucy_bookings")
        .update({ staff_notified_at: new Date().toISOString() })
        .eq("id", booking.id);
    }

    return new Response(
      JSON.stringify({
        booking_id: booking.id,
        pickup: { name: pickup.name ?? pickup.display_name, lat: pickup.lat, lng: pickup.lng },
        dropoff: { name: dropoff.name ?? dropoff.display_name, lat: dropoff.lat, lng: dropoff.lng },
        distance_km,
        duration_min,
        price_kes: price,           // null when status === "awaiting_quote"
        status,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
});
