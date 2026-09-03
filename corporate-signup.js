// corporate-signup.js
// -----------------------------------------------------------------------------
// Handles the corporate.html "Apply for an account" form.
//
// Design decision, worth stating plainly: this does BOTH of the two things
// the rest of the site already does separately —
//   1. Like bookingForm on index.html: opens WhatsApp with a summary message,
//      so staff see the application immediately, the same way you already
//      work (transactions are logged manually via WhatsApp reports today).
//   2. Like rewards.html: writes a durable record to Supabase, so the
//      application isn't ONLY a WhatsApp message that scrolls away — it
//      lands in `organizations` + `members` where the staff console (or a
//      future admin view) can find it and convert it into an active account.
//
// If you'd rather this be WhatsApp-only for now (no Supabase write) until
// the migration below is applied, delete the two "supabaseInsert" calls in
// the submit handler and keep everything else — the WhatsApp half works alone.
//
// SECURITY: SUPABASE_ANON_KEY must be the *anon* / publishable key — never
// the service_role key. The anon key is safe to ship to browsers ONLY
// because Row Level Security policies restrict what it can do. Before this
// goes live, confirm in Supabase that the anon role has an INSERT-only
// policy on `organizations` and `members` (see migration block at bottom) —
// otherwise every submission will fail silently with a permissions error.
//
// REQUIRES (expected to already be loaded site-wide via lueri-common.js):
//   lueriIsValidPhone(phone) -> boolean
//   lueriOpenWhatsApp(number, message) -> { opened: boolean, url: string }
// If either is missing (script failed to load, or renamed), this file falls
// back to an inline equivalent below rather than silently breaking the form.
//
// ASSUMPTIONS TO VERIFY AGAINST YOUR LIVE SUPABASE SCHEMA:
//   organizations: id, name, contact_email, deleted_at        <- confirmed
//     + kra_pin, phone, address, volume_estimate               <- NOT confirmed
//   members: id, full_name, phone, email, organization_id      <- confirmed
//     + job_title, role                                        <- NOT confirmed
//   Migration SQL for the unconfirmed columns is at the bottom of this file.
// -----------------------------------------------------------------------------

