'use strict';

// Lueri Rewards — Supabase-backed client. v20260917-03
// Pesapal pricing, callback URL, and membership activation remain server-authoritative.
// CHANGELOG v20260917-03:
//  - rpcCall/registerMember now surface the REAL HTTP error instead of a generic message.
//  - startMembershipPurchase redirects to checkout.html (the single live checkout
//    implementation with Pesapal / bank transfer / cheque), per CHANGES-SUMMARY.

// FIX: Centralized config. Hardcoded fallback for Anon Key because
// rewards.html does not load lueri-common.js, so window.LUERI is undefined.
const SUPABASE_URL = (window.LUERI && window.LUERI.supabaseUrl) || 'https://ylifvexqamxvwzvhmwex.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = (window.LUERI && window.LUERI.supabaseAnonKey) || 'sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F';

const TIERS = [
  { name: 'VIP', min: 75000, benefits: ['Everything in Platinum','20% off all bookings','4 free standard deliveries every month','Personal account manager','Early access to new services & promotions','Invitations to exclusive Lueri events'] },
  { name: 'Platinum', min: 35000, benefits: ['Everything in Gold','15% off priority same-day bookings','2 free standard deliveries every month','Priority dispatch queue during peak hours','Quarterly gift voucher'] },
  { name: 'Gold', min: 15000, benefits: ['Everything in Silver','10% off priority same-day bookings','1 free standard delivery every month','Dedicated dispatcher line'] },
  { name: 'Silver', min: 5000, benefits: ['Everything in Bronze','5% off priority same-day bookings','KES 200 free delivery credit monthly','Faster WhatsApp response time'] },
  { name: 'Bronze', min: 0, benefits: ['1 point per KES 50 spent','Standard delivery rates','Birthday bonus points','Access to seasonal promotions'] },
];

const LUERI_REWARDS = {
  tiers: TIERS.map(t => ({ name: t.name, minSpend: t.min, benefits: t.benefits })),
  company: { name: 'Lueri International', address: 'Nairobi, Kenya', phone: '+254 713 261 719', kraPin: '', vatRegistered: false, vatRate: 0.16 },
};

let _pesapalModal = null;
let _pesapalPollTimer = null;

