# What changed, and in what order to deploy it

## Files
- `lueri-common.js` — replaces your current copy
- `corporate-signup.js` — replaces your current copy
- `rewards-cloud.js` — replaces your current copy
- `rewards.html` — replaces your current copy
- `rewards-staff.html` — replaces your current copy
- `rewards-staff-cloud.js` — replaces your current copy
- `supabase_migration_fixes.sql` — run in Supabase's SQL editor (NOT a client file)
- `rewards.js` — **delete this from the repo.** Confirmed dead: neither `rewards.html` nor `rewards-staff.html` loads it anymore. It's the old localStorage engine and keeping it around is just a source of confusion (and the exact SyntaxError risk we ruled out only by checking both pages by hand).

## Deploy in this order — the phone-format fix has a real dependency

1. **Back up your Supabase database.**
2. Run the **SELECT preview queries** at the top of `supabase_migration_fixes.sql`. Read the output. If anything looks like a landline, a typo, or a blank, stop and fix that row by hand first.
3. Run **Part 1** of the SQL (phone backfill) inside the transaction shown, check the sanity-check counts, then `commit`.
4. Deploy the three fixed JS files (`lueri-common.js`, `corporate-signup.js`, `rewards-cloud.js`) and `rewards.html` together. They all now write/read the canonical `254XXXXXXXXX` format, matching what step 3 just backfilled.
5. Open `pg_get_functiondef()` on your real `register_member` and `staff_add_transaction` functions, adapt **Part 2** of the SQL (`staff_register_member`) to match their actual logic — the version in the file is a structural template, not a copy of your real function.
6. Run the corrected Part 2 SQL.
7. Deploy `rewards-staff-cloud.js` and `rewards-staff.html` together (the JS now calls `staff_register_member`, which won't exist until step 6 is done).
8. Delete `rewards.js` from the repo.

Steps 4 and 7 each pair a client file with a server-side dependency — deploying the client half without its server half first will make member registration or staff registration start failing, so don't split those pairs across separate deploys.

## What each file fixes

**lueri-common.js** — phone normalization now returns `null` instead of silently guessing on malformed input; all helpers also exposed under `window.Lueri.*` without breaking any existing bare-name call; added `lueriOpenWhatsAppPending`/`lueriResolveWhatsApp` for pages that need to do async work before opening WhatsApp.

**corporate-signup.js** — phone normalization now defers to the site-wide canonical function instead of a local `+254...` reimplementation; duplicate-KRA-PIN rejection no longer confirms to an anonymous visitor that a specific company already exists; added a honeypot spam check (works only once you add a hidden `<input id="corpHoneypot">` field to `corporate.html` — see comment near the top of the file); the "not yet saved to database" flag now leads the WhatsApp message instead of trailing at the bottom.

**rewards-cloud.js** — phone format switched to canonical `254...`; the local phone helper is renamed so it can never silently overwrite `lueri-common.js`'s real `lueriNormalizePhone` if that script is ever added to `rewards.html`.

**rewards.html** — receipt popup now escapes every interpolated field; button click handlers are wired before the decorative tier-explainer code, so a future rendering bug there can't take the Join/Lookup buttons down with it again.

**rewards-staff.html** / **rewards-staff-cloud.js** — phone format aligned to canonical `254...`; invoice numbers use far more entropy to avoid same-day collisions; a fuzzy (name-only) member match now requires explicit staff confirmation before a transaction posts, instead of silently trusting a single search result; member registration now goes through an authenticated RPC so there's an audit trail of which staff member registered whom; the voucher panel is now visibly labeled as not backed by a real shared database; the stale "fix this in rewards.js" note on the invoice template now points at the right files.

## Still needs a business decision, not a code fix
The lifetime-spend-forever tier model (a VIP from years ago keeps 20% off forever even if they never order again) is working as designed post-migration — that's not a bug I fixed, it's a policy call worth revisiting on its own terms.
