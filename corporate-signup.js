// corporate-signup.js
// -----------------------------------------------------------------------------
// Handles the corporate.html "Apply for an account" form.
//
// FIXED IN THIS PASS:
//  1. normalisePhone() no longer reimplements phone formatting locally —
//     it now defers to the site-wide window.lueriNormalizePhone (from
//     lueri-common.js) so this form's phone data matches the same
//     format the rest of the shared JS uses, instead of silently
//     storing a different shape (+254...) than everything else.
//  2. The server error shown to an applicant is now a generic message
//     instead of passing through the RPC's raw error text — the RPC's
//     specific "duplicate KRA PIN" wording let anyone probing the form
//     learn whether a given company already has a Lueri account, which
//     is competitive information (your client list) that shouldn't be
//     brute-force discoverable.
//  3. The "not yet saved to the rewards database" note now sits at the
//     TOP of the WhatsApp message, in caps with a flag emoji, instead of
//     buried at the bottom where it's easy for a busy staff member to
//     miss entirely.
//  4. A basic honeypot spam check: if a hidden field (see below) gets
//     filled in, the form pretends to succeed without actually calling
//     the RPC or opening WhatsApp — bots that blindly fill every field
//     get silently defeated instead of spamming your WhatsApp.
//
//     REQUIRES a new hidden field in corporate.html's #corporateForm,
//     anywhere inside the form tag:
//       <input type="text" name="website" id="corpHoneypot"
//              autocomplete="off" tabindex="-1"
//              style="position:absolute;left:-9999px;width:1px;height:1px;"
//              aria-hidden="true">
//     A real visitor never sees or fills this field. If it's missing
//     from the page, this file still works fine — the check just never
//     triggers.
//
// Everything else below is unchanged from the previous version — same
// design (WhatsApp notification always fires; a database failure never
// blocks it), same validation, same accessibility handling.
//
// SECURITY: SUPABASE_ANON_KEY must be the *anon* / publishable key — never
// the service_role key. The anon key is safe to ship to browsers ONLY
// because Row Level Security policies restrict what it can do. Before this
// goes live, confirm in Supabase that the anon role has an INSERT-only
// policy on `organizations` and `members` (see migration block at bottom) —
// otherwise every submission will fail silently with a permissions error.
//
// REQUIRES (expected to already be loaded site-wide via lueri-common.js):
//   window.lueriNormalizePhone(phone) -> string | null
//   window.lueriIsValidPhone(phone) -> boolean
//   window.lueriOpenWhatsApp(number, message) -> { opened: boolean, url: string }
// If any is missing (script failed to load, or renamed), this file falls
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

  // FIX: use the site-wide canonical normalizer (254XXXXXXXXX, no plus)
  // instead of the old local +254XXXXXXXXX version, so phone numbers
  // written by this form match the format the rest of the site uses.
  // Falls back to a locally-equivalent canonical format only if
  // lueri-common.js genuinely isn't loaded.
  const normalisePhone = typeof window.lueriNormalizePhone === 'function'
    ? window.lueriNormalizePhone
    : (raw) => {
        const trimmed = String(raw || '').trim().replace(/[^\d]/g, '');
        if (trimmed.startsWith('254') && trimmed.length === 12) return trimmed;
        if (trimmed.startsWith('0') && trimmed.length === 10) return '254' + trimmed.slice(1);
        return trimmed;
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

    // Honeypot: a real visitor never fills this hidden field. A bot that
    // blindly fills every input on the page will. If it's filled, pretend
    // to succeed and stop — no RPC call, no WhatsApp message, no signal
    // to the bot that anything was rejected.
    const honeypot = document.getElementById('corpHoneypot');
    if (honeypot && honeypot.value.trim() !== '') {
      const overlay = document.getElementById('successOverlay');
      if (overlay) {
        document.getElementById('successTitle').textContent = 'Application received';
        document.getElementById('successCopy').textContent = 'Our team will review and activate your account within one working day.';
        const fallback = document.getElementById('successFallback');
        if (fallback) fallback.style.display = 'none';
        overlay.classList.add('active');
      }
      return;
    }

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
          // FIX: generic message instead of passing through rpcResult.error
          // verbatim. The specific wording ("duplicate KRA PIN") let anyone
          // probing the form learn whether a given company is already a
          // Lueri client — that's not information this form should confirm
          // to an anonymous visitor.
          showError(
            "We couldn't process this application. If your company already has an account with us, please contact us directly and we'll help you access it."
          );
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
      // FIX: the "not saved to database" flag now leads the message in
      // caps with an emoji, instead of trailing at the bottom where it's
      // easy to miss in a wall of WhatsApp text.
      const dbWarning = dbOutcome
        ? ''
        : '🚩 NOT YET SAVED TO DATABASE — register this applicant manually.\n\n';

      const message = dbWarning
        + 'New corporate account application - Lueri website\n'
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
