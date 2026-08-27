'use strict';

const API_URL = 'https://script.google.com/macros/s/AKfycbwIDbi4ssSEF7rn6l_rljcufKUydMGs5pYeW9BjbbvA2SLekoIvyAyiJBw6i9CqyCkg/exec';

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
};

function calcTier(spend) {
  return TIERS.find(t => spend >= t.min) || TIERS[TIERS.length - 1];
}

function getBenefits(tierName) {
  const tier = TIERS.find(t => t.name === tierName) || TIERS[TIERS.length - 1];
  return tier.benefits;
}

function tierProgress(member) {
  const spend = Number(member.tierWindowSpend) || 0;
  const currentIndex = TIERS.findIndex(t => t.name === member.tier);
  const next = currentIndex > 0 ? TIERS[currentIndex - 1] : null;

  if (!next) {
    return { nextTier: null, remaining: 0, progress: 1 };
  }

  const range = next.min - (TIERS[currentIndex] ? TIERS[currentIndex].min : 0);
  const into = spend - (TIERS[currentIndex] ? TIERS[currentIndex].min : 0);
  const remaining = Math.max(0, next.min - spend);
  const progress = range > 0 ? Math.min(1, Math.max(0, into / range)) : 1;
  return { nextTier: next.name, remaining, progress };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

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

async function registerMember(input, pin) {
  try {
    const payload = { input };
    if (pin) payload.pin = pin;
    return await apiCall('register', payload);
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
    result = await apiCall('lookup', { phone: lueriNormalizePhone(phone) });
  } catch (err) {
    return null;
  }

  if (!result.success || !result.member) {
    return { error: (result && result.errors && result.errors[0]) || null };
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
    transactions: Array.isArray(result.transactions) ? result.transactions : [],
  };
}

function getMemberTransactions(summaryOrId) {
  if (summaryOrId && Array.isArray(summaryOrId.transactions)) {
    return summaryOrId.transactions;
  }
  return [];
}

async function staffAuth(pin) {
  try {
    return await apiCall('staffAuth', { pin });
  } catch (err) {
    return { success: false, errors: ['Could not reach the rewards server.'] };
  }
}

async function listMembers(pin) {
  try {
    return await apiCall('listMembers', { pin });
  } catch (err) {
    return { success: false, errors: ['Could not reach the rewards server.'], members: [] };
  }
}

async function addTransaction(input) {
  try {
    return await apiCall('addTransaction', input);
  } catch (err) {
    return {
      success: false,
      errors: ['Could not reach the rewards server. Check your connection and try again.'],
      member: null,
    };
  }
}
