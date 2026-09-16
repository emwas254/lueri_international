// corporate-signup.js
(function () {
  'use strict';

  const WHATSAPP_NUMBER = (window.LUERI && window.LUERI.whatsapp) || '254713261719';
  const KRA_PIN_PATTERN = /^[A-Za-z]\d{9}[A-Za-z]$/;
  const PHONE_PATTERN = /^(?:\+254|0)(7|1)\d{8}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CORPORATE_PLAN_CODES = ['biz_gold', 'biz_platinum', 'biz_vip'];

  const form = document.getElementById('corporateForm');
  if (!form) return;
  const errorBox = document.getElementById('corporateError');

  const isValidPhone = typeof window.lueriIsValidPhone === 'function' ? window.lueriIsValidPhone : (phone) => PHONE_PATTERN.test(String(phone || '').trim());
  const openWhatsApp = typeof window.lueriOpenWhatsApp === 'function' ? window.lueriOpenWhatsApp : (number, message) => {
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return { opened: !!win, url };
  };
  const normalisePhone = typeof window.lueriNormalizePhone === 'function' ? window.lueriNormalizePhone : (raw) => {
    const trimmed = String(raw || '').trim().replace(/[^\d]/g, '');
    if (trimmed.startsWith('254') && trimmed.length === 12) return trimmed;
    if (trimmed.startsWith('0') && trimmed.length === 10) return '254' + trimmed.slice(1);
    return trimmed;
  };

  function setFieldError(el, hasError) {
    if (!el) return;
    el.classList.toggle('invalid', hasError);
    if (hasError) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function showError(message) { errorBox.textContent = message; errorBox.style.display = 'block'; }
  function hideError() { errorBox.style.display = 'none'; errorBox.textContent = ''; }
  function escapeForWhatsApp(text) { return String(text).replace(/[\r\n]+/g, ' ').trim(); }
  function supabaseClient() { return window.lueri && typeof window.lueri.supabase === 'function' ? window.lueri.supabase() : null; }
  async function registerOrganizationRpc(payload) {
    if (!window.lueri || typeof window.lueri.rpc !== 'function') throw new Error('lueri-common.js not loaded — cannot reach the server.');
    return window.lueri.rpc('register_organization', payload);
  }

  function ensureChequeFields() {
    if (document.getElementById('corporatePaymentMethod')) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    const wrap = document.createElement('div');
    wrap.id = 'corporatePaymentMethod';
    wrap.style.cssText = 'margin:20px 0;padding:16px;border:1px solid var(--line, rgba(27,38,32,.16));border-radius:4px;background:rgba(255,255,255,.04);';
    wrap.innerHTML = `
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label" for="corpPaymentMethod">Payment method</label>
        <select class="input-light" id="corpPaymentMethod" name="payment_method">
          <option value="whatsapp">Continue with WhatsApp</option>
          <option value="cheque">Pay by cheque</option>
        </select>
        <p style="margin:6px 0 0;font-size:.78rem;opacity:.7;">Cheque is available for Essential, Professional and Elite plans. The amount is determined by the server.</p>
      </div>
      <div id="corporateChequeFields" style="display:none;">
        <div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label" for="corpChequeNumber">Cheque number</label><input class="input-light" type="text" id="corpChequeNumber" maxlength="64" autocomplete="off"></div>
          <div class="form-group"><label class="form-label" for="corpChequeBank">Bank</label><input class="input-light" type="text" id="corpChequeBank" maxlength="120" autocomplete="organization"></div>
        </div>
        <div class="form-group"><label class="form-label" for="corpChequeDate">Cheque date</label><input class="input-light" type="date" id="corpChequeDate"></div>
        <div class="form-group"><label class="form-label" for="corpChequeNotes">Notes (optional)</label><textarea class="input-light" id="corpChequeNotes" maxlength="1000" rows="3" placeholder="Optional reference or note for our verification team"></textarea></div>
        <div id="corporateChequeAuthNotice" style="font-size:.8rem;line-height:1.5;opacity:.78;">After submitting, Lueri will send a secure verification link to the company email above. Open it on this device to complete cheque submission. No cheque activates the account until a Lueri staff member verifies it.</div>
      </div>`;
    form.insertBefore(wrap, submitBtn);
    const date = document.getElementById('corpChequeDate');
    if (date) date.max = new Date().toISOString().slice(0, 10);
    const method = document.getElementById('corpPaymentMethod');
    const chequeFields = document.getElementById('corporateChequeFields');
    const plan = document.getElementById('plan');
    function syncChequeVisibility() {
      const supported = plan && CORPORATE_PLAN_CODES.includes(plan.value);
      const isCheque = method && method.value === 'cheque';
      if (!supported && method) { method.value = 'whatsapp'; method.querySelector('option[value="cheque"]')?.setAttribute('disabled', 'disabled'); }
      else if (supported && method) method.querySelector('option[value="cheque"]')?.removeAttribute('disabled');
      if (chequeFields) chequeFields.style.display = supported && isCheque ? 'block' : 'none';
    }
    method.addEventListener('change', syncChequeVisibility);
    plan?.addEventListener('change', syncChequeVisibility);
    syncChequeVisibility();
  }

  function getChequeData() {
    return {
      number: document.getElementById('corpChequeNumber')?.value.trim() || '',
      bank: document.getElementById('corpChequeBank')?.value.trim() || '',
      date: document.getElementById('corpChequeDate')?.value || '',
      notes: document.getElementById('corpChequeNotes')?.value.trim() || '',
    };
  }
  function getPaymentMethod() { return document.getElementById('corpPaymentMethod')?.value || 'whatsapp'; }
  const pendingStateKey = () => 'lueri_corporate_cheque_pending_v1';
  function saveChequePendingState(state) { sessionStorage.setItem(pendingStateKey(), JSON.stringify(state)); }
  function readChequePendingState() { try { return JSON.parse(sessionStorage.getItem(pendingStateKey()) || 'null'); } catch (_) { return null; } }
  function clearChequePendingState() { sessionStorage.removeItem(pendingStateKey()); }

  async function submitCorporateCheque(state) {
    const sb = supabaseClient();
    if (!sb) throw new Error('Secure payment service is unavailable. Please reload and try again.');
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult?.data?.session;
    const authEmail = session?.user?.email?.trim().toLowerCase() || '';
    const expectedEmail = String(state.email || '').trim().toLowerCase();
    if (!session || !authEmail || authEmail !== expectedEmail) throw new Error('The secure company-email verification session is missing or uses a different email address.');
    const result = await window.lueri.rpc('submit_organization_cheque_payment', {
      p_organization_id: state.organizationId,
      p_plan_code: state.planCode,
      p_cheque_number: state.cheque.number,
      p_cheque_bank: state.cheque.bank,
      p_cheque_date: state.cheque.date,
      p_cheque_notes: state.cheque.notes || null,
    });
    if (!result || !result.success) {
      const errors = {
        authentication_required: 'Please open the verification link from your company email and try again.',
        authenticated_email_required: 'Your company email could not be verified. Please restart the verification process.',
        organization_access_denied: 'The verified email does not match the registered corporate account.',
        unknown_organization: 'The corporate application could not be found. Please contact Lueri support.',
        organization_plan_mismatch: 'The selected plan no longer matches the registered corporate account.',
        invalid_business_plan: 'This corporate plan is not available for cheque payment.',
        invalid_cheque_number: 'Please enter a valid cheque number.',
        invalid_cheque_bank: 'Please enter the bank name.',
        cheque_date_required: 'Please enter the cheque date.',
        cheque_date_in_future: 'The cheque date cannot be in the future.',
      };
      throw new Error(errors[result?.error] || 'We could not submit the cheque details. Please try again.');
    }
    clearChequePendingState();
    return result;
  }

  async function startEmailVerification(state) {
    const sb = supabaseClient();
    if (!sb) throw new Error('Secure payment service is unavailable. Please reload and try again.');
    const current = await sb.auth.getSession();
    const currentEmail = current?.data?.session?.user?.email?.trim().toLowerCase() || '';
    if (currentEmail === state.email.toLowerCase()) return submitCorporateCheque(state);
    if (currentEmail && currentEmail !== state.email.toLowerCase()) throw new Error('A different account is already signed in. Sign out of that account, then submit the corporate cheque again using the company email.');
    const otp = await sb.auth.signInWithOtp({ email: state.email, options: { shouldCreateUser: true, emailRedirectTo: window.location.href } });
    if (otp.error) throw new Error('We could not send the secure verification email. Please try again or contact Lueri support.');
    return null;
  }

  async function resumePendingCheque() {
    const state = readChequePendingState();
    if (!state) return;
    const sb = supabaseClient();
    if (!sb) return;
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult?.data?.session;
    const email = session?.user?.email?.trim().toLowerCase() || '';
    if (!session || email !== String(state.email || '').trim().toLowerCase()) return;
    try {
      const result = await submitCorporateCheque(state);
      showPendingSuccess(result, true);
    } catch (err) { console.error('Corporate cheque resume failed:', err); showError(err.message || 'We could not complete the cheque submission.'); }
  }

  function showPendingSuccess(result, resumed) {
    const overlay = document.getElementById('successOverlay');
    if (!overlay) return;
    const ref = result.internal_reference || 'pending verification';
    const amount = result.amount != null ? `KES ${Number(result.amount).toLocaleString()}` : '';
    document.getElementById('successTitle').textContent = 'Cheque submitted for verification';
    document.getElementById('successCopy').textContent = `${amount ? amount + ' · ' : ''}${result.plan_display_name || 'Corporate membership'} is pending staff verification. Reference: ${ref}. ${resumed ? 'Your secure email verification is complete.' : ''}`;
    const fallback = document.getElementById('successFallback');
    if (fallback) fallback.style.display = 'none';
    overlay.classList.add('active');
  }

  ensureChequeFields();
  resumePendingCheque().catch((err) => console.error('Cheque resume check failed:', err));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();
    const honeypot = document.getElementById('corpHoneypot');
    if (honeypot && honeypot.value.trim() !== '') {
      const overlay = document.getElementById('successOverlay');
      if (overlay) { document.getElementById('successTitle').textContent = 'Application received'; document.getElementById('successCopy').textContent = 'Our team will review and activate your account within one working day.'; const fallback = document.getElementById('successFallback'); if (fallback) fallback.style.display = 'none'; overlay.classList.add('active'); }
      return;
    }

    const fields = {
      companyName: document.getElementById('companyName'), kraPin: document.getElementById('kraPin'), volume: document.getElementById('volume'), plan: document.getElementById('plan'),
      address: document.getElementById('address'), contactName: document.getElementById('contactName'), jobTitle: document.getElementById('jobTitle'), contactPhone: document.getElementById('contactPhone'), contactEmail: document.getElementById('contactEmail'),
    };
    const data = {}; Object.keys(fields).forEach((key) => { data[key] = fields[key].value.trim(); });
    const invalid = {
      companyName: data.companyName.length < 2, plan: data.plan === '', kraPin: !KRA_PIN_PATTERN.test(data.kraPin), address: data.address.length < 4,
      contactName: data.contactName.length < 2, contactPhone: !isValidPhone(data.contactPhone), contactEmail: !EMAIL_PATTERN.test(data.contactEmail), volume: data.volume === '',
    };
    const labels = { companyName: 'Company Name', plan: 'Preferred Plan', kraPin: 'KRA PIN', address: 'Billing / Physical Address', contactName: 'Contact Person', contactPhone: 'Phone Number', contactEmail: 'Company Email', volume: 'Est. Deliveries / Week' };
    const rpcPlanCode = CORPORATE_PLAN_CODES.includes(data.plan) ? data.plan : null;
    const paymentMethod = getPaymentMethod();
    const cheque = getChequeData();

    if (paymentMethod === 'cheque' && !rpcPlanCode) { showError('Cheque payment is available for Essential, Professional and Elite only. Please select one of those plans or continue with WhatsApp for Enterprise.'); return; }
    if (paymentMethod === 'cheque') {
      invalid.chequeNumber = cheque.number.length < 3 || cheque.number.length > 64;
      invalid.chequeBank = cheque.bank.length < 2 || cheque.bank.length > 120;
      invalid.chequeDate = !/^\d{4}-\d{2}-\d{2}$/.test(cheque.date) || cheque.date > new Date().toISOString().slice(0, 10);
      labels.chequeNumber = 'Cheque Number'; labels.chequeBank = 'Cheque Bank'; labels.chequeDate = 'Cheque Date';
    }

    let hasError = false; const invalidLabels = [];
    Object.keys(invalid).forEach((key) => {
      const target = fields[key] || document.getElementById({ chequeNumber: 'corpChequeNumber', chequeBank: 'corpChequeBank', chequeDate: 'corpChequeDate' }[key]);
      setFieldError(target, invalid[key]); if (invalid[key]) { hasError = true; invalidLabels.push(labels[key]); }
    });
    if (hasError) {
      const list = invalidLabels.length <= 2 ? invalidLabels.join(' and ') : `${invalidLabels.slice(0, -1).join(', ')}, and ${invalidLabels[invalidLabels.length - 1]}`;
      showError(`Please check: ${list}.`);
      const firstInvalid = Object.keys(invalid).find((key) => invalid[key]);
      (fields[firstInvalid] || document.getElementById({ chequeNumber: 'corpChequeNumber', chequeBank: 'corpChequeBank', chequeDate: 'corpChequeDate' }[firstInvalid]))?.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]'); submitBtn.disabled = true; const originalLabel = submitBtn.textContent; submitBtn.textContent = paymentMethod === 'cheque' ? 'Securing cheque submission…' : 'Submitting…';
    try {
      let dbOutcome;
      try {
        const rpcResult = await registerOrganizationRpc({ p_company_name: data.companyName, p_contact_person: data.contactName, p_role: data.jobTitle || null, p_phone: normalisePhone(data.contactPhone), p_email: data.contactEmail.toLowerCase(), p_kra_pin: data.kraPin.toUpperCase(), p_address: data.address, p_volume: data.volume, p_plan_code: rpcPlanCode });
        if (!rpcResult || !rpcResult.success) { showError("We couldn't process this application. If your company already has an account with us, please contact us directly and we'll help you access it."); return; }
        dbOutcome = rpcResult;
      } catch (dbErr) { console.error('register_organization request failed:', dbErr); showError('We could not securely save the corporate application. Please try again.'); return; }

      if (paymentMethod === 'cheque') {
        const organizationId = dbOutcome?.organization?.id;
        if (!organizationId) throw new Error('The corporate account was created but its secure organization ID was not returned. Please contact Lueri support.');
        const state = { organizationId, planCode: rpcPlanCode, email: data.contactEmail.toLowerCase(), cheque };
        saveChequePendingState(state);
        const immediateResult = await startEmailVerification(state);
        if (immediateResult) showPendingSuccess(immediateResult, false);
        else {
          const overlay = document.getElementById('successOverlay');
          if (overlay) { document.getElementById('successTitle').textContent = 'Check your company email'; document.getElementById('successCopy').textContent = 'We created the corporate application and sent a secure verification link to the company email. Open that link on this device to submit the cheque for staff verification. No membership has been activated yet.'; const fallback = document.getElementById('successFallback'); if (fallback) fallback.style.display = 'none'; overlay.classList.add('active'); }
        }
        return;
      }

      const planLabels = { biz_gold: 'Essential (KES 25,000/mo)', biz_platinum: 'Professional (KES 45,000/mo)', biz_vip: 'Elite (KES 75,000/mo)', enterprise: 'Enterprise — custom quote' };
      const message = 'New corporate account application - Lueri website\n' + `Company: ${escapeForWhatsApp(data.companyName)}\n` + 'KRA PIN: stored in the secure application record; do not request it over WhatsApp.\n' + `Preferred plan: ${planLabels[data.plan] || 'Help me choose'}\n` + `Address: ${escapeForWhatsApp(data.address)}\n` + `Est. deliveries/week: ${data.volume}\n` + `Contact: ${escapeForWhatsApp(data.contactName)}${data.jobTitle ? ' (' + escapeForWhatsApp(data.jobTitle) + ')' : ''}\n` + `Phone: ${data.contactPhone}\n` + `Email: ${data.contactEmail}`;
      const result = openWhatsApp(WHATSAPP_NUMBER, message);
      document.getElementById('successTitle').textContent = result.opened ? 'Opening WhatsApp' : 'WhatsApp did not open';
      document.getElementById('successCopy').textContent = result.opened ? 'Confirm the message in WhatsApp — our team will review and activate your account within one working day.' : 'Your browser blocked the popup. Tap the button below to open WhatsApp.';
      const fallback = document.getElementById('successFallback'); document.getElementById('successWaLink').href = result.url; fallback.style.display = result.opened ? 'none' : 'block';
      const overlay = document.getElementById('successOverlay'); overlay.classList.add('active'); overlay.querySelector('button.btn')?.focus(); if (result.opened) setTimeout(() => form.reset(), 1500);
    } catch (err) { console.error(err); showError(err.message || 'Something went wrong submitting this. Please try again.'); }
    finally { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
  });

  document.querySelectorAll('.pricing-card[data-plan]').forEach((card) => {
    card.style.cursor = 'pointer'; card.addEventListener('click', () => { const planSelect = document.getElementById('plan'); if (planSelect) planSelect.value = card.getAttribute('data-plan'); document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('companyName')?.focus(); });
  });
  window.closeSuccess = function closeSuccess() { document.getElementById('successOverlay').classList.remove('active'); document.getElementById('successFallback').style.display = 'none'; form.querySelector('#companyName')?.focus(); };
})();

/* Corporate cheque submission uses the production RPC: submit_organization_cheque_payment(uuid,text,text,text,date,text). */
