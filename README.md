# Lueri International

Lueri International is a Nairobi-based last-mile delivery and courier platform.

## Production stack

- Frontend: HTML, CSS and JavaScript
- Hosting/deployment: GitHub Pages and custom domain
- Backend: Supabase
- Database: PostgreSQL via Supabase
- Server-side logic: Supabase Edge Functions
- Payments: Pesapal
- Transactional email: Resend
- AI assistant: Lucy
- Source control: GitHub

## Core customer journeys

1. Discover Lueri services.
2. Request a delivery or pickup.
3. Receive pricing and complete checkout.
4. Complete payment.
5. Receive confirmation.
6. Track or manage the delivery.

Corporate customers have a separate organization and membership workflow.

## Internationalisation

The site supports English, Swahili, Chinese, French, Spanish, Arabic and Portuguese, including RTL considerations for Arabic.

## Security principles

- Never place privileged credentials in browser code.
- Verify payment status server-side.
- Compare provider payment amounts with the expected transaction amount.
- Make payment callbacks idempotent.
- Enforce authorization and Row Level Security at the database layer.
- Treat AI input and uploaded customer content as untrusted.
- Use pull requests and automated checks before production changes.

## Development

This repository contains production web application source code. Local development should keep secrets in environment variables or secret-management systems and never commit them.

## Production readiness

See docs/PRODUCTION_READINESS.md for the launch checklist.

## Security reporting

See SECURITY.md for vulnerability reporting guidance.
