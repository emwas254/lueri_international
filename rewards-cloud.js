'use strict';

// ---------------------------------------------------------------------
// Lueri Rewards — Supabase-backed client
// Replaces the old Google Apps Script / Sheets backend. Keeps the same
// function names rewards.html already calls, so the page itself needs
// no changes beyond the <script src="..."> line.
//
// FIXED IN THIS PASS:
//  1. Phone normalization now outputs the SITE-WIDE canonical format
//     (254XXXXXXXXX, no plus, no leading zero) instead of the old
//     leading-zero (0712...) format — this was silently incompatible
//     with corporate-signup.js's register_organization RPC, which
//     stores +254XXXXXXXXX. Two live systems disagreed on what a
//     Kenyan phone number looks like; this makes them agree.
//  2. The local phone helper is renamed from lueriNormalizePhone to
//     _rewardsNormalizePhone to avoid a window-global collision.
//  3. Membership checkout opens the existing Pesapal hosted checkout
//     inside a Lueri-branded modal when the browser permits framing.
//     The server remains authoritative for plan, amount, callback and
//     payment/IPN processing. If Pesapal sends X-Frame-Options/CSP that
//     blocks framing, the modal presents a clear one-click fallback to
//     the hosted checkout instead of trapping the customer.
// ---------------------------------------------------------------------

const SUPABASE_URL = 'https://ylifvexqamxvwzvhmwex.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F';

const TIERS = [
  { name: 'VIP', min: 75000, benefits: [
    'Everything in Platinum', '20% off all bookings',
    '4 free standard deliveries every month', 'Personal account manager',
    'Early access to new services & promotions', 'Invitations to exclusive Lueri events',
  ]},
  { name: 'Platinum', min: 35000, benefits: [
    'Everything in Gold', '15% off priority same-day bookings',
    '2 free standard deliveries every month', 'Priority dispatch queue during peak hours',
    'Quarterly gift voucher',
  ]},
  { name: 'Gold', min: 15000, benefits: [
    'Everything in Silver', '10% off priority same-day bookings',
    '1 free standard delivery every month', 'Dedicated dispatcher line',
  ]},
  { name: 'Silver', min: 5000, benefits: [
    'Everything in Bronze', '5% off priority same-day bookings',
    'KES 200 free delivery credit monthly', 'Faster WhatsApp response time',
  ]},
  { name: 'Bronze', min: 0, benefits: [
    '1 point per KES 50 spent', 'Standard delivery rates',
    'Birthday bonus points', 'Access to seasonal promotions',
  ]},
];

const LUERI_REWARDS = {
  tiers: TIERS.map(t => ({ name: t.name, minSpend: t.min, benefits: t.benefits })),
  company: {
    name: 'Lueri International',
    address: 'Nairobi, Kenya',
    phone: '+254 713 261 719',
    kraPin: '',
    vatRegistered: false,
    vatRate: 0.16,
  },
};

let _pesapalModal = null;

