# Lueri International — Production Readiness

This document is the launch gate for the production application.

## 1. Repository

- [ ] Repository visibility is intentionally private.
- [ ] The main branch is protected.
- [ ] Production changes enter through pull requests.
- [ ] No secrets are present in current files or Git history.
- [ ] GitHub Actions use least-privilege permissions.
- [ ] CodeQL is passing.

## 2. Secrets

- [ ] Supabase service-role credentials exist only server-side.
- [ ] Pesapal secrets exist only in server-side secrets.
- [ ] OpenAI credentials exist only server-side.
- [ ] Resend credentials exist only server-side.
- [ ] Any previously exposed credential has been rotated.

## 3. Payments

- [ ] Pesapal production credentials are configured.
- [ ] Payment status is verified server-side.
- [ ] Expected amount is compared with the provider amount.
- [ ] Duplicate callbacks are idempotent.
- [ ] Failed or cancelled payments do not grant membership.
- [ ] Successful payments grant the correct product.
- [ ] Receipt delivery failure does not reverse a successful payment.

## 4. Supabase

- [ ] Row Level Security is enabled on every customer-facing table.
- [ ] Policies have been tested for anonymous and authenticated users.
- [ ] Service-role access is restricted to trusted server-side functions.
- [ ] Database backups are configured and a restore has been tested.
- [ ] Storage policies prevent unauthorized file access.

## 5. Frontend and UX

- [ ] Mobile layout tested.
- [ ] Desktop layout tested.
- [ ] English, Swahili, Chinese, French, Spanish, Arabic and Portuguese tested.
- [ ] Arabic RTL layout tested.
- [ ] Light and dark themes tested.
- [ ] Keyboard navigation tested.
- [ ] Forms have loading, success and error states.
- [ ] Booking to checkout to payment to confirmation tested end-to-end.

## 6. AI / Lucy

- [ ] Lucy cannot access raw credentials.
- [ ] AI actions are limited to explicit backend tools.
- [ ] Tool arguments are validated server-side.
- [ ] Customer content is treated as untrusted input.
- [ ] AI cannot directly mark payments successful or alter privileged records.

## 7. Operations

- [ ] Production error monitoring is enabled.
- [ ] Payment failures are observable.
- [ ] Email failures are observable.
- [ ] Analytics cover the booking and payment funnel.
- [ ] Incident and rollback procedures are documented.

## Launch rule

Do not launch while any critical security, payment, data-protection, or deployment control remains unchecked.
