/* Lueri Lucy + language hotfix. Loaded after the existing Lucy/i18n scripts. */
(function(){
  'use strict';
  const A='assets/lucy-avatar.webp';
  const LANG={en:'en',sw:'sw',fr:'fr',es:'es',ar:'ar',pt:'pt',zh:'zh-CN'};
  const KEY='lueri-language';

  function hideGoogle(){
    document.querySelectorAll('[class*="goog-te"],[id*="google_translate"],.skiptranslate,iframe.skiptranslate,.goog-logo-link,.goog-power-badge').forEach(e=>{
      e.style.setProperty('display','none','important');e.style.setProperty('visibility','hidden','important');
      e.style.setProperty('opacity','0','important');e.style.setProperty('pointer-events','none','important');
    });
    if(document.body)document.body.style.setProperty('top','0','important');
    document.documentElement.style.setProperty('margin-top','0','important');
  }

  function clearGoogle(){
    ['googtrans','googtransopt'].forEach(n=>{
      document.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain='+location.hostname;
      if(location.hostname.includes('.'))document.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.'+location.hostname.split('.').slice(-2).join('.');
    });
  }

  function setGoogle(v){
    const x='/en/'+LANG[v];
    document.cookie='googtrans='+x+'; path=/; SameSite=Lax';
    document.cookie='googtrans='+x+'; path=/; domain='+location.hostname+'; SameSite=Lax';
  }

  function choose(v){
    if(!LANG[v])return;
    try{localStorage.setItem(KEY,v);localStorage.setItem('lueri_lang',v);localStorage.setItem('lueri_locale',v);}catch(_){ }
    document.documentElement.lang=v==='zh'?'zh-CN':v;
    document.documentElement.dir=v==='ar'?'rtl':'ltr';
    document.documentElement.dataset.lueriLanguage=v;
    if(v==='en')clearGoogle();else setGoogle(v);
    const u=new URL(location.href);u.searchParams.set('lang',v);u.searchParams.set('_lueri',Date.now());
    location.replace(u.toString());
  }

  function install(){
    const style=document.createElement('style');style.id='lucy-fix-style';
    style.textContent=`
      #lucy-launcher{background-image:url("${A}")!important;background-size:cover!important;background-position:center!important;font-size:0!important;}
      #lucy-launcher .lucy-dot,#lucy-launcher [data-lucy-launcher-label]{display:none!important}
      #lucy-panel{z-index:10001!important}
      .lucy-avatar{background-image:url("${A}")!important;background-size:cover!important;background-position:center!important;}
      #lucy-panel .lucy-quick-actions,#lucy-panel .lucy-booking-actions,#lucy-panel .lucy-whatsapp-actions,.lucy-book-now,.lucy-whatsapp-button{display:none!important}
      .goog-te-banner-frame,.goog-te-menu-frame,.goog-te-gadget,.goog-te-balloon-frame,iframe.skiptranslate,.goog-logo-link,.goog-power-badge{display:none!important}
    `;document.head.appendChild(style);
    hideGoogle();

    const v=(()=>{try{return localStorage.getItem(KEY)||localStorage.getItem('lueri_lang')||'en'}catch(_){return'en'}})();
    if(v==='en' && (document.documentElement.classList.contains('translated-ltr') || document.documentElement.classList.contains('translated-rtl'))){
      clearGoogle();
      const u=new URL(location.href);u.searchParams.set('_lueri_en_reset','1');
      if(!sessionStorage.getItem('_lueri_en_reset')){sessionStorage.setItem('_lueri_en_reset','1');location.replace(u.toString());return;}
    }
    if(v==='en'){try{sessionStorage.removeItem('_lueri_en_reset')}catch(_){}
    }
    const sel=document.querySelector('[data-lueri-language]');if(sel)sel.value=LANG[v]?v:'en';
    if(v==='en')clearGoogle();else setGoogle(v);

    document.addEventListener('change',function(e){
      const t=e.target;if(!(t instanceof HTMLSelectElement)||!t.matches('[data-lueri-language]'))return;
      e.preventDefault();e.stopImmediatePropagation();choose(t.value);
    },true);

    new MutationObserver(hideGoogle).observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
