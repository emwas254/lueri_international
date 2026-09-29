// supabase/functions/_shared/lucy-facts.ts
// Single source of truth for Rewards tiers and prices in Lucy.
// Reads public.membership_plans, so English, Swahili, French, etc. and the AI's knowledge
// can never disagree with the database again. Change a price in the table and Lucy follows
// within 10 minutes. No redeploy needed.
//
// Business rule encoded here (from you):
//  - Bronze is free, joined by signing up on the website.
//  - Members earn points and move up automatically when lifetime spend reaches a tier's level (slower).
//  - Any paid tier (Silver/Gold/Platinum/VIP) can also be bought directly (faster).
//  - One-time vs renewing is NOT stated anywhere yet, so no copy here says "per year".

export type Plan = {
  code: string;
  display_name: string;
  min_lifetime_spend: number;
  price_kes: number | null;
  sort_order: number;
  benefits: string[];
};

// Used only if the table can't be read AND nothing is cached yet. Mirrors the live table (29 Sep 2026).
const FALLBACK_PLANS: Plan[] = [
  { code: "bronze", display_name: "Bronze", min_lifetime_spend: 0, price_kes: null, sort_order: 1, benefits: [] },
  { code: "silver", display_name: "Silver", min_lifetime_spend: 5000, price_kes: 5000, sort_order: 2, benefits: [] },
  { code: "gold", display_name: "Gold", min_lifetime_spend: 15000, price_kes: 15000, sort_order: 3, benefits: [] },
  { code: "platinum", display_name: "Platinum", min_lifetime_spend: 35000, price_kes: 35000, sort_order: 4, benefits: [] },
  { code: "vip", display_name: "VIP", min_lifetime_spend: 75000, price_kes: 75000, sort_order: 5, benefits: [] },
];

let cache: { at: number; plans: Plan[] } | null = null;

// deno-lint-ignore no-explicit-any
export async function getRewardsPlans(supabaseAdmin: any): Promise<Plan[]> {
  if (cache && Date.now() - cache.at < 600_000) return cache.plans;
  try {
    const { data, error } = await supabaseAdmin
      .from("membership_plans")
      .select("code, display_name, min_lifetime_spend, price_kes, sort_order, benefits")
      .order("sort_order");
    if (error || !Array.isArray(data) || data.length === 0) throw error ?? new Error("no plans");
    // deno-lint-ignore no-explicit-any
    const plans: Plan[] = data.map((p: any) => ({
      code: String(p.code),
      display_name: String(p.display_name),
      min_lifetime_spend: Number(p.min_lifetime_spend) || 0,
      price_kes: p.price_kes == null ? null : Number(p.price_kes),
      sort_order: Number(p.sort_order) || 0,
      benefits: Array.isArray(p.benefits) ? p.benefits.map(String) : [],
    }));
    cache = { at: Date.now(), plans };
    return plans;
  } catch (err) {
    console.error("getRewardsPlans failed, using cache/fallback", err);
    return cache?.plans ?? FALLBACK_PLANS;
  }
}

const kes = (n: number) => "KES " + n.toLocaleString("en-US");

function lists(plans: Plan[]) {
  const earn = plans.filter((p) => p.min_lifetime_spend > 0)
    .map((p) => `${p.display_name} ${kes(p.min_lifetime_spend)}`).join(", ");
  const buy = plans.filter((p) => p.price_kes != null)
    .map((p) => `${p.display_name} ${kes(p.price_kes as number)}`).join(", ");
  return { earn, buy };
}

