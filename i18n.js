/* Lueri International — native seven-language bootstrap
   Full base translations: i18n-engine.js
   Strict completion translations: i18n-strict.js
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

  function themeStyles() {
    if (document.getElementById('lueri-native-language-styles')) return;
    var s = document.createElement('style');
    s.id = 'lueri-native-language-styles';
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
    Object.keys(NATIVE).forEach(function (code) {
      var option = select.querySelector('option[value="' + code + '"]');
      if (option) option.textContent = NATIVE[code].flag + ' ' + NATIVE[code].name;
    });
  }

  function syncLocale(locale) {
    if (!NATIVE[locale]) locale = 'en';
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    if (document.body) document.body.classList.toggle('rtl', locale === 'ar');
    labelSelector();
  }

  themeStyles();

  /* Synchronous loading keeps the existing engine's DOMContentLoaded flow intact. */
  document.write('<script src="i18n-engine.js"><\\/script>');
  document.write('<script src="i18n-strict.js"><\\/script>');

  function wireSelector() {
    var select = document.getElementById('languageSelector');
    if (!select || select.dataset.lueriWired === 'true') return;
    select.dataset.lueriWired = 'true';
    select.addEventListener('change', function () {
      var locale = this.value;
      syncLocale(locale);
      localStorage.setItem('lueri_language', locale);
      if (typeof window.lueriSetLocale === 'function') window.lueriSetLocale(locale);
    });
    syncLocale(select.value || localStorage.getItem('lueri_language') || 'en');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireSelector();
      labelSelector();
    }, { once:true });
  } else {
    wireSelector();
    labelSelector();
  }
})();
