// supabase/functions/lucy-chat/index.ts
//
// Lucy v2: LLM-backed support, strictly scoped to Lueri's public FAQ/
// policy content. No database access, no order/account/payment lookup,
// no tool use. Requires ANTHROPIC_API_KEY as an Edge Function secret.
//
// 2026-09-14: corporate pricing in KNOWLEDGE updated to the authoritative
// Essential/Professional/Elite model (25k/45k/75k) to match website,
// corporate-signup.js and the business_plans table. Previously quoted an
// obsolete Starter/Professional/Enterprise model. No other logic changed.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-4-5-20251001";
const MAX_MESSAGE_LEN = 500;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Ground truth, pulled from the live site content. Update this block
// whenever pricing, hours, or coverage actually change — Lucy only
// knows what's written here, nothing else.
const KNOWLEDGE = `
LUERI INTERNATIONAL — APPROVED SUPPORT KNOWLEDGE

Services: parcel & document delivery, business/e-commerce dispatch, on-demand courier. Nairobi last-mile only, not cross-border freight.

Coverage: Nairobi CBD, Westlands, Kilimani, Kasarani, South B/South C, Embakasi, Ngong Road, Thika Road, and surrounding towns. If a location isn't listed, tell the customer to message Lueri directly to check.

Hours: Monday-Friday 8:00 AM-5:00 PM, Saturday 8:00 AM-3:00 PM, closed Sunday. Bookings after 5:00 PM or on Sunday carry over to the next business day.

Pricing: Single delivery from KES 350 (final price depends on zones and parcel size, always quoted before pickup). Payment via M-Pesa. Corporate plans: Essential KES 25,000/mo (5 deliveries included, KES 600/delivery after), Professional KES 45,000/mo (12 deliveries included, KES 550/delivery after), Elite KES 75,000/mo (25 deliveries included, KES 500/delivery after). Custom Enterprise agreements available above Elite.

Same-day delivery is NOT guaranteed — it's an estimate, subject to traffic and weather.

Liability: limited to the lower of declared value or KES 5,000 per item unless otherwise agreed in writing.

How to book: Book a Pickup form on the website, or WhatsApp Lueri directly with pickup, drop-off, and parcel details.

Corporate accounts: apply via the Business page; reviewed and activated within about one working day, never automatic.

Rewards: free loyalty program, points earned per delivery, tiers are Bronze/Silver/Gold/Platinum/VIP.
`.trim();

const SYSTEM_PROMPT = `You are Lucy, the support assistant for Lueri International, a Nairobi last-mile delivery company.

Rules you must never break:
1. Only answer using the APPROVED KNOWLEDGE below. Never invent prices, hours, coverage areas, or policies not stated there.
2. You have no access to any customer's account, order, delivery status, or payment records — you cannot look anything up. If asked about a specific order, delivery, or payment, say you can't access personal account details and direct them to WhatsApp Lueri at https://wa.link/qk7m3b.
3. Never ask for or accept sensitive personal information (ID numbers, card numbers, passwords).
4. Keep replies short — 2-4 sentences, plain and friendly.
5. If a question falls outside the APPROVED KNOWLEDGE, say you're not sure and point them to WhatsApp rather than guessing.

APPROVED KNOWLEDGE:
${KNOWLEDGE}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ reply: "Lucy's AI is being set up. Please WhatsApp Lueri directly for now: https://wa.link/qk7m3b" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message ?? "").trim();

    if (!message) {
      return new Response(JSON.stringify({ error: "Empty message" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (message.length > MAX_MESSAGE_LEN) {
      return new Response(JSON.stringify({ reply: "That question's a bit long — could you shorten it, or WhatsApp Lueri directly: https://wa.link/qk7m3b" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error", res.status, errText);
      return new Response(JSON.stringify({ reply: "Lucy is having trouble right now. Please WhatsApp Lueri directly: https://wa.link/qk7m3b" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply = data?.content?.find((b: { type: string }) => b.type === "text")?.text
      ?? "I'm not sure about that — please WhatsApp Lueri directly: https://wa.link/qk7m3b";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("lucy-chat error", err);
    return new Response(JSON.stringify({ reply: "Something went wrong. Please WhatsApp Lueri directly: https://wa.link/qk7m3b" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
