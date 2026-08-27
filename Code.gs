/**
 * ============================================================================
 * LUERI REWARDS — GOOGLE SHEETS BACKEND
 * ============================================================================
 *
 * SETUP
 * 1. Extensions > Apps Script in "Lueri Rewards Database".
 * 2. Paste this file. File > Project settings > Script properties:
 *      SHEET_ID  = the spreadsheet ID from the Sheet URL
 *      STAFF_PIN = a long random staff token (not a 4-digit PIN)
 * 3. Deploy > Web app: Execute as Me, Who has access: Anyone
 *    (lookup/register are still public but rate-limited and stripped;
 *     writes require STAFF_PIN.)
 * 4. After every change, Deploy > Manage deployments > New version.
 * 5. Put the Web App URL in rewards-cloud.js as API_URL.
 * ============================================================================
 */

var MEMBERS_SHEET = 'Members';
var TRANSACTIONS_SHEET = 'Transactions';
var FIRST_MEMBER_NUMBER = 1000;
var FIRST_TRANSACTION_NUMBER = 5000;
var POINTS_PER_KES = 50;
var TIER_WINDOW_DAYS = 365;

var MEMBER_HEADERS = [
  'id', 'memberNumber', 'name', 'phone', 'email', 'birthday',
  'joinedRaw', 'lastActivity', 'lifetimeSpend', 'tierWindowSpend',
  'points', 'expiredPoints', 'tier', 'status', 'notes',
  'createdAt', 'updatedAt'
];

var TRANSACTION_HEADERS = [
  'id', 'transactionNumber', 'memberId', 'memberNumber', 'phone',
  'amount', 'points', 'notes', 'createdAt', 'type'
];

var TIERS = [
  { name: 'VIP', min: 75000 },
  { name: 'Platinum', min: 35000 },
  { name: 'Gold', min: 15000 },
  { name: 'Silver', min: 5000 },
  { name: 'Bronze', min: 0 }
];

/* ---------------------------------------------------------------------- */
/* CONFIG                                                                  */
/* ---------------------------------------------------------------------- */

function getSheetId() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) {
    throw new Error('SHEET_ID is not set in Apps Script > Project settings > Script properties.');
  }
  return id;
}

function getStaffPin() {
  var pin = PropertiesService.getScriptProperties().getProperty('STAFF_PIN');
  if (!pin) {
    throw new Error('STAFF_PIN is not set in Script properties.');
  }
  return pin;
}

/* ---------------------------------------------------------------------- */
/* HTTP                                                                    */
/* ---------------------------------------------------------------------- */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var result;

    switch (action) {
      case 'register':
        result = registerMember(body.input || {}, body.pin || '');
        break;
      case 'lookup':
        result = lookupMember(body.phone || '');
        break;
      case 'staffAuth':
        result = staffAuth(body.pin || '');
        break;
      case 'listMembers':
        result = listMembers(body.pin || '');
        break;
      case 'addTransaction':
        result = addTransaction(body);
        break;
      default:
        result = { success: false, errors: ['Unknown action.'], member: null };
    }
    return jsonResponse(result);
  } catch (err) {
    Logger.log(err);
    return jsonResponse({ success: false, errors: ['Request failed.'], member: null });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return jsonResponse({ status: 'ok' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------- */
/* RATE LIMITS                                                             */
/* ---------------------------------------------------------------------- */

function rateLimit(key, max, seconds) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(key) || '0');
  if (n >= max) return false;
  cache.put(key, String(n + 1), seconds);
  return true;
}

function pinAllowed() {
  var cache = CacheService.getScriptCache();
  return cache.get('pinlock') !== '1';
}

function notePinFailure() {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('pinfail') || '0') + 1;
  cache.put('pinfail', String(n), 900);
  if (n >= 8) cache.put('pinlock', '1', 900);
}

function clearPinFailures() {
  var cache = CacheService.getScriptCache();
  cache.remove('pinfail');
  cache.remove('pinlock');
}

function requireStaffPin(pin) {
  if (!pinAllowed()) {
    return { ok: false, errors: ['Too many incorrect PIN attempts. Try again later.'] };
  }
  var expected;
  try {
    expected = getStaffPin();
  } catch (err) {
    return { ok: false, errors: ['Staff access is not configured.'] };
  }
  if (String(pin || '') !== expected) {
    notePinFailure();
    return { ok: false, errors: ['Incorrect staff PIN.'] };
  }
  clearPinFailures();
  return { ok: true, errors: [] };
}

