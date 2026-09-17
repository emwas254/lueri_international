/* Lueri International — native seven-language i18n bootstrap
   Loads the existing translation engine and makes the selector readable,
   native-language, RTL-aware, and compatible with Lueri light/dark themes.
   NO Google Translate. NO third-party translation widget.
*/
(function () {
  'use strict';

  var NATIVE_NAMES = {
    en: 'English',
    zh: '中文',
    sw: 'Kiswahili',
    fr: 'Français',
    es: 'Español',
    ar: 'العربية',
    pt: 'Português'
  };

  var FLAGS = {
    en: '🇬🇧',
    zh: '🇨🇳',
    sw: '🇰🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    ar: '🇸🇦',
    pt: '🇧🇷'
  };

  var RTL = { ar: true };

  function addLocaleStyles() {
    if (document.getElementById('lueri-i18n-locale-styles')) return;

    var style = document.createElement('style');
    style.id = 'lueri-i18n-locale-styles';
    style.textContent = `
      /* ================================================================
         LUERI NATIVE LANGUAGE SELECTOR
         Theme-aware, high-contrast, flag-preserving.
         ================================================================ */
      #languageSelector,
      .language-selector,
      .language-selector-native {
        appearance: auto;
        -webkit-appearance: auto;
        min-width: 126px;
        min-height: 40px;
        padding: 7px 30px 7px 10px !important;
        border: 1.5px solid var(--ink, #1b2620) !important;
        border-radius: 8px !important;
        background-color: var(--paper, #f4efe4) !important;
        color: var(--ink, #1b2620) !important;
        font-family: 'IBM Plex Sans', 'Noto Sans', Arial, sans-serif !important;
        font-size: .84rem !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
        letter-spacing: .01em;
        cursor: pointer;
        opacity: 1 !important;
        color-scheme: light;
        transition: color .2s ease, background-color .2s ease, border-color .2s ease, box-shadow .2s ease;
      }

      #languageSelector:hover,
      .language-selector:hover,
      .language-selector-native:hover {
        border-color: var(--route, #b8321f) !important;
        box-shadow: 0 0 0 2px rgba(184,50,31,.12);
      }

      #languageSelector:focus-visible,
      .language-selector:focus-visible,
      .language-selector-native:focus-visible {
        outline: 3px solid var(--signal, #d6a91a);
        outline-offset: 2px;
      }

      #languageSelector option,
      .language-selector option,
      .language-selector-native option {
        background: #f4efe4 !important;
        color: #1b2620 !important;
        font-family: 'IBM Plex Sans', 'Noto Sans', Arial, sans-serif !important;
        font-size: .95rem !important;
        font-weight: 700 !important;
      }

      [data-theme='dark'] #languageSelector,
      [data-theme='dark'] .language-selector,
      [data-theme='dark'] .language-selector-native {
        background-color: var(--paper, #1b2620) !important;
        color: var(--ink, #f0ead8) !important;
        border-color: var(--ink, #f0ead8) !important;
        color-scheme: dark;
      }

      [data-theme='dark'] #languageSelector option,
      [data-theme='dark'] .language-selector option,
      [data-theme='dark'] .language-selector-native option {
        background: #1b2620 !important;
        color: #f0ead8 !important;
      }

      /* Native-script font support. */
      html:lang(zh), html:lang(zh) body {
        font-family: 'Noto Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', Arial, sans-serif;
      }
      html:lang(ar), html:lang(ar) body {
        font-family: 'Noto Sans Arabic', 'Noto Sans', 'Segoe UI', Tahoma, Arial, sans-serif;
      }
      html:lang(ar) #languageSelector,
      html:lang(ar) .language-selector,
      html:lang(ar) .language-selector-native,
      html:lang(ar) #languageSelector option,
      html:lang(ar) .language-selector option,
      html:lang(ar) .language-selector-native option {
        font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif !important;
      }

      /* RTL is a layout change, not merely a text translation. */
      html[dir='rtl'] body { direction: rtl; }
      html[dir='rtl'] .nav-controls,
      html[dir='rtl'] .cta-row,
      html[dir='rtl'] .form-actions { direction: rtl; }
      html[dir='rtl'] input,
      html[dir='rtl'] textarea,
      html[dir='rtl'] select { text-align: right; }
      html[dir='rtl'] #languageSelector,
      html[dir='rtl'] .language-selector,
      html[dir='rtl'] .language-selector-native {
        padding-left: 30px !important;
        padding-right: 10px !important;
      }

      /* Keep translated copy readable when scripts become visually denser. */
      html[lang='zh'] body,
      html[lang='ar'] body { line-height: 1.7; }
      html[lang='zh'] h1,
      html[lang='zh'] h2,
      html[lang='zh'] h3,
      html[lang='ar'] h1,
      html[lang='ar'] h2,
      html[lang='ar'] h3 { line-height: 1.35; }

      @media (max-width: 480px) {
        #languageSelector,
        .language-selector,
        .language-selector-native {
          min-width: 116px;
          min-height: 38px;
          font-size: .8rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function labelSelector() {
    var selector = document.getElementById('languageSelector');
    if (!selector) return;

    Object.keys(NATIVE_NAMES).forEach(function (code) {
      var option = selector.querySelector('option[value="' + code + '"]');
      if (option) {
        option.textContent = FLAGS[code] + ' ' + NATIVE_NAMES[code];
      }
    });
  }

  function syncDocumentLocale(locale) {
    if (!NATIVE_NAMES[locale]) locale = 'en';
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', RTL[locale] ? 'rtl' : 'ltr');
    document.body.classList.toggle('rtl', !!RTL[locale]);
    labelSelector();
  }

  function wireSelector() {
    var selector = document.getElementById('languageSelector');
    if (!selector || selector.dataset.lueriNativeWired === 'true') return;
    selector.dataset.lueriNativeWired = 'true';

    selector.addEventListener('change', function (event) {
      var locale = event.target.value;
      syncDocumentLocale(locale);
      if (typeof window.lueriSetLocale === 'function') {
        window.lueriSetLocale(locale);
      }
    });

    var initial = selector.value || localStorage.getItem('lueri_language') || 'en';
    syncDocumentLocale(initial);
  }

  addLocaleStyles();

  /* Load the full translation engine synchronously while the page is parsing.
     This preserves the engine's existing DOMContentLoaded behaviour. */
  document.write('<script src="i18n-engine.js"><\\/script>');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      labelSelector();
      wireSelector();
    }, { once: true });
  } else {
    labelSelector();
    wireSelector();
  }
})();
