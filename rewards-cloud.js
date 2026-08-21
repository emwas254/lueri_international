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
// TO USE THIS FILE:
//   1. In rewards.html, change:
//        <script src="rewards.js"></script>
//      to:
//        <script src="rewards-cloud.js"></script>
//   2. Paste your Apps Script Web App URL into API_URL below.
//   3. The two event handlers in rewards.html that call registerMember()
//      and getMemberSummary() need to become async/await (see the small
//      patch notes at the bottom of this file).
//
// ============================================================================

'use strict';

const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

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
   ==========================================================================
   rewards.html also reads LUERI_REWARDS.tiers (for the public tier explainer
   grid) and calls getMemberTransactions() (for the transaction history
   table) directly from the old rewards.js. This file is a full drop-in
   replacement, so both are covered here — the explainer keeps working, and
   transaction history returns empty until phase 2 adds transaction sync
   into the Sheet (until then, transactions are still tracked manually).
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
    // Apps Script web apps read this as a plain string body, not multipart —
    // 'text/plain' avoids a CORS preflight that Apps Script doesn't handle.
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    throw new Error('Network error: ' + response.status);
  }

  return response.json();
}

/**
 * Register a new rewards member. Same name and same return shape
 * ({ success, errors, member, existing }) as the old localStorage version,
 * so the HTML barely has to change — it just needs to `await` this now.
 */
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

/**
 * Look up a member by phone and build the same enriched summary object
 * the old getMemberSummary() produced (member, tier, benefits, points,
 * progress to next tier, etc).
 */
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

/* ==========================================================================
   PATCH NOTES FOR rewards.html
   ==========================================================================
   Your two existing event handlers call registerMember() and
   getMemberSummary() as if they return instantly. Now that they fetch from
   a server, they return a Promise, so the handlers need `async`/`await`.

   Change this:

     document.getElementById('lookupBtn').addEventListener('click', () => {
       const phone = document.getElementById('lookupPhone').value.trim();
       const summary = getMemberSummary(phone);
       ...
     });

   To this:

     document.getElementById('lookupBtn').addEventListener('click', async () => {
       const phone = document.getElementById('lookupPhone').value.trim();
       const summary = await getMemberSummary(phone);
       ...
     });

   And change this:

     document.getElementById('joinBtn').addEventListener('click', () => {
       ...
       const result = registerMember(input);
       ...
     });

   To this:

     document.getElementById('joinBtn').addEventListener('click', async () => {
       ...
       const result = await registerMember(input);
       ...
       // also: remove the 1200ms auto-redirect, or extend it to 4000-5000ms
       // so the Member No. confirmation is actually readable.
     });
   ========================================================================== */