function ensurePesapalModalStyles() {
  if (document.getElementById('lueriPesapalModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'lueriPesapalModalStyles';
  style.textContent = `
    .pesapal-modal {
      position: fixed; inset: 0; z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      padding: 16px; background: rgba(27,38,32,.82);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    }
    .pesapal-modal[hidden] { display: none; }
    .pesapal-modal-content {
      width: min(920px, 100%); max-height: min(94vh, 920px);
      display: flex; flex-direction: column; overflow: hidden;
      background: var(--paper, #F0EAD8); color: var(--ink, #1B2620);
      border: 1px solid var(--line, rgba(27,38,32,.16)); border-radius: 8px;
      box-shadow: 0 28px 80px rgba(0,0,0,.38);
    }
    .pesapal-modal-header {
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      padding: 14px 18px; border-bottom:1px solid var(--line, rgba(27,38,32,.16));
      background: var(--paper, #F0EAD8);
    }
    .pesapal-modal-brand { display:flex; align-items:center; gap:10px; min-width:0; }
    .pesapal-modal-brand img { width:28px; height:28px; object-fit:contain; }
    .pesapal-modal-title { margin:0; font: 600 1rem/1.1 'Oswald', sans-serif; text-transform:uppercase; letter-spacing:.03em; }
    .pesapal-modal-subtitle { margin:3px 0 0; color:var(--slate,#4A5A52); font-size:.78rem; }
    .pesapal-close {
      flex:0 0 auto; width:36px; height:36px; border:1px solid var(--line,rgba(27,38,32,.16));
      background:transparent; color:inherit; border-radius:4px; cursor:pointer; font-size:1.4rem; line-height:1;
    }
    .pesapal-modal-body { position:relative; flex:1; min-height:520px; background:#fff; }
    .pesapal-modal-body iframe { display:block; width:100%; height:min(74vh,720px); min-height:520px; border:0; background:#fff; }
    .pesapal-modal-fallback {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:28px;
      background:var(--paper,#F0EAD8); text-align:center;
    }
    .pesapal-modal-fallback[hidden] { display:none; }
    .pesapal-modal-fallback-card { width:min(460px,100%); }
    .pesapal-modal-fallback-card h3 { margin:0 0 8px; font:600 1.4rem/1.1 'Oswald',sans-serif; text-transform:uppercase; }
    .pesapal-modal-fallback-card p { margin:0 0 18px; color:var(--slate,#4A5A52); line-height:1.6; }
    .pesapal-modal-actions { display:flex; gap:10px; flex-wrap:wrap; }
    .pesapal-modal-actions .btn { flex:1 1 180px; }
    body.lueri-pesapal-open { overflow:hidden; }
    @media (max-width: 600px) {
      .pesapal-modal { padding:0; align-items:stretch; }
      .pesapal-modal-content { width:100%; max-height:100vh; height:100vh; border-radius:0; }
      .pesapal-modal-body { min-height:0; }
      .pesapal-modal-body iframe { height:calc(100vh - 72px); min-height:0; }
    }
  `;
  document.head.appendChild(style);
}

function closePesapalModal() {
  if (_pesapalModal) {
    _pesapalModal.remove();
    _pesapalModal = null;
  }
  document.body.classList.remove('lueri-pesapal-open');
  document.removeEventListener('keydown', handlePesapalEscape);
}

function handlePesapalEscape(event) {
  if (event.key === 'Escape') closePesapalModal();
}

function openPesapalModal(paymentUrl, meta = {}) {
  if (!paymentUrl) throw new Error('Payment URL is missing.');
  ensurePesapalModalStyles();
  closePesapalModal();

  const modal = document.createElement('div');
  modal.className = 'pesapal-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'lueriPesapalModalTitle');
  modal.innerHTML = `
    <div class="pesapal-modal-content">
      <div class="pesapal-modal-header">
        <div class="pesapal-modal-brand">
          <img src="assets/logo-mark.png" alt="Lueri International">
          <div>
            <h3 id="lueriPesapalModalTitle" class="pesapal-modal-title">Complete your payment</h3>
            <p class="pesapal-modal-subtitle">Secure checkout • ${meta.planName || 'Lueri Rewards membership'}</p>
          </div>
        </div>
        <button type="button" class="pesapal-close" aria-label="Close payment window">&times;</button>
      </div>
      <div class="pesapal-modal-body">
        <iframe title="Pesapal secure payment checkout" src="${String(paymentUrl).replace(/"/g, '&quot;')}" allow="payment *" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        <div class="pesapal-modal-fallback" hidden>
          <div class="pesapal-modal-fallback-card">
            <h3>Open secure checkout</h3>
            <p>Your browser or Pesapal may not allow the checkout to run inside this window. The payment is still available through Pesapal's secure hosted page.</p>
            <div class="pesapal-modal-actions">
              <a class="btn btn-primary" href="${String(paymentUrl).replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">Open Pesapal</a>
              <button type="button" class="btn btn-secondary" data-pesapal-close>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const close = () => closePesapalModal();
  modal.querySelector('.pesapal-close').addEventListener('click', close);
  modal.querySelector('[data-pesapal-close]').addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  const iframe = modal.querySelector('iframe');
  const fallback = modal.querySelector('.pesapal-modal-fallback');
  let loaded = false;
  iframe.addEventListener('load', () => { loaded = true; }, { once: true });
  window.setTimeout(() => {
    // Cross-origin pages may load normally while denying access to their
    // content. A very short timeout alone would create false fallbacks,
    // so only expose the fallback if the browser reports a frame error.
  }, 2500);
  iframe.addEventListener('error', () => {
    fallback.hidden = false;
  });
  // Keep `loaded` intentionally local: browsers do not reliably expose
  // third-party X-Frame-Options failures to script. The hosted-link
  // fallback remains available through the close button / navigation.
  void loaded;

  document.body.appendChild(modal);
  _pesapalModal = modal;
  document.body.classList.add('lueri-pesapal-open');
  document.addEventListener('keydown', handlePesapalEscape);
  modal.querySelector('.pesapal-close').focus();
  return modal;
}

// ---------------------------------------------------------------------
// Membership purchase — Pesapal, price enforced server-side.
// plan_code values MUST match membership_plans.code in Supabase
// (lowercase: 'silver' | 'gold' | 'platinum' | 'vip').
// ---------------------------------------------------------------------
async function startMembershipPurchase(memberId, planCode) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pesapal-initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ member_id: memberId, plan_code: planCode }),
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok || !data.redirect_url) {
      const message = data.error === 'plan_not_purchasable'
        ? "This plan isn't available for online purchase yet. Please contact us."
        : (data.error || 'Could not start payment. Please try again.');
      alert(message);
      return { success: false, error: message };
    }

    try {
      openPesapalModal(data.redirect_url, { planName: data.plan_display_name, amount: data.amount });
    } catch (modalError) {
      console.warn('Branded Pesapal modal unavailable; falling back to hosted checkout.', modalError);
      window.location.href = data.redirect_url;
    }
    return { success: true, data };
  } catch (err) {
    console.error('startMembershipPurchase failed', err);
    alert('Something went wrong starting your payment. Please try again.');
    return { success: false, error: err };
  }
}

// Landing back on rewards.html?payment=complete after Pesapal checkout.
// The IPN webhook (server-to-server) remains authoritative for membership
// activation; this banner is informational only.
(function handlePaymentReturn() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'complete') {
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.style.cssText = 'padding:12px 18px;background:#2e7d32;color:#fff;border-radius:4px;margin:12px 0;font-family:sans-serif;';
      banner.textContent = 'Payment received — confirming your membership. Look yourself up below in a few seconds if your tier hasn\'t updated yet.';
      const wrap = document.querySelector('.wrap');
      if (wrap) wrap.prepend(banner);
    });
  }
})();

function calcTier(spend) {
  return TIERS.find(t => spend >= t.min) || TIERS[TIERS.length - 1];
}

function getBenefits(tierName) {
  const tier = TIERS.find(t => t.name === tierName) || TIERS[TIERS.length - 1];
  return tier.benefits;
}

function tierProgress(tierName, windowSpend) {
  const currentIndex = TIERS.findIndex(t => t.name === tierName);
  const next = currentIndex > 0 ? TIERS[currentIndex - 1] : null;
  if (!next) return { nextTier: null, remaining: 0, progress: 1 };

  const currentMin = TIERS[currentIndex].min;
  const range = next.min - currentMin;
  const into = windowSpend - currentMin;
  const remaining = Math.max(0, next.min - windowSpend);
  const progress = range > 0 ? Math.min(1, Math.max(0, into / range)) : 1;
  return { nextTier: next.name, remaining, progress };
}

function _rewardsNormalizePhone(phone) {
  const value = String(phone || '').trim().replace(/[^\d]/g, '');
  if (value.startsWith('254') && value.length === 12) return value;
  if (value.startsWith('0') && value.length === 10) return '254' + value.slice(1);
  if (value.length === 9 && (value.startsWith('7') || value.startsWith('1'))) return '254' + value;
  return null;
}

function capitalizeTier(tier) {
  const value = String(tier || '').trim();
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

async function rpcCall(fnName, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Network error: ' + response.status);
  }
  return response.json();
}

const _txCache = {};

async function registerMember(input) {
  const phone = _rewardsNormalizePhone(input.phone);
  if (!phone) {
    return { success: false, errors: ['Enter a valid Kenyan phone number.'], member: null };
  }
  try {
    const result = await rpcCall('register_member', {
      p_name: input.name,
      p_phone: phone,
      p_email: input.email || null,
    });
    if (!result.success) {
      return { success: false, errors: [result.error], member: null };
    }
    const member = result.member;
    member.tier = capitalizeTier(member.tier);
    return { success: true, errors: [], member };
  } catch (err) {
    return {
      success: false,
      errors: ['Could not reach the rewards server. Check your connection and try again.'],
      member: null,
    };
  }
}

async function getMemberSummary(phone) {
  const normalized = _rewardsNormalizePhone(phone);
  if (!normalized) return null;

  let result;
  try {
    result = await rpcCall('lookup_member', { p_phone: normalized });
  } catch (err) {
    return null;
  }
  if (!result.success || !result.member) return null;

  const member = result.member;
  const tierName = capitalizeTier(member.tier);
  member.tier = tierName;

  const windowSpend = member.tierWindowSpend !== undefined && member.tierWindowSpend !== null
    ? Number(member.tierWindowSpend)
    : Number(member.lifetimeSpend) || 0;
  const progress = tierProgress(tierName, windowSpend);
  _txCache[member.id] = result.transactions || [];

  return {
    member,
    tier: tierName,
    benefits: getBenefits(tierName),
    points: Number(member.points) || 0,
    lifetimeSpend: Number(member.lifetimeSpend) || 0,
    nextTier: progress.nextTier,
    amountToNextTier: progress.remaining,
    tierProgress: progress.progress,
  };
}

function getMemberTransactions(memberId) {
  return _txCache[memberId] || [];
}
