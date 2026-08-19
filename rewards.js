// ============================================================================
// Lueri Rewards — Shared Rewards Engine
// ============================================================================
//
// Used by:
//   - Customer Rewards page
//   - Staff / Dispatcher console
//
// IMPORTANT ARCHITECTURE NOTE
// ---------------------------
// This application currently uses browser localStorage.
// localStorage is:
//   - per browser
//   - per device
//   - not shared between phones/computers
//   - not secure against deliberate browser-side modification
//
// Therefore this is suitable for:
//   - prototype
//   - single-device operation
//   - early-stage testing
//
// It is NOT a true multi-device production database.
//
// Recommended production migration:
//   Google Sheets + Apps Script
//   Airtable
//   Supabase
//   Firebase
//   or another authenticated backend.
//
// ============================================================================

'use strict';

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const LUERI_REWARDS = Object.freeze({
  version: 1,

  storage: {
    storeKey: 'lueriRewardsData_v1',
    voucherKey: 'lueriRewardsVouchers_v1',
  },

  policy: {
    pointsExpiryDays: 365,

    // 1 point for every KES 50 spent.
    pointsPerKes: 50,

    // Minimum transaction amount that can earn points.
    minimumQualifyingSpend: 0,

    // Voucher codes.
    voucherPrefix: 'LUERI-',
    voucherLength: 6,
  },

  sequences: {
    firstMemberNumber: 1000,
    firstTransactionNumber: 5000,
  },

  company: {
    name: 'Lueri International',
    currency: 'KES',
    country: 'KE',
  },

  // IMPORTANT:
  // Ordered from highest tier to lowest tier.
  tiers: [
    {
      name: 'VIP',
      minSpend: 75000,
      benefits: [
        'Everything in Platinum',
        '20% off all bookings',
        'Unlimited free standard deliveries',
        'Personal account manager',
        'Early access to new services & promotions',
        'Invitations to exclusive Lueri events',
      ],
    },

    {
      name: 'Platinum',
      minSpend: 35000,
      benefits: [
        'Everything in Gold',
        '15% off priority same-day bookings',
        '2 free standard deliveries every month',
        'Priority dispatch queue during peak hours',
        'Quarterly gift voucher',
      ],
    },

    {
      name: 'Gold',
      minSpend: 15000,
      benefits: [
        'Everything in Silver',
        '10% off priority same-day bookings',
        '1 free standard delivery every month',
        'Dedicated dispatcher line',
      ],
    },

    {
      name: 'Silver',
      minSpend: 5000,
      benefits: [
        'Everything in Bronze',
        '5% off priority same-day bookings',
        'KES 200 free delivery credit monthly',
        'Faster WhatsApp response time',
      ],
    },

    {
      name: 'Bronze',
      minSpend: 0,
      benefits: [
        '1 point per KES 50 spent',
        'Standard delivery rates',
        'Birthday bonus points',
        'Access to seasonal promotions',
      ],
    },
  ],
});


/* ==========================================================================
   BACKWARD-COMPATIBLE CONSTANTS
   ========================================================================== */

const STORE_KEY = LUERI_REWARDS.storage.storeKey;
const VOUCHER_KEY = LUERI_REWARDS.storage.voucherKey;

const POINTS_EXPIRY_DAYS =
  LUERI_REWARDS.policy.pointsExpiryDays;

const TIERS = LUERI_REWARDS.tiers.map(tier => ({
  name: tier.name,
  min: tier.minSpend,
}));

const BENEFITS = Object.freeze(
  Object.fromEntries(
    LUERI_REWARDS.tiers.map(tier => [
      tier.name,
      [...tier.benefits],
    ])
  )
);


/* ==========================================================================
   GENERIC UTILITIES
   ========================================================================== */

/**
 * Safely convert a value into a finite number.
 */
function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Clamp a number between min and max.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


/**
 * Create a safe ISO timestamp.
 */
function nowISO() {
  return new Date().toISOString();
}


/**
 * Convert an arbitrary date value into a Date object.
 */
function toDate(value, fallback = new Date()) {
  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? new Date(fallback.getTime())
    : date;
}


/**
 * Return number of days since a date.
 */
function daysSince(value) {
  const date = toDate(value);

  return (
    Date.now() - date.getTime()
  ) / 86400000;
}


/**
 * Format money consistently for Kenya.
 */
function fmt(amount) {
  return (
    'KES ' +
    Math.round(toNumber(amount))
      .toLocaleString('en-KE')
  );
}


/**
 * Format a date for display.
 */
function formatDate(value) {
  const date = toDate(value);

  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}


/**
 * Format date + time.
 */
function formatDateTime(value) {
  const date = toDate(value);

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}


/**
 * Escape HTML when rendering user-controlled data.
 */
function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/**
 * Generate a random identifier.
 */
function randomId(prefix = 'id') {
  if (
    typeof crypto !== 'undefined' &&
    crypto.getRandomValues
  ) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);

    const randomPart = Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    return `${prefix}_${randomPart}`;
  }

  return (
    `${prefix}_${Date.now()}_` +
    Math.random().toString(36).slice(2, 10)
  );
}


/* ==========================================================================
   PHONE NORMALIZATION
   ========================================================================== */

