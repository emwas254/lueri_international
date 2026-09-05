'use strict';

// ---------------------------------------------------------------------
// Lueri Rewards — Staff console, Supabase-backed
// ---------------------------------------------------------------------
// Replaces the old rewards.js localStorage engine for everything that
// touches shared business data (members, transactions, dashboard
// stats). Every staff device now reads and writes the SAME database
// that the customer-facing rewards.html already uses — no more
// per-browser member lists.
//
// Auth model: staff sign in with a real Supabase Auth account (email +
// password), not the old shared passcode. A brand-new account starts
// as role='pending', active=false (see handle_new_auth_user trigger)
// and can do nothing until an admin promotes it — that promotion has
// to happen directly in the database (there is deliberately no
// self-service "make me staff" button).
//
// Tier model note: this replaces the old engine's 365-day rolling
// window with the lifetime-spend model that's already live on the
// customer rewards page (see calculate_tier trigger). A member's tier
// shown here will now always match what they see on their own page.
//
// Vouchers: the "Redeem a voucher" panel below still runs on
// browser-local storage (see the bottom of this file). There is no
// `vouchers` table in the database and nothing in the app currently
// creates a voucher, so this panel has never actually been backed by
// real, shared data — that's a pre-existing gap, not something this
// patch introduces. Flagging it so it doesn't get mistaken for solid
// ground later.
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

// The publicly-callable register_member (no staff auth needed — same
// function the customer signup form already uses).
async function rpcCallPublic(fnName, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Network error: ' + response.status);
  return response.json();
}

function capitalizeTier(tier) {
  const value = String(tier || '').trim();
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizePhone(phone) {
  let value = String(phone || '').trim().replace(/[()\s-]/g, '');
  if (value.startsWith('+254')) value = '0' + value.slice(4);
  else if (value.startsWith('254')) value = '0' + value.slice(3);
  return value;
}

/* ==========================================================================
   MEMBER / TRANSACTION OPERATIONS (mirror the old rewards.js names so
   rewards-staff.html needed minimal changes — but these are async and
   talk to Supabase, not localStorage)
   ========================================================================== */

async function registerMember(input = {}) {
  try {
    const result = await rpcCallPublic('register_member', {
      p_name: input.name,
      p_phone: normalizePhone(input.phone),
      p_email: input.email || null,
    });
    if (!result.success) return { success: false, errors: [result.error], member: null };
    const member = result.member;
    member.tier = capitalizeTier(member.tier);
    return { success: true, errors: [], member };
  } catch (err) {
    return { success: false, errors: ['Could not reach the rewards server.'], member: null };
  }
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

// Resolves the free-text "phone or member number" field staff type into
// an actual member row by asking the database (works across every
// device, unlike the old findMember() which only searched local data).
async function resolveMember(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  const candidates = await searchMembers(raw);
  const normalized = normalizePhone(raw);
  return (
    candidates.find(m => m.phone === normalized) ||
    candidates.find(m => m.memberNumber.toLowerCase() === raw.toLowerCase()) ||
    (candidates.length === 1 ? candidates[0] : null)
  );
}

// type: 'sale' | 'refund' | 'adjustment' (kept as staff-facing wording;
// mapped server-side / here to earn / adjustment as appropriate).
async function addTransaction(input = {}) {
  const member = await resolveMember(input.memberId || input.memberNumber || input.phone);
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
   SHARED UI HELPERS (previously came from rewards.js)
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

// Not a real tax-invoice sequence (there's no invoices table backing this
// yet, same as the old engine's locally-generated numbers) — just a
// human-readable reference so two invoices printed the same day don't
// look identical. Fine for a delivery receipt; talk to your accountant
// before treating this as eTIMS-compliant for VAT purposes.
function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = Math.floor(Math.random() * 900 + 100);
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
   VOUCHERS — still local-only (see note at top of file). Unchanged
   logic from the old engine, just isolated here so it keeps working
   without depending on the removed local member/transaction store.
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