(function () {
  'use strict';

  const SUPABASE_URL = 'https://ylifvexqamxvwzvhmwex.supabase.co';
  const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_ANON_KEY'; // the anon key, same one rewards-cloud.js uses — never the service_role key

  const WHATSAPP_NUMBER = '254713261719';
  const KRA_PIN_PATTERN = /^[A-Za-z]\d{9}[A-Za-z]$/;
  const PHONE_PATTERN = /^(?:\+254|0)7\d{8}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const form = document.getElementById('corporateForm');
  if (!form) return; // page markup changed or script loaded on the wrong page — fail quiet, not loud

  const errorBox = document.getElementById('corporateError');

  // Fallbacks in case lueri-common.js didn't load or was renamed — the form
  // should degrade gracefully, not silently stop working.
  const isValidPhone = typeof window.lueriIsValidPhone === 'function'
    ? window.lueriIsValidPhone
    : (phone) => PHONE_PATTERN.test(String(phone || '').trim());

  const openWhatsApp = typeof window.lueriOpenWhatsApp === 'function'
    ? window.lueriOpenWhatsApp
    : (number, message) => {
        const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        return { opened: !!win, url };
      };

  function setFieldError(el, hasError) {
    el.classList.toggle('invalid', hasError);
    if (hasError) {
      el.setAttribute('aria-invalid', 'true');
    } else {
      el.removeAttribute('aria-invalid');
    }
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }

  function hideError() {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }

  function normalisePhone(raw) {
    const trimmed = raw.trim();
    return trimmed.startsWith('0') ? `+254${trimmed.slice(1)}` : trimmed;
  }

  function escapeForWhatsApp(text) {
    // WhatsApp deep links are plain text, not HTML — no escaping needed for
    // injection purposes, but strip newlines a user might paste into a
    // single-line field so the message template doesn't break formatting.
    return String(text).replace(/[\r\n]+/g, ' ').trim();
  }

  async function supabaseInsert(table, payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      const error = new Error(`${table} insert failed: ${res.status} ${bodyText}`);
      error.status = res.status;
      error.body = bodyText;
      throw error;
    }
    return res.json();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();

    const fields = {
      companyName: document.getElementById('companyName'),
      kraPin: document.getElementById('kraPin'),
      volume: document.getElementById('volume'),
      address: document.getElementById('address'),
      contactName: document.getElementById('contactName'),
      jobTitle: document.getElementById('jobTitle'),
      contactPhone: document.getElementById('contactPhone'),
      contactEmail: document.getElementById('contactEmail'),
    };

    const data = {};
    Object.keys(fields).forEach((key) => { data[key] = fields[key].value.trim(); });

    // Explicit per-field checks (no ||= — kept compatible with older mobile
    // browsers rather than relying on a 2021-era operator).
    const invalid = {
      companyName: data.companyName.length < 2,
      kraPin: !KRA_PIN_PATTERN.test(data.kraPin),
      address: data.address.length < 4,
      contactName: data.contactName.length < 2,
      contactPhone: !isValidPhone(data.contactPhone),
      contactEmail: !EMAIL_PATTERN.test(data.contactEmail),
      volume: data.volume === '',
    };

    const labels = {
      companyName: 'Company Name',
      kraPin: 'KRA PIN',
      address: 'Billing / Physical Address',
      contactName: 'Contact Person',
      contactPhone: 'Phone Number',
      contactEmail: 'Company Email',
      volume: 'Est. Deliveries / Week',
    };

    let hasError = false;
    const invalidLabels = [];
    Object.keys(invalid).forEach((key) => {
      setFieldError(fields[key], invalid[key]);
      if (invalid[key]) {
        hasError = true;
        invalidLabels.push(labels[key]);
      }
    });

    if (hasError) {
      const list = invalidLabels.length <= 2
        ? invalidLabels.join(' and ')
        : `${invalidLabels.slice(0, -1).join(', ')}, and ${invalidLabels[invalidLabels.length - 1]}`;
      showError(`Please check: ${list}.`);
      fields[Object.keys(invalid).find((key) => invalid[key])].focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Submitting…';

    try {
      // 1. Durable record: organization + linked contact.
      const orgResult = await supabaseInsert('organizations', {
        name: data.companyName,
        kra_pin: data.kraPin.toUpperCase(),
        contact_email: data.contactEmail.toLowerCase(),
        phone: normalisePhone(data.contactPhone),
        address: data.address,
        volume_estimate: data.volume,
      });
      const org = Array.isArray(orgResult) ? orgResult[0] : orgResult;

      await supabaseInsert('members', {
        full_name: data.contactName,
        job_title: data.jobTitle || null,
        phone: normalisePhone(data.contactPhone),
        email: data.contactEmail.toLowerCase(),
        organization_id: org.id,
        role: 'org_contact',
      });

      // 2. Immediate notification, same channel staff already work in.
      const message = 'New corporate account application - Lueri website\n'
        + `Company: ${escapeForWhatsApp(data.companyName)}\n`
        + `KRA PIN: ${data.kraPin.toUpperCase()}\n`
        + `Address: ${escapeForWhatsApp(data.address)}\n`
        + `Est. deliveries/week: ${data.volume}\n`
        + `Contact: ${escapeForWhatsApp(data.contactName)}${data.jobTitle ? ' (' + escapeForWhatsApp(data.jobTitle) + ')' : ''}\n`
        + `Phone: ${data.contactPhone}\n`
        + `Email: ${data.contactEmail}`;

      const result = openWhatsApp(WHATSAPP_NUMBER, message);

      document.getElementById('successTitle').textContent = result.opened ? 'Opening WhatsApp' : 'WhatsApp did not open';
      document.getElementById('successCopy').textContent = result.opened
        ? 'Confirm the message in WhatsApp — our team will review and activate your account within one working day.'
        : 'Your browser blocked the popup. Tap the button below to open WhatsApp.';
      const fallback = document.getElementById('successFallback');
      document.getElementById('successWaLink').href = result.url;
      fallback.style.display = result.opened ? 'none' : 'block';
      const overlay = document.getElementById('successOverlay');
      overlay.classList.add('active');
      overlay.querySelector('button.btn')?.focus();

      if (result.opened) setTimeout(() => form.reset(), 1500);
    } catch (err) {
      console.error(err);
      if (err && err.status === 409) {
        showError('An account with this KRA PIN may already exist. WhatsApp us on 0713 261 719 and we\'ll check for you.');
      } else if (err && err.status === 401) {
        showError('This form isn\'t connected yet (missing or invalid API key) — please WhatsApp us on 0713 261 719 instead.');
      } else {
        showError('Something went wrong submitting this. Please try again or WhatsApp us directly on 0713 261 719.');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  // Close the success overlay, restoring focus for keyboard users.
  window.closeSuccess = function closeSuccess() {
    document.getElementById('successOverlay').classList.remove('active');
    document.getElementById('successFallback').style.display = 'none';
    form.querySelector('#companyName')?.focus();
  };
})();

/* -----------------------------------------------------------------------------
   MIGRATION — run against Supabase if these columns / policies don't already
   exist. Safe to run twice (IF NOT EXISTS guards).

   ALTER TABLE organizations
     ADD COLUMN IF NOT EXISTS kra_pin text,
     ADD COLUMN IF NOT EXISTS phone text,
     ADD COLUMN IF NOT EXISTS address text,
     ADD COLUMN IF NOT EXISTS volume_estimate text;

   ALTER TABLE members
     ADD COLUMN IF NOT EXISTS job_title text,
     ADD COLUMN IF NOT EXISTS role text DEFAULT 'individual';

   -- Prevents duplicate organization rows if the same company submits twice.
   -- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so this checks first.
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'organizations_kra_pin_unique'
     ) THEN
       ALTER TABLE organizations ADD CONSTRAINT organizations_kra_pin_unique UNIQUE (kra_pin);
     END IF;
   END $$;

   -- CRITICAL: without this, the public form's anon-key inserts will be
   -- rejected by Row Level Security, since your existing policies were
   -- built around authenticated staff/customer roles, not anonymous public
   -- submissions. This policy allows ONLY inserts, from anyone, on these
   -- two tables — it does not grant read access.
   -- Postgres has no "CREATE POLICY IF NOT EXISTS", so drop-then-create
   -- is the idempotent pattern (safe to run this block twice).
   DROP POLICY IF EXISTS "Public can submit corporate applications" ON organizations;
   CREATE POLICY "Public can submit corporate applications"
     ON organizations FOR INSERT
     TO anon
     WITH CHECK (true);

   DROP POLICY IF EXISTS "Public can submit corporate contacts" ON members;
   CREATE POLICY "Public can submit corporate contacts"
     ON members FOR INSERT
     TO anon
     WITH CHECK (true);
------------------------------------------------------------------------------- */
