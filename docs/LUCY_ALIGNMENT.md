# Lucy front-end alignment report

**CODE-VERIFIED:** source files were compared in branch `audit/ai-readiness`. No browser/payment transaction was run; no behavior is marked LIVE-VERIFIED.

## Entry points

- `index.html:290` and `careers.html:609` load `lucy.js`, which dynamically loads `lucy-ui-v3.js` (v3.2).
- `corporate.html:714` and `delivery-checkout.html:721` load `lucy-v3.js` directly (v3.1).

## Material differences

| Area | `lucy-ui-v3.js` (v3.2) | `lucy-v3.js` (v3.1) | Assessment |
|---|---|---|---|
| Payment handoff | Directly calls `startPayment(data)`; checks HTTP success, requires HTTPS redirect, supports NCBA Till path, and handles `status === 'awaiting_quote'` by showing localized “booking saved” and resetting booking state | Same direct-call handoff, HTTPS redirect validation and NCBA Till path; does not contain the `awaiting_quote` branch | Payment-flow difference confirmed. Do not switch corporate/checkout to v3.2 in this PR. |
| Language sync | Supports en/sw/fr/es/ar/pt/zh; listens to `lueri:languagechange` on both window and document and exposes `LucyChatbot.setLanguage` | Same supported locales and dual event listeners/public method in reviewed code | No material difference established from source inspection; runtime synchronization is UNVERIFIED |
| Endpoints | Calls `/delivery-payment-initiate` and `/lucy-chat` on the same Supabase Functions base URL | Calls the same two endpoints | No endpoint difference found in inspected request paths |
| Error handling | Payment errors are caught/logged, show localized failure/retry; chat errors are caught/logged and surfaced to the user; includes quote-pending handling | Payment errors are caught/logged, show localized failure/retry; chat errors are caught/logged and surfaced to the user; lacks quote-pending special handling | v3.2 has a material additional state branch; exact runtime parity otherwise UNVERIFIED |

## Recommendation

Recommend **v3.2 as the target implementation**, because it contains the `awaiting_quote` behavior that avoids presenting an unpriced route as a payment initialization failure and resets booking state before retry. **Do not switch `corporate.html` or `delivery-checkout.html` to v3.2 now:** the source diff shows a payment-flow behavior difference, and the user explicitly required stopping when such a difference exists.

Next step: write a focused parity test for paid route, `awaiting_quote`, retry/double-submit, NCBA Till handoff, HTTPS redirect rejection, image attachment, and all seven locales. Only then port the quote-pending behavior to the shared implementation or approve a controlled migration.

## Additional copy inconsistency

**CODE-VERIFIED:** corporate plan amounts are 25,000 / 45,000 / 75,000 per month in the Lucy response variants, but plan names are inconsistent. The English/Portuguese/French/Spanish/Arabic/Chinese responses use Essential/Professional/Elite in parts of the response table, while the website corporate selector uses Gold/Platinum/VIP; Swahili also has both naming patterns in separate branches. No plan prices or names were changed in this PR. Aligning these labels should be a separate copy-only change after confirming the canonical tier names.

## Rewards-copy correction

The Lucy chat source previously included copy claiming there were “no paid tier memberships,” contradicting the business rule. The PR replaces that sentence with accurate copy: Bronze is free; paid tiers can be purchased directly and tiers can also be earned through eligible lifetime spend. Public delivery prices are not changed.

## Not verified

- **UNVERIFIED:** live site asset versions/cache and which file is actually served to visitors.
- **UNVERIFIED:** runtime language event timing and visual translations.
- **UNVERIFIED:** real Pesapal/NCBA payment outcomes, duplicate-booking prevention, and quote-pending behavior.
