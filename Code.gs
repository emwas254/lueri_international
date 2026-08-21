/**
 * ============================================================================
 * LUERI REWARDS — GOOGLE SHEETS BACKEND
 * ============================================================================
 *
 * This replaces the browser localStorage engine with a real, shared
 * database: a Google Sheet. Every signup and lookup now goes through this
 * script instead of living only on one customer's phone.
 *
 * SETUP (do this once):
 * 1. Create a new Google Sheet. Name it "Lueri Rewards Database".
 * 2. In the Sheet, go to Extensions > Apps Script.
 * 3. Delete anything in the editor and paste in this entire file.
 * 4. Replace SHEET_ID below with your Sheet's ID (the long string in the
 *    Sheet's URL between /d/ and /edit).
 * 5. Click Deploy > New deployment > type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL it gives you — you'll paste this into
 *    rewards-cloud.js as API_URL.
 * 7. The first time you register or look up a member, this script will
 *    automatically create the "Members" tab with headers for you.
 *
 * WHAT THIS DOES (phase 1 + phase 2):
 * - Phase 1: registration + lookup, persisted centrally instead of living
 *   on one customer's browser.
 * - Phase 2: a PIN-protected transaction endpoint so staff can post a real,
 *   confirmed order amount and have points/tier update automatically.
 *   This is deliberately staff-only — see staff.html. Customers cannot
 *   post their own amounts; that would let anyone self-report a fake spend
 *   and claim VIP benefits for free. The amount must come from whoever
 *   actually quoted and collected payment for the job.
 *
 * SETUP FOR PHASE 2:
 * - Set STAFF_PIN below to a PIN only you and trusted staff know.
 * - Deploy staff.html on the same site (or keep it off the public nav —
 *   it's a working tool, not a customer-facing page).
 * ============================================================================
 */

const SHEET_ID = 'PUT_YOUR_GOOGLE_SHEET_ID_HERE';
const MEMBERS_SHEET = 'Members';
const TRANSACTIONS_SHEET = 'Transactions';
const FIRST_MEMBER_NUMBER = 1000;
const FIRST_TRANSACTION_NUMBER = 5000;

// Change this before deploying. Anyone with this PIN can post transactions
// and award points — treat it like a till password, not a public value.
const STAFF_PIN = 'CHANGE_THIS_PIN';

// 1 point earned per KES 50 spent — matches your existing program rules.
const POINTS_PER_KES = 50;

const MEMBER_HEADERS = [
  'id', 'memberNumber', 'name', 'phone', 'email', 'birthday',
  'joinedRaw', 'lastActivity', 'lifetimeSpend', 'tierWindowSpend',
  'points', 'expiredPoints', 'tier', 'status', 'notes',
  'createdAt', 'updatedAt'
];

const TRANSACTION_HEADERS = [
  'id', 'transactionNumber', 'memberId', 'memberNumber', 'phone',
  'amount', 'points', 'notes', 'createdAt'
];

/* ---------------------------------------------------------------------- */
/* ENTRY POINTS                                                            */
/* ---------------------------------------------------------------------- */

function doPost(e) {
  // A lock stops two people registering at the exact same second from
  // getting the same member number or overwriting each other's row.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    let result;
    switch (action) {
      case 'register':
        result = registerMember(body.input || {});
        break;
      case 'lookup':
        result = lookupMember(body.phone || '');
        break;
      case 'addTransaction':
        result = addTransaction(body);
        break;
      default:
        result = { success: false, errors: ['Unknown action: ' + action], member: null };
    }
    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ success: false, errors: [String(err)], member: null });

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'Lueri Rewards API is live.' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------- */
/* SHEET HELPERS                                                           */
/* ---------------------------------------------------------------------- */

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(MEMBERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(MEMBERS_SHEET);
    sheet.appendRow(MEMBER_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getTransactionsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TRANSACTIONS_SHEET);
    sheet.appendRow(TRANSACTION_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Ordered highest to lowest — matches the tier table on the website.
const TIERS = [
  { name: 'VIP', min: 75000 },
  { name: 'Platinum', min: 35000 },
  { name: 'Gold', min: 15000 },
  { name: 'Silver', min: 5000 },
  { name: 'Bronze', min: 0 },
];

function calcTier(spend) {
  return (TIERS.find(t => spend >= t.min) || TIERS[TIERS.length - 1]).name;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').trim();
}

function findMemberRowByPhone(sheet, phone) {
  const data = sheet.getDataRange().getValues();
  const phoneCol = MEMBER_HEADERS.indexOf('phone');
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][phoneCol]) === phone) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

function rowToMember(row) {
  const member = {};
  MEMBER_HEADERS.forEach((key, i) => { member[key] = row[i]; });
  return member;
}

function nextMemberNumber() {
  // PropertiesService persists across executions, so the counter survives
  // even if the Sheet is edited by hand.
  const props = PropertiesService.getScriptProperties();
  let seq = parseInt(props.getProperty('memberSeq') || String(FIRST_MEMBER_NUMBER), 10);
  seq += 1;
  props.setProperty('memberSeq', String(seq));
  return 'LR-' + seq;
}

