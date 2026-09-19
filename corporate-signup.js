// corporate-signup.js
(function () {
  'use strict';

  const WHATSAPP_NUMBER = (window.LUERI && window.LUERI.whatsapp) || '254719261713';
  const SUPABASE_URL = (window.LUERI && window.LUERI.supabaseUrl) || 'https://ylifvexqamxvwzvhmwex.supabase.co';
  const SUPABASE_ANON_KEY = (window.LUERI && window.LUERI.supabaseAnonKey) || '';
  const KRA_PIN_PATTERN = /^[A-Za-z]\d{9}[A-Za-z]$/;
  const PHONE_PATTERN = /^(?:\+254|0)(7|1)\d{8}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CORPORATE_PLAN_CODES = ['biz_gold', 'biz_platinum', 'biz_vip'];
  const PAYMENT_STATE_KEY = 'lueri_corporate_pesapal_pending_v1';
  const CHEQUE_STATE_KEY = 'lueri_corporate_cheque_pending_v1';
  const BANK_TRANSFER_STATE_KEY = 'lueri_corporate_bank_transfer_pending_v1';

  const form = document.getElementById('corporateForm');
  if (!form) return;
  const errorBox = document.getElementById('corporateError');

  const isValidPhone = typeof window.lueriIsValidPhone === 'function'
    ? window.lueriIsValidPhone
    : (phone) => PHONE_PATTERN.test(String(phone || '').trim());

  const normalisePhone = typeof window.lueriNormalizePhone === 'function'
    ? window.lueriNormalizePhone
    : (raw) => {
        const digits = String(raw || '').trim().replace(/\D/g, '');
        if (digits.startsWith('254') && digits.length === 12) return digits;
        if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
        return digits;
      };

  const openWhatsApp = (message) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return { opened: !!win, url };
  };

  const supabaseClient = () =>
    window.lueri && typeof window.lueri.supabase === 'function' ? window.lueri.supabase() : null;

  const rpc = (name, payload) => {
    if (!window.lueri || typeof window.lueri.rpc !== 'function') {
      throw new Error('Lueri secure services are unavailable. Please reload the page.');
    }
    return window.lueri.rpc(name, payload);
  };

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }

  function hideError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.style.display = 'none';
  }

  function escapeText(text) {
    return String(text || '').replace(/[\r\n]+/g, ' ').trim();
  }

  function setOverlay(title, copy, fallbackUrl) {
    const overlay = document.getElementById('successOverlay');
    if (!overlay) return;
    const titleEl = document.getElementById('successTitle');
    const copyEl = document.getElementById('successCopy');
    const fallback = document.getElementById('successFallback');
    const waLink = document.getElementById('successWaLink');
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    if (fallback) fallback.style.display = fallbackUrl ? 'block' : 'none';
    if (waLink && fallbackUrl) waLink.href = fallbackUrl;
    overlay.classList.add('active');
  }

  function saveState(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function readState(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }

  function clearState(key) {
    try { sessionStorage.removeItem(key); } catch (_) {}
  }

  function ensurePaymentUI() {
    if (document.getElementById('corporatePaymentMethod')) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    const wrap = document.createElement('div');
    wrap.id = 'corporatePaymentMethod';
    wrap.style.cssText = 'margin:20px 0;padding:16px;border:1px solid var(--line, rgba(27,38,32,.16));border-radius:4px;background:rgba(255,255,255,.04);';

    wrap.innerHTML = `
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label" for="corpPaymentMethod">Payment method</label>
        <select class="form-input" id="corpPaymentMethod" name="payment_method">
          <option value="pesapal">Pay online with Pesapal (M-Pesa &amp; Cards)</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cheque">Pay by cheque</option>
                  </select>
        <p id="corpPaymentMethodHint" style="margin:6px 0 0;font-size:.78rem;opacity:.7;">Online payment opens the secure Pesapal checkout. The amount is verified server-side.</p>
      </div>

      <div id="corporateBankTransferFields" style="display:none;">
        <div style="font-size:.8rem;line-height:1.55;padding:12px 0 6px;"><strong>Bank transfer instructions</strong><br>Transfer the exact membership amount shown above, then enter the bank transaction/reference number below. Lueri staff will verify the transfer before activating membership.</div>
        <div style="font-size:.8rem;line-height:1.55;opacity:.9;padding:8px 0;">
          <div><strong>Account name:</strong> LUERI INTERNATIONAL</div>
          <div><strong>Bank:</strong> NCBA BANK KENYA PLC</div>
          <div><strong>Branch:</strong> Buru Buru</div>
          <div><strong>Currency:</strong> KES</div>
          <div><strong>Account number:</strong> 1011828853</div>
          <div><strong>SWIFT:</strong> CBAFKENX</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="corpBankTransferReference">Bank transaction/reference number</label>
          <input class="form-input" type="text" id="corpBankTransferReference" maxlength="120" autocomplete="off" placeholder="Bank transfer confirmation/reference">
        </div>
        <div class="form-group">
          <label class="form-label" for="corpBankTransferNotes">Notes (optional)</label>
          <textarea class="form-input" id="corpBankTransferNotes" maxlength="1000" rows="3" placeholder="Optional payment note"></textarea>
        </div>
        <div style="font-size:.8rem;line-height:1.55;opacity:.78;padding:4px 0 10px;">Do not send card numbers, passwords or banking login details. Only the bank transaction/reference number is required here.</div>
      </div>

      <div id="corporateChequeFields" style="display:none;">
        <div class="form-row2">
          <div class="form-group">
            <label class="form-label" for="corpChequeNumber">Cheque number</label>
            <input class="form-input" type="text" id="corpChequeNumber" maxlength="64" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label" for="corpChequeBank">Bank</label>
            <input class="form-input" type="text" id="corpChequeBank" maxlength="120" autocomplete="organization">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="corpChequeDate">Cheque date</label>
          <input class="form-input" type="date" id="corpChequeDate">
        </div>
        <div class="form-group">
          <label class="form-label" for="corpChequeNotes">Notes (optional)</label>
          <textarea class="form-input" id="corpChequeNotes" maxlength="1000" rows="3" placeholder="Optional reference or note for our verification team"></textarea>
        </div>
        <div style="font-size:.8rem;line-height:1.55;opacity:.78;padding:10px 0;">Cheques are physical instruments and cannot be linked directly to a bank account from the website. Make the cheque payable to <strong>Lueri International</strong>. A Lueri staff member must verify and clear it before membership is activated.</div>
      </div>`;

    form.insertBefore(wrap, submitBtn);

    const method = document.getElementById('corpPaymentMethod');
    const plan = document.getElementById('plan');
    const chequeFields = document.getElementById('corporateChequeFields');
    const bankFields = document.getElementById('corporateBankTransferFields');
    const hint = document.getElementById('corpPaymentMethodHint');
    const date = document.getElementById('corpChequeDate');
    if (date) date.max = new Date().toISOString().slice(0, 10);

    function syncPaymentUI() {
      const planCode = plan ? plan.value : '';
      const isPaidPlan = CORPORATE_PLAN_CODES.includes(planCode);
      const isCheque = method && method.value === 'cheque';
      const isBank = method && method.value === 'bank_transfer';
      const isPesapal = method && method.value === 'pesapal';

      if (!isPaidPlan && method) {
        method.value = 'pesapal';
        method.querySelector('option[value="pesapal"]')?.setAttribute('disabled', 'disabled');
        method.querySelector('option[value="bank_transfer"]')?.setAttribute('disabled', 'disabled');
        method.querySelector('option[value="cheque"]')?.setAttribute('disabled', 'disabled');
      } else if (isPaidPlan && method) {
        method.querySelector('option[value="pesapal"]')?.removeAttribute('disabled');
        method.querySelector('option[value="bank_transfer"]')?.removeAttribute('disabled');
        method.querySelector('option[value="cheque"]')?.removeAttribute('disabled');
      }

      if (chequeFields) chequeFields.style.display = isPaidPlan && isCheque ? 'block' : 'none';
      if (bankFields) bankFields.style.display = isPaidPlan && isBank ? 'block' : 'none';
      if (hint) {
        hint.textContent = isPesapal
          ? 'A secure Pesapal payment panel opens here for M-Pesa or card payment. You stay on the Lueri checkout.'
          : isBank
            ? 'Transfer to Lueri, enter the bank transaction reference, then wait for staff verification.'
            : isCheque
              ? 'Cheque remains pending until Lueri staff verifies and clears it.'
              : 'Enterprise uses custom pricing. Submit the application and Lueri will review it before quoting.';
      }
    }

    method?.addEventListener('change', syncPaymentUI);
    plan?.addEventListener('change', syncPaymentUI);
    syncPaymentUI();
  }

  function getPaymentMethod() {
    return document.getElementById('corpPaymentMethod')?.value || 'pesapal';
  }

  function getChequeData() {
    return {
      number: document.getElementById('corpChequeNumber')?.value.trim() || '',
      bank: document.getElementById('corpChequeBank')?.value.trim() || '',
      date: document.getElementById('corpChequeDate')?.value || '',
      notes: document.getElementById('corpChequeNotes')?.value.trim() || '',
    };
  }

  function getBankTransferData() {
    return {
      reference: document.getElementById('corpBankTransferReference')?.value.trim() || '',
      notes: document.getElementById('corpBankTransferNotes')?.value.trim() || '',
    };
  }

  async function startPesapalPayment(organizationId, planCode) {
    const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY };
    const sb = supabaseClient();
    const session = sb ? (await sb.auth.getSession())?.data?.session : null;
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/pesapal-initiate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ organization_id: organizationId, plan_code: planCode }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || !data.redirect_url) {
      throw new Error(data.error || 'We could not start the secure Pesapal payment.');
    }

    saveState(PAYMENT_STATE_KEY, {
      paymentId: data.payment_id,
      internalReference: data.internal_reference,
      organizationId,
      planCode,
      savedAt: Date.now(),
    });

    const panel = document.getElementById('lueriPaymentPanel');
    const frame = document.getElementById('lueriPaymentFrame');
    const loading = document.getElementById('lueriPaymentLoading');
    const status = document.getElementById('lueriPaymentStatus');
    const planLabel = document.getElementById('lueriPaymentPlan');
    if (!panel || !frame) throw new Error('The secure payment panel could not be loaded.');
    if (planLabel) planLabel.textContent = (planCode === 'biz_gold' ? 'Essential' : planCode === 'biz_platinum' ? 'Professional' : 'Elite') + ' corporate membership';
    if (loading) loading.classList.remove('hidden');
    if (status) status.textContent = 'Your secure payment is loading…';
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    frame.src = data.redirect_url;
    frame.addEventListener('load', () => loading?.classList.add('hidden'), { once: true });
  }

  async function pollCorporatePayment() {
    const state = readState(PAYMENT_STATE_KEY);
    if (!state?.paymentId || !state?.internalReference) return null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const result = await rpc('get_payment_status', { p_payment_id: state.paymentId, p_reference: state.internalReference });
        const row = result?.payment || result;
        const status = row?.status || row?.[0]?.status;
        if (status === 'successful') { clearState(PAYMENT_STATE_KEY); return { status: 'successful', row }; }
        if (['failed', 'cancelled', 'rejected'].includes(status)) { clearState(PAYMENT_STATE_KEY); return { status, row }; }
      } catch (err) { console.warn('Corporate payment status check failed:', err); }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    return { status: 'pending' };
  }


  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin || !event.data || event.data.type !== 'lueri-pesapal-callback') return;
    const state = readState(PAYMENT_STATE_KEY);
    if (!state || (event.data.reference && state.internalReference && event.data.reference !== state.internalReference)) return;
    const statusEl = document.getElementById('lueriPaymentStatus');
    if (statusEl) statusEl.textContent = 'Payment received. Confirming securely with Lueri…';
    const result = await pollCorporatePayment();
    const panel = document.getElementById('lueriPaymentPanel');
    if (result?.status === 'successful') {
      if (statusEl) statusEl.innerHTML = '<strong>Payment confirmed.</strong> Your corporate membership is now active.';
      panel?.classList.remove('active');
      document.body.style.overflow = '';
      setOverlay('Payment confirmed', 'Your corporate membership payment has been confirmed by Lueri. Your organization is now active under the selected plan.', null);
    } else if (result?.status === 'pending') {
      if (statusEl) statusEl.innerHTML = '<strong>Payment received.</strong> Final confirmation is still pending. You can safely close this panel; Lueri will activate the membership after Pesapal confirmation.';
    } else {
      if (statusEl) statusEl.innerHTML = '<strong>Payment not completed.</strong> No corporate membership was activated.';
    }
  });

  document.getElementById('lueriPaymentClose')?.addEventListener('click', () => {
    document.getElementById('lueriPaymentPanel')?.classList.remove('active');
    document.body.style.overflow = '';
  });

  async function handlePesapalReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'complete') return;

    const state = readState(PAYMENT_STATE_KEY);
    const reference = params.get('OrderMerchantReference') || state?.internalReference || 'your payment';
    setOverlay('Confirming Pesapal payment', `Pesapal returned you to Lueri. We are checking payment reference ${reference}. Your corporate membership is activated only after the server confirms the payment.`, null);

    const result = await pollCorporatePayment();
    if (!result) return;

    if (result.status === 'successful') {
      setOverlay('Payment confirmed', 'Your corporate membership payment has been confirmed by Lueri. Your organization is now active under the selected plan.', null);
    } else if (result.status === 'pending') {
      setOverlay('Payment received — confirmation pending', 'Pesapal returned you to Lueri, but the server has not received the final confirmation yet. The membership will activate only after Pesapal confirmation.', null);
    } else {
      setOverlay('Payment not completed', 'Pesapal did not confirm a successful payment. No corporate membership was activated. You can return to the form and try again.', null);
    }

    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash || ''}`);
  }

  async function submitCheque(state) {
    const sb = supabaseClient();
    if (!sb) throw new Error('Secure payment service is unavailable. Please reload the page.');
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult?.data?.session;
    const authEmail = session?.user?.email?.trim().toLowerCase() || '';
    if (!session || authEmail !== state.email.toLowerCase()) throw new Error('Please open the secure verification link sent to the company email before completing the cheque submission.');

    const result = await rpc('submit_organization_cheque_payment', {
      p_organization_id: state.organizationId,
      p_plan_code: state.planCode,
      p_cheque_number: state.cheque.number,
      p_cheque_bank: state.cheque.bank,
      p_cheque_date: state.cheque.date,
      p_cheque_notes: state.cheque.notes || null,
    });

    if (!result?.success) {
      const messages = {
        authentication_required: 'Please open the company-email verification link first.',
        authenticated_email_required: 'The company email could not be verified.',
        organization_access_denied: 'The verified email does not match the corporate account.',
        unknown_organization: 'The corporate application could not be found.',
        organization_plan_mismatch: 'The selected plan no longer matches the corporate account.',
        invalid_business_plan: 'This plan is not available for cheque payment.',
        invalid_cheque_number: 'Please enter a valid cheque number.',
        invalid_cheque_bank: 'Please enter the bank name.',
        cheque_date_required: 'Please enter the cheque date.',
        cheque_date_in_future: 'The cheque date cannot be in the future.',
      };
      throw new Error(messages[result?.error] || 'We could not submit the cheque details.');
    }
    clearState(CHEQUE_STATE_KEY);
    return result;
  }

  async function submitBankTransfer(state) {
    const sb = supabaseClient();
    if (!sb) throw new Error('Secure payment service is unavailable. Please reload the page.');
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult?.data?.session;
    const authEmail = session?.user?.email?.trim().toLowerCase() || '';
    if (!session || authEmail !== state.email.toLowerCase()) throw new Error('Please open the secure verification link sent to the company email before completing the bank-transfer submission.');

    const result = await rpc('submit_organization_bank_transfer_payment', {
      p_organization_id: state.organizationId,
      p_plan_code: state.planCode,
      p_transfer_reference: state.bankTransfer.reference,
      p_transfer_notes: state.bankTransfer.notes || null,
    });

    if (!result?.success) {
      const messages = {
        authentication_required: 'Please open the company-email verification link first.',
        organization_access_denied: 'The verified email does not match the corporate account.',
        unknown_organization: 'The corporate application could not be found.',
        organization_plan_mismatch: 'The selected plan no longer matches the corporate account.',
        invalid_business_plan: 'This plan is not available for bank transfer.',
        transfer_reference_required: 'Please enter the bank transaction/reference number.',
      };
      throw new Error(messages[result?.error] || 'We could not submit the bank-transfer reference.');
    }
    clearState(BANK_TRANSFER_STATE_KEY);
    return result;
  }

  async function sendChequeVerification(state) {
    const sb = supabaseClient();
    if (!sb) throw new Error('Secure payment service is unavailable. Please reload the page.');
    const current = await sb.auth.getSession();
    const currentEmail = current?.data?.session?.user?.email?.trim().toLowerCase() || '';
    if (currentEmail === state.email.toLowerCase()) return submitCheque(state);
    if (currentEmail && currentEmail !== state.email.toLowerCase()) throw new Error('A different account is already signed in. Sign out, then retry using the company email.');

    const result = await sb.auth.signInWithOtp({ email: state.email, options: { shouldCreateUser: true, emailRedirectTo: window.location.href } });
    if (result.error) throw new Error('We could not send the company-email verification link. Please try again.');
    return null;
  }

  async function sendBankTransferVerification(state) {
    const sb = supabaseClient();
    if (!sb) throw new Error('Secure payment service is unavailable. Please reload the page.');
    const current = await sb.auth.getSession();
    const currentEmail = current?.data?.session?.user?.email?.trim().toLowerCase() || '';
    if (currentEmail === state.email.toLowerCase()) return submitBankTransfer(state);
    if (currentEmail && currentEmail !== state.email.toLowerCase()) throw new Error('A different account is already signed in. Sign out, then retry using the company email.');

    const result = await sb.auth.signInWithOtp({ email: state.email, options: { shouldCreateUser: true, emailRedirectTo: window.location.href } });
    if (result.error) throw new Error('We could not send the company-email verification link. Please try again.');
    return null;
  }

  async function resumeCheque() {
    const state = readState(CHEQUE_STATE_KEY);
    if (!state) return;
    const sb = supabaseClient();
    if (!sb) return;
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult?.data?.session;
    const email = session?.user?.email?.trim().toLowerCase() || '';
    if (!session || email !== String(state.email || '').trim().toLowerCase()) return;

    try {
      const result = await submitCheque(state);
      setOverlay('Cheque submitted for verification', `The cheque has been recorded as pending verification. Reference: ${result.internal_reference}. Membership will not activate until Lueri staff clears the cheque.`, null);
    } catch (err) {
      console.error('Corporate cheque resume failed:', err);
      showError(err.message || 'We could not complete the cheque submission.');
    }
  }

  async function resumeBankTransfer() {
    const state = readState(BANK_TRANSFER_STATE_KEY);
    if (!state) return;
    const sb = supabaseClient();
    if (!sb) return;
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult?.data?.session;
    const email = session?.user?.email?.trim().toLowerCase() || '';
    if (!session || email !== String(state.email || '').trim().toLowerCase()) return;

    try {
      const result = await submitBankTransfer(state);
      setOverlay('Bank transfer submitted', `Your bank-transfer reference has been recorded as pending verification. Reference: ${result.internal_reference}. Membership will not activate until Lueri staff confirms the transfer.`, null);
    } catch (err) {
      console.error('Corporate bank transfer resume failed:', err);
      showError(err.message || 'We could not complete the bank-transfer submission.');
    }
  }

  function sendWhatsAppApplication(data) {
    const planLabels = { biz_gold: 'Essential (KES 25,000/mo)', biz_platinum: 'Professional (KES 45,000/mo)', biz_vip: 'Elite (KES 75,000/mo)', enterprise: 'Enterprise — custom quote' };
    const message =
      'New corporate account application - Lueri website\n' +
      `Company: ${escapeText(data.companyName)}\n` +
      'KRA PIN: stored in the secure application record; do not request it over WhatsApp.\n' +
      `Preferred plan: ${planLabels[data.plan] || 'Help me choose'}\n` +
      `Address: ${escapeText(data.address)}\n` +
      `Est. deliveries/week: ${data.volume}\n` +
      `Contact: ${escapeText(data.contactName)}${data.jobTitle ? ` (${escapeText(data.jobTitle)})` : ''}\n` +
      `Phone: ${data.contactPhone}\n` +
      `Email: ${data.contactEmail}`;

    const result = openWhatsApp(message);
    setOverlay(result.opened ? 'Opening WhatsApp' : 'WhatsApp did not open', result.opened ? 'Confirm the application message in WhatsApp. Our Accounts Desk will review it.' : 'Your browser blocked the WhatsApp popup. Use the button below.', result.opened ? null : result.url);
  }

  function collectData() {
    const ids = ['companyName', 'kraPin', 'volume', 'plan', 'address', 'contactName', 'jobTitle', 'contactPhone', 'contactEmail'];
    const data = {};
    ids.forEach((id) => { data[id] = document.getElementById(id)?.value.trim() || ''; });
    return data;
  }

  function validate(data, paymentMethod) {
    const invalid = [];
    if (data.companyName.length < 2) invalid.push('Company Name');
    if (!data.plan) invalid.push('Preferred Plan');
    if (!KRA_PIN_PATTERN.test(data.kraPin)) invalid.push('KRA PIN');
    if (!data.volume) invalid.push('Estimated Deliveries / Week');
    if (data.address.length < 4) invalid.push('Billing / Physical Address');
    if (data.contactName.length < 2) invalid.push('Contact Person');
    if (!isValidPhone(data.contactPhone)) invalid.push('Phone Number');
    if (!EMAIL_PATTERN.test(data.contactEmail)) invalid.push('Company Email');

    if (paymentMethod === 'cheque') {
      const cheque = getChequeData();
      if (cheque.number.length < 3 || cheque.number.length > 64) invalid.push('Cheque Number');
      if (cheque.bank.length < 2 || cheque.bank.length > 120) invalid.push('Cheque Bank');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cheque.date)) invalid.push('Cheque Date');
      if (cheque.date && cheque.date > new Date().toISOString().slice(0, 10)) invalid.push('Cheque Date');
    }
    if (paymentMethod === 'bank_transfer') {
      const bank = getBankTransferData();
      if (bank.reference.length < 3 || bank.reference.length > 120) invalid.push('Bank Transaction/Reference Number');
    }
    return invalid;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    hideError();
    if (document.getElementById('corpHoneypot')?.value.trim()) return;

    const data = collectData();
    const paymentMethod = getPaymentMethod();
    const planCode = CORPORATE_PLAN_CODES.includes(data.plan) ? data.plan : null;

    if (paymentMethod === 'pesapal' && !planCode) return showError('Pesapal payment is available for Essential, Professional and Elite. Enterprise is handled by Accounts Desk.');
    if (paymentMethod === 'bank_transfer' && !planCode) return showError('Bank transfer is available for Essential, Professional and Elite. Enterprise is handled by Accounts Desk.');
    if (paymentMethod === 'cheque' && !planCode) return showError('Cheque payment is available for Essential, Professional and Elite. Enterprise is handled by Accounts Desk.');

    const invalid = validate(data, paymentMethod);
    if (invalid.length) return showError(`Please check: ${invalid.join(', ')}.`);

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Submit Application';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = paymentMethod === 'pesapal' ? 'Preparing secure Pesapal checkout…' : paymentMethod === 'bank_transfer' ? 'Securing bank-transfer submission…' : paymentMethod === 'cheque' ? 'Securing cheque submission…' : 'Submitting…';
    }

    try {
      const registration = await rpc('register_organization', {
        p_company_name: data.companyName,
        p_contact_person: data.contactName,
        p_role: data.jobTitle || null,
        p_phone: normalisePhone(data.contactPhone),
        p_email: data.contactEmail.toLowerCase(),
        p_kra_pin: data.kraPin.toUpperCase(),
        p_address: data.address,
        p_volume: data.volume,
        p_plan_code: planCode,
      });

      if (!registration?.success) throw new Error(registration?.error || 'We could not securely save the corporate application.');
      const organizationId = registration.organization?.id;
      if (!organizationId) throw new Error('The corporate account was created but its organization ID was not returned.');

      if (!CORPORATE_PLAN_CODES.includes(planCode)) {
        setOverlay('Enterprise application received', 'Enterprise pricing is custom. Your application has been received for review. Lueri will contact you using the details provided.', null);
        return;
      }

      if (paymentMethod === 'pesapal') {
        await startPesapalPayment(organizationId, planCode);
        return;
      }

      if (paymentMethod === 'bank_transfer') {
        const state = { organizationId, planCode, email: data.contactEmail.toLowerCase(), bankTransfer: getBankTransferData(), savedAt: Date.now() };
        saveState(BANK_TRANSFER_STATE_KEY, state);
        const immediate = await sendBankTransferVerification(state);
        if (immediate) {
          setOverlay('Bank transfer submitted', `Your bank-transfer reference is pending staff verification. Reference: ${immediate.internal_reference}. No membership is activated until Lueri confirms the transfer.`, null);
        } else {
          setOverlay('Check your company email', 'We created the corporate application and sent a secure verification link to the company email. Open that link on this device to complete bank-transfer submission. No membership has been activated yet.', null);
        }
        return;
      }

      if (paymentMethod === 'cheque') {
        const state = { organizationId, planCode, email: data.contactEmail.toLowerCase(), cheque: getChequeData(), savedAt: Date.now() };
        saveState(CHEQUE_STATE_KEY, state);
        const immediate = await sendChequeVerification(state);
        if (immediate) {
          setOverlay('Cheque submitted for verification', `Your cheque payment is pending staff verification. Reference: ${immediate.internal_reference}. No membership is activated until the cheque is cleared.`, null);
        } else {
          setOverlay('Check your company email', 'We created the corporate application and sent a secure verification link to the company email. Open that link on this device to complete cheque submission. No membership has been activated yet.', null);
        }
        return;
      }

      sendWhatsAppApplication(data);
    } catch (err) {
      console.error('Corporate application failed:', err);
      showError(err.message || 'We could not process this application. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  }

  ensurePaymentUI();
  handlePesapalReturn().catch((err) => console.error('Corporate Pesapal return check failed:', err));
  resumeCheque().catch((err) => console.error('Corporate cheque resume check failed:', err));
  resumeBankTransfer().catch((err) => console.error('Corporate bank transfer resume check failed:', err));
  form.addEventListener('submit', handleSubmit);

  document.querySelectorAll('.pricing-card[data-plan]').forEach((card) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const plan = document.getElementById('plan');
      if (plan) {
        plan.value = card.getAttribute('data-plan');
        plan.dispatchEvent(new Event('change'));
      }
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('companyName')?.focus();
    });
  });

  window.closeSuccess = function closeSuccess() {
    document.getElementById('successOverlay')?.classList.remove('active');
    document.getElementById('successFallback')?.style.setProperty('display', 'none');
    form.querySelector('#companyName')?.focus();
  };
})();
