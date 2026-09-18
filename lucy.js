/* Lueri International — Lucy loader
 * Loads the customer-facing Lucy UI, then applies the production hotfix layer.
 * Stable filename preserves existing page references.
 */
(function () {
  'use strict';
  const load = () => {
    if (document.querySelector('script[data-lucy-ui]')) return;
    const script = document.createElement('script');
    script.src = 'lucy-ui.js?v=20260919-08';
    script.dataset.lucyUi = 'true';
    document.head.appendChild(script);
    const fix = document.createElement('script');
    fix.src = 'lucy-fix.js?v=20260919-07';
    fix.dataset.lucyFix = 'true';
    document.head.appendChild(fix);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