function ensurePesapalModalStyles() {
  if (document.getElementById('lueriPesapalModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'lueriPesapalModalStyles';
  style.textContent = `
    .pesapal-modal { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(27,38,32,.85); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); opacity:0; visibility:hidden; transition:opacity .3s ease,visibility .3s ease; }
    .pesapal-modal.active { opacity:1; visibility:visible; }
    .pesapal-modal-content { width:min(560px,100%); max-height:min(94vh,820px); display:flex; flex-direction:column; overflow:hidden; background:var(--paper,#F0EAD8); color:var(--ink,#1B2620); border:1px solid var(--line,rgba(27,38,32,.16)); border-radius:8px; box-shadow:0 24px 60px rgba(0,0,0,.4); transform:translateY(20px); transition:transform .3s cubic-bezier(.2,.8,.2,1); }
    .pesapal-modal.active .pesapal-modal-content { transform:translateY(0); }
    .pesapal-modal-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; border-bottom:1px solid var(--line,rgba(27,38,32,.16)); background:var(--ink,#1B2620); color:var(--paper,#F0EAD8); }
    .pesapal-modal-brand { display:flex; align-items:center; gap:10px; min-width:0; }
    .pesapal-modal-brand img { width:28px; height:28px; object-fit:contain; }
    .pesapal-modal-title { margin:0; font:600 1.05rem/1.1 Oswald,sans-serif; text-transform:uppercase; letter-spacing:.04em; }
    .pesapal-modal-subtitle { margin:3px 0 0; color:rgba(240,234,216,.78); font-size:.75rem; }
    .pesapal-close { flex:0 0 auto; width:34px; height:34px; border:1px solid rgba(240,234,216,.3); background:none; color:var(--paper,#F0EAD8); border-radius:4px; cursor:pointer; font-size:1.45rem; line-height:1; display:flex; align-items:center; justify-content:center; }
    .pesapal-modal-close:hover { background:rgba(240,234,216,.1); border-color:var(--paper,#F0EAD8); }
    .pesapal-modal-body { position:relative; flex:1; min-height:550px; background:#fff; }
    .pesapal-modal-body iframe { display:block; width:100%; height:550px; border:0; background:#fff; }
    .pesapal-loading { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:24px; background:#fff; color:#4A5A52; font:500 .8rem/1.4 'IBM Plex Mono',monospace; text-align:center; z-index:2; pointer-events:none; }
    .pesapal-loading.hidden { display:none; }
    .pesapal-fallback { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:28px; background:var(--paper,#F0EAD8); text-align:center; z-index:3; }
    .pesapal-fallback[hidden] { display:none; }
    .pesapal-fallback-card { width:min(440px,100%); }
    .pesapal-fallback-card h3 { margin:0 0 8px; font:600 1.35rem/1.1 Oswald,sans-serif; text-transform:uppercase; }
    .pesapal-fallback-card p { margin:0 0 18px; color:var(--slate,#4A5A52); line-height:1.6; }
    .pesapal-actions { display:flex; gap:10px; flex-wrap:wrap; }
    .pesapal-actions .btn { flex:1 1 180px; }
    body.lueri-pesapal-open { overflow:hidden; }
    @media (max-width:600px) { .pesapal-modal { padding:0; align-items:stretch; } .pesapal-modal-content { width:100%; max-height:100vh; height:100vh; border-radius:0; } .pesapal-modal-body { min-height:0; } .pesapal-modal-body iframe { height:calc(100vh - 76px); min-height:0; } }
    @media (prefers-reduced-motion:reduce) { .pesapal-modal,.pesapal-modal-content { transition:none; } }
  `;
  document.head.appendChild(style);
}

function stopPesapalPolling() {
  if (_pesapalPollTimer) {
    clearInterval(_pesapalPollTimer);
    _pesapalPollTimer = null;
  }
}

function closePesapalModal({keepMessage=false} = {}) {
  stopPesapalPolling();
  const modal = _pesapalModal;
  _pesapalModal = null;
  document.body.classList.remove('lueri-pesapal-open');
  document.removeEventListener('keydown', handlePesapalEscape);
  if (!modal) return;
  modal.classList.remove('active');
  window.setTimeout(() => modal.remove(), 300);
  if (keepMessage && typeof showMsg === 'function') {
    showMsg('joinSuccessMsg', 'Payment window closed. If you completed payment, your membership is being confirmed.');
  }
}

function handlePesapalEscape(event) {
  if (event.key === 'Escape') closePesapalModal({keepMessage:true});
}

// Retained for compatibility (checkout.html or other pages may reference it).
function openPesapalModal(paymentUrl, trackingId, meta = {}) {
  if (!paymentUrl) throw new Error('Payment URL is missing.');
  ensurePesapalModalStyles();
  closePesapalModal();

  const modal = document.createElement('div');
  modal.className = 'pesapal-modal';
  modal.id = 'pesapalModal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','lueriPesapalModalTitle');

  const safeUrl = String(paymentUrl);
  const safePlanName = String(meta.planName || 'Lueri Rewards membership').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  modal.innerHTML = `
    <div class="pesapal-modal-content">
      <div class="pesapal-modal-header">
        <div class="pesapal-modal-brand">
          <img src="assets/logo-mark.png" alt="Lueri International">
          <div>
            <h3 id="lueriPesapalModalTitle" class="pesapal-modal-title">Secure Checkout</h3>
            <p class="pesapal-modal-subtitle">${safePlanName}</p>
          </div>
        </div>
        <button type="button" class="pesapal-close" aria-label="Close payment window">&times;</button>
      </div>
      <div class="pesapal-modal-body">
        <div class="pesapal-loading">Loading secure payment gateway...</div>
        <iframe title="Pesapal secure payment checkout" allow="payment *" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        <div class="pesapal-fallback" hidden>
          <div class="pesapal-fallback-card">
            <h3>Open secure checkout</h3>
            <p>Your browser or Pesapal may not allow this checkout to run inside the Lueri window. Continue to Pesapal's secure hosted checkout instead.</p>
            <div class="pesapal-actions">
              <a class="btn btn-primary" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open Pesapal</a>
              <button type="button" class="btn btn-secondary" data-pesapal-close>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const iframe = modal.querySelector('iframe');
  iframe.src = safeUrl;

  const loading = modal.querySelector('.pesapal-loading');
  const fallback = modal.querySelector('.pesapal-fallback');
  iframe.addEventListener('load', () => loading.classList.add('hidden'), { once:true });
  iframe.addEventListener('error', () => { loading.classList.add('hidden'); fallback.hidden = false; });
  modal.querySelector('.pesapal-close').addEventListener('click', () => closePesapalModal({keepMessage:true}));
  modal.querySelector('[data-pesapal-close]').addEventListener('click', () => closePesapalModal({keepMessage:true}));
  modal.addEventListener('click', event => { if (event.target === modal) closePesapalModal({keepMessage:true}); });

  document.body.appendChild(modal);
  _pesapalModal = modal;
  document.body.classList.add('lueri-pesapal-open');
  document.addEventListener('keydown', handlePesapalEscape);
  window.requestAnimationFrame(() => modal.classList.add('active'));
  modal.querySelector('.pesapal-close').focus();

  if (trackingId) {
    _pesapalPollTimer = window.setInterval(() => checkPaymentStatus(trackingId, meta), 5000);
  }
  return modal;
}

// CHANGED: paid memberships now go through checkout.html — the single live
// checkout implementation that offers Pesapal, bank transfer AND cheque.
// The browser never supplies an amount; the server verifies price at checkout.
async function startMembershipPurchase(memberId, planCode) {
  const params = new URLSearchParams();
  params.set('plan', planCode || '');
  if (memberId) params.set('member', String(memberId));
  window.location.href = 'checkout.html?' + params.toString();
  return { success: true, redirected: true };
}

async function checkPaymentStatus(trackingId, meta = {}) {
  if (!trackingId) return;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pesapal-status?order_tracking_id=${encodeURIComponent(trackingId)}`, {
      headers:{ 'apikey':SUPABASE_PUBLISHABLE_KEY },
    });
    if (!response.ok) return;
    const data = await response.json();
    const status = String(data.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'INVALID') {
      stopPesapalPolling();
      if (status === 'COMPLETED') {
        closePesapalModal();
        if (typeof showMsg === 'function') showMsg('joinSuccessMsg', `Payment successful! Your ${meta.planName || 'membership'} payment is being applied to your Rewards account.`);
        setTimeout(() => {
          const lookupPhone = document.getElementById('lookupPhone');
          const joinPhone = document.getElementById('joinPhone');
          if (typeof showTab === 'function') showTab('lookup');
          if (lookupPhone && joinPhone) {
            lookupPhone.value = joinPhone.value;
            const lookupBtn = document.getElementById('lookupBtn');
            if (lookupBtn) lookupBtn.click();
          }
        }, 1200);
      } else {
        closePesapalModal();
        if (typeof showMsg === 'function') showMsg('joinMsg', 'The payment could not be confirmed. Please try again.');
      }
    }
  } catch (error) {
    console.error('Payment status check failed:', error);
  }
}

