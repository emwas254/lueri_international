/* Lueri International — Lucy production loader + language compatibility layer (v3.2)
   Native Lueri i18n owns language selection; Lucy mirrors it.
   Bump UI_VERSION whenever lucy-ui-v3.js changes so browsers fetch the new file. */
(function(){
  'use strict';
  const UI_VERSION='3.2';
  const LANG=['en','sw','fr','es','ar','pt','zh'];
  const KEY='lueri_language';

  function locale(preferred){
    try{
      const v=preferred
        || document.documentElement.dataset.lueriLanguage
        || document.documentElement.dataset.lucyLanguage
        || (window.LueriI18n&&typeof window.LueriI18n.get==='function'&&window.LueriI18n.get())
        || localStorage.getItem(KEY)
        || localStorage.getItem('lueri-language')
        || localStorage.getItem('lueri_lang')
        || localStorage.getItem('lueri_locale')
        || 'en';
      return LANG.includes(v)?v:'en';
    }catch(_){return'en';}
  }

  function sync(preferred){
    const v=locale(preferred);
    document.documentElement.dataset.lueriLanguage=v;
    document.documentElement.lang=v==='zh'?'zh-CN':v;
    document.documentElement.dir=v==='ar'?'rtl':'ltr';
    if(window.LucyChatbot&&typeof window.LucyChatbot.setLanguage==='function')window.LucyChatbot.setLanguage(v);
  }

  function installLanguage(){
    sync();
    window.addEventListener('lueri:languagechange',e=>sync(e&&e.detail&&e.detail.language));
    document.addEventListener('lueri:languagechange',e=>sync(e&&e.detail&&e.detail.language));
    window.addEventListener('lueri-language-change',e=>sync(e&&e.detail&&e.detail.locale));
    document.addEventListener('lueri-language-change',e=>sync(e&&e.detail&&e.detail.locale));
    window.addEventListener('storage',e=>{
      if(['lueri_language','lueri-language','lueri_lang','lueri_locale'].includes(e.key))sync();
    });
  }

  function loadUI(){
    if(window.__lucyUiV3||document.querySelector('script[data-lucy-ui-v3]'))return;
    const s=document.createElement('script');
    s.src='lucy-ui-v3.js?v='+UI_VERSION;
    s.dataset.lucyUiV3='true';
    document.head.appendChild(s);
  }

  function start(){installLanguage();loadUI();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
