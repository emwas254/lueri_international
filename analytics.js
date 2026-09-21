/* Lueri International - first-party, cookieless analytics.
   Writes anonymous events to Supabase table public.site_events (insert-only for the public,
   read-only for staff via is_staff()). Stores NO IP, NO user-agent, NO name/phone.
   The session id is a random per-tab token in sessionStorage and disappears when the tab closes.

   To exclude your own visits, open the site once and run in the browser console:
     localStorage.setItem('lueri_no_track','1')

   Events: pageview, whatsapp_click, call_click, email_click, booking_submit,
           rewards_join_click, corporate_click, lucy_open
*/
(function () {
  'use strict';
  if (window.__lueriAnalytics) return;
  window.__lueriAnalytics = true;

  var ENDPOINT = 'https://ylifvexqamxvwzvhmwex.supabase.co/rest/v1/site_events';
  var KEY = 'sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F';

  try {
    if (localStorage.getItem('lueri_no_track') === '1') return;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  } catch (e) { /* storage blocked: carry on */ }
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;

  function clip(v, n) { return v ? String(v).slice(0, n) : null; }

  function sessionId() {
    try {
      var s = sessionStorage.getItem('lueri_sid');
      if (s) return s;
      var a = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(a);
      s = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      sessionStorage.setItem('lueri_sid', s);
      return s;
    } catch (e) { return null; }
  }

  var params = new URLSearchParams(location.search);
  var refHost = null;
  try {
    var r = document.referrer ? new URL(document.referrer).hostname : '';
    if (r && r !== location.hostname) refHost = r;
  } catch (e) { /* ignore */ }

  function send(event, label) {
    try {
      var body = {
        event: event,
        path: clip(location.pathname, 200),
        label: clip(label, 80),
        ref_host: clip(refHost, 100),
        utm_source: clip(params.get('utm_source'), 60),
        utm_medium: clip(params.get('utm_medium'), 60),
        utm_campaign: clip(params.get('utm_campaign'), 80),
        lang: clip(document.documentElement.lang, 10),
        vw: Math.min(window.innerWidth || 0, 10000),
        sid: sessionId()
      };
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', 'apikey': KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(body)
      }).catch(function () { /* analytics must never break the page */ });
    } catch (e) { /* ignore */ }
  }

  function where(el) {
    var s = el.closest && el.closest('section[id]');
    if (s) return s.id;
    if (el.closest && el.closest('header')) return 'header';
    if (el.closest && el.closest('footer')) return 'footer';
    if (el.closest && el.closest('#lucy-panel, #lucy-root, [id^="lucy"]')) return 'lucy';
    return 'page';
  }

  // Page view (once per load)
  send('pageview', null);

  // Click tracking (delegated; no changes needed to the existing markup)
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var launcher = t.closest('#lucy-launcher');
    if (launcher) { send('lucy_open', null); return; }

    var copyEl = t.closest('[data-copy]');
    if (copyEl) {
      var lbl = (copyEl.getAttribute('data-copy-label') || '').toLowerCase();
      if (lbl === 'whatsapp') send('whatsapp_click', 'copy-number');
      else if (lbl === 'email') send('email_click', 'copy-email');
      return;
    }

    var hrefEl = t.closest('a[href], [data-href]');
    if (!hrefEl) return;
    var href = hrefEl.getAttribute('href') || hrefEl.getAttribute('data-href') || '';
    var h = href.toLowerCase();

    if (/^https?:\/\/(wa\.link|wa\.me|api\.whatsapp\.com)/.test(h)) send('whatsapp_click', where(hrefEl));
    else if (h.indexOf('tel:') === 0) send('call_click', where(hrefEl));
    else if (h.indexOf('mailto:') === 0) send('email_click', where(hrefEl));
    else if (/(^|\/)rewards\.html/.test(h) && location.pathname.indexOf('rewards') === -1) send('rewards_join_click', where(hrefEl));
    else if (/(^|\/)corporate\.html/.test(h) && location.pathname.indexOf('corporate') === -1) send('corporate_click', where(hrefEl));
  }, true);

  // A booking / application counts only when the site shows its success overlay
  // (so failed validations are not counted as bookings).
  function watchSuccess() {
    var overlay = document.getElementById('successOverlay');
    if (!overlay || !window.MutationObserver) return;
    var fired = false;
    new MutationObserver(function () {
      var on = overlay.classList.contains('active');
      if (on && !fired) { fired = true; send('booking_submit', location.pathname); }
      if (!on) fired = false;
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchSuccess);
  else watchSuccess();
})();