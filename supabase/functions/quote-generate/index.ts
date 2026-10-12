// Public (via token): price a delivery from real locations. Needs the drop-off already saved by location-submit.
// Returns only what a customer should see: price, ETA, validity. Cost, margin and breakdown stay in delivery_quotes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clientIp, corsHeaders, haversineM, rateLimited, TOKEN_RE } from "../_shared/delivery-link.ts";
import { computeQuote, DEFAULT_CONFIG, offRoadFromNote, type QuoteConfig } from "../_shared/quote.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const LOCATIONIQ_API_KEY = Deno.env.get("LOCATIONIQ_API_KEY") ?? "";

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object") return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = out[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" ? merge(b, v) : v;
  }
  return out as T;
}

async function geocode(text: string): Promise<{ lat: number; lng: number } | null> {
  if (!text) return null;
  try {
    const { data: hit } = await admin.from("location_landmarks").select("lat, lng").contains("aliases", [text.toLowerCase()]).limit(1);
    if (hit?.length) return { lat: hit[0].lat, lng: hit[0].lng };
    if (!LOCATIONIQ_API_KEY) return null;
    const r = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(text + ", Kenya")}&format=json&limit=1`);
    if (!r.ok) return null;
    const j = await r.json();
    const lat = parseFloat(j?.[0]?.lat), lng = parseFloat(j?.[0]?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch (e) { console.error("geocode failed (non-blocking)", e); return null; }
}

// Road distance via LocationIQ directions if available on this plan; otherwise straight-line x road factor.
async function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }, roadFactor: number) {
  if (LOCATIONIQ_API_KEY) {
    try {
      const r = await fetch(`https://us1.locationiq.com/v1/directions/driving/${a.lng},${a.lat};${b.lng},${b.lat}?key=${LOCATIONIQ_API_KEY}&overview=false`);
      if (r.ok) {
        const j = await r.json(); const rt = j?.routes?.[0];
        if (rt && Number.isFinite(rt.distance) && rt.distance > 0) return { km: rt.distance / 1000, durationMin: Math.round(rt.duration / 60), source: "routing" };
      }
    } catch (e) { console.error("directions failed, using straight line", e); }
  }
  return { km: (haversineM(a.lat, a.lng, b.lat, b.lng) / 1000) * roadFactor, durationMin: undefined, source: "straight_line" };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (await rateLimited(admin, "quote-generate", clientIp(req), 12, 60)) return json({ error: "Too many requests. Please wait a minute." }, 429);

  const b = await req.json().catch(() => null) as { token?: string } | null;
  const token = String(b?.token ?? "");
  if (!TOKEN_RE.test(token)) return json({ error: "This link is not valid or has expired." }, 404);

  const { data: link } = await admin.from("delivery_links").select("booking_id, expires_at").eq("token", token).maybeSingle();
  if (!link || new Date(link.expires_at) < new Date()) return json({ error: "This link is not valid or has expired." }, 404);
  if (!link.booking_id) return json({ error: "Please share your delivery location first." }, 409);

  const { data: bk } = await admin.from("bookings").select("id, status, pickup, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, dropoff_confidence, dropoff_note").eq("id", link.booking_id).single();
  if (!bk) return json({ error: "Could not find your delivery." }, 404);
  if (!["awaiting_quote", "requested"].includes(String(bk.status))) return json({ error: "This delivery can no longer be re-quoted online. Please contact us." }, 409);

  const { data: st } = await admin.from("pricing_settings").select("config").eq("id", 1).maybeSingle();
  const cfg = merge<QuoteConfig>(DEFAULT_CONFIG, st?.config);

  // Pickup coordinates: saved ones, else geocode the pickup text once and keep them.
  let pickup = bk.pickup_lat != null && bk.pickup_lng != null ? { lat: bk.pickup_lat as number, lng: bk.pickup_lng as number } : null;
  if (!pickup) {
    pickup = await geocode(String(bk.pickup ?? ""));
    if (pickup) await admin.from("bookings").update({ pickup_lat: pickup.lat, pickup_lng: pickup.lng }).eq("id", bk.id);
  }
  const drop = bk.dropoff_lat != null && bk.dropoff_lng != null ? { lat: bk.dropoff_lat as number, lng: bk.dropoff_lng as number } : null;

  const dist = pickup && drop ? await distance(pickup, drop, cfg.roadFactor) : null;
  const q = computeQuote({
    km: dist?.km ?? 0, durationMin: dist?.durationMin, when: new Date(), offRoad: offRoadFromNote(bk.dropoff_note),
    confidence: bk.dropoff_confidence ?? undefined, hasCoords: !!(pickup && drop),
  }, cfg);

  if (q.needsHuman || q.price == null) {
    await admin.from("delivery_events").insert({ booking_id: bk.id, from_status: bk.status, to_status: bk.status, actor_type: "system", meta: { quote: "needs_human", reason: q.reason } });
    const msg = "We need to confirm a few details before we can give you an exact price. Our team will contact you shortly.";
    return json({ ok: true, needs_human: true, reason: q.reason, message: msg });
  }

  const validUntil = new Date(Date.now() + cfg.validMinutes * 60_000).toISOString();
  const { error } = await admin.from("delivery_quotes").insert({
    booking_id: bk.id, mode: cfg.mode, price_kes: q.price, est_cost_kes: Math.round(q.estCost ?? 0), margin_pct: q.marginPct,
    distance_km: Number(dist!.km.toFixed(2)), distance_source: dist!.source, eta_minutes: q.etaMinutes, rush: q.band?.pressure === "peak",
    breakdown: q.breakdown ?? {}, valid_until: validUntil,
  });
  if (error) { console.error("quote insert failed", error); return json({ error: "Could not prepare your price." }, 500); }
  await admin.from("bookings").update({ route_km: Number(dist!.km.toFixed(2)), route_minutes: dist!.durationMin ?? null, est_cost_kes: Math.round(q.estCost ?? 0) }).eq("id", bk.id);
  await admin.from("delivery_events").insert({ booking_id: bk.id, from_status: bk.status, to_status: bk.status, actor_type: "system", meta: { quote: q.price, mode: cfg.mode, km: dist!.km, source: dist!.source, band: q.band?.id, mult: q.band?.mult, scheduled_for: q.scheduledFor?.when ?? null } });

  return json({ ok: true, price_kes: q.price, eta_minutes: q.etaMinutes, valid_minutes: cfg.validMinutes, estimate: dist!.source !== "routing", band: q.band ? { label: q.band.label, pressure: q.band.pressure } : null, scheduled_for: q.scheduledFor?.label ?? null, cheaper_later: q.cheaperLater ?? null });
});
