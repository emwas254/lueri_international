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
// If you'd rather this be WhatsApp-only for now (no Supabase write), delete
// the registerOrganizationRpc call in the submit handler and keep
// everything else — the WhatsApp half works alone, and always runs
// regardless of what the database call does (see the submit handler).
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
  const SUPABASE_ANON_KEY = 'sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F'; // same anon key used by rewards-cloud.js and rewards-staff-cloud.js

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

  async function registerOrganizationRpc(payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      const error = new Error(`register_organization failed: ${res.status} ${bodyText}`);
      error.status = res.status;
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
      // 1. Durable record — register_organization validates required fields
      // server-side and rejects duplicate KRA PIN / company name atomically.
      // This is the same function the site already uses for organization
      // signups elsewhere, rather than writing to organizations/members
      // directly (which needs a matching RLS policy per table and can
      // leave an orphaned organization row if the second insert fails).
      let dbOutcome = null;
      try {
        const rpcResult = await registerOrganizationRpc({
          p_company_name: data.companyName,
          p_contact_person: data.contactName,
          p_role: data.jobTitle || null,
          p_phone: normalisePhone(data.contactPhone),
          p_email: data.contactEmail.toLowerCase(),
          p_kra_pin: data.kraPin.toUpperCase(),
          p_address: data.address,
          p_volume: data.volume,
        });
        if (!rpcResult.success) {
          // A real validation rejection (e.g. duplicate KRA PIN) — worth
          // surfacing to the applicant rather than silently continuing,
          // since it usually means they already have an account.
          showError(rpcResult.error);
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
          return;
        }
        dbOutcome = rpcResult;
      } catch (dbErr) {
        // Deliberately NOT re-thrown: whatever happens to the database
        // write, the lead must still reach you on WhatsApp. Logged so it's
        // visible in the browser console for debugging, never shown as a
        // blocking error to the applicant.
        console.error('register_organization request failed (continuing to WhatsApp anyway):', dbErr);
      }

      // 2. Immediate notification, same channel staff already work in.
      // This step always runs, regardless of what happened above.
      const message = 'New corporate account application - Lueri website\n'
        + `Company: ${escapeForWhatsApp(data.companyName)}\n`
        + `KRA PIN: ${data.kraPin.toUpperCase()}\n`
        + `Address: ${escapeForWhatsApp(data.address)}\n`
        + `Est. deliveries/week: ${data.volume}\n`
        + `Contact: ${escapeForWhatsApp(data.contactName)}${data.jobTitle ? ' (' + escapeForWhatsApp(data.jobTitle) + ')' : ''}\n`
        + `Phone: ${data.contactPhone}\n`
        + `Email: ${data.contactEmail}`
        + (dbOutcome ? '' : '\n[Note: not yet saved to the rewards database — register manually if needed.]');

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
      // Only reachable now if something in the WhatsApp/DOM step itself
      // throws — the database call above can no longer land here.
      console.error(err);
      showError('Something went wrong submitting this. Please try again or WhatsApp us directly on 0713 261 719.');
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
   No migration block needed here — this form now calls register_organization,
   an existing SECURITY DEFINER function that already validates required
   fields, checks for a duplicate KRA PIN / company name, and inserts safely
   without needing a public RLS INSERT policy on organizations or members.
   (An earlier version of this file assumed direct table inserts and
   included a migration to open a public INSERT policy for that — do not
   apply that anymore: it would let anyone insert arbitrary rows into these
   tables with no validation at all.)
------------------------------------------------------------------------------- */
