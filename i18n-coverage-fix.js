/* Lueri International — coverage i18n correction
   Fixes the Nairobi coverage list translation that was falling back/mixing language.
   The visible list is intentionally stable across languages for proper names/route names.
*/
(function(){
  'use strict';
  var T = window.LueriI18n && window.LueriI18n.translations;
  if(!T) return;

  function merge(dst, src){
    Object.keys(src).forEach(function(k){
      if(src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])){
        dst[k] = dst[k] || {};
        merge(dst[k], src[k]);
      } else {
        dst[k] = src[k];
      }
    });
  }

  var zones = {
    cbd:'Nairobi CBD',
    westlands:'Westlands',
    kilimani:'Kilimani',
    kasarani:'Kasarani',
    south:'South B / South C',
    embakasi:'Embakasi',
    ngong:'Ngong Road',
    thika:'Thika Road',
    eastleigh:'Eastleigh',
    kariobangi:'Kariobangi'
  };

  Object.keys(T).forEach(function(locale){
    merge(T[locale], { zones: zones });
  });
})();
