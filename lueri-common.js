'use strict';

/**
 * Shared Kenyan phone + WhatsApp helpers for public pages.
 * Canonical form: 2547XXXXXXXX or 2541XXXXXXXX (no plus, no leading zero).
 */

function lueriNormalizePhone(phone) {
  let value = String(phone || '').trim().replace(/[^\d]/g, '');

  if (value.startsWith('254') && value.length >= 12) {
    value = value.slice(0, 12);
  } else if (value.startsWith('0') && value.length >= 10) {
    value = '254' + value.slice(1, 10);
  } else if (value.length === 9 && (value.startsWith('7') || value.startsWith('1'))) {
    value = '254' + value;
  }

  return value;
}

function lueriIsValidPhone(phone) {
  return /^254[71]\d{8}$/.test(lueriNormalizePhone(phone));
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
