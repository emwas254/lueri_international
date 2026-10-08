// Staff-only: create an opaque delivery link. The customer later opens /d/<token>.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, newToken } from "../_shared/delivery-link.ts";

const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(URL_, SERVICE);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Authorization: verify the caller's JWT, then check their active staff/admin profile with the service client.
  // (is_staff() is not executable by the authenticated role in this project, so we read profiles directly.)
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await userClient.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return json({ error: "Not authorized" }, 401);
  const { data: prof } = await admin.from("profiles").select("role, active").eq("id", uid).maybeSingle();
  if (!prof || prof.active !== true || !["staff", "admin"].includes(String(prof.role))) return json({ error: "Not authorized" }, 403);

  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  const pickup = String(b?.pickup_text ?? "").trim();
  if (!pickup || pickup.length > 300) return json({ error: "pickup_text required (max 300 chars)" }, 400);
  const details = b?.details ? String(b.details).slice(0, 1500) : null;
  const merchantId = b?.merchant_id ? String(b.merchant_id) : null;
  if (merchantId && !UUID_RE.test(merchantId)) return json({ error: "Invalid merchant_id" }, 400);
  const hours = Math.min(Math.max(Number(b?.expires_hours ?? 168) || 168, 1), 168);

  for (let i = 0; i < 3; i++) {
    const token = newToken(10);
    const { error } = await admin.from("delivery_links").insert({
      token, pickup_text: pickup, details, merchant_id: merchantId,
      created_by: uid, expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
    });
    if (!error) return json({ ok: true, token, url: `https://lueriinternational.com/d/${token}` });
    if (error.code !== "23505") { console.error("link-create failed", error); return json({ error: "Could not create link" }, 500); }
  }
  return json({ error: "Could not create link" }, 500);
});