/**
 * Normalize a Kenyan phone number.
 *
 * Examples:
 *   0713261719
 *   254713261719
 *   +254713261719
 *
 * become:
 *   0713261719
 */
function normalizePhone(phone) {
  let value = String(phone || '')
    .trim()
    .replace(/[()\s-]/g, '');

  if (value.startsWith('+254')) {
    value = '0' + value.slice(4);
  } else if (value.startsWith('254')) {
    value = '0' + value.slice(3);
  }

  return value;
}


/**
 * Basic Kenyan phone validation.
 *
 * This intentionally remains practical rather than overly restrictive.
 */
function isValidPhone(phone) {
  const normalized = normalizePhone(phone);

  return /^(07\d{8}|01\d{8})$/.test(normalized);
}


/* ==========================================================================
   TIER ENGINE
   ========================================================================== */

/**
 * Determine tier from lifetime spend.
 */
function calcTier(spend) {
  const amount = Math.max(0, toNumber(spend));

  const tier = LUERI_REWARDS.tiers.find(
    item => amount >= item.minSpend
  );

  return tier
    ? tier.name
    : 'Bronze';
}


/**
 * Return tier configuration.
 */
function getTier(tierName) {
  return (
    LUERI_REWARDS.tiers.find(
      tier => tier.name === tierName
    ) || LUERI_REWARDS.tiers[
      LUERI_REWARDS.tiers.length - 1
    ]
  );
}


/**
 * Get the next tier.
 */
function nextTier(tierName) {
  const index = LUERI_REWARDS.tiers.findIndex(
    tier => tier.name === tierName
  );

  return index > 0
    ? LUERI_REWARDS.tiers[index - 1]
    : null;
}


/**
 * Amount remaining before next tier.
 */
function amountToNextTier(member) {
  const tierName = calcTier(member.lifetimeSpend);
  const next = nextTier(tierName);

  if (!next) {
    return 0;
  }

  return Math.max(
    0,
    next.minSpend - toNumber(member.lifetimeSpend)
  );
}


/**
 * Progress through current tier toward next tier.
 */
function tierProgress(member) {
  const spend = Math.max(
    0,
    toNumber(member.lifetimeSpend)
  );

  const current = getTier(calcTier(spend));
  const next = nextTier(current.name);

  if (!next) {
    return {
      currentTier: current.name,
      nextTier: null,
      progress: 100,
      remaining: 0,
    };
  }

  const range =
    next.minSpend - current.minSpend;

  const progress = range > 0
    ? ((spend - current.minSpend) / range) * 100
    : 100;

  return {
    currentTier: current.name,
    nextTier: next.name,
    progress: clamp(progress, 0, 100),
    remaining: Math.max(
      0,
      next.minSpend - spend
    ),
  };
}


/**
 * Return benefits for a member.
 */
function getBenefits(tierName) {
  return [...(BENEFITS[tierName] || BENEFITS.Bronze)];
}


/* ==========================================================================
   POINTS ENGINE
   ========================================================================== */

/**
 * Calculate points earned from qualifying spend.
 *
 * Example:
 *   KES 400 = 8 points
 *   KES 1,250 = 25 points
 */
function calculatePoints(amount) {
  const spend = Math.max(
    0,
    toNumber(amount)
  );

  if (
    spend <
    LUERI_REWARDS.policy.minimumQualifyingSpend
  ) {
    return 0;
  }

  return Math.floor(
    spend / LUERI_REWARDS.policy.pointsPerKes
  );
}


/**
 * Calculate exact spend represented by points.
 */
function pointsToSpend(points) {
  return (
    Math.max(0, toNumber(points)) *
    LUERI_REWARDS.policy.pointsPerKes
  );
}


/* ==========================================================================
   DEFAULT DATA STRUCTURES
   ========================================================================== */

function createEmptyStore() {
  return {
    version: LUERI_REWARDS.version,
    members: [],
    transactions: [],
    memberSeq:
      LUERI_REWARDS.sequences.firstMemberNumber,
    txSeq:
      LUERI_REWARDS.sequences.firstTransactionNumber,
    updatedAt: nowISO(),
  };
}


function createEmptyVoucherList() {
  return [];
}


/* ==========================================================================
   DATA SANITIZATION
   ========================================================================== */

function sanitizeMember(member) {
  if (!member || typeof member !== 'object') {
    return null;
  }

  const lifetimeSpend = Math.max(
    0,
    toNumber(
      member.lifetimeSpend ??
      member.spend ??
      member.totalSpend
    )
  );

  const points = Math.max(
    0,
    Math.floor(
      toNumber(member.points)
    )
  );

  const tier = calcTier(lifetimeSpend);

  return {
    ...member,

    id: member.id || randomId('member'),

    memberNumber:
      member.memberNumber ??
      member.memberId ??
      null,

    name: String(member.name || '').trim(),

    phone: normalizePhone(member.phone),

    email:
      String(member.email || '')
        .trim()
        .toLowerCase(),

    birthday:
      member.birthday || '',

    joinedRaw:
      member.joinedRaw ||
      member.joinedAt ||
      nowISO(),

    lastActivity:
      member.lastActivity ||
      member.joinedRaw ||
      nowISO(),

    lifetimeSpend,

    points,

    expiredPoints: Math.max(
      0,
      Math.floor(
        toNumber(member.expiredPoints)
      )
    ),

    tier,

    status:
      member.status ||
      'active',

    notes:
      String(member.notes || '').trim(),

    createdAt:
      member.createdAt ||
      member.joinedRaw ||
      nowISO(),

    updatedAt:
      nowISO(),
  };
}