/* ---------------------------------------------------------------------- */
/* PHONE / TIER                                                            */
/* ---------------------------------------------------------------------- */

function normalizePhone(phone) {
  var value = String(phone || '').replace(/[^\d]/g, '');
  if (value.indexOf('254') === 0 && value.length >= 12) {
    value = value.substring(0, 12);
  } else if (value.charAt(0) === '0' && value.length >= 10) {
    value = '254' + value.substring(1, 10);
  } else if (value.length === 9 && (value.charAt(0) === '7' || value.charAt(0) === '1')) {
    value = '254' + value;
  }
  return value;
}

function isValidPhone(phone) {
  return /^254[71]\d{8}$/.test(normalizePhone(phone));
}

function calcTier(spend) {
  var amount = Number(spend) || 0;
  for (var i = 0; i < TIERS.length; i++) {
    if (amount >= TIERS[i].min) return TIERS[i].name;
  }
  return 'Bronze';
}

/* ---------------------------------------------------------------------- */
/* SHEETS                                                                  */
/* ---------------------------------------------------------------------- */

function getSheet() {
  var ss = SpreadsheetApp.openById(getSheetId());
  var sheet = ss.getSheetByName(MEMBERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(MEMBERS_SHEET);
    sheet.appendRow(MEMBER_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getTransactionsSheet() {
  var ss = SpreadsheetApp.openById(getSheetId());
  var sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TRANSACTIONS_SHEET);
    sheet.appendRow(TRANSACTION_HEADERS);
    sheet.setFrozenRows(1);
  } else {
    ensureTransactionTypeColumn(sheet);
  }
  return sheet;
}

function ensureTransactionTypeColumn(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < TRANSACTION_HEADERS.length) {
    sheet.getRange(1, TRANSACTION_HEADERS.length).setValue('type');
  }
}

function findMemberRowByPhone(sheet, phone) {
  var normalized = normalizePhone(phone);
  var data = sheet.getDataRange().getValues();
  var phoneCol = MEMBER_HEADERS.indexOf('phone');
  for (var i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][phoneCol]) === normalized) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

function findMemberRowByAnyId(sheet, identifier) {
  var data = sheet.getDataRange().getValues();
  var idCol = MEMBER_HEADERS.indexOf('memberNumber');
  var phoneCol = MEMBER_HEADERS.indexOf('phone');
  var normalizedPhone = normalizePhone(identifier);
  var cleanId = String(identifier || '').trim().toUpperCase();

  for (var i = 1; i < data.length; i++) {
    var rowMemberNumber = String(data[i][idCol] || '').trim().toUpperCase();
    if (cleanId && rowMemberNumber === cleanId) return { rowIndex: i + 1, row: data[i] };
    if (normalizedPhone && normalizePhone(data[i][phoneCol]) === normalizedPhone) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

function rowToMember(row) {
  var member = {};
  MEMBER_HEADERS.forEach(function (key, i) {
    member[key] = row[i];
  });
  member.phone = normalizePhone(member.phone);
  member.lifetimeSpend = Number(member.lifetimeSpend) || 0;
  member.tierWindowSpend = Number(member.tierWindowSpend) || 0;
  member.points = Number(member.points) || 0;
  member.expiredPoints = Number(member.expiredPoints) || 0;
  return member;
}

function publicMember(member) {
  return {
    id: member.id,
    memberNumber: member.memberNumber,
    name: member.name,
    phone: member.phone,
    lifetimeSpend: member.lifetimeSpend,
    tierWindowSpend: member.tierWindowSpend,
    points: member.points,
    expiredPoints: member.expiredPoints,
    tier: member.tier,
    status: member.status,
    lastActivity: member.lastActivity
  };
}

function staffMember(member) {
  var pub = publicMember(member);
  pub.email = member.email || '';
  pub.joinedRaw = member.joinedRaw;
  return pub;
}

function maxSequence(sheet, colName, prefix, first) {
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return first + 1;
  var data = sheet.getDataRange().getValues();
  var col = data[0].indexOf(colName);
  if (col < 0) return first + 1;
  var max = first;
  var re = new RegExp('^' + prefix + '-(\\d+)$', 'i');
  for (var i = 1; i < data.length; i++) {
    var m = String(data[i][col] || '').trim().match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function nextMemberNumber(sheet) {
  return 'LR-' + maxSequence(sheet, 'memberNumber', 'LR', FIRST_MEMBER_NUMBER);
}

function nextTransactionNumber(sheet) {
  return 'TX-' + maxSequence(sheet, 'transactionNumber', 'TX', FIRST_TRANSACTION_NUMBER);
}

function parseDateMs(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === '[object Date]') return value.getTime();
  var d = new Date(value);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function calcTierWindowSpend(memberId) {
  var sheet = getTransactionsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  var headers = data[0];
  var idCol = headers.indexOf('memberId');
  var amountCol = headers.indexOf('amount');
  var dateCol = headers.indexOf('createdAt');
  var typeCol = headers.indexOf('type');
  var cutoff = Date.now() - TIER_WINDOW_DAYS * 86400000;
  var sum = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) !== String(memberId)) continue;
    if (parseDateMs(data[i][dateCol]) < cutoff) continue;
    var type = String(data[i][typeCol] || 'sale').toLowerCase();
    var amount = Number(data[i][amountCol]) || 0;
    if (type === 'refund') sum -= Math.abs(amount);
    else if (type === 'sale' || type === '') sum += Math.abs(amount);
  }
  return Math.max(0, sum);
}

function memberTransactions(memberId, limit) {
  var sheet = getTransactionsSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rec = {};
    headers.forEach(function (key, idx) { rec[key] = data[i][idx]; });
    if (String(rec.memberId) !== String(memberId)) continue;
    rec.amount = Number(rec.amount) || 0;
    rec.points = Number(rec.points) || 0;
    rec.type = rec.type || 'sale';
    rec.date = rec.createdAt;
    rows.push(rec);
  }
  rows.sort(function (a, b) { return parseDateMs(b.createdAt) - parseDateMs(a.createdAt); });
  return rows.slice(0, limit || 10);
}

