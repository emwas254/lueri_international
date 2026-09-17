/* Lueri International — i18next-powered seven-language bootstrap
   Uses i18next as the translation runtime with the existing Lueri resource dictionaries.
   This site is static HTML, not React, so react-i18next is intentionally NOT loaded:
   react-i18next is a React binding and would add an unused React runtime here.
   No Google Translate. No third-party translation widget.
*/
(function () {
  'use strict';

  var NATIVE = {
    en: { flag:'🇬🇧', name:'English' },
    zh: { flag:'🇨🇳', name:'中文' },
    sw: { flag:'🇰🇪', name:'Kiswahili' },
    fr: { flag:'🇫🇷', name:'Français' },
    es: { flag:'🇪🇸', name:'Español' },
    ar: { flag:'🇸🇦', name:'العربية' },
    pt: { flag:'🇧🇷', name:'Português' }
  };
  var LANGS = Object.keys(NATIVE);
  var STORAGE_KEY = 'lueri_language';

  function themeStyles() {
    if (document.getElementById('lueri-i18next-styles')) return;
    var s = document.createElement('style');
    s.id = 'lueri-i18next-styles';
    s.textContent = `
      #languageSelector {
        min-width:128px !important;
        min-height:40px !important;
        padding:7px 30px 7px 10px !important;
        border:1.5px solid var(--ink,#1b2620) !important;
        border-radius:8px !important;
        background-color:var(--paper,#f4efe4) !important;
        color:var(--ink,#1b2620) !important;
        font-family:'IBM Plex Sans','Noto Sans',Arial,sans-serif !important;
        font-size:.84rem !important;
        font-weight:700 !important;
        line-height:1.2 !important;
        opacity:1 !important;
        color-scheme:light;
      }
      #languageSelector option {
        background:#f4efe4 !important;
        color:#1b2620 !important;
        font-family:'IBM Plex Sans','Noto Sans',Arial,sans-serif !important;
        font-weight:700 !important;
        font-size:.95rem !important;
      }
      [data-theme='dark'] #languageSelector {
        background-color:var(--paper,#1b2620) !important;
        color:var(--ink,#f0ead8) !important;
        border-color:var(--ink,#f0ead8) !important;
        color-scheme:dark;
      }
      [data-theme='dark'] #languageSelector option {
        background:#1b2620 !important;
        color:#f0ead8 !important;
      }
      html:lang(ar),html:lang(ar) body { font-family:'Noto Sans Arabic','Noto Sans','Segoe UI',Tahoma,Arial,sans-serif; }
      html:lang(ar) body { direction:rtl; text-align:right; line-height:1.7; }
      html:lang(ar) input,html:lang(ar) textarea,html:lang(ar) select { text-align:right; }
      html:lang(ar) #languageSelector { font-family:'Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif !important; }
      html:lang(zh) body { font-family:'Noto Sans SC','Noto Sans CJK SC','Microsoft YaHei',Arial,sans-serif; line-height:1.7; }
      html:lang(zh) h1,html:lang(zh) h2,html:lang(zh) h3,html:lang(ar) h1,html:lang(ar) h2,html:lang(ar) h3 { line-height:1.35; }
      html[dir='rtl'] .nav-controls,html[dir='rtl'] .cta-row,html[dir='rtl'] .form-actions { direction:rtl; }
      @media(max-width:480px){#languageSelector{min-width:116px !important;font-size:.8rem !important;}}
    `;
    document.head.appendChild(s);
  }

  function labelSelector() {
    var select = document.getElementById('languageSelector');
    if (!select) return;
    LANGS.forEach(function (code) {
      var option = select.querySelector('option[value="' + code + '"]');
      if (option) option.textContent = NATIVE[code].flag + ' ' + NATIVE[code].name;
    });
  }

  function syncDocument(locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    if (document.body) document.body.classList.toggle('rtl', locale === 'ar');
    labelSelector();
  }

  function flatten(obj, prefix, out) {
    out = out || {};
    Object.keys(obj || {}).forEach(function (key) {
      var value = obj[key];
      var full = prefix ? prefix + '.' + key : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, out);
      else out[full] = value;
    });
    return out;
  }

  function applyI18next(locale) {
    if (!window.i18next || !window.LueriI18n || !window.LueriI18n.translations) return;
    var dict = window.LueriI18n.translations[locale] || window.LueriI18n.translations.en;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var value = window.i18next.t(key, { lng: locale });
      if (value === key) value = flatten(dict)[key] || window.i18next.t(key, { lng:'en' });
      if (value !== key) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var value = window.i18next.t(key, { lng: locale });
      if (value !== key) el.setAttribute('placeholder', value);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      var value = window.i18next.t(key, { lng: locale });
      if (value !== key) el.setAttribute('aria-label', value);
    });
    syncDocument(locale);
  }

  function start() {
    themeStyles();
    labelSelector();

    var translations = window.LueriI18n && window.LueriI18n.translations;
    if (!window.i18next || !translations) return;

    var resources = {};
    LANGS.forEach(function (code) {
      resources[code] = { translation: flatten(translations[code]) };
    });

    window.i18next.init({
      lng: localStorage.getItem(STORAGE_KEY) || 'en',
      fallbackLng: 'en',
      resources: resources,
      interpolation: { escapeValue: false }
    }).then(function () {
      var locale = LANGS.indexOf(window.i18next.language) >= 0 ? window.i18next.language : 'en';
      var select = document.getElementById('languageSelector');
      if (select) select.value = locale;
      applyI18next(locale);

      if (select && select.dataset.i18nextWired !== 'true') {
        select.dataset.i18nextWired = 'true';
        select.addEventListener('change', function () {
          var next = LANGS.indexOf(this.value) >= 0 ? this.value : 'en';
          window.i18next.changeLanguage(next).then(function () {
            localStorage.setItem(STORAGE_KEY, next);
            applyI18next(next);
            if (typeof window.lueriSetLocale === 'function') window.lueriSetLocale(next);
            window.dispatchEvent(new CustomEvent('lueri:languagechange', { detail:{ language:next } }));
          });
        });
      }
    });
  }

  /* Load i18next first, then the existing resource/strict layers. */
  document.write('<script src="https://cdn.jsdelivr.net/npm/i18next@25.6.0/dist/umd/i18next.min.js"><\\/script>');
  document.write('<script src="i18n-engine.js"><\\/script>');
  document.write('<script src="i18n-strict.js"><\\/script>');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();