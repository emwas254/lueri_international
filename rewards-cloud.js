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
//     IMPORTANT: this requires the one-time data backfill in
//     supabase_migration_fixes.sql to reformat phone numbers already
//     stored in the members table — deploy that SQL BEFORE or AT THE
//     SAME TIME as this file, not after, or existing members will
//     temporarily fail lookup_member() until the backfill runs.
//  2. The local phone helper is renamed from lueriNormalizePhone to
//     _rewardsNormalizePhone. The old name is a bare top-level
//     function declaration, which becomes a global (window.*) property
//     — if lueri-common.js is ever added to rewards.html, its real
//     window.lueriNormalizePhone would get silently overwritten by
//     whichever script loaded last. Renaming removes the collision
//     entirely rather than relying on load order.
//  3. Pesapal membership purchase: startMembershipPurchase() calls the
//     pesapal-initiate Edge Function and redirects to Pesapal's hosted
//     checkout. It's invoked directly from rewards.html's own inline
//     script as part of the selection-first Join flow (pick a tier,
//     fill in details, straight to checkout) — there is deliberately
//     no auto-rendered upsell panel here anymore; an earlier version of
//     this file added one after every lookup/registration, but with a
//     dedicated purchase section now on the page itself, a second,
//     different tier-picker appearing after login was redundant and
//     looked bolted-on rather than designed in.
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

// ---------------------------------------------------------------------
// Membership purchase — Pesapal, price enforced server-side.
// plan_code values MUST match membership_plans.code in Supabase
// (lowercase: 'silver' | 'gold' | 'platinum' | 'vip'). Called from
// rewards.html's own inline script, right after a successful
// registerMember()/lookup, as part of the selection-first Join flow.
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
    const data = await response.json();

    if (!data.redirect_url) {
      alert(data.error === 'plan_not_purchasable'
        ? "This plan isn't available for online purchase yet. Please contact us."
        : 'Could not start payment. Please try again.');
      return;
    }

    window.location.href = data.redirect_url; // hands off to Pesapal's hosted checkout
  } catch (err) {
    console.error(err);
    alert('Something went wrong starting your payment. Please try again.');
  }
}

// Landing back on rewards.html?payment=complete after Pesapal checkout.
// The IPN webhook (server-to-server) usually finishes around the same
// time as this redirect, but isn't guaranteed instant — so this just
// shows a short confirmation banner; the tier badge itself refreshes
// next time getMemberSummary() runs (e.g. the member looks themself up).
(function handlePaymentReturn() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'complete') {
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.style.cssText = 'padding:12px 18px;background:#2e7d32;color:#fff;border-radius:4px;margin:12px 0;font-family:sans-serif;';
      banner.textContent = 'Payment received — confirming your membership. Look yourself up below in a few seconds if your tier hasn\u2019t updated yet.';
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

// CHANGED: tier now qualifies on a rolling 365-day spend window, not
// lifetime spend — a member who goes quiet drifts back down to the tier
// their recent activity actually supports, instead of a VIP discount
// (and flat perks like free monthly deliveries) locking in forever from
// one big order years ago. This is the same design the old localStorage
// engine used, reinstated deliberately.
//
// windowSpend should be member.tierWindowSpend once the matching DB
// trigger/column is deployed (see staff_roles_and_departments.sql-adjacent
// migration). Until that's live, this falls back to lifetimeSpend so
// nothing breaks — it just won't self-correct downward yet.
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

// FIX: outputs 254XXXXXXXXX (canonical, no plus) instead of the old
// leading-zero format, and renamed so it can never shadow the real
// window.lueriNormalizePhone from lueri-common.js. Returns null (not a
// best-guess string) when the input can't be confidently resolved —
// callers must check for null before using the result.
function _rewardsNormalizePhone(phone) {
  const value = String(phone || '').trim().replace(/[^\d]/g, '');
  if (value.startsWith('254') && value.length === 12) return value;
  if (value.startsWith('0') && value.length === 10) return '254' + value.slice(1);
  if (value.length === 9 && (value.startsWith('7') || value.startsWith('1'))) return '254' + value;
  return null;
}

// Supabase stores tier names lowercase ('bronze', 'silver', ...); the
// TIERS table above (and the rest of this page) expects them
// capitalized ('Bronze', 'Silver', ...). This normalizes it once, right
// after data comes back from the database, so nothing downstream has
// to think about casing.
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

// Cache of each looked-up member's transactions, keyed by member id —
// fixes a bug in the old client where getMemberTransactions(id) never
// actually had anywhere to pull data from.
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
    : Number(member.lifetimeSpend) || 0; // fallback until the DB migration lands
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
