# Wiring Pesapal into Lueri Rewards — setup steps

## 0. Before you touch production
Do this entire flow in **sandbox** first, regardless of which keys you were issued.
Pesapal sandbox base URL: `https://cybqa.pesapal.com/pesapalv3/api`
Pesapal live base URL: `https://pay.pesapal.com/v3/api`
Get separate sandbox test credentials free from developer.pesapal.com if the keys you
have are marked "live" — do not test real money flows against production on day one.

## 1. Two things I can't safely guess for you
- **`payments` table columns.** I wrote the function against a plausible shape
  (order_tracking_id, merchant_reference, phone_number, email, full_name, amount,
  plan_code, status, payment_method, confirmation_code, raw_response jsonb,
  updated_at). Your real `payments` table already exists from Phase 1 migrations —
  confirm/adjust columns against it before deploying, the same way the
  rewards.js/rewards-cloud.js phone-format mismatch bit you before.
- **`apply_membership_payment` RPC.** This needs to be a new SECURITY DEFINER
  function that takes a successful payment and upgrades the member's tier /
  writes a rewards_transactions row, following the same lifetime-spend model as
  `register_member`. I have not written it because I don't have your live
  `members`/`memberships` schema in front of me — say the word and I'll pull it
  via the Supabase tools and write the RPC to match exactly, rather than guess
  and risk another cross-file mismatch.

## 2. Set secrets (Supabase CLI, or dashboard → Project Settings → Edge Functions)
```bash
supabase secrets set PESAPAL_CONSUMER_KEY=your_consumer_key
supabase secrets set PESAPAL_CONSUMER_SECRET=your_consumer_secret
supabase secrets set PESAPAL_ENV=sandbox
supabase secrets set SITE_URL=https://lueriinternational.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 3. Deploy the two functions
```bash
supabase functions deploy pesapal-ipn
supabase functions deploy pesapal-initiate
```

## 4. Register your IPN URL — ONE TIME ONLY per environment
Get a token first, then register. Do this once for sandbox, once for live —
each returns a different `ipn_id`.
```bash
curl -X POST https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"consumer_key":"YOUR_KEY","consumer_secret":"YOUR_SECRET"}'
# copy the "token" from the response, then:

curl -X POST https://cybqa.pesapal.com/pesapalv3/api/URLSetup/RegisterIPN \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url":"https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/pesapal-ipn","ipn_notification_type":"GET"}'
# copy the "ipn_id" from the response, then:

supabase secrets set PESAPAL_IPN_ID=the_ipn_id_you_got_back
```

## 5. Test the full loop in sandbox
Pesapal publishes sandbox test card/M-Pesa numbers on developer.pesapal.com —
use those, complete a checkout, confirm the `payments` row flips to COMPLETED
and (once the RPC exists) the member's tier actually updates.

## 6. Go live
Repeat steps 2 and 4 with `PESAPAL_ENV=live` and your live consumer key/secret
and live IPN registration — this gives a different `ipn_id`. Update the secret.
Nothing else in the code changes.
