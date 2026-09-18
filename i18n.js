/* Lueri International — i18next-powered seven-language bootstrap
   Static HTML site: i18next is used directly; react-i18next is not loaded because React is not used.
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

  function installStyles() {
    if (document.getElementById('lueri-i18next-styles')) return;
    var s = document.createElement('style');
    s.id = 'lueri-i18next-styles';
    s.textContent = `
      #languageSelector{min-width:128px!important;min-height:40px!important;padding:7px 30px 7px 10px!important;border:1.5px solid var(--ink,#1b2620)!important;border-radius:8px!important;background:var(--paper,#f4efe4)!important;color:var(--ink,#1b2620)!important;font-family:'IBM Plex Sans','Noto Sans',Arial,sans-serif!important;font-size:.84rem!important;font-weight:700!important;line-height:1.2!important;opacity:1!important;color-scheme:light;}
      #languageSelector option{background:#f4efe4!important;color:#1b2620!important;font-family:'IBM Plex Sans','Noto Sans',Arial,sans-serif!important;font-weight:700!important;font-size:.95rem!important;}
      [data-theme='dark'] #languageSelector{background:var(--paper,#1b2620)!important;color:var(--ink,#f0ead8)!important;border-color:var(--ink,#f0ead8)!important;color-scheme:dark;}
      [data-theme='dark'] #languageSelector option{background:#1b2620!important;color:#f0ead8!important;}

      html:lang(ar),html:lang(ar) body,html:lang(ar) body *{font-family:'Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif!important;}
      html:lang(ar) body{direction:rtl;text-align:right;line-height:1.75;}
      html:lang(ar) h1,html:lang(ar) h2,html:lang(ar) h3{font-weight:800;line-height:1.45;}
      html:lang(ar) input,html:lang(ar) textarea,html:lang(ar) select{text-align:right;}
      html:lang(ar) .section-head{flex-direction:row-reverse;}
      html:lang(ar) .pricing-grid{direction:rtl;}
      html:lang(ar) .pricing-card,html:lang(ar) .pricing-note,html:lang(ar) .sla-item{text-align:right;}
      html:lang(ar) .menu-panel-grid,html:lang(ar) .why-list{direction:rtl;}
      html:lang(ar) .menu-link{flex-direction:row-reverse;}
      html:lang(ar) .menu-link-body{text-align:right;}
      html:lang(ar) .cta-row,html:lang(ar) .form-actions,html:lang(ar) .nav-controls{direction:rtl;}

      html:lang(zh),html:lang(zh) body,html:lang(zh) body *{font-family:'Noto Sans SC','Noto Sans CJK SC','Microsoft YaHei',Arial,sans-serif!important;}
      html:lang(zh) body{line-height:1.75;}
      html:lang(zh) h1,html:lang(zh) h2,html:lang(zh) h3{line-height:1.4;}
      html[lang='sw'] body,html[lang='fr'] body,html[lang='es'] body,html[lang='pt'] body{line-height:1.6;}

      /* Pricing separation + gentle motion. */
      #pricing .pricing-grid{column-gap:24px;row-gap:24px;margin-bottom:36px;}
      #pricing .pricing-note{margin-top:0;}
      #pricing .pricing-note + .pricing-note{margin-top:24px;}
      #pricing .pricing-grid + .pricing-note{margin-top:0;}
      #pricing .pricing-card{animation:lueriPricingIn .72s cubic-bezier(.2,.8,.2,1) both;will-change:transform,opacity;}
      #pricing .pricing-card:nth-child(1){animation-delay:.04s;}
      #pricing .pricing-card:nth-child(2){animation-delay:.12s;}
      #pricing .pricing-card:nth-child(3){animation-delay:.20s;}
      #pricing .pricing-card:hover{transform:translateY(-8px) scale(1.015);box-shadow:0 18px 36px rgba(0,0,0,.16);border-color:var(--route);}
      @keyframes lueriPricingIn{from{opacity:0;transform:translateY(26px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
      @media (prefers-reduced-motion:reduce){#pricing .pricing-card{animation:none!important;transition:none!important;}}
      @media(max-width:480px){#languageSelector{min-width:116px!important;min-height:38px!important;font-size:.8rem!important;}}
    `;
    document.head.appendChild(s);
  }

  function labelSelector() {
    var selector = document.getElementById('languageSelector');
    if (!selector) return;
    LANGS.forEach(function (code) {
      var option = selector.querySelector('option[value="' + code + '"]');
      if (option) option.textContent = NATIVE[code].flag + ' ' + NATIVE[code].name;
    });
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

  function setDocumentLocale(locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    if (document.body) document.body.classList.toggle('rtl', locale === 'ar');
    labelSelector();
  }

  function applyI18next(locale) {
    if (!window.i18next || !window.LueriI18n || !window.LueriI18n.translations) return;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var value = window.i18next.t(key, { lng:locale, defaultValue:'' });
      if (value && value !== key) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var value = window.i18next.t(key, { lng:locale, defaultValue:key });
      if (value && value !== key) el.setAttribute('placeholder', value);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      var value = window.i18next.t(key, { lng:locale, defaultValue:key });
      if (value && value !== key) el.setAttribute('aria-label', value);
    });
    setDocumentLocale(locale);
  }

  function start() {
    installStyles();
    labelSelector();
    var translationData = window.LueriI18n && window.LueriI18n.translations;
    if (!window.i18next || !translationData) return;

    var resources = {};
    LANGS.forEach(function (code) { resources[code] = { translation: flatten(translationData[code]) }; });

    var requested = 'en';
    try { requested = localStorage.getItem(STORAGE_KEY) || 'en'; } catch (_) {}
    if (LANGS.indexOf(requested) < 0) requested = 'en';

    window.i18next.init({
      lng:requested,
      fallbackLng:false,
      supportedLngs:LANGS,
      resources:resources,
      interpolation:{ escapeValue:false },
      returnEmptyString:false,
      initImmediate:false
    }, function () {
      var locale = LANGS.indexOf(window.i18next.language) >= 0 ? window.i18next.language : requested;
      var selector = document.getElementById('languageSelector');
      if (selector) selector.value = locale;
      applyI18next(locale);

      if (selector && selector.dataset.i18nextWired !== 'true') {
        selector.dataset.i18nextWired = 'true';
        selector.addEventListener('change', function () {
          var next = LANGS.indexOf(this.value) >= 0 ? this.value : 'en';
          window.i18next.changeLanguage(next, function () {
            try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
            applyI18next(next);
            if (typeof window.lueriSetLocale === 'function') window.lueriSetLocale(next);
            window.dispatchEvent(new CustomEvent('lueri:languagechange', { detail:{language:next} }));
          });
        });
      }
    });
  }

  /* i18next UMD runtime + existing Lueri translation resources. */
  document.write('<script src="https://cdn.jsdelivr.net/npm/i18next@25.6.0/dist/umd/i18next.min.js"><\\/script>');
    document.write('<script src="i18n-translations.js"><\\/script>');
  document.write('<script src="i18n-completion.js"><\\/script>');
  document.write('<script src="i18n-strict.js"><\\/script>');

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
