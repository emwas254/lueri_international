# Payment flow update — 2026-09-16

## Completed

- Extended the deployed `pesapal-initiate` Edge Function to support both individual `member_id` and corporate `organization_id` orders.
- Corporate Pesapal amounts are read from `business_plans.price_kes`; the browser cannot supply the amount.
- Corporate Pesapal payments create `payments.organization_id` records with `payment_method = 'pesapal'` and a unique merchant reference.
- Corporate Pesapal callbacks return to `corporate.html?payment=complete`.
- Existing `pesapal-ipn` already detects organization payments and calls `apply_organization_membership_payment()` after server-side status and amount verification.
- Rewards checkout no longer crashes when `register_member()` returns its duplicate-phone error shape. It now reuses the existing member through `lookup_member()` and then sends the customer directly to Pesapal for online payment.
- Corporate paid plans now default to Pesapal. WhatsApp remains for Enterprise/custom assistance rather than being the payment path for paid public plans.
- Cheque remains a manual verification instrument. It is not represented as a bank-transfer mechanism and never activates membership until staff clears it.

## Bank transfer / bank account

A cheque cannot be technically linked to a bank account through the website. A separate **Bank Transfer** method can be added, but the exact receiving bank name, account name, account number, branch and any required reference must be supplied and verified before publishing them. No bank details are invented in this change.

Pesapal's current business Payments Page also advertises bank-transfer support, subject to the merchant account/payment configuration.

## Validation status

- GitHub source changes committed to `main`.
- `pesapal-initiate` deployed successfully as an active Edge Function version.
- No real payment was performed.
- Browser/mobile runtime testing remains required.