(function handlePaymentReturn() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'complete') {
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.style.cssText = 'padding:12px 18px;background:#2e7d32;color:#fff;border-radius:4px;margin:12px 0;font-family:sans-serif;';
      banner.textContent = "Payment received — confirming your membership. Look yourself up below in a few seconds if your tier hasn't updated yet.";
      const wrap = document.querySelector('.wrap');
      if (wrap) wrap.prepend(banner);
    });
  }
})();

function calcTier(spend) { return TIERS.find(t => spend >= t.min) || TIERS[TIERS.length - 1]; }
function getBenefits(tierName) { return (TIERS.find(t => t.name === tierName) || TIERS[TIERS.length - 1]).benefits; }
function tierProgress(tierName, windowSpend) {
  const currentIndex = TIERS.findIndex(t => t.name === tierName);
  const next = currentIndex > 0 ? TIERS[currentIndex - 1] : null;
  if (!next) return { nextTier:null, remaining:0, progress:1 };
  const currentMin = TIERS[currentIndex].min;
  const range = next.min - currentMin;
  const into = windowSpend - currentMin;
  return { nextTier:next.name, remaining:Math.max(0,next.min-windowSpend), progress:range > 0 ? Math.min(1,Math.max(0,into/range)) : 1 };
}

// Canonical Kenyan phone normalization (fails closed: returns null on bad input).
function _rewardsNormalizePhone(phone) {
  const value = String(phone || '').trim().replace(/[^\d]/g,'');
  if (value.startsWith('254') && value.length === 12) return value;
  if (value.startsWith('0') && value.length === 10) return '254' + value.slice(1);
  if (value.length === 9 && (value.startsWith('7') || value.startsWith('1'))) return '254' + value;
  return null;
}

