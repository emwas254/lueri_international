# Repository hygiene findings and i18n consolidation proposal

## Public repository exposure inventory

This is a source-code review, not a claim that the public repository contains a leaked credential. Do not paste secret values into an issue or report.

| Status | File and line | Finding |
|---|---|---|
| CODE-VERIFIED | `index.html:17–18` | Public Supabase project URL appears in preconnect metadata; project URL is not a secret by itself. |
| CODE-VERIFIED | `rewards-cloud.js:11–12` | Public Supabase URL and publishable/anon client key are embedded in browser code. A publishable key is expected to be public; RLS and RPC grants must enforce security. |
| CODE-VERIFIED | `index.html:44–57` | Business phone/contact and business schema metadata are public. This is expected public contact information, not a secret. |
| CODE-VERIFIED | `index.html:261–275` | Business phone, email, operating hours and registration copy are included in public HTML. |
| CODE-VERIFIED | `corporate.html:604–650` | Corporate signup uses public-facing form and Supabase client integration; inspect server-side RPC controls rather than treating client code as authorization. |
| CODE-VERIFIED | `supabase/migrations/20260930003906_create_careers_recruitment_system.sql:24–35` | Recruitment schema describes applicant PII fields. Schema is metadata, but applicant rows must be protected by RLS and grants. |
| CODE-VERIFIED | `supabase/migrations/20260930004136_add_staff_careers_console_rpcs.sql:14–31` | Staff RPC workflow names and authorization structure are visible. Schema/function names are not credentials but reveal attack surface. |
| UNVERIFIED | Repository-wide | No claim is made that every historical commit, workflow log, issue, or all files are free of secrets. Existing automated obvious-secret scan is not an exhaustive audit. |

## Four-file i18n consolidation order (proposal only; do not execute as part of this PR)

1. **Freeze current behavior:** record script load order and create snapshots for all seven locales (en, sw, fr, es, ar, pt, zh), including RTL Arabic, dynamically inserted Lucy messages, form validation, pricing, checkout, and coverage zones.
2. **Create one canonical dictionary module:** one file/object per locale, with stable keys and no DOM mutation. Preserve every current translated string and fallback behavior exactly in the first pass.
3. **Move base translations from `i18n-translations.js` and `i18n-completion.js`:** compare key coverage and duplicate keys; fail tests on missing keys rather than silently falling back.
4. **Move overrides from `i18n-copy-patch.js`:** preserve the current deliberate English and Swahili wording and price values. Replace literal values with shared configuration only for simple labels; keep complete prose as localized strings until explicit templates and translation review are ready.
5. **Move zone labels from `i18n-coverage-fix.js` (and the duplicate coverage finalizer in `i18n-translations.js`):** keep one zone dictionary and one language-change subscription. Remove duplicate DOM observers only after regression tests pass.
6. **Switch consumers and compare snapshots:** test initial render, language switch in both directions, localStorage persistence, Arabic directionality/horizontal overflow, dynamic Lucy content, and booking/checkout flow.
7. **Delete legacy scripts in a separate PR:** only after all pages reference the canonical module and tests prove behavior parity.

## Non-goals

- No secret rotation, permission changes, production database calls, deployment, or public price changes.
- Do not remove a public contact detail merely because it is public; confirm business intent first.