function sanitizeTransaction(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    return null;
  }

  return {
    ...transaction,

    id:
      transaction.id ||
      randomId('tx'),

    transactionNumber:
      transaction.transactionNumber ??
      transaction.txId ??
      null,

    memberId:
      transaction.memberId ||
      null,

    memberNumber:
      transaction.memberNumber ||
      null,

    type:
      transaction.type ||
      'sale',

    amount:
      toNumber(transaction.amount),

    points:
      Math.floor(
        toNumber(transaction.points)
      ),

    description:
      String(
        transaction.description || ''
      ).trim(),

    reference:
      String(
        transaction.reference || ''
      ).trim(),

    date:
      transaction.date ||
      transaction.createdAt ||
      nowISO(),

    createdAt:
      transaction.createdAt ||
      transaction.date ||
      nowISO(),

    createdBy:
      String(
        transaction.createdBy || ''
      ).trim(),
  };
}


/* ==========================================================================
   STORAGE
   ========================================================================== */

function loadStore() {
  try {
    const raw =
      localStorage.getItem(STORE_KEY);

    if (!raw) {
      return createEmptyStore();
    }

    const parsed = JSON.parse(raw);

    const store = {
      ...createEmptyStore(),
      ...parsed,
    };

    store.members = Array.isArray(parsed.members)
      ? parsed.members
          .map(sanitizeMember)
          .filter(Boolean)
      : [];

    store.transactions =
      Array.isArray(parsed.transactions)
        ? parsed.transactions
            .map(sanitizeTransaction)
            .filter(Boolean)
        : [];

    store.memberSeq =
      Math.max(
        LUERI_REWARDS.sequences.firstMemberNumber,
        toNumber(
          parsed.memberSeq,
          LUERI_REWARDS.sequences.firstMemberNumber
        )
      );

    store.txSeq =
      Math.max(
        LUERI_REWARDS.sequences.firstTransactionNumber,
        toNumber(
          parsed.txSeq,
          LUERI_REWARDS.sequences.firstTransactionNumber
        )
      );

    return store;

  } catch (error) {
    console.error(
      '[Lueri Rewards] Could not load store:',
      error
    );

    return createEmptyStore();
  }
}


