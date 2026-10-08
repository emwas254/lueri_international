// Public (via token): capture the drop-off, score confidence, create/update the booking. Never sets a price.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scoreLocation, type Method } from "../_shared/location-confidence.ts";
import {
  BAND_MESSAGE, clientIp, corsHeaders, DEFAULT_BBOX, haversineM, inBbox, normalizePhoneKE, rateLimited, TOKEN_RE, toLocalPhone,
} from "../_shared/delivery-link.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const LOCATIONIQ_API_KEY = Deno.env.get("LOCATIONIQ_API_KEY") ?? "";
const BBOX = Deno.env.get("SERVICE_BBOX") ?? DEFAULT_BBOX;
const METHODS: Method[] = ["gps", "pin", "address", "landmark", "call"];
const APPROX_TYPES = new Set(["suburb", "city", "town", "neighbourhood", "administrative", "county", "state", "village"]);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const txt = (v: unknown, max: number) => (v == null ? "" : String(v).trim().slice(0, max));

// Cache first (shared with delivery-payment-initiate), then LocationIQ. Best-effort: never throws.
async function geocode(text: string): Promise<{ lat: number; lng: number; approximate: boolean } | null> {
  if (!text) return null;
  try {
    const key = text.toLowerCase();
    const { data: hit } = await admin.from("location_landmarks").select("lat, lng").contains("aliases", [key]).limit(1);
    if (hit?.length) return { lat: hit[0].lat, lng: hit[0].lng, approximate: false };
    if (!LOCATIONIQ_API_KEY) return null;
    const r = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(text + ", Kenya")}&format=json&limit=1`);
    if (!r.ok) return null;
    const j = await r.json();
    const lat = parseFloat(j?.[0]?.lat), lng = parseFloat(j?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, approximate: APPROX_TYPES.has(String(j[0].type)) };
  } catch (e) { console.error("geocode failed (non-blocking)", e); return null; }
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (await rateLimited(admin, "location-submit", clientIp(req), 20, 60)) return json({ error: "Too many requests. Please wait a minute." }, 429);

  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return json({ error: "Invalid request" }, 400);
  const token = String(b.token ?? "");
  if (!TOKEN_RE.test(token)) return json({ error: "This link is not valid or has expired." }, 404);

  const method = String(b.method ?? "") as Method;
  const name = txt(b.customer_name, 120);
  const phone = normalizePhoneKE(String(b.contact_phone ?? ""));
  const address = txt(b.address_text, 300), landmark = txt(b.landmark_text, 300), gate = txt(b.gate_note, 300);
  if (!METHODS.includes(method)) return json({ error: "Invalid method" }, 400);
  if (!name) return json({ error: "Please enter your name." }, 400);
  if (!phone) return json({ error: "Please enter a valid Kenyan mobile number so our rider can call you." }, 400);

  const { data: link } = await admin.from("delivery_links").select("token, booking_id, pickup_text, details, expires_at").eq("token", token).maybeSingle();
  if (!link || new Date(link.expires_at) < new Date()) return json({ error: "This link is not valid or has expired." }, 404);

  // Resolve coordinates by method. Client-supplied coordinates are only ever trusted as a *claim*; they feed the score.
  let lat = num(b.lat), lng = num(b.lng);
  const accuracyM = num(b.accuracy_m);
  let geocodeApprox = false;
  if ((method === "gps" || method === "pin") && (lat == null || lng == null)) return json({ error: "Location missing." }, 400);
  if (method === "address" || method === "landmark" || method === "call") {
    const g = await geocode([landmark, address].filter(Boolean).join(", "));
    if (g) { lat = g.lat; lng = g.lng; geocodeApprox = g.approximate; } else { lat = undefined; lng = undefined; }
  }
  if (lat != null && lng != null && (Math.abs(lat) > 90 || Math.abs(lng) > 180)) return json({ error: "Invalid coordinates" }, 400);

  const hasCoords = lat != null && lng != null;
  if (hasCoords && !inBbox(lat!, lng!, BBOX)) return json({ ok: false, band: "blocked", message: BAND_MESSAGE.blocked }, 422);

  const gpsLat = num(b.gps_lat), gpsLng = num(b.gps_lng);
  const pinMoved = hasCoords && gpsLat != null && gpsLng != null ? haversineM(gpsLat, gpsLng, lat!, lng!) : undefined;
  const s = scoreLocation({
    method: hasCoords ? method : "call", // nothing resolvable = treated as call-only
    accuracyM, geocodeApproximate: geocodeApprox, hasLandmarkText: !!landmark, pinMovedFromGpsM: pinMoved,
  });
  const needsHuman = s.band === "human_verify" || !hasCoords;
  const note = [landmark, gate].filter(Boolean).join(" | ") || null;
  const dropoffText = address || landmark || (hasCoords ? `Pin ${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : "To be confirmed by phone");

  const fields = {
    dropoff: dropoffText, dropoff_lat: hasCoords ? lat : null, dropoff_lng: hasCoords ? lng : null,
    dropoff_confidence: s.score, dropoff_method: hasCoords ? method : "call", dropoff_accuracy_m: accuracyM ?? null,
    dropoff_note: note, contact_phone: phone,
  };

  let prevStatus: string | null = null;
  let bookingId = link.booking_id as string | null;
  if (bookingId) {
    const { data: bk } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    prevStatus = bk?.status ?? null;
    if (prevStatus && !["awaiting_quote", "requested"].includes(prevStatus)) {
      return json({ error: "This delivery can no longer be changed online. Please contact us." }, 409);
    }
    const { error } = await admin.from("bookings").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", bookingId);
    if (error) { console.error("booking update failed", error); return json({ error: "Could not save your location." }, 500); }
  } else {
    const { data: ins, error } = await admin.from("bookings").insert({
      customer_name: name, phone: toLocalPhone(phone), pickup: link.pickup_text, details: link.details,
      status: "awaiting_quote", source: "link", ...fields,
    }).select("id").single();
    if (error || !ins) { console.error("booking insert failed", error); return json({ error: "Could not save your location." }, 500); }
    bookingId = ins.id;
    await admin.from("delivery_links").update({ booking_id: bookingId, used_at: new Date().toISOString() }).eq("token", token);
  }

  await admin.from("delivery_events").insert({
    booking_id: bookingId, from_status: prevStatus, to_status: "awaiting_quote", actor_type: "customer",
    meta: { method, score: s.score, band: s.band, flags: s.flags, needs_human: needsHuman },
  });

  // Deliberately no price, no coordinates, no internal IDs in the response.
  return json({ ok: true, confidence: s.score, band: s.band, needs_human: needsHuman, message: BAND_MESSAGE[needsHuman && s.band !== "human_verify" ? "human_verify" : s.band] });
});
