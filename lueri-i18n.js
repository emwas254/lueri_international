/* LUERI INTERNATIONAL — complete customer-facing localization layer
 *
 * The previous implementation translated only a small whitelist of exact
 * English strings. That caused the language selector to produce mixed pages:
 * some strings changed while headings, paragraphs, FAQ copy, legal copy,
 * dynamically rendered content and form text remained English.
 *
 * This version uses Google's website translation engine for the complete DOM
 * while retaining Lueri's branded language selector. The selector itself is
 * excluded from translation, the selected language persists across pages, and
 * Arabic switches the document direction to RTL.
 */
(function(){
  'use strict';

  const LANGS = {
    en: 'English',
    sw: 'Kiswahili',
    fr: 'Français',
    es: 'Español',
    ar: 'العربية',
    pt: 'Português',
    zh: '中文'
  };

  const GOOGLE_CODES = {
    en: 'en',
    sw: 'sw',
    fr: 'fr',
    es: 'es',
    ar: 'ar',
    pt: 'pt',
    zh: 'zh-CN'
  };

  const RTL = new Set(['ar']);
  const KEY = 'lueri-language';
  let googleReady = false;
  let pendingLanguage = null;

  function get(){
    try {
      const saved = localStorage.getItem(KEY);
      return LANGS[saved] ? saved : 'en';
    } catch (_) {
      return 'en';
    }
  }

  function setDocumentLanguage(lang){
    if (!LANGS[lang]) lang = 'en';
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
    document.documentElement.dataset.lueriLanguage = lang;
    document.querySelectorAll('[data-lueri-language]').forEach(function(el){
      el.value = lang;
    });
  }

  function save(lang){
    try { localStorage.setItem(KEY, lang); } catch (_) {}
  }

  function ensureGoogleStyles(){
    if (document.getElementById('lueri-google-translate-style')) return;
    const style = document.createElement('style');
    style.id = 'lueri-google-translate-style';
    style.textContent = `
      /* Keep Google's translation machinery invisible; Lueri owns the UI. */
      .goog-te-banner-frame.skiptranslate,
      body > .skiptranslate,
      .goog-te-gadget,
      .goog-logo-link,
      .goog-te-balloon-frame { display:none !important; }
      body { top:0 !important; }
      html.translated-ltr, html.translated-rtl { margin-top:0 !important; }
      .lueri-language-picker { display:flex; align-items:center; margin-left:8px; flex:0 0 auto; position:relative; z-index:10000; }
      .lueri-language-picker select {
        font:500 12px/1.2 'IBM Plex Sans', sans-serif;
        letter-spacing:.03em;
        border:1px solid currentColor;
        border-radius:3px;
        background:#1b2620;
        color:#f0ead8;
        padding:9px 30px 9px 10px;
        min-height:38px;
        min-width:122px;
        cursor:pointer;
        color-scheme:dark;
      }
      .lueri-language-picker select option { background:#1b2620; color:#f0ead8; }
      .lueri-language-picker select:focus { outline:2px solid currentColor; outline-offset:2px; }
      [dir="rtl"] .lueri-language-picker { margin-left:0; margin-right:8px; }
      @media(max-width:640px){
        .lueri-language-picker { margin-left:4px; }
        .lueri-language-picker select { max-width:122px; min-width:112px; padding:8px 20px 8px 7px; font-size:11px; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectPicker(){
    if (document.querySelector('.lueri-language-picker')) return;
    ensureGoogleStyles();

    const wrap = document.createElement('div');
    wrap.className = 'lueri-language-picker notranslate';
    wrap.setAttribute('translate','no');
    wrap.setAttribute('aria-label','Language selector');

    const select = document.createElement('select');
    select.setAttribute('data-lueri-language','');
    select.setAttribute('aria-label','Language');
    select.className = 'notranslate';
    select.setAttribute('translate','no');

    Object.entries(LANGS).forEach(function(entry){
      const code = entry[0], name = entry[1];
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      option.className = 'notranslate';
      option.setAttribute('translate','no');
      select.appendChild(option);
    });

    select.addEventListener('change', function(e){
      set(e.target.value);
    });

    wrap.appendChild(select);
    const host = document.querySelector('.nav-controls')
      || document.querySelector('.navbar > div:last-child')
      || document.querySelector('header nav,.site-header nav,.header-nav,.nav-links');
    if (host) host.appendChild(wrap);
    else document.body.appendChild(wrap);
  }

  function findGoogleSelect(){
    return document.querySelector('.goog-te-combo');
  }

  function applyGoogleLanguage(lang){
    const code = GOOGLE_CODES[lang] || 'en';
    const combo = findGoogleSelect();
    if (!combo) {
      pendingLanguage = lang;
      return false;
    }

    if (combo.value !== code) {
      combo.value = code;
      combo.dispatchEvent(new Event('change', { bubbles:true }));
    }
    setDocumentLanguage(lang);
    pendingLanguage = null;
    return true;
  }

  function set(lang){
    if (!LANGS[lang]) return;
    save(lang);
    setDocumentLanguage(lang);
    if (lang === 'en') {
      /* Google Translate uses the English target to restore the source page. */
      applyGoogleLanguage('en');
    } else {
      applyGoogleLanguage(lang);
    }
  }

  function installGoogle(){
    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
      initGoogle();
      return;
    }
    if (document.getElementById('lueri-google-translate-script')) return;

    window.googleTranslateElementInit = function(){ initGoogle(); };
    const script = document.createElement('script');
    script.id = 'lueri-google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  function initGoogle(){
    if (googleReady) return;
    try {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'sw,fr,es,ar,pt,zh-CN',
        autoDisplay: false,
        multilanguagePage: true
      }, 'lueri-google-translate');
      googleReady = true;
      const wanted = pendingLanguage || get();
      setDocumentLanguage(wanted);
      window.setTimeout(function(){ applyGoogleLanguage(wanted); }, 250);
      window.setTimeout(function(){ applyGoogleLanguage(wanted); }, 1000);
      window.setTimeout(function(){ applyGoogleLanguage(wanted); }, 2500);
    } catch (err) {
      console.error('Lueri language engine failed to initialize:', err);
    }
  }

  function injectGoogleHost(){
    if (document.getElementById('lueri-google-translate')) return;
    const host = document.createElement('div');
    host.id = 'lueri-google-translate';
    host.className = 'notranslate';
    host.setAttribute('translate','no');
    host.setAttribute('aria-hidden','true');
    host.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-99999px;top:-99999px;';
    document.body.appendChild(host);
  }

  function observeDynamicContent(){
    if (window.__lueriI18nObserver) return;
    let timer = null;
    const observer = new MutationObserver(function(mutations){
      if (!googleReady) return;
      let relevant = false;
      for (const mutation of mutations) {
        if (mutation.target && mutation.target.closest && mutation.target.closest('.lueri-language-picker,#lueri-google-translate,.goog-te-menu-frame')) continue;
        if (mutation.type === 'childList' && mutation.addedNodes.length) { relevant = true; break; }
      }
      if (!relevant) return;
      clearTimeout(timer);
      timer = setTimeout(function(){
        const lang = get();
        if (lang !== 'en') applyGoogleLanguage(lang);
      }, 350);
    });
    observer.observe(document.body, { childList:true, subtree:true });
    window.__lueriI18nObserver = observer;
  }

  function init(){
    ensureGoogleStyles();
    injectPicker();
    injectGoogleHost();
    const lang = get();
    setDocumentLanguage(lang);
    installGoogle();
    observeDynamicContent();
  }

  window.LueriI18n = {
    languages: LANGS,
    get: get,
    set: set,
    apply: set,
    init: init
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
