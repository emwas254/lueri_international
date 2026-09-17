/* Lueri International — Lucy loader
 * The customer-facing implementation lives in lucy-ui.js.
 * Keeping this stable filename preserves all existing page script references.
 */
(function () {
  'use strict';
  const load = () => {
    if (document.querySelector('script[data-lucy-ui]')) return;
    const script = document.createElement('script');
    script.src = 'lucy-ui.js?v=20260917-01';
    script.defer = true;
    script.dataset.lucyUi = 'true';
    document.head.appendChild(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
