/* LUERI INTERNATIONAL — lightweight customer-facing language layer
   Languages: English, Kiswahili, French, Spanish, Arabic, Portuguese, Chinese (Simplified).
   English remains the source language. Approved UI strings only.
*/
(function(){'use strict';
  const LANGS={en:'English',sw:'Kiswahili',fr:'Français',es:'Español',ar:'العربية',pt:'Português',zh:'中文'};
  const RTL=new Set(['ar']);
  const T={
    en:{menu:'Menu',close:'Close',home:'Home',services:'Services',rewards:'Rewards',corporate:'Corporate',careers:'Careers',book:'Book a Pickup',contact:'Contact',language:'Language',back:'Back',submit:'Submit',continue:'Continue',pay:'Pay now',pending:'Pending verification',secure:'Secure checkout',bank:'Bank transfer',cheque:'Cheque',pesapal:'Pesapal',support:'Contact support',sameDay:'Same-day delivery',courier:'Courier & delivery'},
    sw:{menu:'Menyu',close:'Funga',home:'Nyumbani',services:'Huduma',rewards:'Zawadi',corporate:'Kampuni',careers:'Kazi',book:'Agiza Pickup',contact:'Wasiliana',language:'Lugha',back:'Rudi',submit:'Tuma',continue:'Endelea',pay:'Lipa sasa',pending:'Inasubiri uthibitisho',secure:'Malipo salama',bank:'Uhamisho wa benki',cheque:'Hundi',pesapal:'Pesapal',support:'Wasiliana na usaidizi',sameDay:'Uwasilishaji wa siku hiyo',courier:'Courier na uwasilishaji'},
    fr:{menu:'Menu',close:'Fermer',home:'Accueil',services:'Services',rewards:'Récompenses',corporate:'Entreprises',careers:'Carrières',book:'Réserver un enlèvement',contact:'Contact',language:'Langue',back:'Retour',submit:'Envoyer',continue:'Continuer',pay:'Payer maintenant',pending:'En attente de vérification',secure:'Paiement sécurisé',bank:'Virement bancaire',cheque:'Chèque',pesapal:'Pesapal',support:'Contacter le support',sameDay:'Livraison le jour même',courier:'Messagerie et livraison'},
    es:{menu:'Menú',close:'Cerrar',home:'Inicio',services:'Servicios',rewards:'Recompensas',corporate:'Empresas',careers:'Empleo',book:'Reservar recogida',contact:'Contacto',language:'Idioma',back:'Volver',submit:'Enviar',continue:'Continuar',pay:'Pagar ahora',pending:'Pendiente de verificación',secure:'Pago seguro',bank:'Transferencia bancaria',cheque:'Cheque',pesapal:'Pesapal',support:'Contactar soporte',sameDay:'Entrega el mismo día',courier:'Mensajería y entregas'},
    ar:{menu:'القائمة',close:'إغلاق',home:'الرئيسية',services:'الخدمات',rewards:'المكافآت',corporate:'الشركات',careers:'الوظائف',book:'حجز استلام',contact:'اتصل بنا',language:'اللغة',back:'رجوع',submit:'إرسال',continue:'متابعة',pay:'ادفع الآن',pending:'بانتظار التحقق',secure:'دفع آمن',bank:'تحويل بنكي',cheque:'شيك',pesapal:'Pesapal',support:'تواصل مع الدعم',sameDay:'توصيل في نفس اليوم',courier:'خدمات البريد والتوصيل'},
    pt:{menu:'Menu',close:'Fechar',home:'Início',services:'Serviços',rewards:'Recompensas',corporate:'Empresas',careers:'Carreiras',book:'Agendar recolha',contact:'Contacto',language:'Idioma',back:'Voltar',submit:'Enviar',continue:'Continuar',pay:'Pagar agora',pending:'A aguardar verificação',secure:'Pagamento seguro',bank:'Transferência bancária',cheque:'Cheque',pesapal:'Pesapal',support:'Contactar suporte',sameDay:'Entrega no mesmo dia',courier:'Correio e entregas'},
    zh:{menu:'菜单',close:'关闭',home:'首页',services:'服务',rewards:'会员奖励',corporate:'企业服务',careers:'招聘',book:'预约取件',contact:'联系我们',language:'语言',back:'返回',submit:'提交',continue:'继续',pay:'立即支付',pending:'等待验证',secure:'安全结账',bank:'银行转账',cheque:'支票',pesapal:'Pesapal',support:'联系支持',sameDay:'当日配送',courier:'快递与配送'}
  };
  const KEY='lueri-language';
  function get(){try{const saved=localStorage.getItem(KEY);return LANGS[saved]?saved:'en';}catch(_){return 'en';}}
  function set(lang){if(!LANGS[lang])return;try{localStorage.setItem(KEY,lang);}catch(_){}apply(lang);}
  function apply(lang){
    document.documentElement.lang=lang;
    document.documentElement.dir=RTL.has(lang)?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.getAttribute('data-i18n');if(T[lang]&&T[lang][key])el.textContent=T[lang][key];});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const key=el.getAttribute('data-i18n-placeholder');if(T[lang]&&T[lang][key])el.setAttribute('placeholder',T[lang][key]);});
    document.querySelectorAll('[data-lueri-language]').forEach(el=>el.value=lang);
  }
  function injectStyles(){
    if(document.getElementById('lueri-i18n-style'))return;
    const s=document.createElement('style');s.id='lueri-i18n-style';s.textContent='.lueri-language-picker{display:flex;align-items:center;margin-left:8px}.lueri-language-picker select{font:500 12px/1.2 inherit;letter-spacing:.04em;border:1px solid currentColor;border-radius:2px;background:transparent;color:inherit;padding:9px 28px 9px 10px;min-height:38px;cursor:pointer}.lueri-language-picker select:focus{outline:2px solid currentColor;outline-offset:2px}@media(max-width:640px){.lueri-language-picker{margin-left:4px}.lueri-language-picker select{max-width:92px;padding:8px 20px 8px 7px;font-size:11px}}';document.head.appendChild(s);
  }
  function inject(){
    if(document.querySelector('.lueri-language-picker'))return;
    injectStyles();
    const wrap=document.createElement('div');wrap.className='lueri-language-picker';wrap.setAttribute('aria-label','Language selector');
    const select=document.createElement('select');select.setAttribute('data-lueri-language','');select.setAttribute('aria-label','Language');
    Object.entries(LANGS).forEach(([code,name])=>{const o=document.createElement('option');o.value=code;o.textContent=name;select.appendChild(o);});
    select.addEventListener('change',e=>set(e.target.value));wrap.appendChild(select);
    const host=document.querySelector('.nav-controls') || document.querySelector('header nav,.site-header nav,.header-nav,.nav-links');
    if(host)host.appendChild(wrap);else document.body.appendChild(wrap);
  }
  function init(){inject();apply(get());}
  window.LueriI18n={languages:LANGS,translations:T,get,set,apply,init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();