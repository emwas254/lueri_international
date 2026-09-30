/* Lueri International — canonical brand lockup
 * Keeps the motto identical wherever the brand appears outside the primary
 * homepage i18n pipeline. Language is read from the shared lueri_language key.
 */
(function(){
  'use strict';
  var MOTTO = {
    en: 'Moving What Matters',
    zh: '让重要的事向前',
    sw: 'Kusogeza Kilicho Muhimu',
    fr: 'Faire avancer l’essentiel',
    es: 'Movemos lo que importa',
    ar: 'نحرّك ما يهم',
    pt: 'Movemos o que importa'
  };
  function apply(){
    var lang = document.documentElement.dataset.lueriLanguage ||
      localStorage.getItem('lueri_language') || 'en';
    var value = MOTTO[lang] || MOTTO.en;
    document.querySelectorAll('[data-lueri-motto]').forEach(function(el){
      el.textContent = value;
      el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      el.setAttribute('lang', lang);
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply, {once:true});
  } else { apply(); }
  window.addEventListener('lueri:language-changed', apply);
  window.lueriBrand = { apply: apply, motto: MOTTO };
})();