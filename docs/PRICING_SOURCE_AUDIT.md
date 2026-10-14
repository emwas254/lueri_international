# Pricing source audit

**CODE-VERIFIED** means the value exists in repository code. **LIVE-VERIFIED** is not claimed. No backend quote logic or public prices are changed by this PR.

## Price inventory

Line numbers refer to the source revision reviewed before this PR; additions may shift subsequent lines.

| File | Line(s) | Value | Language / context |
|---|---:|---|---|
| `index.html` | 7 | Standard KES 350; Express KES 800 | English SEO meta description |
| `index.html` | 232–234 | KES 350–800; documents KES 400; errands from KES 600 | English visible pricing |
| `i18n-copy-patch.js` | 1–2, 20–24 | Standard 350; Express 800; documents 400; errands from 600 | English + Swahili |
| `i18n-copy-patch.js` | 36–40, 45 | Same 350/400/800/600 | Swahili; non-English fallback range also KES 350–800 |
| `i18n-completion.js` | 15, 24, 33, 42 | 350/400/800 in localized pricing paragraphs | French, Spanish, Arabic, Portuguese |
| `i18n-completion.js` | 72–78 | KES 350–800; errands from KES 600 where supplied | English, Swahili, Chinese, French, Spanish, Arabic, Portuguese |
| `supabase/functions/_shared/lucy-facts.ts` | 17, 24–28, 59–65, 98, 123 | Rewards configured direct-purchase values: Silver 5,000; Gold 15,000; Platinum 35,000; VIP 75,000; Bronze free/null | Shared Lucy Rewards facts; also stores earned-spend thresholds, which are conceptually distinct from direct purchase |
| `supabase/functions/_shared/price-floor.ts` | 1–21 | Assumptions include rider 250/hour, fuel 190/litre, 40 km/litre, overhead 25, fee 2.5%, risk 5%, margin 25% | Cost-model assumptions, not public tariffs |
| `corporate.html` | 497–513, 547–549 | Gold 25,000/month + 600 overage; Platinum 45,000/month + 550 overage; VIP 75,000/month + 500 overage | English corporate pricing |
| `delivery-checkout.html` | 497–513, 547–549 | Same corporate prices and overages | English checkout copy |
| `supabase/functions/lucy-chat/index.ts` | 189–190, 396, 400, 404, 412, 420, 428, 436 | Routes from KES 100; documents from KES 200; corporate 25,000/45,000/75,000 monthly; one response says there are no paid tier memberships | English + translated response variants |
| `rewards-cloud.js` | 13–20 | Silver 5,000; Gold 15,000; Platinum 35,000; VIP 75,000 lifetime-spend thresholds | Earned-tier thresholds; not proof of direct-purchase pricing |
| `pricing-config.js` | 1–29 | Current delivery, corporate and configured Rewards values | Browser-side config; not backend authority |

## Six non-English language price differences

- **CODE-VERIFIED — Swahili:** `i18n-copy-patch.js:36–40` includes 350/400/800/600, matching English values; descriptions are translated.
- **CODE-VERIFIED — French, Spanish, Arabic and Portuguese:** `i18n-completion.js:15,24,33,42` contain 350/400/800 in localized pricing paragraphs. Runtime precedence is not LIVE-VERIFIED.
- **CODE-VERIFIED — Chinese:** `i18n-completion.js:100–105` contains the Chinese locale block. The common `priceFrom` value at line 74 is KES 350–800; exact presence of each individual tariff in the full Chinese pricing paragraph is **UNVERIFIED** pending runtime/locale inspection.
- **CODE-VERIFIED — all six non-English Lucy response locales (Swahili, Portuguese, French, Spanish, Arabic, Chinese):** `supabase/functions/lucy-chat/index.ts:404,412,420,428,436` advertise routes from KES 100 and documents from KES 200, conflicting with the deliberate published rates (Standard 350, documents 400). This is a confirmed source discrepancy; the response line for English also contains the lower figures. No price was changed here.

## Integration boundary

- `index.html` loads `pricing-config.js` before the i18n stack and reads it for the simple English `pricing.priceFrom` and `pricing.priceQuoted` labels before the English snapshot is captured.
- `i18n-copy-patch.js` reads the same config for English price labels and descriptions.
- The SEO meta description at `index.html:7` remains static intentionally; browser JavaScript is not a reliable crawler metadata source.
- Full translated paragraphs remain static because replacing them with templates is a structural rewrite. Do not mechanically rewrite them before language-by-language regression tests.
- Backend Edge Functions and database quote RPCs remain unchanged. Browser config must never be treated as an authoritative payment amount.

## Not verified

- **UNVERIFIED:** public site render and crawler metadata.
- **UNVERIFIED:** active database membership-plan prices and live quote RPC output.
- **UNVERIFIED:** translation key precedence after full script load order on every page.
