/* Legacy compatibility shim.
   The active language system is i18next in i18n.js + i18n-engine.js + i18n-completion.js.
   This file intentionally does not maintain a second translation dictionary. */
(function(){
'use strict';
window.lueriSetLocale=function(locale){
  if(window.i18next && typeof window.i18next.changeLanguage==='function'){
    window.i18next.changeLanguage(locale);
    return;
  }
  if(window.LueriI18n && typeof window.LueriI18n.setLanguage==='function') window.LueriI18n.setLanguage(locale);
};
})();