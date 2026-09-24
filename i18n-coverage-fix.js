/* Lueri International — final coverage localization
   Loaded LAST so no later translation bundle can overwrite these values.
   Place names are localized/transliterated per language while preserving official
   brand/product names elsewhere on the site.
*/
(function(){
  'use strict';
  var T = window.LueriI18n && window.LueriI18n.translations;
  if(!T) return;

  var zones = {
    en:{
      cbd:'Nairobi CBD', westlands:'Westlands', kilimani:'Kilimani', kasarani:'Kasarani',
      south:'South B / South C', embakasi:'Embakasi', ngong:'Ngong Road', thika:'Thika Road',
      eastleigh:'Eastleigh', kariobangi:'Kariobangi'
    },
    zh:{
      cbd:'内罗毕中央商务区', westlands:'韦斯特兰兹', kilimani:'基利马尼', kasarani:'卡萨拉尼',
      south:'南B区 / 南C区', embakasi:'恩巴卡西', ngong:'恩贡路', thika:'蒂卡路',
      eastleigh:'东利', kariobangi:'卡里奥班吉'
    },
    sw:{
      cbd:'CBD ya Nairobi', westlands:'Westlands', kilimani:'Kilimani', kasarani:'Kasarani',
      south:'South B / South C', embakasi:'Embakasi', ngong:'Barabara ya Ngong', thika:'Barabara ya Thika',
      eastleigh:'Eastleigh', kariobangi:'Kariobangi'
    },
    fr:{
      cbd:'Centre-ville de Nairobi', westlands:'Westlands', kilimani:'Kilimani', kasarani:'Kasarani',
      south:'South B / South C', embakasi:'Embakasi', ngong:'Route de Ngong', thika:'Route de Thika',
      eastleigh:'Eastleigh', kariobangi:'Kariobangi'
    },
    es:{
      cbd:'Distrito Central de Negocios de Nairobi', westlands:'Westlands', kilimani:'Kilimani', kasarani:'Kasarani',
      south:'South B / South C', embakasi:'Embakasi', ngong:'Carretera de Ngong', thika:'Carretera de Thika',
      eastleigh:'Eastleigh', kariobangi:'Kariobangi'
    },
    ar:{
      cbd:'منطقة الأعمال المركزية في نيروبي', westlands:'ويستلاندز', kilimani:'كيليماني', kasarani:'كاساراني',
      south:'ساوث B / ساوث C', embakasi:'إمباكاسي', ngong:'طريق نغونغ', thika:'طريق ثيكا',
      eastleigh:'إيستلي', kariobangi:'كاريوبانغي'
    },
    pt:{
      cbd:'Centro Comercial de Nairobi', westlands:'Westlands', kilimani:'Kilimani', kasarani:'Kasarani',
      south:'South B / South C', embakasi:'Embakasi', ngong:'Estrada de Ngong', thika:'Estrada de Thika',
      eastleigh:'Eastleigh', kariobangi:'Kariobangi'
    }
  };

  Object.keys(zones).forEach(function(locale){
    if(!T[locale]) return;
    T[locale].zones = zones[locale];
  });
})();