/* ---------------------------------------------------------------------- */
/* ACTIONS                                                                 */
/* ---------------------------------------------------------------------- */

function staffAuth(pin) {
  var auth = requireStaffPin(pin);
  if (!auth.ok) return { success: false, errors: auth.errors };
  return { success: true, errors: [] };
}

function registerMember(input, pin) {
  var name = String(input.name || '').trim();
  var phone = normalizePhone(input.phone);
  var email = String(input.email || '').trim().toLowerCase();

  var errors = [];
  if (!name) errors.push('Name is required.');
  if (!isValidPhone(phone)) errors.push('Enter a valid Kenyan phone number.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Enter a valid email address.');
  if (errors.length) return { success: false, errors: errors, member: null };

  if (!rateLimit('reg:global', 25, 3600)) {
    return { success: false, errors: ['Too many signups right now. Try again later.'], member: null };
  }

  var sheet = getSheet();
  var existing = findMemberRowByPhone(sheet, phone);
  if (existing) {
    var staff = pin && requireStaffPin(pin).ok;
    return {
      success: false,
      errors: ['A rewards member already exists with this phone number.'],
      member: staff ? staffMember(rowToMember(existing.row)) : null,
      existing: true
    };
  }

  var now = new Date().toISOString();
  var id = 'member_' + Utilities.getUuid();
  var memberNumber = nextMemberNumber(sheet);

  var newRow = [
    id, memberNumber, name, phone, email, input.birthday || '',
    now, now, 0, 0, 0, 0, 'Bronze', 'active',
    String(input.notes || '').trim(), now, now
  ];
  sheet.appendRow(newRow);

  var member = rowToMember(newRow);
  return {
    success: true,
    errors: [],
    member: pin && requireStaffPin(pin).ok ? staffMember(member) : publicMember(member),
    existing: false
  };
}

