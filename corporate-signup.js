// corporate-signup.js
(function () {
  'use strict';

  const SUPABASE_URL = 'https://ylifvexqamxvwzvhmwex.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F';

  const WHATSAPP_NUMBER = '254713261719';
  const KRA_PIN_PATTERN = /^[A-Za-z]\d{9}[A-Za-z]$/;
  const PHONE_PATTERN = /^(?:\+254|0)7\d{8}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const form = document.getElementById('corporateForm');
  if (!form) return;

  const errorBox = document.getElementById('corporateError');

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
      plan: document.getElementById('plan'),
      address: document.getElementById('address'),
      contactName: document.getElementById('contactName'),
      jobTitle: document.getElementById('jobTitle'),
      contactPhone: document.getElementById('contactPhone'),
      contactEmail: document.getElementById('contactEmail'),
    };

    const data = {};
    Object.keys(fields).forEach((key) => { data[key] = fields[key].value.trim(); });

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
          showError(
            "We couldn't process this application. If your company already has an account with us, please contact us directly and we'll help you access it."
          );
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
          return;
        }
        dbOutcome = rpcResult;
      } catch (dbErr) {
        console.error('register_organization request failed (continuing to WhatsApp anyway):', dbErr);
      }

      const dbWarning = dbOutcome
        ? ''
        : '🚩 NOT YET SAVED TO DATABASE — register this applicant manually.\n\n';

      const message = dbWarning
        + 'New corporate account application - Lueri website\n'
        + `Company: ${escapeForWhatsApp(data.companyName)}\n`
        + 'KRA PIN: stored in the secure application record; do not request it over WhatsApp.\n'
        + `Preferred plan: ${data.plan || 'Help me choose'}\n`
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
      showError('Something went wrong submitting this. Please try again or WhatsApp us directly on 0713 261 719.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  window.closeSuccess = function closeSuccess() {
    document.getElementById('successOverlay').classList.remove('active');
    document.getElementById('successFallback').style.display = 'none';
    form.querySelector('#companyName')?.focus();
  };
})();

/* No migration needed — this form calls register_organization, an existing
   SECURITY DEFINER function that already validates and inserts safely. */
