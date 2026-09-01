'use strict';

// ---------------------------------------------------------------------
// Lueri Rewards — Supabase-backed client
// Replaces the old Google Apps Script / Sheets backend. Keeps the same
// function names rewards.html already calls, so the page itself needs
// no changes beyond the <script src="..."> line.
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

function calcTier(spend) {
  return TIERS.find(t => spend >= t.min) || TIERS[TIERS.length - 1];
}

function getBenefits(tierName) {
  const tier = TIERS.find(t => t.name === tierName) || TIERS[TIERS.length - 1];
  return tier.benefits;
}

// Tier progress based on LIFETIME spend (matches the promise on the
// page: "based on lifetime spend and never resets"), not a rolling
// window like the old localStorage engine used.
function tierProgress(tierName, lifetimeSpend) {
  const currentIndex = TIERS.findIndex(t => t.name === tierName);
  const next = currentIndex > 0 ? TIERS[currentIndex - 1] : null;
  if (!next) return { nextTier: null, remaining: 0, progress: 1 };

  const currentMin = TIERS[currentIndex].min;
  const range = next.min - currentMin;
  const into = lifetimeSpend - currentMin;
  const remaining = Math.max(0, next.min - lifetimeSpend);
  const progress = range > 0 ? Math.min(1, Math.max(0, into / range)) : 1;
  return { nextTier: next.name, remaining, progress };
}

function lueriNormalizePhone(phone) {
  let value = String(phone || '').trim().replace(/[()\s-]/g, '');
  if (value.startsWith('+254')) value = '0' + value.slice(4);
  else if (value.startsWith('254')) value = '0' + value.slice(3);
  return value;
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
  try {
    const result = await rpcCall('register_member', {
      p_name: input.name,
      p_phone: lueriNormalizePhone(input.phone),
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
  let result;
  try {
    result = await rpcCall('lookup_member', { p_phone: lueriNormalizePhone(phone) });
  } catch (err) {
    return null;
  }
  if (!result.success || !result.member) return null;

  const member = result.member;
  const tierName = capitalizeTier(member.tier);
  member.tier = tierName;

  const progress = tierProgress(tierName, member.lifetimeSpend);
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
