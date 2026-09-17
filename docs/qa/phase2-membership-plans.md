# Phase 2 — membership_plans Evidence

**Status: CLOSED**

## Schema

Verified columns:

- `code`
- `display_name`
- `min_lifetime_spend`
- `sort_order`
- `benefits`
- `created_at`
- `updated_at`
- `price_kes`

## Rows / prices

| Code | Display name | Price (KES) | Status |
|---|---|---:|---|
| `bronze` | Bronze | NULL | Free tier |
| `silver` | Silver | 5,000 | Verified |
| `gold` | Gold | 15,000 | Verified |
| `platinum` | Platinum | 35,000 | Verified |
| `vip` | VIP | 75,000 | Verified |

Tier codes and prices match the current purchase-tier display copy.

## Active flags

**N/A by schema design.** `membership_plans` has no `active` column. Existing rows are treated as active. Adding an `active` column during stabilization would violate the recovery contract and is deferred to a post-stabilization schema change.

## Duration gap

There is no duration column in `membership_plans`. The current one-year membership term is a business rule represented in copy.

Binding stabilization rule: checkout and Lucy must render the membership term from one shared named constant (for example `LUERI.membershipTermMonths = 12` in `lueri-common.js`), never from per-file literals.

A schema-level duration column is deferred to post-stabilization work.

## Gate decision

Phase 2 is **CLOSED** with the following record:

- Columns: verified
- Rows: verified
- Prices: verified
- Tier codes: verified
- Active flag: N/A and documented
- Duration gap: documented
- Shared duration constant rule: binding
