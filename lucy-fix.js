/* Lueri Lucy production compatibility layer.
   No Google Translate, no page reloads, no competing language runtime.
   The native Lueri i18n runtime owns language selection; Lucy mirrors it. */
(function(){
  'use strict';
  const LANG=['en','sw','fr','es','ar','pt','zh'];
  const KEY='lueri_language';

  function locale(){
    try{
      const v=(window.LueriI18n&&typeof window.LueriI18n.get==='function'&&window.LueriI18n.get())
        || localStorage.getItem(KEY)
        || localStorage.getItem('lueri-language')
        || localStorage.getItem('lueri_lang')
        || localStorage.getItem('lueri_locale')
        || 'en';
      return LANG.includes(v)?v:'en';
    }catch(_){return'en';}
  }

  function sync(){
    const v=locale();
    document.documentElement.dataset.lueriLanguage=v;
    document.documentElement.lang=v==='zh'?'zh-CN':v;
    document.documentElement.dir=v==='ar'?'rtl':'ltr';
    if(window.LucyChatbot&&typeof window.LucyChatbot.setLanguage==='function'){
      window.LucyChatbot.setLanguage(v);
    }
  }

  function install(){
    sync();
    window.addEventListener('lueri:languagechange',e=>sync(e&&e.detail&&e.detail.language));
    document.addEventListener('lueri:languagechange',e=>sync(e&&e.detail&&e.detail.language));
    window.addEventListener('lueri-language-change',e=>sync(e&&e.detail&&e.detail.locale));
    document.addEventListener('lueri-language-change',e=>sync(e&&e.detail&&e.detail.locale));
    window.addEventListener('storage',e=>{
      if(['lueri_language','lueri-language','lueri_lang','lueri_locale'].includes(e.key))sync();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();