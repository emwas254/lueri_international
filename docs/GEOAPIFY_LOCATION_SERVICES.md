# Geoapify location services for Lueri

## Why this exists

Lueri's delivery payment function currently gets its authoritative KES price from the existing Supabase `get_delivery_price` RPC. This function adds address geocoding and road-route metrics without changing the existing pricing rules.

Flow:

`pickup/drop-off text → Geoapify geocoding → driving route → existing Lueri price RPC → quote`

Geoapify currently offers a free plan with 3,000 credits/day and says no credit card is required to start. Geocoding and routing are each metered in credits. Commercial use is permitted on the free plan subject to the provider's attribution/plan terms.

## Supabase secret

Create this Edge Function secret:

`GEOAPIFY_API_KEY`

Never put the key in `index.html`, public JavaScript, GitHub, or chat.

Example with the Supabase CLI:

```powershell
supabase secrets set GEOAPIFY_API_KEY=YOUR_KEY --project-ref <project-ref>
```

## Deploy

From the repository root:

```powershell
supabase functions deploy delivery-route-quote --project-ref <project-ref>
```

## Frontend call

The frontend should call the Edge Function rather than Geoapify directly. That keeps the provider key server-side.

Request:

```json
{
  "pickup": "Westlands, Nairobi",
  "dropoff": "Kilimani, Nairobi",
  "details": "Small parcel"
}
```

Response contains:

- `quote.amount_kes` — existing Lueri authoritative price
- `quote.distance_km`
- `quote.duration_minutes`
- resolved pickup/drop-off coordinates

## Important

The public OpenStreetMap Nominatim service is deliberately NOT used here. Its published policy has strict limits and specifically prohibits using the public service for applications whose primary function is package/vehicle tracking or geocoding resale. Geoapify is being used as the managed location-service layer instead.

## Production design

Keep the provider behind this Edge Function. If Geoapify is ever replaced, the website and Lucy should continue calling Lueri's `delivery-route-quote` endpoint rather than a provider directly.
