/* Lueri header helper  ·  assets/header.js
   The theme and language controls sit in a strip that shows while the menu is open.
   The site's "click outside the menu closes it" handler would otherwise treat a tap on
   those controls as an outside click, close the menu, and hide the control mid-tap.
   Stopping the click here keeps the menu open while the visitor changes theme or language. */
(function () {
  function init() {
    var utils = document.querySelector('.lh-utils');
    if (!utils) return;
    utils.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
