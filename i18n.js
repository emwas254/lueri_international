/* Lueri International — native i18n loader + language-name presentation.
   The full translation engine lives in i18n-engine.js.
   No Google Translate or third-party translation widget is used.
*/
(function () {
  'use strict';

  var nativeNames = {
    en: 'English',
    zh: '中文',
    sw: 'Kiswahili',
    fr: 'Français',
    es: 'Español',
    ar: 'العربية',
    pt: 'Português'
  };

  var flags = {
    en: '🇬🇧',
    zh: '🇨🇳',
    sw: '🇰🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    ar: '🇸🇦',
    pt: '🇧🇷'
  };

  function labelOptions() {
    var selector = document.getElementById('languageSelector');
    if (!selector) return;
    Object.keys(nativeNames).forEach(function (code) {
      var option = selector.querySelector('option[value="' + code + '"]');
      if (option) option.textContent = flags[code] + ' ' + nativeNames[code];
    });
  }

  /* Load the existing full translation engine without replacing it. */
  document.write('<script src="i18n-engine.js"><\\/script>');
  labelOptions();
  document.addEventListener('DOMContentLoaded', labelOptions, { once: true });
})();
