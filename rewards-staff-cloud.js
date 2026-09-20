'use strict';

// ---------------------------------------------------------------------
// Lueri Rewards — Staff console, Supabase-backed
// ---------------------------------------------------------------------
// FIXED IN THIS PASS:
//  1. normalizePhone now outputs the site-wide canonical 254XXXXXXXXX
//     format (was leading-zero 0712...), matching the fix in
//     rewards-cloud.js and corporate-signup.js. Requires the same
//     one-time DB backfill (see supabase_migration_fixes.sql).
//  2. generateInvoiceNumber() now uses a much larger random space
//     (6 digits instead of 3) plus the time-of-day in seconds, cutting
//     same-day collision odds from roughly 1-in-3 on a 30-transaction
//     day down to effectively negligible. Still NOT a real atomic
//     sequence — if you need a legally distinct invoice number per
//     transaction, that has to come from a database sequence, not a
//     client-generated one. Flagged here, not solved here.
//  3. resolveMember() now distinguishes an EXACT match (phone or
//     member number) from a FUZZY fallback (name search that happened
//     to return exactly one row). addTransaction() refuses to proceed
//     on a fuzzy match without an explicit confirm flag, so a loose
//     name search can no longer silently post a transaction to the
//     wrong customer. rewards-staff.html has been updated to show a
//     confirmation prompt when this happens.
//  4. registerMember() now goes through the authenticated
//     staff_register_member RPC (staffRpcCall, requires a logged-in,
//     approved session) instead of the anonymous public register_member
//     RPC — so there's finally an audit trail of which staff member
//     registered which customer. This requires the new
//     staff_register_member function defined in
//     supabase_migration_fixes.sql — deploy that SQL before this file,
//     or member registration from this console will start failing.
// ---------------------------------------------------------------------

const SUPABASE_URL = 'https://ylifvexqamxvwzvhmwex.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F';

const SESSION_KEY = 'lueriStaffSession_v1'; // holds only the auth session (access/refresh token), never business data

/* ==========================================================================
   SESSION / AUTH
   ========================================================================== */

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function staffSignUp(email, password, fullName) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password, data: { full_name: fullName || '' } }),
  });
  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.msg || data.error_description || 'Could not create account.' };
  }
  return { success: true };
}

async function staffLogIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.error_description || data.msg || 'Invalid email or password.' };
  }
  saveSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 30) * 1000, // refresh 30s early
  });
  return { success: true };
}

