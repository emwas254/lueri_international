// ============================================================================
// Lueri Rewards — Cloud Adapter (Phase 1)
// ============================================================================
//
// This replaces the localStorage-based engine in rewards.js with calls to a
// Google Sheets backend (see Code.gs), so membership data survives across
// devices and browsers instead of living only on one phone.
//
// WHAT'S IN SCOPE FOR THIS FILE: registration + lookup, matching what the
// customer-facing rewards page actually needs today. Tier/points/voucher
// math still runs here on the client using your existing tier table, just
// against data that now comes from the Sheet instead of localStorage.
//
// ============================================================================

'use strict';

const API_URL = 'https://script.google.com/macros/s/AKfycbwIDbi4ssSEF7rn6l_rljcufKUydMGs5pYeW9BjbbvA2SLekoIvyAyiJBw6i9CqyCkg/exec';

/* ==========================================================================
   TIER TABLE — kept identical to your existing rewards program rules
   ========================================================================== */

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

function calcTier(spend) {
  return TIERS.find(t => spend >= t.min) || TIERS[TIERS.length - 1];
}

function getBenefits(tierName) {
  const tier = TIERS.find(t => t.name === tierName) || TIERS[TIERS.length - 1];
  return tier.benefits;
}

function tierProgress(member) {
  const spend = member.tierWindowSpend || 0;
  const currentIndex = TIERS.findIndex(t => t.name === member.tier);
  const nextTier = currentIndex > 0 ? TIERS[currentIndex - 1] : null;

  if (!nextTier) {
    return { nextTier: null, remaining: 0, progress: 1 };
  }

  const remaining = Math.max(0, nextTier.min - spend);
  const progress = Math.min(1, spend / nextTier.min);
  return { nextTier: nextTier.name, remaining, progress };
}

/* ==========================================================================
   COMPATIBILITY SHIMS
   ========================================================================== */

const LUERI_REWARDS = {
  tiers: TIERS.map(t => ({ name: t.name, minSpend: t.min, benefits: t.benefits })),
};

function getMemberTransactions(memberId) {
  return [];
}

/* ==========================================================================
   BACKEND CALLS
   ========================================================================== */

async function apiCall(action, payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    throw new Error('Network error: ' + response.status);
  }

  return response.json();
}

async function registerMember(input) {
  try {
    return await apiCall('register', { input });
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
    result = await apiCall('lookup', { phone });
  } catch (err) {
    return null;
  }

  if (!result.success || !result.member) {
    return null;
  }

  const member = result.member;
  member.tier = calcTier(Number(member.tierWindowSpend) || 0).name;

  const progress = tierProgress(member);

  return {
    member,
    tier: member.tier,
    benefits: getBenefits(member.tier),
    points: Number(member.points) || 0,
    expiredPoints: Number(member.expiredPoints) || 0,
    lifetimeSpend: Number(member.lifetimeSpend) || 0,
    nextTier: progress.nextTier,
    amountToNextTier: progress.remaining,
    tierProgress: progress.progress,
    pointsExpiryDays: 365,
    lastActivity: member.lastActivity,
  };
}