const TEMPLATES: Record<string, string> = {
  en: "Lueri Rewards is for individual customers. Bronze is free: just sign up on the website. As you use Lueri you earn points and move up automatically when your lifetime spend reaches each level: {earn}. The faster route is to join a tier directly by paying for it: {buy}. Join at {url}.",
  sw: "Lueri Rewards ni kwa wateja binafsi. Bronze ni bure: jisajili tu kwenye tovuti. Kadri unavyotumia huduma za Lueri unapata pointi na kupanda ngazi kiotomatiki matumizi yako ya jumla yakifikia kila kiwango: {earn}. Njia ya haraka zaidi ni kujiunga na ngazi moja kwa moja kwa kulipa: {buy}. Jiunge kupitia {url}.",
  fr: "Lueri Rewards s’adresse aux clients individuels. Bronze est gratuit : il suffit de s’inscrire sur le site. En utilisant Lueri, vous gagnez des points et montez automatiquement de niveau lorsque vos dépenses cumulées atteignent chaque palier : {earn}. La voie la plus rapide consiste à rejoindre directement un niveau en payant : {buy}. Inscription : {url}.",
  es: "Lueri Rewards es para clientes individuales. Bronze es gratis: solo regístrate en el sitio web. A medida que usas Lueri acumulas puntos y subes de nivel automáticamente cuando tu gasto acumulado alcanza cada nivel: {earn}. La vía más rápida es unirte directamente a un nivel pagando: {buy}. Únete en {url}.",
  ar: "برنامج Lueri Rewards مخصص للعملاء الأفراد. Bronze مجاني: سجّل فقط عبر الموقع. كلما استخدمت خدمات Lueri تكسب نقاطاً وترتقي تلقائياً عندما يصل إجمالي إنفاقك إلى كل مستوى: {earn}. والطريق الأسرع هو الانضمام مباشرة إلى مستوى بالدفع: {buy}. انضم عبر {url}.",
  pt: "O Lueri Rewards destina-se a clientes individuais. O Bronze é gratuito: basta registar-se no site. À medida que usa a Lueri, ganha pontos e sobe de nível automaticamente quando o gasto acumulado atinge cada nível: {earn}. O caminho mais rápido é aderir diretamente a um nível pagando: {buy}. Adira em {url}.",
  zh: "Lueri Rewards 面向个人客户。Bronze 免费：在网站上注册即可。随着您使用 Lueri 的服务，您会累积积分，累计消费达到各等级门槛时自动升级：{earn}。更快的方式是直接付费加入某个等级：{buy}。加入：{url}。",
};

export function rewardsAnswer(locale: string, plans: Plan[], url: string): string {
  const { earn, buy } = lists(plans);
  return (TEMPLATES[locale] ?? TEMPLATES.en)
    .replace("{earn}", () => earn)
    .replace("{buy}", () => buy)
    .replace("{url}", () => url);
}

// Injected into the AI's system prompt at request time (English; the model answers in the visitor's language).
export function rewardsKnowledge(plans: Plan[]): string {
  const { earn, buy } = lists(plans);
  const benefits = plans
    .filter((p) => p.benefits.length)
    .map((p) => `${p.display_name}: ${p.benefits.join("; ")}`)
    .join("\n");
  return [
    "LIVE REWARDS FACTS (authoritative; override anything above that conflicts):",
    "- Lueri Rewards is for individual customers. Bronze is free and joined by signing up on the website.",
    "- Members earn points on eligible deliveries and move up tiers automatically when lifetime spend reaches: " + earn + ".",
    "- Every paid tier can also be bought directly with money, which is the faster route: " + buy + ".",
    "- Do NOT say whether a purchase is one-time or recurring, or 'per year'. If asked, say Lueri will confirm and point to WhatsApp.",
    benefits ? "- Tier benefits:\n" + benefits : "",
  ].filter(Boolean).join("\n");
}

/* ---- Wiring in lucy-chat/index.ts ------------------------------------------------

1) Import (top of file):
     import { getRewardsPlans, rewardsAnswer, rewardsKnowledge } from "../_shared/lucy-facts.ts";

2) In the FAQ block, just before the line  `const knowledgeReply = answers[validLocale] || answers.en;`
   replace that line with:
     const rewardsWins = asksRewards && !asksCorporate; // matches the existing priority in the answers chain
     const knowledgeReply = rewardsWins
       ? rewardsAnswer(validLocale, await getRewardsPlans(supabaseAdmin), "https://lueriinternational.com/rewards.html")
       : (answers[validLocale] || answers.en);
   (The reply is still localised by the existing ?lang= rewriting at the end of the handler.)

3) In the AI path, replace
     const augmentedSystemPrompt = `${SYSTEM_PROMPT}\n\nLANGUAGE INSTRUCTION:\n${LOCALE_INSTRUCTIONS[validLocale]}`;
   with
     const augmentedSystemPrompt = `${SYSTEM_PROMPT}\n\n${rewardsKnowledge(await getRewardsPlans(supabaseAdmin))}\n\nLANGUAGE INSTRUCTION:\n${LOCALE_INSTRUCTIONS[validLocale]}`;

4) Delete these two wrong lines from the KNOWLEDGE constant:
     "Membership plans: Individual Rewards tiers are Silver, Gold, Platinum and VIP as paid plans; Bronze is the entry loyalty tier. ..."
     "Rewards: free loyalty program; points are earned per qualifying delivery. Tiers: Bronze, Silver, Gold, Platinum and VIP."

Test: ask "Rewards Membership" in English and Swahili. Both must show the same five numbers.
Then change a price_kes in the table and ask again after 10 minutes.
---------------------------------------------------------------------------------- */
