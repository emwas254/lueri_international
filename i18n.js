/* Lueri International — seven-language bootstrap
   Static HTML site. No Google Translate. No third-party widget.
*/
(function () {
  'use strict';
  var NATIVE = {
    en: { flag:'GB', src:'https://flagcdn.com/w40/gb.png', name:'English' },
    zh: { flag:'CN', src:'https://flagcdn.com/w40/cn.png', name:'中文' },
    sw: { flag:'KE', src:'https://flagcdn.com/w40/ke.png', name:'Kiswahili' },
    fr: { flag:'FR', src:'https://flagcdn.com/w40/fr.png', name:'Français' },
    es: { flag:'ES', src:'https://flagcdn.com/w40/es.png', name:'Español' },
    ar: { flag:'SA', src:'https://flagcdn.com/w40/sa.png', name:'العربية' },
    pt: { flag:'BR', src:'https://flagcdn.com/w40/br.png', name:'Português' }
  };
  var LANGS = Object.keys(NATIVE);
  var STORAGE_KEY = 'lueri_language';
  function installStyles() {
    if (document.getElementById('lueri-i18next-styles')) return;
    var s = document.createElement('style');
    s.id = 'lueri-i18next-styles';
    s.textContent = `
      .lueri-language-menu{position:relative;display:inline-block;z-index:3000;}
      .lueri-language-trigger{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;min-width:128px;min-height:40px;padding:7px 10px;border:1.5px solid var(--ink,#1b2620);border-radius:8px;background:var(--paper,#f4efe4);color:var(--ink,#1b2620);font:700 .84rem/1.2 'IBM Plex Sans','Noto Sans',Arial,sans-serif;cursor:pointer;box-sizing:border-box;white-space:nowrap;}
      .lueri-language-trigger:focus-visible,.lueri-language-option:focus-visible{outline:2px solid var(--route,#00bfa6);outline-offset:2px;}
      .lueri-language-list{position:absolute;right:0;top:calc(100% + 6px);min-width:180px;padding:6px;background:var(--paper,#f4efe4);border:1px solid var(--line,#c8c1ae);border-radius:8px;box-shadow:0 14px 30px rgba(0,0,0,.18);display:none;}
      .lueri-language-menu.open .lueri-language-list{display:block;}
      .lueri-language-option{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;background:transparent;color:var(--ink,#1b2620);border-radius:5px;font:600 .86rem/1.2 'IBM Plex Sans','Noto Sans',Arial,sans-serif;text-align:left;cursor:pointer;}
      .lueri-language-option:hover,.lueri-language-option[aria-selected='true']{background:rgba(0,191,166,.10);}
      .lueri-language-flag{width:22px;height:15px;display:block;object-fit:cover;border-radius:2px;flex:0 0 auto;box-shadow:0 0 0 1px rgba(27,38,32,.18);}
      [data-theme='dark'] .lueri-language-trigger,[data-theme='dark'] .lueri-language-list{background:var(--paper,#1b2620);color:var(--ink,#f0ead8);border-color:var(--ink,#f0ead8);}
      [data-theme='dark'] .lueri-language-option{color:var(--ink,#f0ead8);}
      @media(max-width:700px){.lueri-language-trigger{min-width:112px;min-height:40px;font-size:.78rem}.lueri-language-list{right:0;min-width:170px;}}
      #languageSelector{min-width:128px!important;min-height:40px!important;padding:7px 30px 7px 10px!important;border:1.5px solid var(--ink,#1b2620)!important;border-radius:8px!important;background:var(--paper,#f4efe4)!important;color:var(--ink,#1b2620)!important;font-family:'IBM Plex Sans','Noto Sans',Arial,sans-serif!important;font-size:.84rem!important;font-weight:700!important;line-height:1.2!important;opacity:1!important;color-scheme:light;}
      #languageSelector option{background:#f4efe4!important;color:#1b2620!important;font-family:'IBM Plex Sans','Noto Sans',Arial,sans-serif!important;font-weight:700!important;font-size:.95rem!important;}
      [data-theme='dark'] #languageSelector{background:var(--paper,#1b2620)!important;color:var(--ink,#f0ead8)!important;border-color:var(--ink,#f0ead8)!important;color-scheme:dark;}
      [data-theme='dark'] #languageSelector option{background:#1b2620!important;color:#f0ead8!important;}
      html:lang(ar),html:lang(ar) body,html:lang(ar) body *{font-family:'Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif!important;}
      html:lang(ar) body{direction:rtl;text-align:right;line-height:1.75;}
      html:lang(ar) h1,html:lang(ar) h2,html:lang(ar) h3{font-weight:800;line-height:1.45;}
      html:lang(ar) input,html:lang(ar) textarea,html:lang(ar) select{text-align:right;}
      html:lang(ar) .pricing-grid{direction:rtl;}
      html:lang(ar) .pricing-card,html:lang(ar) .pricing-note,html:lang(ar) .sla-item{text-align:right;}
      html:lang(ar) .menu-panel-grid,html:lang(ar) .why-list{direction:rtl;}
      html:lang(ar) .menu-link-body{text-align:right;}
      html:lang(ar) .cta-row,html:lang(ar) .form-actions,html:lang(ar) .nav-controls{direction:rtl;}
      html:lang(ar) .btn{letter-spacing:normal;}
      html:lang(zh),html:lang(zh) body,html:lang(zh) body *{font-family:'Noto Sans SC','Noto Sans CJK SC','Microsoft YaHei',Arial,sans-serif!important;}
      html:lang(zh) body{line-height:1.75;}
      html:lang(zh) h1,html:lang(zh) h2,html:lang(zh) h3{line-height:1.4;}
      @media(max-width:760px){#lueriLanguageTrigger{font-size:.78rem!important;min-width:0!important}.lueri-language-list{max-width:calc(100vw - 24px)!important;min-width:190px!important;}}
      html[lang='sw'] body,html[lang='fr'] body,html[lang='es'] body,html[lang='pt'] body{line-height:1.6;}
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
    var menu=document.getElementById('lueriLanguageMenu');
    if(!menu){
      menu=document.createElement('div'); menu.id='lueriLanguageMenu'; menu.className='lueri-language-menu';
      selector.parentNode.insertBefore(menu,selector); selector.style.display='none'; selector.setAttribute('aria-hidden','true');
      var trigger=document.createElement('button'); trigger.type='button'; trigger.className='lueri-language-trigger'; trigger.id='lueriLanguageTrigger'; trigger.setAttribute('aria-haspopup','listbox'); trigger.setAttribute('aria-expanded','false');
      var list=document.createElement('div'); list.className='lueri-language-list'; list.setAttribute('role','listbox'); list.setAttribute('aria-label','Select language');
      menu.appendChild(trigger); menu.appendChild(list);
      LANGS.forEach(function(code){
        var b=document.createElement('button'); b.type='button'; b.className='lueri-language-option'; b.dataset.locale=code; b.setAttribute('role','option');
        b.innerHTML='<img class="lueri-language-flag" src="'+NATIVE[code].src+'" alt="" aria-hidden="true" loading="lazy" decoding="async"><span>'+NATIVE[code].name+'</span>';
        b.addEventListener('click',function(){ selector.value=code; selector.dispatchEvent(new Event('change',{bubbles:true})); close(); });
        list.appendChild(b);
      });
      function close(){menu.classList.remove('open');trigger.setAttribute('aria-expanded','false');}
      trigger.addEventListener('click',function(){var open=menu.classList.toggle('open');trigger.setAttribute('aria-expanded',String(open));});
      document.addEventListener('click',function(e){if(!menu.contains(e.target))close();});
      document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
    }
    var current=selector.value||'en', meta=NATIVE[current]||NATIVE.en;
    var trigger=document.getElementById('lueriLanguageTrigger');
    if(trigger){trigger.innerHTML='<span style="display:inline-flex;align-items:center;gap:9px;min-width:0;"><img class="lueri-language-flag" src="'+meta.src+'" alt="" aria-hidden="true" width="22" height="15"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+meta.name+'</span></span><span aria-hidden="true">⌄</span>';}
    menu.querySelectorAll('.lueri-language-option').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.locale===current));});
  }
  function setDocumentLocale(locale) {
    locale = LANGS.indexOf(locale) >= 0 ? locale : 'en';
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.lueriLanguage = locale;
    document.documentElement.classList.toggle('is-rtl', locale === 'ar');
    if (document.body) document.body.classList.toggle('rtl', locale === 'ar');
    labelSelector();
  }

  function lookup(locale, key) {
    /* Critical customer-facing CTA: keep this mapping local to the runtime so the
       review button can never fall back to English because of dictionary load order. */
    if (key === 'why.reviewBtn') {
      var reviewLabels = {
        en: 'Leave a review on Facebook',
        zh: '在 Facebook 上留下评价',
        sw: 'Acha maoni kwenye Facebook',
        fr: 'Laisser un avis sur Facebook',
        es: 'Dejar una reseña en Facebook',
        ar: 'اترك تقييمًا على فيسبوك',
        pt: 'Deixar uma avaliação no Facebook'
      };
      return reviewLabels[locale] || reviewLabels.en;
    }
    var source = window.LueriI18n && window.LueriI18n.translations && window.LueriI18n.translations[locale];
    if (!source) return '';
    return key.split('.').reduce(function (obj, part) { return obj && obj[part]; }, source) || '';
  }

  function localizeSectionLinks(locale) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || !/(rewards|corporate|careers)\.html/.test(href)) return;
      try {
        var url = new URL(href, window.location.href);
        if (/(rewards|corporate|careers)\.html$/.test(url.pathname)) {
          url.searchParams.set('lang', locale);
          a.setAttribute('href', url.pathname + '?' + url.searchParams.toString() + (url.hash || ''));
        }
      } catch (_) {}
    });
  }

  function applyI18next(locale) {
    if (!window.LueriI18n || !window.LueriI18n.translations) return;
    locale = LANGS.indexOf(locale) >= 0 ? locale : 'en';
    if (window.LueriI18nCompletion && typeof window.LueriI18nCompletion.apply === 'function') {
      window.LueriI18nCompletion.apply(locale);
    }
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = lookup(locale, el.getAttribute('data-i18n'));
      if (v) {
        if (/<[a-z][\s\S]*>/i.test(String(v))) el.innerHTML = v;
        else el.textContent = v;
      } else {
        var en = el.getAttribute('data-en');
        if (en !== null) el.innerHTML = en;
      }
    });
    [['placeholder','data-i18n-placeholder','data-en-placeholder'],['aria-label','data-i18n-aria','data-en-aria']].forEach(function (a) {
      document.querySelectorAll('[' + a[1] + ']').forEach(function (el) {
        var v = lookup(locale, el.getAttribute(a[1]));
        el.setAttribute(a[0], v || el.getAttribute(a[2]) || '');
      });
    });
    /* Hard-bind the customer review CTA after every translation pass.
       This prevents any later dictionary merge or stale fallback from restoring English. */
    var reviewCTA = document.querySelector('[data-i18n="why.reviewBtn"]');
    if (reviewCTA) {
      var reviewLabels = {
        en:'Leave a review on Facebook',
        zh:'在 Facebook 上留下评价',
        sw:'Acha maoni kwenye Facebook',
        fr:'Laisser un avis sur Facebook',
        es:'Dejar una reseña en Facebook',
        ar:'اترك تقييمًا على فيسبوك',
        pt:'Deixar uma avaliação no Facebook'
      };
      reviewCTA.textContent = reviewLabels[locale] || reviewLabels.en;
      reviewCTA.setAttribute('lang', locale === 'zh' ? 'zh-CN' : locale);
      reviewCTA.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    }

    setDocumentLocale(locale);
    localizeSectionLinks(locale);
    try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}
    window.dispatchEvent(new CustomEvent('lueri:languagechange', { detail:{language:locale} }));
    if (typeof window.lueriSetLocale === 'function') window.lueriSetLocale(locale);
  }

  function requestedLocale() {
    var fromUrl = null;
    try { fromUrl = new URLSearchParams(window.location.search).get('lang'); } catch (_) {}
    if (fromUrl && LANGS.indexOf(fromUrl) >= 0) return fromUrl;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && LANGS.indexOf(stored) >= 0) return stored;
    } catch (_) {}
    return 'en';
  }

  function start() {
    installStyles();
    if (!window.LueriI18n || !window.LueriI18n.translations) return;
    var requested = requestedLocale();
    var selector = document.getElementById('languageSelector');
    if (selector) {
      selector.value = requested;
      labelSelector();
      if (selector.dataset.lueriLanguageWired !== 'true') {
        selector.dataset.lueriLanguageWired = 'true';
        selector.addEventListener('change', function () {
          var next = LANGS.indexOf(this.value) >= 0 ? this.value : 'en';
          applyI18next(next);
          var url = new URL(window.location.href);
          url.searchParams.set('lang', next);
          history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString() + url.hash);
          labelSelector();
        });
      }
    }
    applyI18next(requested);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();

})();