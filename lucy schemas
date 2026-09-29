// supabase/functions/_shared/lucy-schemas.ts  (v2, written against the real lucy-chat v3.2 code)
//
// Purpose: lucy-chat trusts whatever `delivery_state` the browser sends. This makes it safe.
// Design rule: bad optional input is REPAIRED (reset to a safe default), never a 400,
// so an old cached session or a stale tab can't break the customer's chat.
// delivery-payment-initiate already validates every field by hand, so no second schema there.
import { z } from "npm:zod@3.23.8";

export const LOCALES = ["en", "sw", "fr", "es", "ar", "pt", "zh"] as const;

export const STEPS = [
  "IDLE", "TRACKING", "DELIVERY_TYPE", "MULTI_TRIP_COUNT", "PICKUP", "DROPOFF",
  "PARCEL", "TIME", "NAME", "PHONE", "EMAIL", "REVIEW",
] as const;

const short = (n: number) => z.string().max(n).optional();

// member_id and parcel_photo_path are deliberately NOT accepted from the client:
// nothing in Lucy ever sets member_id, and the photo path is only ever set by the server.
export const DeliveryState = z.object({
  step: z.enum(STEPS),
  delivery_type: z.enum(["one_off", "round_trip", "multi_trip"]).optional(),
  trip_count: z.number().int().min(1).max(100).optional(),
  pickup: short(300),
  dropoff: short(300),
  details: short(1500),
  preferred_time: short(100),
  customer_name: short(120),
  customer_phone: short(20),
  customer_email: short(200),
  parcel_photo_path: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/)
    .nullable()
    .optional()
    .catch(undefined),
}); // unknown keys are stripped

export const LucyChatRequest = z.object({
  message: z.string().trim().min(1).max(2000), // lucy-chat itself answers >500 chars politely
  locale: z.enum(LOCALES).catch("en"),
  topic_intent: z.string().trim().toUpperCase().max(20).catch(""),
  delivery_state: DeliveryState.catch({ step: "IDLE" }),
  history: z.array(z.unknown()).max(20).catch([]), // items are filtered in the handler
  image_data: z
    .string()
    .max(5_700_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .optional()
    .catch(undefined),
});

export type LucyChatRequestT = z.infer<typeof LucyChatRequest>;

/* ---- Wiring in lucy-chat/index.ts ------------------------------------------------

1) import { LucyChatRequest } from "../_shared/lucy-schemas.ts";

2) In handle(), right after the origin/rate-limit checks, add a cheap size guard:
     if (Number(req.headers.get("content-length") ?? 0) > 6_000_000) return json({ error: "Too large" }, 413);

3) Delete these two unused lines:
     const rawLocale = String((await req.clone().json()...
     const validRequestLocale = ...

4) Replace:   const body = await req.json().catch(() => ({}));
   with:
     const parsed = LucyChatRequest.safeParse(await req.json().catch(() => null));
     if (!parsed.success) return json({ error: "Invalid request" }, 400);
     const body = parsed.data;

   Everything below keeps working: body.message, body.locale, body.topic_intent,
   body.delivery_state, body.history, body.image_data all keep their names.
---------------------------------------------------------------------------------- */
