'use strict';
/**
 * Shared Kenyan phone + WhatsApp helpers for public pages.
 * Canonical form: 2547XXXXXXXX or 2541XXXXXXXX (no plus, no leading zero).
 *
 * FIXED IN THIS PASS:
 *  - lueriNormalizePhone now returns null instead of silently truncating
 *    or guessing when the input doesn't cleanly resolve to a valid
 *    254[71]XXXXXXXX number (e.g. an extra pasted digit, a landline).
 *    Callers must treat null as "invalid" — don't send it to WhatsApp,
 *    a database write, or an RPC call without checking first.
 *  - Everything below is now ALSO exposed under window.Lueri.* so new
 *    code can use one namespaced object instead of bare globals. The
 *    original bare-name globals (lueriNormalizePhone, lueriIsValidPhone,
 *    etc.) are left exactly as they were — no existing caller needs to
 *    change anything to pick up the null-safety fix above.
 */
function lueriNormalizePhone(phone) {
  let value = String(phone || '').trim().replace(/[^\d]/g, '');

  if (value.startsWith('254')) {
    if (value.length !== 12) {
      // Too short or too long (extra/missing digit) — don't guess which
      // characters to keep. Better to reject than to silently mangle a
      // number that ends up wired into a WhatsApp send or a DB write.
      return null;
    }
  } else if (value.startsWith('0') && value.length === 10) {
    value = '254' + value.slice(1);
  } else if (value.length === 9 && (value.startsWith('7') || value.startsWith('1'))) {
    value = '254' + value;
  } else {
    return null;
  }

  return /^254[71]\d{8}$/.test(value) ? value : null;
}
function lueriIsValidPhone(phone) {
  return lueriNormalizePhone(phone) !== null;
}
function lueriFmtKes(amount) {
  return 'KES ' + Math.round(Number(amount) || 0).toLocaleString('en-KE');
}
function lueriEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
/**
 * @returns {{ opened: boolean, url: string }}
 *
 * NOTE (not changed here, but worth remembering): this only reliably
 * bypasses mobile popup blockers when called synchronously inside a
 * click handler. If a caller does `await someAsyncCall(); lueriOpenWhatsApp(...)`,
 * some mobile browsers (notably iOS Safari) will block the popup. The
 * safest pattern is `const win = window.open('', '_blank'); /* async work */ win.location.href = url;`
 * — but that requires restructuring the caller, not this helper, so it's
 * left as a note rather than a change here. Every current caller of this
 * function already shows a visible fallback link when `opened` is false,
 * which is the important safety net either way.
 */
function lueriOpenWhatsApp(msisdn, text) {
  const url = 'https://wa.me/' + msisdn + '?text=' + encodeURIComponent(text);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  const opened = !!(popup && !popup.closed);
  return { opened: opened, url: url };
}
function lueriBootTheme() {
  try {
    const saved = localStorage.getItem('theme');
    const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { /* private mode */ }
}

// Namespaced access for new code. Reduces the risk of a same-named
// global from another script silently overwriting one of these later —
// this already happened once: rewards-cloud.js and rewards-staff-cloud.js
// each define their own differently-behaved lueriNormalizePhone /
// normalizePhone. New pages/scripts should prefer window.Lueri.* where
// practical; existing bare-name globals above are untouched.
window.Lueri = Object.assign(window.Lueri || {}, {
  normalizePhone: lueriNormalizePhone,
  isValidPhone: lueriIsValidPhone,
  fmtKes: lueriFmtKes,
  escapeHtml: lueriEscapeHtml,
  openWhatsApp: lueriOpenWhatsApp,
  bootTheme: lueriBootTheme,
});