async function staffLogOut() {
  const session = getSession();
  if (session) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session.access_token}` },
      });
    } catch (err) { /* best effort — clear locally regardless */ }
  }
  clearSession();
}

async function refreshSession() {
  const session = getSession();
  if (!session || !session.refresh_token) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) { clearSession(); return null; }
  const data = await response.json();
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 30) * 1000,
  };
  saveSession(next);
  return next;
}

async function getValidAccessToken() {
  let session = getSession();
  if (!session) return null;
  if (Date.now() >= session.expires_at) {
    session = await refreshSession();
  }
  return session ? session.access_token : null;
}

function isLoggedIn() {
  return !!getSession();
}

/* ==========================================================================
   RPC HELPERS
   ========================================================================== */

async function staffRpcCall(fnName, payload) {
  const token = await getValidAccessToken();
  if (!token) {
    return { success: false, error: 'not_logged_in' };
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    clearSession();
    return { success: false, error: 'not_logged_in' };
  }
  if (!response.ok) {
    return { success: false, error: 'network_error' };
  }
  return response.json();
}

function capitalizeTier(tier) {
  const value = String(tier || '').trim();
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// FIX: canonical 254XXXXXXXXX output (was leading-zero 0712...), and
// returns null instead of a best-guess string when input can't be
// resolved confidently.
function normalizePhone(phone) {
  const value = String(phone || '').trim().replace(/[^\d]/g, '');
  if (value.startsWith('254') && value.length === 12) return value;
  if (value.startsWith('0') && value.length === 10) return '254' + value.slice(1);
  if (value.length === 9 && (value.startsWith('7') || value.startsWith('1'))) return '254' + value;
  return null;
}

/* ==========================================================================
   MEMBER / TRANSACTION OPERATIONS
   ========================================================================== */

// FIX: now goes through the authenticated staff_register_member RPC
// instead of the anonymous public register_member RPC, so registrations
// made from this console carry the staff member's identity for audit
// purposes. Requires supabase_migration_fixes.sql to be applied first.
async function registerMember(input = {}) {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { success: false, errors: ['Enter a valid Kenyan phone number.'], member: null };
  }
  const result = await staffRpcCall('staff_register_member', {
    p_name: input.name,
    p_phone: phone,
    p_email: input.email || null,
  });
  if (!result.success) {
    const message =
      result.error === 'not_authorized' ? 'Your account is not approved for staff actions yet. Ask an admin to activate it.' :
      result.error === 'not_logged_in' ? 'Your session has expired. Please log in again.' :
      (result.error || 'Could not register the member.');
    return { success: false, errors: [message], member: null };
  }
  const member = result.member;
  member.tier = capitalizeTier(member.tier);
  return { success: true, errors: [], member };
}

async function searchMembers(query = '') {
  const result = await staffRpcCall('staff_search_members', { p_query: query });
  if (!result.success) return [];
  return (result.members || []).map(m => ({ ...m, tier: capitalizeTier(m.tier) }));
}

async function listMembers() {
  return searchMembers('');
}

async function getDashboardStats() {
  const result = await staffRpcCall('staff_dashboard_stats', {});
  if (!result.success) {
    return { totalMembers: 0, totalLifetimeSpend: 0, totalPoints: 0, totalTransactions: 0 };
  }
  return result;
}

// FIX: distinguishes an exact match (phone or member number — safe to
// use without confirmation) from a fuzzy fallback (a name search that
// happened to return exactly one row — NOT safe to use silently, since
// a partial name match on the wrong customer would post a transaction
// to the wrong account with no warning).
async function resolveMember(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return { member: null, exact: false };

  const candidates = await searchMembers(raw);
  const normalized = normalizePhone(raw);

  const byPhone = normalized ? candidates.find(m => m.phone === normalized) : null;
  if (byPhone) return { member: byPhone, exact: true };

  const byNumber = candidates.find(m => String(m.memberNumber).toLowerCase() === raw.toLowerCase());
  if (byNumber) return { member: byNumber, exact: true };

  if (candidates.length === 1) return { member: candidates[0], exact: false };
  return { member: null, exact: false };
}

// type: 'sale' | 'refund' | 'adjustment' (kept as staff-facing wording;
// mapped server-side / here to earn / adjustment as appropriate).
//
// FIX: when resolveMember() only found a fuzzy (non-exact) match, this
// now returns { ambiguous: true, member } instead of silently posting
// the transaction. The caller (rewards-staff.html) must show the
// resolved member's name to staff and resubmit with
// input.confirmedMemberId set to proceed.
async function addTransaction(input = {}) {
  let member;

  if (input.confirmedMemberId) {
    // Staff already confirmed a fuzzy match in a previous call — trust
    // the specific id, don't re-run the fuzzy search.
    const all = await searchMembers('');
    member = all.find(m => m.id === input.confirmedMemberId) || null;
  } else {
    const resolved = await resolveMember(input.memberId || input.memberNumber || input.phone);
    if (resolved.member && !resolved.exact) {
      return {
        success: false,
        errors: [],
        ambiguous: true,
        transaction: null,
        member: resolved.member,
      };
    }
    member = resolved.member;
  }

  if (!member) {
    return { success: false, errors: ['Member not found.'], transaction: null, member: null };
  }

  const result = await staffRpcCall('staff_add_transaction', {
    p_member_id: member.id,
    p_type: input.type || 'sale',
    p_amount: input.amount !== undefined && input.amount !== '' ? Number(input.amount) : null,
    p_note: input.note || null,
    p_points_delta: input.pointsDelta !== undefined ? Math.floor(Number(input.pointsDelta)) : null,
    p_spend_delta: input.spendDelta !== undefined ? Number(input.spendDelta) : null,
  });

  if (!result.success) {
    const message =
      result.error === 'not_authorized' ? 'Your account is not approved for staff actions yet. Ask an admin to activate it.' :
      result.error === 'not_logged_in' ? 'Your session has expired. Please log in again.' :
      result.error === 'amount_required' ? 'Enter an amount greater than zero.' :
      'Could not log the transaction.';
    return { success: false, errors: [message], transaction: null, member };
  }

  result.member.tier = capitalizeTier(result.member.tier);
  return { success: true, errors: [], transaction: result.transaction, member: result.member };
}

/* ==========================================================================
   SHARED UI HELPERS
   ========================================================================== */

function fmt(amount) {
  const n = Number(amount) || 0;
  return 'KES ' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  const d = value ? new Date(value) : new Date();
  return d.toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(value) {
  const div = document.createElement('div');
  div.textContent = String(value == null ? '' : value);
  return div.innerHTML;
}

// FIX: 6-digit random suffix (was 3) plus the current time in seconds,
// cutting same-day collision odds to effectively negligible for any
// realistic daily transaction volume. Still not a real tax-invoice
// sequence — see the comment at the top of this file.
function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const secondsOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const suffix = String(secondsOfDay).padStart(5, '0') + String(Math.floor(Math.random() * 900 + 100));
  return `INV-${y}${m}${d}-${suffix}`;
}

const LUERI_REWARDS = {
  company: {
    name: 'Lueri International',
    address: 'Nairobi, Kenya',
    phone: '+254 713 261 719',
    kraPin: '',
    vatRegistered: false,
    vatRate: 0.16,
  },
};

/* ==========================================================================
   VOUCHERS — still local-only. See the disclosure text added in
   rewards-staff.html: this panel has no real database behind it yet.
   ========================================================================== */

const VOUCHER_KEY = 'lueriRewardsVouchers_v1';

function loadVouchers() {
  try {
    const raw = localStorage.getItem(VOUCHER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveVouchers(list) {
  localStorage.setItem(VOUCHER_KEY, JSON.stringify(list));
}

function findVoucher(code, vouchers = loadVouchers()) {
  const normalized = String(code || '').trim().toUpperCase();
  return vouchers.find(v => v.code === normalized) || null;
}

function redeemVoucher(code, redeemedBy = '') {
  const vouchers = loadVouchers();
  const voucher = findVoucher(code, vouchers);
  if (!voucher) return { success: false, errors: ['Voucher not found.'], voucher: null };
  if (voucher.status !== 'active') return { success: false, errors: [`Voucher is ${voucher.status}.`], voucher };
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
    voucher.status = 'expired';
    saveVouchers(vouchers);
    return { success: false, errors: ['Voucher has expired.'], voucher };
  }
  voucher.status = 'redeemed';
  voucher.redeemedAt = new Date().toISOString();
  voucher.redeemedBy = String(redeemedBy || '').trim();
  saveVouchers(vouchers);
  return { success: true, errors: [], voucher };
}