function lookupMember(phone) {
  if (!rateLimit('lookup:global', 60, 600)) {
    return { success: false, errors: ['Too many lookups. Try again later.'], member: null };
  }

  var normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) {
    return { success: false, errors: ['Enter a valid Kenyan phone number.'], member: null };
  }

  if (!rateLimit('lookup:' + normalized, 8, 600)) {
    return { success: false, errors: ['Too many lookups for this number. Try again later.'], member: null };
  }

  var sheet = getSheet();
  var existing = findMemberRowByPhone(sheet, normalized);
  if (!existing) {
    return { success: false, errors: ['No rewards member found with that phone number.'], member: null };
  }

  var member = rowToMember(existing.row);
  var windowSpend = calcTierWindowSpend(member.id);
  member.tierWindowSpend = windowSpend;
  member.tier = calcTier(windowSpend);

  var rowRange = sheet.getRange(existing.rowIndex, 1, 1, MEMBER_HEADERS.length);
  var updated = MEMBER_HEADERS.map(function (key) {
    if (key === 'tierWindowSpend') return windowSpend;
    if (key === 'tier') return member.tier;
    return existing.row[MEMBER_HEADERS.indexOf(key)];
  });
  rowRange.setValues([updated]);

  return {
    success: true,
    errors: [],
    member: publicMember(member),
    transactions: memberTransactions(member.id, 10)
  };
}

function listMembers(pin) {
  var auth = requireStaffPin(pin);
  if (!auth.ok) return { success: false, errors: auth.errors, members: [] };

  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var members = [];
  for (var i = 1; i < data.length; i++) {
    members.push(staffMember(rowToMember(data[i])));
  }
  return { success: true, errors: [], members: members };
}

function addTransaction(body) {
  var auth = requireStaffPin(body.pin);
  if (!auth.ok) return { success: false, errors: auth.errors, member: null };

  var identifier = String(body.memberIdentifier || '').trim();
  var amount = Number(body.amount);
  var type = String(body.type || 'sale').toLowerCase();
  var allowed = { sale: true, refund: true, adjustment: true };

  if (!identifier) {
    return { success: false, errors: ['Member number or phone is required.'], member: null };
  }
  if (!amount || amount <= 0) {
    return { success: false, errors: ['Enter a valid order amount greater than zero.'], member: null };
  }
  if (!allowed[type]) {
    return { success: false, errors: ['Invalid transaction type.'], member: null };
  }

  var sheet = getSheet();
  var found = findMemberRowByAnyId(sheet, identifier);
  if (!found) {
    return { success: false, errors: ['No member found with that number.'], member: null };
  }

  var member = rowToMember(found.row);
  if (String(member.status) !== 'active') {
    return { success: false, errors: ['Member account is ' + member.status + '.'], member: null };
  }

  var pointsEarned = Math.floor(amount / POINTS_PER_KES);
  var spendDelta = type === 'refund' ? -amount : amount;
  var pointsDelta = type === 'refund' ? -pointsEarned : pointsEarned;

  if (type === 'adjustment') {
    spendDelta = Number(body.spendDelta);
    if (!isFinite(spendDelta)) spendDelta = amount;
    pointsDelta = Math.floor(Number(body.pointsDelta));
    if (!isFinite(pointsDelta)) pointsDelta = pointsEarned;
  }

  var newLifetimeSpend = Math.max(0, (Number(member.lifetimeSpend) || 0) + spendDelta);
  var newPoints = Math.max(0, (Number(member.points) || 0) + pointsDelta);
  var now = new Date().toISOString();

  var txSheet = getTransactionsSheet();
  var txNumber = nextTransactionNumber(txSheet);
  var txId = 'tx_' + Utilities.getUuid();
  txSheet.appendRow([
    txId, txNumber, member.id, member.memberNumber,
    member.phone, amount, pointsDelta, String(body.notes || '').trim(), now, type
  ]);

  var newTierWindowSpend = calcTierWindowSpend(member.id);
  var newTier = calcTier(newTierWindowSpend);

  var rowRange = sheet.getRange(found.rowIndex, 1, 1, MEMBER_HEADERS.length);
  var updatedRow = MEMBER_HEADERS.map(function (key) {
    if (key === 'lifetimeSpend') return newLifetimeSpend;
    if (key === 'tierWindowSpend') return newTierWindowSpend;
    if (key === 'points') return newPoints;
    if (key === 'tier') return newTier;
    if (key === 'lastActivity') return now;
    if (key === 'updatedAt') return now;
    return found.row[MEMBER_HEADERS.indexOf(key)];
  });
  rowRange.setValues([updatedRow]);

  var updatedMember = rowToMember(updatedRow);
  return {
    success: true,
    errors: [],
    member: staffMember(updatedMember),
    transaction: {
      id: txId,
      transactionNumber: txNumber,
      amount: amount,
      points: pointsDelta,
      type: type,
      date: now,
      createdAt: now
    }
  };
}