function capitalizeTier(tier) { const value = String(tier || '').trim(); return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(); }

// CHANGED: surfaces the REAL HTTP status + Supabase error body instead of
// swallowing it. This is what finally tells us why registration fails.
async function rpcCall(fnName, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'apikey':SUPABASE_PUBLISHABLE_KEY },
    body:JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.text()).slice(0, 300); } catch (_) {}
    throw new Error(`HTTP ${response.status} from Supabase on "${fnName}": ${detail}`);
  }
  return response.json();
}

const _txCache = {};

// CHANGED: on failure, shows the real server detail in the red error box.
async function registerMember(input) {
  const phone = _rewardsNormalizePhone(input.phone);
  if (!phone) return {success:false,errors:['Enter a valid Kenyan phone number.'],member:null};
  try {
    const result = await rpcCall('register_member',{p_name:input.name,p_phone:phone,p_email:input.email || null});
    if (!result.success) return {success:false,errors:[result.error],member:null};
    const member = result.member; member.tier = capitalizeTier(member.tier); return {success:true,errors:[],member};
  } catch (err) {
    console.error('register_member failed:', err);
    return {success:false,errors:['Server detail: ' + (err && err.message ? err.message : 'unknown error')],member:null};
  }
}

async function getMemberSummary(phone) {
  const normalized = _rewardsNormalizePhone(phone); if (!normalized) return null;
  let result;
  try {
    result = await rpcCall('lookup_member',{p_phone:normalized});
  } catch (err) {
    console.error('lookup_member failed:', err);
    return null;
  }
  if (!result.success || !result.member) return null;
  const member=result.member; const tierName=capitalizeTier(member.tier); member.tier=tierName;
  const windowSpend=member.tierWindowSpend !== undefined && member.tierWindowSpend !== null ? Number(member.tierWindowSpend) : Number(member.lifetimeSpend)||0;
  const progress=tierProgress(tierName,windowSpend); _txCache[member.id]=result.transactions||[];
  return {member,tier:tierName,benefits:getBenefits(tierName),points:Number(member.points)||0,lifetimeSpend:Number(member.lifetimeSpend)||0,nextTier:progress.nextTier,amountToNextTier:progress.remaining,tierProgress:progress.progress};
}

function getMemberTransactions(memberId) { return _txCache[memberId] || []; }
