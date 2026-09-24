/* Lueri International — final coverage localization
   This is a DOM-level finalizer. It runs after the translation engine and also
   listens for language changes, so the visible coverage list cannot fall back
   to English after a locale switch.
*/
(function(){
  'use strict';

  var Z = {
    en:{cbd:'Nairobi CBD',westlands:'Westlands',kilimani:'Kilimani',kasarani:'Kasarani',south:'South B / South C',embakasi:'Embakasi',ngong:'Ngong Road',thika:'Thika Road',eastleigh:'Eastleigh',kariobangi:'Kariobangi'},
    zh:{cbd:'内罗毕中央商务区',westlands:'韦斯特兰兹',kilimani:'基利马尼',kasarani:'卡萨拉尼',south:'南B区 / 南C区',embakasi:'恩巴卡西',ngong:'恩贡路',thika:'蒂卡路',eastleigh:'东利',kariobangi:'卡里奥班吉'},
    sw:{cbd:'CBD ya Nairobi',westlands:'Westlands',kilimani:'Kilimani',kasarani:'Kasarani',south:'South B / South C',embakasi:'Embakasi',ngong:'Barabara ya Ngong',thika:'Barabara ya Thika',eastleigh:'Eastleigh',kariobangi:'Kariobangi'},
    fr:{cbd:'Centre-ville de Nairobi',westlands:'Westlands',kilimani:'Kilimani',kasarani:'Kasarani',south:'South B / South C',embakasi:'Embakasi',ngong:'Route de Ngong',thika:'Route de Thika',eastleigh:'Eastleigh',kariobangi:'Kariobangi'},
    es:{cbd:'Distrito Central de Negocios de Nairobi',westlands:'Westlands',kilimani:'Kilimani',kasarani:'Kasarani',south:'South B / South C',embakasi:'Embakasi',ngong:'Carretera de Ngong',thika:'Carretera de Thika',eastleigh:'Eastleigh',kariobangi:'Kariobangi'},
    ar:{cbd:'منطقة الأعمال المركزية في نيروبي',westlands:'ويستلاندز',kilimani:'كيليماني',kasarani:'كاساراني',south:'ساوث B / ساوث C',embakasi:'إمباكاسي',ngong:'طريق نغونغ',thika:'طريق ثيكا',eastleigh:'إيستلي',kariobangi:'كاريوبانغي'},
    pt:{cbd:'Centro Comercial de Nairobi',westlands:'Westlands',kilimani:'Kilimani',kasarani:'Kasarani',south:'South B / South C',embakasi:'Embakasi',ngong:'Estrada de Ngong',thika:'Estrada de Thika',eastleigh:'Eastleigh',kariobangi:'Kariobangi'}
  };

  function locale(){
    return (document.documentElement.lang || localStorage.getItem('lueri_language') || 'en').toLowerCase().split('-')[0];
  }

  function apply(){
    var l=locale(), z=Z[l]||Z.en;
    Object.keys(z).forEach(function(k){
      document.querySelectorAll('[data-i18n="zones.'+k+'"]').forEach(function(el){el.textContent=z[k];});
    });
  }

  function boot(){
    apply();
    window.addEventListener('lueri:languagechange',apply);
    if(window.i18next && typeof window.i18next.on==='function') window.i18next.on('languageChanged',apply);
    var obs=new MutationObserver(function(){apply();});
    obs.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
