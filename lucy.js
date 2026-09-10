/* Lucy v1: static, allow-listed support. Never reads accounts, orders or payments. */
(function () {
  'use strict';
  const wa = 'https://wa.link/qk7m3b';
  const answers = {
    'Book a delivery': 'Use Book a Pickup or WhatsApp Lueri with your pickup, drop-off and parcel details. A dispatcher confirms the quote and availability before collection.',
    'Corporate plans': 'Lueri has Starter, Professional and Enterprise business plans. Corporate activation is reviewed by the team; no account is activated automatically.',
    'Service area': 'Lueri handles last-mile delivery across Nairobi and surrounding towns. Share both locations on WhatsApp for a route check.',
    'Opening hours': 'Monday–Friday, 8:00 AM–5:00 PM; Saturday, 8:00 AM–3:00 PM; closed Sunday. Bookings outside hours are handled on the next business day.',
    'Track a delivery': 'For a live delivery update, please use WhatsApp. Lucy cannot access customer records, locations, payment details or order status.'
  };
  const style = document.createElement('style');
  style.textContent = '.lucy-launch{position:fixed;right:20px;bottom:20px;z-index:1100;border:0;border-radius:999px;background:#1B2620;color:#F0EAD8;padding:14px 18px;font:600 14px system-ui;box-shadow:0 8px 24px #0003;cursor:pointer}.lucy-panel{position:fixed;right:20px;bottom:76px;z-index:1100;width:min(360px,calc(100vw - 40px));padding:20px;background:#F0EAD8;color:#1B2620;border:1px solid #1B2620;border-radius:6px;box-shadow:0 16px 40px #0004}.lucy-panel[hidden]{display:none}.lucy-panel h2{margin:0 0 8px;font:600 22px system-ui}.lucy-options{display:grid;gap:8px;margin:14px 0}.lucy-options button,.lucy-escalate{padding:10px;border:1px solid #1B2620;background:transparent;text-align:left;cursor:pointer;border-radius:3px}.lucy-escalate{display:inline-block;background:#B8321F;color:#fff;text-decoration:none;border-color:#B8321F}.lucy-answer{min-height:44px;line-height:1.5}';
  document.head.appendChild(style);
  const panel = document.createElement('aside');
  panel.className = 'lucy-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'Lucy support');
  panel.innerHTML = '<h2>Lucy</h2><p>Quick answers from Lueri\u2019s approved service information.</p><div class="lucy-options"></div><p class="lucy-answer" aria-live="polite">Choose a topic. For anything specific to you, talk to Lueri on WhatsApp.</p><a class="lucy-escalate" href="' + wa + '" target="_blank" rel="noopener noreferrer">Talk to Lueri on WhatsApp</a>';
  const answer = panel.querySelector('.lucy-answer'); const options = panel.querySelector('.lucy-options');
  Object.keys(answers).forEach((topic) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = topic; b.addEventListener('click', () => { answer.textContent = answers[topic]; }); options.appendChild(b); });
  const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'lucy-launch'; launch.textContent = 'Ask Lucy'; launch.setAttribute('aria-expanded', 'false');
  launch.addEventListener('click', () => { panel.hidden = !panel.hidden; launch.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) panel.querySelector('button')?.focus(); });
  document.body.append(panel, launch);
})();
