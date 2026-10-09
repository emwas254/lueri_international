// Public: resolve a token to the minimum the customer page needs. Never returns internal IDs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clientIp, corsHeaders, rateLimited, TOKEN_RE } from "../_shared/delivery-link.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const INVALID = { error: "This link is not valid or has expired." };

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (await rateLimited(admin, "link-open", clientIp(req), 30, 60)) return json({ error: "Too many requests. Please wait a minute." }, 429);

  const b = await req.json().catch(() => null) as { token?: string } | null;
  const token = String(b?.token ?? "");
  if (!TOKEN_RE.test(token)) return json(INVALID, 404);

  const { data: link } = await admin.from("delivery_links")
    .select("pickup_text, details, expires_at, booking_id, organizations(name)").eq("token", token).maybeSingle();
  if (!link || new Date(link.expires_at) < new Date()) return json(INVALID, 404);

  // deno-lint-ignore no-explicit-any
  const merchant = (link as any).organizations?.name ?? null;
  return json({ ok: true, merchant, pickup_text: link.pickup_text, details: link.details, location_already_submitted: !!link.booking_id });
});
