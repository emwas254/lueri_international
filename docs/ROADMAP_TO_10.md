# Lueri roadmap: what "10/10" means (measurable)

Audit date: 14 Oct 2026. Scores were 4/10 AI adoption, 3/10 scalability.
Rule: a score only moves when its gate below is met with a number, not a feeling.

## AI adoption (4 -> 10)
| Gate | Evidence required | Status |
|---|---|---|
| Lucy turns WhatsApp/site enquiries into confirmed bookings | % of bookings that came via Lucy, tracked weekly | Not measured |
| Quote-in-seconds | Median time from enquiry to quote < 2 min | Not measured |
| Dispatch/receipt messages drafted by AI | Staff minutes saved per day logged | Not started |
| Social queue publishing (Make) | 5 posts/week live for 8 weeks | Built, running unverified |
| One verified payment path | Pesapal sandbox then live transaction recorded in `payments` | UNVERIFIED |
| Every AI feature has an owner metric | Orders, minutes saved or KES saved | Missing |

## Scalability (3 -> 10)
| Gate | Evidence required | Status |
|---|---|---|
| Every job class has a price above cost | Written cost per job class (rider, fuel, trolley, airtime) and a floor of cost + 40% | Missing |
| Actual charges match published rates | Spot-check 20 jobs: charged vs published | Gap suspected (jobs done at KES 100/200 vs published 350/400) |
| Repeat demand | 30+ repeat orders/week from 10+ accounts | Not reached |
| Founder-independent delivery | A second rider/dispatcher completes jobs without Evanson | Not reached |
| Licensing | CA courier licence or a documented compliant subcontract route | Not done |
| Security gates closed | `lookup_member` exposure, RLS verification, staff approval enforced server-side | Partly verified |

## Engineering debt worth clearing
- Two Lucy front-ends are live: `lucy-ui-v3.js` (via `lucy.js`) on index/careers, and `lucy-v3.js` on corporate/delivery-checkout. Pick one.
- i18n is layered over four files (`i18n-translations`, `i18n-completion`, `i18n-copy-patch`, `i18n-coverage-fix`). Consolidate into one dictionary per language.
- Public pricing lives in several places (index meta tag, i18n patches, Lucy facts, `price-floor.ts`). Move it to one source.