function nextTransactionNumber() {
  const props = PropertiesService.getScriptProperties();
  let seq = parseInt(props.getProperty('txSeq') || String(FIRST_TRANSACTION_NUMBER), 10);
  seq += 1;
  props.setProperty('txSeq', String(seq));
  return 'TX-' + seq;
}

/* ---------------------------------------------------------------------- */
/* ACTIONS                                                                 */
/* ---------------------------------------------------------------------- */

function registerMember(input) {
  const name = String(input.name || '').trim();
  const phone = normalizePhone(input.phone);
  const email = String(input.email || '').trim().toLowerCase();

  const errors = [];
  if (!name) errors.push('Name is required.');
  if (!phone) errors.push('Phone number is required.');
  if (errors.length) return { success: false, errors, member: null };

  const sheet = getSheet();
  const existing = findMemberRowByPhone(sheet, phone);
  if (existing) {
    return {
      success: false,
      errors: ['A rewards member already exists with this phone number.'],
      member: rowToMember(existing.row),
      existing: true
    };
  }

  const now = new Date().toISOString();
  const id = 'member_' + Utilities.getUuid();
  const memberNumber = nextMemberNumber();

  const newRow = [
    id, memberNumber, name, phone, email, input.birthday || '',
    now, now, 0, 0, 0, 0, 'Bronze', 'active',
    String(input.notes || '').trim(), now, now
  ];
  sheet.appendRow(newRow);

  return {
    success: true,
    errors: [],
    member: rowToMember(newRow),
    existing: false
  };
}

function lookupMember(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { success: false, errors: ['Phone number is required.'], member: null };
  }

  const sheet = getSheet();
  const existing = findMemberRowByPhone(sheet, normalized);
  if (!existing) {
    return { success: false, errors: ['No rewards member found with that phone number.'], member: null };
  }

  return { success: true, errors: [], member: rowToMember(existing.row) };
}

function findMemberRowByAnyId(sheet, identifier) {
  const data = sheet.getDataRange().getValues();
  const idCol = MEMBER_HEADERS.indexOf('memberNumber');
  const phoneCol = MEMBER_HEADERS.indexOf('phone');
  const normalizedPhone = normalizePhone(identifier);
  const cleanId = String(identifier || '').trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    const rowMemberNumber = String(data[i][idCol] || '').trim().toUpperCase();
    if (rowMemberNumber === cleanId) return { rowIndex: i + 1, row: data[i] };
    if (normalizedPhone && normalizePhone(data[i][phoneCol]) === normalizedPhone) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

/**
 * Post a confirmed transaction and award points. STAFF ONLY — requires the
 * correct PIN. This is the one action that changes a customer's balance,
 * so it must never be reachable by a customer-facing form.
 *
 * Expected body: { action: 'addTransaction', pin, memberIdentifier, amount, notes }
 * memberIdentifier can be a member number (e.g. "LR-1004") or a phone number.
 */
function addTransaction(body) {
  if (String(body.pin || '') !== STAFF_PIN) {
    return { success: false, errors: ['Incorrect staff PIN.'], member: null };
  }

  const identifier = String(body.memberIdentifier || '').trim();
  const amount = Number(body.amount);

  if (!identifier) {
    return { success: false, errors: ['Member number or phone is required.'], member: null };
  }
  if (!amount || amount <= 0) {
    return { success: false, errors: ['Enter a valid order amount greater than zero.'], member: null };
  }

  const sheet = getSheet();
  const found = findMemberRowByAnyId(sheet, identifier);
  if (!found) {
    return { success: false, errors: ['No member found with that number.'], member: null };
  }

  const member = rowToMember(found.row);
  const pointsEarned = Math.floor(amount / POINTS_PER_KES);

  const newLifetimeSpend = (Number(member.lifetimeSpend) || 0) + amount;
  const newTierWindowSpend = (Number(member.tierWindowSpend) || 0) + amount;
  const newPoints = (Number(member.points) || 0) + pointsEarned;
  const newTier = calcTier(newTierWindowSpend);
  const now = new Date().toISOString();

  // Update the member row in place.
  const rowRange = sheet.getRange(found.rowIndex, 1, 1, MEMBER_HEADERS.length);
  const updatedRow = MEMBER_HEADERS.map(key => {
    if (key === 'lifetimeSpend') return newLifetimeSpend;
    if (key === 'tierWindowSpend') return newTierWindowSpend;
    if (key === 'points') return newPoints;
    if (key === 'tier') return newTier;
    if (key === 'lastActivity') return now;
    if (key === 'updatedAt') return now;
    return found.row[MEMBER_HEADERS.indexOf(key)];
  });
  rowRange.setValues([updatedRow]);

  // Log the transaction for a clean audit trail.
  const txSheet = getTransactionsSheet();
  const txNumber = nextTransactionNumber();
  txSheet.appendRow([
    'tx_' + Utilities.getUuid(), txNumber, member.id, member.memberNumber,
    member.phone, amount, pointsEarned, String(body.notes || '').trim(), now
  ]);

  return {
    success: true,
    errors: [],
    member: rowToMember(updatedRow),
    transaction: { transactionNumber: txNumber, amount, points: pointsEarned },
  };
}