function saveStoreData(data) {
  try {
    data.updatedAt = nowISO();

    localStorage.setItem(
      STORE_KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {
    console.error(
      '[Lueri Rewards] Could not save store:',
      error
    );

    return false;
  }
}


/**
 * Clear ALL rewards data.
 *
 * This is intentionally explicit because it is destructive.
 */
function clearRewardsStore() {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(VOUCHER_KEY);
}


/* ==========================================================================
   VOUCHER STORAGE
   ========================================================================== */

function loadVouchers() {
  try {
    const raw =
      localStorage.getItem(VOUCHER_KEY);

    if (!raw) {
      return createEmptyVoucherList();
    }

    const list = JSON.parse(raw);

    return Array.isArray(list)
      ? list
      : [];

  } catch (error) {
    console.error(
      '[Lueri Rewards] Could not load vouchers:',
      error
    );

    return [];
  }
}


function saveVouchers(list) {
  try {
    localStorage.setItem(
      VOUCHER_KEY,
      JSON.stringify(list)
    );

    return true;

  } catch (error) {
    console.error(
      '[Lueri Rewards] Could not save vouchers:',
      error
    );

    return false;
  }
}


/* ==========================================================================
   MEMBER NUMBER GENERATION
   ========================================================================== */

function generateMemberNumber(store) {
  store.memberSeq =
    Math.max(
      store.memberSeq,
      LUERI_REWARDS.sequences.firstMemberNumber
    ) + 1;

  return `LR-${store.memberSeq}`;
}


function generateTransactionNumber(store) {
  store.txSeq =
    Math.max(
      store.txSeq,
      LUERI_REWARDS.sequences.firstTransactionNumber
    ) + 1;

  return `TX-${store.txSeq}`;
}


/* ==========================================================================
   MEMBER LOOKUP
   ========================================================================== */

function findMemberById(memberId, store = loadStore()) {
  return (
    store.members.find(
      member => member.id === memberId
    ) || null
  );
}


function findMemberByNumber(
  memberNumber,
  store = loadStore()
) {
  const value =
    String(memberNumber || '')
      .trim()
      .toUpperCase();

  return (
    store.members.find(
      member =>
        String(member.memberNumber)
          .toUpperCase() === value
    ) || null
  );
}


function findMemberByPhone(
  phone,
  store = loadStore()
) {
  const normalized =
    normalizePhone(phone);

  return (
    store.members.find(
      member =>
        normalizePhone(member.phone) ===
        normalized
    ) || null
  );
}


function findMember(
  identifier,
  store = loadStore()
) {
  if (!identifier) {
    return null;
  }

  const value =
    String(identifier).trim();

  return (
    findMemberById(value, store) ||
    findMemberByNumber(value, store) ||
    findMemberByPhone(value, store)
  );
}


/* ==========================================================================
   POINTS EXPIRY
   ========================================================================== */

/**
 * Apply rolling 12-month inactivity expiry.
 *
 * Points expire only when:
 *   - member has points
 *   - more than 365 days have passed since last activity
 *
 * Lifetime spend and tier are NOT affected.
 */
function applyExpiryPolicy(member) {
  if (!member) {
    return null;
  }

  const last =
    member.lastActivity
      ? toDate(member.lastActivity)
      : toDate(member.joinedRaw || nowISO());

  const inactiveDays =
    (Date.now() - last.getTime()) /
    86400000;

  if (
    inactiveDays >
      LUERI_REWARDS.policy.pointsExpiryDays &&
    toNumber(member.points) > 0
  ) {
    member.expiredPoints =
      Math.max(
        0,
        Math.floor(
          toNumber(member.expiredPoints)
        )
      ) +
      Math.floor(
        toNumber(member.points)
      );

    member.points = 0;
    member.updatedAt = nowISO();
  }

  return member;
}


/**
 * Apply expiry to every member.
 */
function applyExpiryToAllMembers() {
  const store = loadStore();

  store.members.forEach(
    member => applyExpiryPolicy(member)
  );

  saveStoreData(store);

  return store.members;
}


/* ==========================================================================
   MEMBER REGISTRATION
   ========================================================================== */

function validateMemberInput(input) {
  const errors = [];

  if (
    !input ||
    typeof input !== 'object'
  ) {
    return ['Member information is required.'];
  }

  if (!String(input.name || '').trim()) {
    errors.push('Customer name is required.');
  }

  if (!isValidPhone(input.phone)) {
    errors.push(
      'Enter a valid Kenyan phone number.'
    );
  }

  if (
    input.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(input.email).trim()
    )
  ) {
    errors.push(
      'Enter a valid email address.'
    );
  }

  return errors;
}


/**
 * Register a new rewards member.
 */
function registerMember(input = {}) {
  const errors =
    validateMemberInput(input);

  if (errors.length) {
    return {
      success: false,
      errors,
      member: null,
    };
  }

  const store = loadStore();

  const phone =
    normalizePhone(input.phone);

  const existing =
    findMemberByPhone(phone, store);

  if (existing) {
    return {
      success: false,
      errors: [
        'A rewards member already exists with this phone number.',
      ],
      member: existing,
      existing: true,
    };
  }

  const member = sanitizeMember({
    id: randomId('member'),

    memberNumber:
      generateMemberNumber(store),

    name:
      String(input.name).trim(),

    phone,

    email:
      String(input.email || '')
        .trim()
        .toLowerCase(),

    birthday:
      input.birthday || '',

    joinedRaw:
      nowISO(),

    lastActivity:
      nowISO(),

    lifetimeSpend: 0,

    points: 0,

    expiredPoints: 0,

    tier: 'Bronze',

    status: 'active',

    notes:
      String(input.notes || '').trim(),

    createdAt:
      nowISO(),

    updatedAt:
      nowISO(),
  });

  store.members.push(member);

  if (!saveStoreData(store)) {
    return {
      success: false,
      errors: [
        'Could not save the new member to this browser.',
      ],
      member: null,
    };
  }

  return {
    success: true,
    errors: [],
    member,
    existing: false,
  };
}


/* ==========================================================================
   MEMBER UPDATE
   ========================================================================== */

function updateMember(memberId, updates = {}) {
  const store = loadStore();

  const member =
    findMemberById(memberId, store);

  if (!member) {
    return {
      success: false,
      errors: ['Member not found.'],
      member: null,
    };
  }

  if (updates.phone) {
    const phone =
      normalizePhone(updates.phone);

    if (!isValidPhone(phone)) {
      return {
        success: false,
        errors: [
          'Enter a valid Kenyan phone number.',
        ],
        member,
      };
    }

    const duplicate =
      store.members.find(
        item =>
          item.id !== member.id &&
          normalizePhone(item.phone) === phone
      );

    if (duplicate) {
      return {
        success: false,
        errors: [
          'Another member already uses this phone number.',
        ],
        member,
      };
    }

    member.phone = phone;
  }

  if (updates.name !== undefined) {
    const name =
      String(updates.name).trim();

    if (!name) {
      return {
        success: false,
        errors: [
          'Customer name cannot be empty.',
        ],
        member,
      };
    }

    member.name = name;
  }

  if (updates.email !== undefined) {
    member.email =
      String(updates.email || '')
        .trim()
        .toLowerCase();
  }

  if (updates.birthday !== undefined) {
    member.birthday =
      String(updates.birthday || '');
  }

  if (updates.status !== undefined) {
    const allowed = [
      'active',
      'suspended',
      'inactive',
    ];

    if (!allowed.includes(updates.status)) {
      return {
        success: false,
        errors: ['Invalid member status.'],
        member,
      };
    }

    member.status = updates.status;
  }

  if (updates.notes !== undefined) {
    member.notes =
      String(updates.notes || '').trim();
  }

  member.tier =
    calcTier(member.lifetimeSpend);

  member.updatedAt =
    nowISO();

  saveStoreData(store);

  return {
    success: true,
    errors: [],
    member,
  };
}


/* ==========================================================================
   TRANSACTIONS
   ========================================================================== */

/**
 * Add a customer transaction.
 *
 * Default transaction type:
 *   sale
 *
 * Other supported types:
 *   adjustment
 *   refund
 *
 * SALE:
 *   increases lifetime spend and points
 *
 * REFUND:
 *   decreases lifetime spend and removes corresponding points,
 *   but never below zero.
 *
 * ADJUSTMENT:
 *   intended for staff corrections.
 *
 * For financial reconciliation, a backend should eventually be used.
 */
function addTransaction(input = {}) {
  const store = loadStore();

  const member =
    findMember(
      input.memberId ||
      input.memberNumber ||
      input.phone,
      store
    );

  if (!member) {
    return {
      success: false,
      errors: ['Member not found.'],
      transaction: null,
      member: null,
    };
  }

  if (member.status !== 'active') {
    return {
      success: false,
      errors: [
        `Member account is ${member.status}.`,
      ],
      transaction: null,
      member,
    };
  }

  applyExpiryPolicy(member);

  const amount =
    Math.round(
      Math.max(
        0,
        toNumber(input.amount)
      )
    );

  if (amount <= 0) {
    return {
      success: false,
      errors: [
        'Transaction amount must be greater than zero.',
      ],
      transaction: null,
      member,
    };
  }

  const type =
    String(input.type || 'sale')
      .toLowerCase();

  const allowedTypes = [
    'sale',
    'refund',
    'adjustment',
  ];

  if (!allowedTypes.includes(type)) {
    return {
      success: false,
      errors: ['Invalid transaction type.'],
      transaction: null,
      member,
    };
  }

  /*
   * Prevent accidental duplicate submissions.
   */
  if (input.reference) {
    const duplicate =
      store.transactions.find(
        transaction =>
          transaction.memberId === member.id &&
          transaction.reference ===
            String(input.reference).trim()
      );

    if (duplicate) {
      return {
        success: false,
        errors: [
          'A transaction with this reference already exists for this member.',
        ],
        transaction: duplicate,
        member,
        duplicate: true,
      };
    }
  }

  const basePoints =
    calculatePoints(amount);

  let spendDelta = 0;
  let pointsDelta = 0;

  if (type === 'sale') {
    spendDelta = amount;
    pointsDelta = basePoints;
  }

  if (type === 'refund') {
    spendDelta = -amount;
    pointsDelta = -basePoints;
  }

  if (type === 'adjustment') {
    spendDelta =
      toNumber(input.spendDelta, 0);

    pointsDelta =
      Math.floor(
        toNumber(input.pointsDelta, 0)
      );
  }

  member.lifetimeSpend =
    Math.max(
      0,
      toNumber(member.lifetimeSpend) +
        spendDelta
    );

  member.points =
    Math.max(
      0,
      Math.floor(
        toNumber(member.points) +
          pointsDelta
      )
    );

  member.tier =
    calcTier(member.lifetimeSpend);

  member.lastActivity =
    nowISO();

  member.updatedAt =
    nowISO();

  const transaction =
    sanitizeTransaction({
      id: randomId('tx'),

      transactionNumber:
        generateTransactionNumber(store),

      memberId:
        member.id,

      memberNumber:
        member.memberNumber,

      type,

      amount,

      points:
        pointsDelta,

      spendDelta,

      description:
        input.description || '',

      reference:
        input.reference || '',

      date:
        input.date || nowISO(),

      createdAt:
        nowISO(),

      createdBy:
        input.createdBy || '',
    });

  store.transactions.push(
    transaction
  );

  if (!saveStoreData(store)) {
    return {
      success: false,
      errors: [
        'Could not save the transaction.',
      ],
      transaction: null,
      member,
    };
  }

  return {
    success: true,
    errors: [],
    transaction,
    member,
    pointsEarned:
      type === 'sale'
        ? basePoints
        : 0,
  };
}


/* ==========================================================================
   MEMBER TRANSACTION HISTORY
   ========================================================================== */

function getMemberTransactions(
  memberIdentifier,
  store = loadStore()
) {
  const member =
    findMember(
      memberIdentifier,
      store
    );

  if (!member) {
    return [];
  }

  return store.transactions
    .filter(
      transaction =>
        transaction.memberId === member.id
    )
    .sort(
      (a, b) =>
        toDate(b.date) -
        toDate(a.date)
    );
}


/* ==========================================================================
   REWARDS SUMMARY
   ========================================================================== */

function getMemberSummary(
  memberIdentifier
) {
  const store = loadStore();

  const member =
    findMember(
      memberIdentifier,
      store
    );

  if (!member) {
    return null;
  }

  applyExpiryPolicy(member);

  member.tier =
    calcTier(member.lifetimeSpend);

  saveStoreData(store);

  const progress =
    tierProgress(member);

  return {
    member,

    tier:
      member.tier,

    benefits:
      getBenefits(member.tier),

    points:
      member.points,

    expiredPoints:
      member.expiredPoints,

    lifetimeSpend:
      member.lifetimeSpend,

    nextTier:
      progress.nextTier,

    amountToNextTier:
      progress.remaining,

    tierProgress:
      progress.progress,

    pointsExpiryDays:
      POINTS_EXPIRY_DAYS,

    lastActivity:
      member.lastActivity,
  };
}


/* ==========================================================================
   SEARCH
   ========================================================================== */

function searchMembers(query = '') {
  const store = loadStore();

  const value =
    String(query)
      .trim()
      .toLowerCase();

  if (!value) {
    return store.members;
  }

  return store.members.filter(member => {
    return [
      member.name,
      member.phone,
      member.email,
      member.memberNumber,
      member.tier,
    ]
      .filter(Boolean)
      .some(field =>
        String(field)
          .toLowerCase()
          .includes(value)
      );
  });
}


/* ==========================================================================
   VOUCHERS
   ========================================================================== */

/**
 * Generate a human-friendly voucher code.
 */
function generateVoucherCode() {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let code =
    LUERI_REWARDS.policy.voucherPrefix;

  for (
    let i = 0;
    i < LUERI_REWARDS.policy.voucherLength;
    i++
  ) {
    const index =
      Math.floor(
        Math.random() * chars.length
      );

    code += chars[index];
  }

  return code;
}


/**
 * Guarantee uniqueness.
 */
function generateUniqueVoucherCode(
  vouchers = loadVouchers()
) {
  let code;

  do {
    code =
      generateVoucherCode();
  } while (
    vouchers.some(
      voucher =>
        voucher.code === code
    )
  );

  return code;
}


/**
 * Create a voucher.
 *
 * This function does NOT automatically deduct points.
 * The caller explicitly supplies the points cost.
 */
function createVoucher({
  memberIdentifier,
  pointsCost,
  value,
  expiresAt = null,
  createdBy = '',
  description = '',
} = {}) {
  const store = loadStore();

  const member =
    findMember(
      memberIdentifier,
      store
    );

  if (!member) {
    return {
      success: false,
      errors: ['Member not found.'],
      voucher: null,
      member: null,
    };
  }

  applyExpiryPolicy(member);

  const cost =
    Math.floor(
      Math.max(
        0,
        toNumber(pointsCost)
      )
    );

  if (cost <= 0) {
    return {
      success: false,
      errors: [
        'Voucher points cost must be greater than zero.',
      ],
      voucher: null,
      member,
    };
  }

  if (member.points < cost) {
    return {
      success: false,
      errors: [
        'Member does not have enough points.',
      ],
      voucher: null,
      member,
    };
  }

  const voucherList =
    loadVouchers();

  const code =
    generateUniqueVoucherCode(
      voucherList
    );

  member.points -= cost;

  member.updatedAt =
    nowISO();

  const voucher = {
    id: randomId('voucher'),

    code,

    memberId:
      member.id,

    memberNumber:
      member.memberNumber,

    pointsCost:
      cost,

    value:
      Math.max(
        0,
        toNumber(value)
      ),

    currency:
      LUERI_REWARDS.company.currency,

    description:
      String(description || '').trim(),

    status:
      'active',

    createdAt:
      nowISO(),

    expiresAt:
      expiresAt
        ? toDate(expiresAt).toISOString()
        : null,

    createdBy:
      String(createdBy || '').trim(),

    redeemedAt:
      null,

    redeemedBy:
      '',
  };

  voucherList.push(voucher);

  if (
    !saveStoreData(store) ||
    !saveVouchers(voucherList)
  ) {
    return {
      success: false,
      errors: [
        'Could not save the voucher.',
      ],
      voucher: null,
      member,
    };
  }

  return {
    success: true,
    errors: [],
    voucher,
    member,
  };
}


/**
 * Find voucher by code.
 */
function findVoucher(
  code,
  vouchers = loadVouchers()
) {
  const normalized =
    String(code || '')
      .trim()
      .toUpperCase();

  return (
    vouchers.find(
      voucher =>
        String(voucher.code)
          .toUpperCase() ===
        normalized
    ) || null
  );
}


/**
 * Redeem voucher.
 */
function redeemVoucher(
  code,
  redeemedBy = ''
) {
  const vouchers =
    loadVouchers();

  const voucher =
    findVoucher(code, vouchers);

  if (!voucher) {
    return {
      success: false,
      errors: ['Voucher not found.'],
      voucher: null,
    };
  }

  if (voucher.status !== 'active') {
    return {
      success: false,
      errors: [
        `Voucher is ${voucher.status}.`,
      ],
      voucher,
    };
  }

  if (
    voucher.expiresAt &&
    new Date(voucher.expiresAt) <
      new Date()
  ) {
    voucher.status =
      'expired';

    saveVouchers(vouchers);

    return {
      success: false,
      errors: ['Voucher has expired.'],
      voucher,
    };
  }

  voucher.status =
    'redeemed';

  voucher.redeemedAt =
    nowISO();

  voucher.redeemedBy =
    String(redeemedBy || '').trim();

  saveVouchers(vouchers);

  return {
    success: true,
    errors: [],
    voucher,
  };
}


/**
 * Get all vouchers belonging to a member.
 */
function getMemberVouchers(
  memberIdentifier
) {
  const store = loadStore();

  const member =
    findMember(
      memberIdentifier,
      store
    );

  if (!member) {
    return [];
  }

  return loadVouchers()
    .filter(
      voucher =>
        voucher.memberId === member.id
    )
    .sort(
      (a, b) =>
        toDate(b.createdAt) -
        toDate(a.createdAt)
    );
}


/* ==========================================================================
   DASHBOARD STATISTICS
   ========================================================================== */

function getDashboardStats() {
  const store = loadStore();

  store.members.forEach(
    member => applyExpiryPolicy(member)
  );

  saveStoreData(store);

  const activeMembers =
    store.members.filter(
      member =>
        member.status === 'active'
    );

  const totalSpend =
    store.members.reduce(
      (sum, member) =>
        sum +
        toNumber(member.lifetimeSpend),
      0
    );

  const totalPoints =
    store.members.reduce(
      (sum, member) =>
        sum +
        toNumber(member.points),
      0
    );

  const tierCounts =
    LUERI_REWARDS.tiers.reduce(
      (result, tier) => {
        result[tier.name] =
          store.members.filter(
            member =>
              member.tier === tier.name
          ).length;

        return result;
      },
      {}
    );

  const transactions =
    store.transactions;

  const sales =
    transactions.filter(
      transaction =>
        transaction.type === 'sale'
    );

  const refunds =
    transactions.filter(
      transaction =>
        transaction.type === 'refund'
    );

  return {
    totalMembers:
      store.members.length,

    activeMembers:
      activeMembers.length,

    totalTransactions:
      transactions.length,

    totalSales:
      sales.length,

    totalRefunds:
      refunds.length,

    totalLifetimeSpend:
      totalSpend,

    totalPoints:
      totalPoints,

    totalVouchers:
      loadVouchers().length,

    tierCounts,
  };
}


/* ==========================================================================
   EXPORT / BACKUP
   ========================================================================== */

/**
 * Export all rewards data as JSON.
 *
 * Useful because localStorage is fragile.
 */
function exportRewardsData() {
  const store =
    loadStore();

  const vouchers =
    loadVouchers();

  return {
    exportedAt:
      nowISO(),

    application:
      'Lueri Rewards',

    version:
      LUERI_REWARDS.version,

    store,

    vouchers,
  };
}


/**
 * Download backup as a JSON file.
 */
function downloadRewardsBackup() {
  const data =
    exportRewardsData();

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        ),
      ],
      {
        type:
          'application/json',
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  link.href = url;

  link.download =
    `lueri-rewards-backup-${date}.json`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


/**
 * Import a previously exported backup.
 *
 * This replaces current local rewards data.
 */
function importRewardsData(data) {
  try {
    if (
      !data ||
      typeof data !== 'object'
    ) {
      throw new Error(
        'Invalid backup file.'
      );
    }

    if (
      !data.store ||
      !Array.isArray(
        data.store.members
      ) ||
      !Array.isArray(
        data.store.transactions
      )
    ) {
      throw new Error(
        'Backup structure is invalid.'
      );
    }

    const store = {
      ...createEmptyStore(),
      ...data.store,

      members:
        data.store.members
          .map(sanitizeMember)
          .filter(Boolean),

      transactions:
        data.store.transactions
          .map(sanitizeTransaction)
          .filter(Boolean),

      updatedAt:
        nowISO(),
    };

    const vouchers =
      Array.isArray(data.vouchers)
        ? data.vouchers
        : [];

    saveStoreData(store);
    saveVouchers(vouchers);

    return {
      success: true,
      errors: [],
      store,
      vouchers,
    };

  } catch (error) {
    console.error(
      '[Lueri Rewards] Import failed:',
      error
    );

    return {
      success: false,
      errors: [
        error.message ||
        'Could not import backup.',
      ],
      store: null,
      vouchers: [],
    };
  }
}


/* ==========================================================================
   DATA INTEGRITY / REPAIR
   ========================================================================== */

/**
 * Recalculate all member tiers and balances from transaction history.
 *
 * This is particularly useful after manually editing localStorage or
 * migrating data.
 *
 * IMPORTANT:
 * Existing expired points are preserved.
 */
function rebuildMemberBalances() {
  const store = loadStore();

  store.members.forEach(member => {
    const transactions =
      store.transactions.filter(
        transaction =>
          transaction.memberId ===
          member.id
      );

    let spend = 0;
    let points = 0;

    transactions.forEach(
      transaction => {
        const type =
          transaction.type;

        if (type === 'sale') {
          spend +=
            Math.max(
              0,
              toNumber(
                transaction.amount
              )
            );

          points +=
            Math.max(
              0,
              Math.floor(
                toNumber(
                  transaction.points
                )
              )
            );
        }

        if (type === 'refund') {
          spend -=
            Math.max(
              0,
              toNumber(
                transaction.amount
              )
            );

          points -=
            Math.max(
              0,
              Math.floor(
                toNumber(
                  transaction.points
                )
              )
            );
        }

        if (type === 'adjustment') {
          spend +=
            toNumber(
              transaction.spendDelta
            );

          points +=
            Math.floor(
              toNumber(
                transaction.points
              )
            );
        }
      }
    );

    member.lifetimeSpend =
      Math.max(0, spend);

    member.points =
      Math.max(
        0,
        Math.floor(points)
      );

    member.tier =
      calcTier(member.lifetimeSpend);

    member.updatedAt =
      nowISO();
  });

  saveStoreData(store);

  return store;
}


/* ==========================================================================
   EVENT SYSTEM
   ========================================================================== */

function emitRewardsEvent(
  eventName,
  detail = {}
) {
  try {
    window.dispatchEvent(
      new CustomEvent(
        `lueri:${eventName}`,
        {
          detail,
        }
      )
    );
  } catch (error) {
    // Older browsers / restricted environments.
    console.warn(
      '[Lueri Rewards] Event could not be emitted:',
      error
    );
  }
}


/* ==========================================================================
   WRAPPED OPERATIONS WITH EVENTS
   ========================================================================== */

const RewardsAPI = {

  /* Configuration */
  config:
    LUERI_REWARDS,

  /* Formatting */
  fmt,
  formatDate,
  formatDateTime,
  escapeHTML,

  /* Phone */
  normalizePhone,
  isValidPhone,

  /* Tiers */
  calcTier,
  getTier,
  nextTier,
  amountToNextTier,
  tierProgress,
  getBenefits,

  /* Points */
  calculatePoints,
  pointsToSpend,

  /* Members */
  registerMember,
  updateMember,
  findMember,
  findMemberById,
  findMemberByNumber,
  findMemberByPhone,
  searchMembers,
  getMemberSummary,

  /* Transactions */
  addTransaction,
  getMemberTransactions,

  /* Expiry */
  applyExpiryPolicy,
  applyExpiryToAllMembers,

  /* Vouchers */
  generateVoucherCode,
  createVoucher,
  findVoucher,
  redeemVoucher,
  getMemberVouchers,

  /* Dashboard */
  getDashboardStats,

  /* Backup */
  exportRewardsData,
  downloadRewardsBackup,
  importRewardsData,

  /* Maintenance */
  rebuildMemberBalances,

  /* Storage */
  loadStore,
  saveStoreData,
  loadVouchers,
  saveVouchers,
  clearRewardsStore,
};


/* ==========================================================================
   GLOBAL EXPORT
   ========================================================================== */

/**
 * Expose a single namespace:
 *
 *   LueriRewards.registerMember(...)
 *   LueriRewards.addTransaction(...)
 *   LueriRewards.getMemberSummary(...)
 *
 * This keeps the global window clean.
 */
if (typeof window !== 'undefined') {
  window.LueriRewards =
    RewardsAPI;
}


/* ==========================================================================
   OPTIONAL BACKWARD COMPATIBILITY
   ==========================================================================
   
   These functions preserve compatibility with the earlier implementation
   you showed me.

   Existing pages can continue calling:
   
     calcTier()
     nextTier()
     loadStore()
     saveStoreData()
     applyExpiryPolicy()
     loadVouchers()
     saveVouchers()
     generateVoucherCode()
     fmt()
     normalizePhone()

   New code should preferably use:
   
     LueriRewards.calcTier()
     LueriRewards.loadStore()
     etc.
   
   ========================================================================== */

if (typeof window !== 'undefined') {

  window.calcTier =
    window.calcTier || calcTier;

  window.nextTier =
    window.nextTier || nextTier;

  window.isWeekend =
    window.isWeekend ||
    function isWeekend() {
      const day =
        new Date().getDay();

      return (
        day === 0 ||
        day === 6
      );
    };

  window.fmt =
    window.fmt || fmt;

  window.normalizePhone =
    window.normalizePhone ||
    normalizePhone;

  window.loadStore =
    window.loadStore ||
    loadStore;

  window.saveStoreData =
    window.saveStoreData ||
    saveStoreData;

  window.applyExpiryPolicy =
    window.applyExpiryPolicy ||
    applyExpiryPolicy;

  window.loadVouchers =
    window.loadVouchers ||
    loadVouchers;

  window.saveVouchers =
    window.saveVouchers ||
    saveVouchers;

  window.generateVoucherCode =
    window.generateVoucherCode ||
    generateVoucherCode;
}


/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

(function initializeLueriRewards() {

  try {
    /*
     * Make sure storage exists.
     */
    const store =
      loadStore();

    /*
     * Apply expiry policy on page load.
     */
    let changed = false;

    store.members.forEach(member => {
      const before =
        member.points;

      applyExpiryPolicy(member);

      if (
        before !== member.points
      ) {
        changed = true;
      }

      member.tier =
        calcTier(
          member.lifetimeSpend
        );
    });

    if (changed) {
      saveStoreData(store);
    }

    console.info(
      '[Lueri Rewards] Initialized successfully.',
      {
        version:
          LUERI_REWARDS.version,

        members:
          store.members.length,

        transactions:
          store.transactions.length,
      }
    );

  } catch (error) {

    console.error(
      '[Lueri Rewards] Initialization failed:',
      error
    );

  }

})();
