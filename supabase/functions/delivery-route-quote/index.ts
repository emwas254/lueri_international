import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEOAPIFY_API_KEY = Deno.env.get("GEOAPIFY_API_KEY") ?? "";

const ALLOWED_ORIGINS = new Set([
  "https://lueriinternational.com",
  "https://www.lueriinternational.com",
]);

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://lueriinternational.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, max = 300) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

type GeoPoint = {
  lat: number;
  lon: number;
  formatted: string;
};

async function geocode(address: string): Promise<GeoPoint> {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", address);
  url.searchParams.set("filter", "countrycode:ke");
  url.searchParams.set("limit", "1");
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Geoapify geocoding failed", response.status);
    throw new Error("Address lookup failed.");
  }

  const feature = data?.features?.[0];
  const lat = Number(feature?.properties?.lat);
  const lon = Number(feature?.properties?.lon);
  const formatted = String(feature?.properties?.formatted ?? address);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("We couldn't locate one of those addresses in Kenya.");
  }

  return { lat, lon, formatted };
}

async function route(pickup: GeoPoint, dropoff: GeoPoint) {
  const url = new URL("https://api.geoapify.com/v1/routing");
  // Geoapify routing expects latitude,longitude waypoint pairs.
  url.searchParams.set(
    "waypoints",
    `${pickup.lat},${pickup.lon}|${dropoff.lat},${dropoff.lon}`,
  );
  url.searchParams.set("mode", "drive");
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Geoapify routing failed", response.status);
    throw new Error("Route calculation failed.");
  }

  const properties = data?.features?.[0]?.properties;
  const distanceMeters = Number(properties?.distance);
  const durationSeconds = Number(properties?.time);

  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
    throw new Error("We couldn't calculate a driving route for those locations.");
  }

  return {
    distance_km: Math.round((distanceMeters / 1000) * 100) / 100,
    duration_minutes: Math.max(1, Math.ceil(durationSeconds / 60)),
  };
}

async function authoritativePrice(pickup: string, dropoff: string, details: string) {
  if (!supabaseAdmin) throw new Error("Supabase service credentials unavailable.");

  const { data, error } = await supabaseAdmin.rpc("get_delivery_price", {
    p_pickup: pickup,
    p_dropoff: dropoff,
    p_details: details,
  });

  if (error || data == null) {
    console.error("get_delivery_price failed", error);
    throw new Error("The Lueri pricing engine is unavailable.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  const amount = Number(row?.amount_kes);

  if (row?.is_valid !== true || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(String(row?.error_message ?? "A confirmed price is not available for this route."));
  }

  return amount;
}

async function handle(req: Request) {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, origin);
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "Invalid request origin." }, 403, origin);
  }

  if (!GEOAPIFY_API_KEY) {
    console.error("Missing GEOAPIFY_API_KEY");
    return json({ error: "Location services are not configured." }, 500, origin);
  }

  try {
    const body = await req.json();
    const pickup = cleanText(body?.pickup);
    const dropoff = cleanText(body?.dropoff);
    const details = cleanText(body?.details, 1500);

    if (!pickup || !dropoff) {
      return json({ error: "Pickup and drop-off locations are required." }, 400, origin);
    }

    if (pickup.length < 3 || dropoff.length < 3) {
      return json({ error: "Please provide fuller pickup and drop-off locations." }, 400, origin);
    }

    const [pickupPoint, dropoffPoint] = await Promise.all([
      geocode(pickup),
      geocode(dropoff),
    ]);

    const routeData = await route(pickupPoint, dropoffPoint);
    const amountKes = await authoritativePrice(pickup, dropoff, details);

    return json({
      success: true,
      quote: {
        amount_kes: amountKes,
        currency: "KES",
        distance_km: routeData.distance_km,
        duration_minutes: routeData.duration_minutes,
      },
      locations: {
        pickup: pickupPoint,
        dropoff: dropoffPoint,
      },
      provider: "Geoapify",
      attribution: "Routing and geocoding data © OpenStreetMap contributors, powered by Geoapify",
    }, 200, origin);
  } catch (error) {
    console.error("delivery-route-quote error", error);
    return json({
      error: error instanceof Error ? error.message : "Unable to calculate the delivery quote.",
    }, 502, origin);
  }
}

Deno.serve(handle);
