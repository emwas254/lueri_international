// Shared helpers for the delivery-link functions. Pure and dependency-free so they can be unit tested.
export const ALLOWED_ORIGINS = ["https://lueriinternational.com", "https://www.lueriinternational.com"];
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // 57 chars, no look-alikes
export const TOKEN_RE = /^[A-Za-z0-9]{8,12}$/;

export function newToken(len = 10): string {
  const out: string[] = [];
  const limit = 256 - (256 % ALPHABET.length); // rejection sampling: no modulo bias
  while (out.length < len) {
    for (const b of crypto.getRandomValues(new Uint8Array(len * 2))) {
      if (b < limit && out.length < len) out.push(ALPHABET[b % ALPHABET.length]);
    }
  }
  return out.join("");
}

// Canonical Kenyan mobile: 2547XXXXXXXX / 2541XXXXXXXX, or null if invalid.
export function normalizePhoneKE(v: string): string | null {
  const d = String(v ?? "").replace(/\D/g, "");
  let n: string;
  if (d.length === 12 && d.startsWith("254")) n = d;
  else if (d.length === 10 && d.startsWith("0")) n = "254" + d.slice(1);
  else if (d.length === 9) n = "254" + d;
  else return null;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}
export const toLocalPhone = (canon: string) => "0" + canon.slice(3); // bookings.phone uses 07xx today

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// "south,west,north,east". Default is a wide Nairobi-metro box (incl. Karen, Ngong, Kiambu edge). Configurable via env.
export const DEFAULT_BBOX = "-1.55,36.55,-1.05,37.25";
export function inBbox(lat: number, lng: number, bbox = DEFAULT_BBOX): boolean {
  const [s, w, n, e] = bbox.split(",").map(Number);
  if ([s, w, n, e].some((x) => !Number.isFinite(x))) return true; // bad config must not block customers
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

export const BAND_MESSAGE: Record<string, string> = {
  confirmed: "Location confirmed.",
  confirm_pin: "We found your area. Please check the pin is in the right place.",
  add_detail: "We have identified the general area, but we need one more detail to make sure our courier finds you.",
  human_verify: "We need one more detail so our rider finds you. Our team will call you to confirm.",
  blocked: "Sorry, that location is outside our current delivery area.",
};

export function clientIp(req: Request): string {
  return (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
}

export function corsHeaders(req: Request): Record<string, string> {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// deno-lint-ignore no-explicit-any
export async function rateLimited(admin: any, bucket: string, key: string, max: number, windowSec: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { count } = await admin.from("rate_limit_events").select("id", { count: "exact", head: true })
    .eq("bucket", bucket).eq("key", key).gte("at", since);
  if ((count ?? 0) >= max) return true;
  await admin.from("rate_limit_events").insert({ bucket, key });
  return false;
}
