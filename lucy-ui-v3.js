/* Lueri International — Lucy customer-facing concierge (v3.2)
 * v3.1: payment handoff runs by direct call (the old document/window event mismatch
 * silently dropped every "Yes" confirmation). Progress message, retry button,
 * double-run guard, phone/customer_phone tolerance, https redirect check.
 * v3.2: unpriced routes (status "awaiting_quote") now show a localized "booking saved" message
 * instead of a payment error, and reset the booking state so a retry cannot duplicate the booking.
 */
(function () {
  'use strict';
  if (window.__lucyUiV3) return;
  window.__lucyUiV3 = true;

  const API_BASE = 'https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1';
  const SUPPORTED_LOCALES = ['en','sw','fr','es','ar','pt','zh'];
  const LUCY_AVATAR = 'assets/lucy-avatar.webp';
  const LUCY_AVATAR_SMALL = 'assets/lucy-avatar-sm.webp';

  const UI = {
    en: {name:'Lucy',status:'Online and ready to help',greeting:"Hi, I'm Lucy, Lueri's digital concierge. How can I assist you today?",placeholder:'Ask me anything...',send:'Send',close:'Close',open:'Open Lucy',topics:['Delivery Pricing','Corporate Plans','Rewards Membership','Service Areas','Opening Hours','Track Delivery','Book a Delivery']},
    sw: {name:'Lucy',status:'Mtandaoni na tayari kukusaidia',greeting:'Habari, mimi ni Lucy, msaidizi wa kidijitali wa Lueri. Ninaweza kukusaidia vipi leo?',placeholder:'Niulize chochote...',send:'Tuma',close:'Funga',open:'Fungua Lucy',topics:['Bei ya Usafirishaji','Mipango ya Biashara','Uanachama wa Rewards','Maeneo Tunayofikia','Saa za Kazi','Fuatilia Oda','Agiza Delivery']},
    fr: {name:'Lucy',status:'En ligne et prête à aider',greeting:"Bonjour, je suis Lucy, la concierge numérique de Lueri. Comment puis-je vous aider aujourd'hui ?",placeholder:"Demandez-moi n'importe quoi...",send:'Envoyer',close:'Fermer',open:'Ouvrir Lucy',topics:['Tarifs de livraison','Plans d’entreprise','Adhésion Rewards','Zones de service','Heures d’ouverture','Suivre une livraison','Réserver une livraison']},
    es: {name:'Lucy',status:'En línea y lista para ayudar',greeting:'Hola, soy Lucy, la conserje digital de Lueri. ¿Cómo puedo ayudarte hoy?',placeholder:'Pregúntame lo que quieras...',send:'Enviar',close:'Cerrar',open:'Abrir Lucy',topics:['Precios de entrega','Planes corporativos','Membresía Rewards','Áreas de servicio','Horario','Rastrear entrega','Reservar entrega']},
    ar: {name:'لوسي',status:'متصلة وجاهزة للمساعدة',greeting:'مرحباً، أنا لوسي، المساعدة الرقمية لـ Lueri. كيف يمكنني مساعدتك اليوم؟',placeholder:'اسألني أي شيء...',send:'إرسال',close:'إغلاق',open:'فتح لوسي',topics:['أسعار التوصيل','خطط الشركات','عضوية Rewards','مناطق الخدمة','ساعات العمل','تتبع التوصيل','احجز توصيلاً']},
    pt: {name:'Lucy',status:'Online e pronta para ajudar',greeting:'Olá, eu sou a Lucy, a concierge digital da Lueri. Como posso ajudar você hoje?',placeholder:'Pergunte-me qualquer coisa...',send:'Enviar',close:'Fechar',open:'Abrir Lucy',topics:['Preços de entrega','Planos empresariais','Membresia Rewards','Áreas de serviço','Horário de funcionamento','Rastrear entrega','Agendar entrega']},
    zh: {name:'露西',status:'在线并准备提供帮助',greeting:'您好，我是露西，Lueri 的数字礼宾。今天我能帮您什么？',placeholder:'问问露西任何事情……',send:'发送',close:'关闭',open:'打开露西',topics:['配送价格','企业计划','Rewards 会员','服务区域','营业时间','追踪配送','预约配送']}
  };

  /* Small strings, one place. L(map) picks the active locale, falling back to English. */
  const S = {
    alt:{en:'Parcel photo',sw:'Picha ya kifurushi',fr:'Photo du colis',es:'Foto del paquete',ar:'صورة الطرد',pt:'Foto do pacote',zh:'包裹照片'},
    attached:{en:'📷 Parcel photo attached',sw:'📷 Picha ya kifurushi imeambatishwa',fr:'📷 Photo du colis jointe',es:'📷 Foto del paquete adjunta',ar:'📷 تم إرفاق صورة الطرد',pt:'📷 Foto do pacote anexada',zh:'📷 已附上包裹照片'},
    typing:{en:'Typing…',sw:'Inaandika…',fr:'Saisie…',es:'Escribiendo…',ar:'يكتب الآن…',pt:'Digitando…',zh:'正在输入…'},
    upload:{en:'📷 Upload Photo',sw:'📷 Pakia picha',fr:'📷 Envoyer une photo',es:'📷 Subir foto',ar:'📷 تحميل صورة',pt:'📷 Enviar foto',zh:'📷 上传照片'},
    typeDetails:{en:'⌨ Type Details',sw:'⌨ Andika maelezo',fr:'⌨ Saisir les détails',es:'⌨ Escribir detalles',ar:'⌨ أدخل التفاصيل',pt:'⌨ Digitar detalhes',zh:'⌨ 输入详情'},
    retryPhoto:{en:'↻ Retry Photo',sw:'↻ Tuma picha tena',fr:'↻ Renvoyer la photo',es:'↻ Reenviar foto',ar:'↻ إعادة إرسال الصورة',pt:'↻ Reenviar foto',zh:'↻ 重新发送照片'},
    tooBig:{en:'The photo is too large. Please use an image under 4 MB.',sw:'Picha ni kubwa sana. Tumia picha iliyo chini ya 4 MB.',fr:'La photo est trop volumineuse. Utilisez une image de moins de 4 Mo.',es:'La foto es demasiado grande. Usa una imagen de menos de 4 MB.',ar:'الصورة كبيرة جداً. استخدم صورة أقل من 4 ميغابايت.',pt:'A foto é demasiado grande. Use uma imagem com menos de 4 MB.',zh:'图片太大。请使用小于 4 MB 的图片。'},
    connErr:{en:'Sorry, Lucy cannot connect right now. The photo is kept in this session and can be retried when the connection returns.',sw:'Samahani, Lucy hawezi kuunganishwa kwa sasa. Picha imehifadhiwa kwenye kikao hiki; unaweza kujaribu tena muunganisho ukirejea.',fr:'Désolée, Lucy ne peut pas se connecter. La photo est conservée dans cette session et pourra être renvoyée après rétablissement de la connexion.',es:'Lo siento, Lucy no puede conectarse. La foto se conserva en esta sesión y podrá reenviarse cuando vuelva la conexión.',ar:'عذراً، لا تستطيع لوسي الاتصال الآن. تم الاحتفاظ بالصورة في هذه الجلسة ويمكن إعادة إرسالها بعد عودة الاتصال.',pt:'Desculpe, a Lucy não consegue ligar-se agora. A foto foi mantida nesta sessão e poderá ser reenviada quando a ligação voltar.',zh:'抱歉，Lucy 暂时无法连接。照片已保留在本次会话中，恢复连接后可重试。'},
    cam:{en:'Take or attach a photo',sw:'Piga au ambatisha picha',fr:'Prendre ou joindre une photo',es:'Tomar o adjuntar una foto',ar:'التقاط أو إرفاق صورة',pt:'Tirar ou anexar uma foto',zh:'拍摄或附加照片'},
    lTitle:{en:'Chat with Lucy',sw:'Zungumza na Lucy',fr:'Discuter avec Lucy',es:'Habla con Lucy',ar:'تحدث مع لوسي',pt:'Falar com a Lucy',zh:'与露西聊天'},
    prep:{en:'Preparing your secure payment…',sw:'Tunaandaa malipo yako salama…',fr:'Préparation de votre paiement sécurisé…',es:'Preparando tu pago seguro…',ar:'جارٍ تجهيز الدفع الآمن…',pt:'A preparar o pagamento seguro…',zh:'正在准备安全付款…'},
    opening:{en:'Opening the secure payment page…',sw:'Tunafungua ukurasa salama wa malipo…',fr:'Ouverture de la page de paiement sécurisée…',es:'Abriendo la página de pago seguro…',ar:'جارٍ فتح صفحة الدفع الآمنة…',pt:'A abrir a página de pagamento segura…',zh:'正在打开安全付款页面…'},
    payFail:{en:'We could not prepare the payment. Your details are safe, tap Retry.',sw:'Hatukuweza kuandaa malipo. Taarifa zako ziko salama, bonyeza Jaribu tena.',fr:'Impossible de préparer le paiement. Vos informations sont conservées, appuyez sur Réessayer.',es:'No pudimos preparar el pago. Tus datos están a salvo, pulsa Reintentar.',ar:'تعذر إعداد الدفع. بياناتك محفوظة، اضغط إعادة المحاولة.',pt:'Não foi possível preparar o pagamento. Os seus dados estão guardados, toque em Tentar novamente.',zh:'无法准备付款。您的信息已保留，请点击重试。'},
    quote:{
      en:'Your booking is saved (reference {ref}). This route isn’t in our automatic pricing yet, so a Lueri team member will confirm your price and get in touch shortly. You can also WhatsApp us: https://wa.link/qk7m3b',
      sw:'Booking yako imehifadhiwa (rejea {ref}). Njia hii bado haipo kwenye bei za kiotomatiki, kwa hiyo mtu wa timu ya Lueri atathibitisha bei na kuwasiliana nawe hivi karibuni. Unaweza pia kutuandikia WhatsApp: https://wa.link/qk7m3b',
      fr:'Votre réservation est enregistrée (référence {ref}). Cet itinéraire n’est pas encore dans notre tarification automatique : un membre de l’équipe Lueri confirmera votre prix et vous contactera très bientôt. Vous pouvez aussi nous écrire sur WhatsApp : https://wa.link/qk7m3b',
      es:'Tu reserva está guardada (referencia {ref}). Esta ruta aún no está en nuestra tarifa automática, así que un miembro del equipo de Lueri confirmará tu precio y te contactará en breve. También puedes escribirnos por WhatsApp: https://wa.link/qk7m3b',
      ar:'تم حفظ حجزك (المرجع {ref}). هذا المسار غير مدرج بعد في التسعير التلقائي، لذلك سيؤكد أحد أعضاء فريق Lueri السعر ويتواصل معك قريباً. يمكنك أيضاً مراسلتنا عبر واتساب: https://wa.link/qk7m3b',
      pt:'A sua reserva foi guardada (referência {ref}). Esta rota ainda não está no nosso preçário automático, por isso um membro da equipa Lueri irá confirmar o preço e contactá-lo em breve. Também pode falar connosco pelo WhatsApp: https://wa.link/qk7m3b',
      zh:'您的预订已保存（参考编号 {ref}）。该路线尚未纳入自动报价，Lueri 团队成员会尽快确认价格并与您联系。您也可以通过 WhatsApp 联系我们：https://wa.link/qk7m3b'
    },
    payRetry:{en:'↻ Retry payment',sw:'↻ Jaribu malipo tena',fr:'↻ Réessayer le paiement',es:'↻ Reintentar pago',ar:'↻ إعادة محاولة الدفع',pt:'↻ Tentar pagamento novamente',zh:'↻ 重试付款'},
    incomplete:{en:'Some booking details are missing. Please restart the booking.',sw:'Baadhi ya maelezo ya booking hayapo. Tafadhali anza upya.',fr:'Des informations de réservation manquent. Veuillez recommencer.',es:'Faltan datos de la reserva. Inicia la reserva de nuevo.',ar:'بعض تفاصيل الحجز ناقصة. يرجى إعادة الحجز.',pt:'Faltam dados da reserva. Reinicie a reserva.',zh:'预订信息不完整，请重新开始预订。'}
  };
  const DT = {
    en:['One-off delivery','Round-trip delivery','Multi-trip / rebook'],
    sw:['Delivery ya mara moja','Delivery ya kwenda na kurudi','Multi-trip / rebook'],
    fr:['Livraison ponctuelle','Livraison aller-retour','Multi-trajets / rebooking'],
    es:['Entrega puntual','Entrega de ida y vuelta','Multi-viaje / rebooking'],
    ar:['توصيل لمرة واحدة','توصيل ذهاب وعودة','رحلات متعددة / إعادة حجز'],
    pt:['Entrega única','Entrega de ida e volta','Multi-viagem / rebooking'],
    zh:['单次配送','往返配送','多次配送 / 重新预约']
  };

  let locale='en', deliveryState={step:'IDLE'}, history=[], isOpen=false, busy=false, payBusy=false;

  const L = m => m[locale] || m.en;
  function t(k){return(UI[locale]||UI.en)[k];}
  function currentLocale(){try{const c=[document.documentElement.dataset.lueriLanguage,document.documentElement.dataset.lucyLanguage,window.LueriI18n&&typeof window.LueriI18n.get==='function'?window.LueriI18n.get():null,localStorage.getItem('lueri_language'),localStorage.getItem('lueri-language'),localStorage.getItem('lueri_lang'),localStorage.getItem('lueri_locale')];return c.find(v=>SUPPORTED_LOCALES.includes(v))||'en';}catch(_){return'en';}}

  const LUCY_SESSION_KEY='lueri_lucy_session_v2';
  const LUCY_PENDING_PHOTO_KEY='lueri_lucy_pending_photo_v2';
  function saveSession(){
    try{sessionStorage.setItem(LUCY_SESSION_KEY,JSON.stringify({locale,deliveryState,history:history.slice(-20),savedAt:Date.now()}));}catch(_){}
  }
  function restoreSession(){
    try{
      const raw=sessionStorage.getItem(LUCY_SESSION_KEY); if(!raw)return;
      const s=JSON.parse(raw); if(!s||Date.now()-(Number(s.savedAt)||0)>24*60*60*1000){sessionStorage.removeItem(LUCY_SESSION_KEY);return;}
      if(SUPPORTED_LOCALES.includes(s.locale))locale=s.locale;
      if(s.deliveryState&&typeof s.deliveryState==='object')deliveryState=s.deliveryState;
      if(Array.isArray(s.history))history=s.history.slice(-20);
    }catch(_){}
  }
  function clearSession(){try{sessionStorage.removeItem(LUCY_SESSION_KEY);sessionStorage.removeItem(LUCY_PENDING_PHOTO_KEY);}catch(_){}}
  function compressImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{try{const max=1600;let w=img.naturalWidth,h=img.naturalHeight;if(!w||!h)throw new Error('empty');const r=Math.min(1,max/Math.max(w,h));w=Math.round(w*r);h=Math.round(h*r);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);const out=c.toDataURL('image/jpeg',0.8);out.length>4000000?reject(new Error('still too large')):resolve(out);}catch(e){URL.revokeObjectURL(url);reject(e);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode failed'));};img.src=url;});}
  function savePendingPhoto(data){try{sessionStorage.setItem(LUCY_PENDING_PHOTO_KEY,data);return true;}catch(_){return false;}}
  function getPendingPhoto(){try{return sessionStorage.getItem(LUCY_PENDING_PHOTO_KEY)||'';}catch(_){return'';}}
  function clearPendingPhoto(){try{sessionStorage.removeItem(LUCY_PENDING_PHOTO_KEY);}catch(_){}}

  function injectStyles(){if(document.getElementById('lucy-restored-styles'))return;const s=document.createElement('style');s.id='lucy-restored-styles';s.textContent=`
#lucy-launcher{display:flex!important;position:fixed!important;right:22px!important;bottom:20px!important;z-index:2147483000!important;width:168px!important;min-width:168px!important;height:48px!important;padding:4px 11px 4px 4px!important;margin:0!important;border:1px solid rgba(240,234,216,.38)!important;border-radius:25px!important;background:#274238!important;color:#f0ead8!important;box-shadow:0 9px 24px rgba(0,0,0,.22)!important;cursor:pointer!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;font-family:'IBM Plex Sans',Arial,sans-serif!important;direction:ltr!important}#lucy-launcher:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,.28)}#lucy-launcher .lucy-dot,#lucy-launcher [data-lucy-launcher-label],#lucy-launcher .lucy-launcher-status{display:none!important}
#lucy-launcher .lucy-launcher-copy{position:relative}
#lucy-launcher .lucy-launcher-copy:before{content:'';width:7px;height:7px;min-width:7px;border-radius:50%;background:#39d353;box-shadow:0 0 0 2px rgba(57,211,83,.12);display:inline-block;margin-right:6px;vertical-align:middle}#lucy-launcher .lucy-launcher-avatar{width:40px;height:40px;min-width:40px;border-radius:50%;background:url("${LUCY_AVATAR_SMALL}") center/cover no-repeat;border:2px solid #f0ead8;box-shadow:0 2px 7px rgba(0,0,0,.22)}#lucy-launcher .lucy-launcher-copy{display:flex;flex:1;min-width:0;align-items:center;justify-content:center;line-height:1.1;color:#f0ead8;overflow:hidden}.lucy-launcher-title{display:block!important;font:800 12px/1.15 'IBM Plex Sans',Arial,sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;max-width:100%!important;min-width:0!important;letter-spacing:0!important;text-align:center!important;unicode-bidi:plaintext}#lucy-launcher.locale-sw .lucy-launcher-title,#lucy-launcher.locale-fr .lucy-launcher-title{font-size:10.5px!important;letter-spacing:-.01em!important}#lucy-launcher.locale-ar .lucy-launcher-title{font-family:'Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif!important;font-size:10.5px!important}
#lucy-panel{position:fixed!important;right:22px!important;bottom:82px!important;top:auto!important;left:auto!important;z-index:2147482999!important;width:350px!important;height:420px!important;min-height:0!important;max-height:calc(100vh - 104px)!important;margin:0!important;padding:0!important;display:none;flex-direction:column;overflow:hidden;background:#f0ead8;color:#1b2620;border:1px solid rgba(27,38,32,.18);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.25)}#lucy-panel.is-open{display:flex!important}.lucy-head{display:flex;flex:0 0 62px;box-sizing:border-box;align-items:center;justify-content:space-between;padding:8px 12px!important;margin:0!important;background:#274238;color:#f0ead8;border-bottom:1px solid rgba(255,255,255,.12);min-height:62px!important;height:62px!important}.lucy-head-main{display:flex;align-items:center;gap:9px;min-width:0}.lucy-avatar{width:43px;height:43px;min-width:43px;border-radius:50%;background-image:url("${LUCY_AVATAR}");background-size:cover;background-position:center;border:2px solid #f0ead8;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:0;overflow:hidden}.lucy-title{font-weight:800;font-size:16px;line-height:1.1}.lucy-status{font-size:11px;opacity:.82;margin-top:3px}.lucy-close{border:0;background:transparent;color:inherit;font-size:25px;line-height:1;cursor:pointer;padding:2px 5px;margin:0}.lucy-body{display:flex;flex-direction:column;min-height:0;flex:1;margin:0!important;padding:0!important}.lucy-messages{flex:1;overflow:auto;padding:11px 13px 6px;display:flex;flex-direction:column;gap:5px;scroll-behavior:smooth}.lucy-message{max-width:88%;padding:8px 10px;margin:2px 0;border-radius:14px;line-height:1.38;white-space:pre-wrap;overflow-wrap:anywhere;font:400 12.5px/1.38 'IBM Plex Sans',Arial,sans-serif}.lucy-message.user{align-self:flex-end;background:#274238;color:#f0ead8;border-bottom-right-radius:5px}.lucy-message.bot{align-self:flex-start;background:#e7ece5;color:#1b2620;border-bottom-left-radius:5px}.lucy-typing{opacity:.65;font-style:italic}.lucy-delivery-type-actions{display:none;padding:0 13px 7px;gap:7px;flex-wrap:wrap}.lucy-delivery-type-actions.is-visible{display:flex}.lucy-delivery-type-btn{border:1px solid rgba(39,66,56,.7);background:#fff;color:#1b2620;border-radius:12px;padding:9px 11px;font:600 10.5px/1.15 'IBM Plex Sans',Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-align:left}.lucy-delivery-type-btn:hover{transform:translateY(-1px);background:#f4f7f2}.lucy-parcel-actions{display:none;padding:0 13px 7px;gap:7px;flex-wrap:wrap}.lucy-parcel-actions.is-visible{display:flex}.lucy-parcel-btn{border:1px solid rgba(39,66,56,.7);background:#fff;color:#1b2620;border-radius:12px;padding:8px 11px;font:600 10.5px/1.1 'IBM Plex Sans',Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.lucy-parcel-btn.primary{background:#274238;color:#f0ead8}.lucy-parcel-btn:hover{transform:translateY(-1px)}.lucy-pay-retry{display:block;margin-top:8px}.lucy-topics{padding:0 13px 8px;display:flex;gap:5px;flex-wrap:wrap}.lucy-topic-btn{border:1px solid rgba(27,38,32,.55);background:transparent;color:#1b2620;border-radius:999px;padding:6px 8px;font:600 10px/1.1 'IBM Plex Sans',Arial,sans-serif;cursor:pointer;white-space:nowrap}.lucy-topic-btn:hover{background:#274238;color:#f0ead8}.lucy-compose{padding:7px 8px;border-top:1px solid rgba(27,38,32,.12);display:flex;gap:7px;background:#f0ead8}.lucy-input{flex:1;min-width:0;height:38px;border:1px solid rgba(27,38,32,.22);background:#fff;color:#1b2620;border-radius:20px;padding:0 11px;font:400 12.5px/1.3 'IBM Plex Sans',Arial,sans-serif}.lucy-input:focus{outline:2px solid #e8b93d;outline-offset:1px}.lucy-camera{width:39px;height:39px;min-width:39px;border:1px solid rgba(27,38,32,.28);border-radius:50%;background:#fff;color:#1b2620;cursor:pointer;font-size:17px;display:grid;place-items:center}.lucy-camera:hover{background:#274238;color:#f0ead8}.lucy-send{width:39px;height:39px;border:0;border-radius:50%;background:#1b2620;color:#fff;font-weight:800;cursor:pointer;font-size:0;display:grid;place-items:center}.lucy-send::before{content:'➤';font-size:18px;transform:translateX(1px)}.lucy-send:disabled{opacity:.55;cursor:not-allowed}.lucy-footer{display:none!important}@media(max-width:560px){#lucy-launcher{right:12px!important;bottom:12px!important;width:min(190px,calc(100vw - 24px))!important;min-width:0!important;height:46px!important;padding:3px 9px 3px 3px!important}#lucy-launcher .lucy-launcher-avatar{width:38px;height:38px;min-width:38px}.lucy-launcher-title{font-size:11.5px!important}#lucy-panel{right:12px!important;bottom:66px!important;width:min(330px,calc(100vw - 24px))!important;height:min(405px,calc(100vh - 82px))!important;max-height:calc(100vh - 82px)!important;border-radius:15px}.lucy-head{flex-basis:59px;height:59px!important;min-height:59px!important;padding:8px 10px!important}.lucy-avatar{width:40px;height:40px;min-width:40px}.lucy-messages{padding:10px}.lucy-topics{padding:0 10px 7px}.lucy-compose{padding:6px 7px}.lucy-input{height:37px}.lucy-send{width:37px;height:37px}}
  `;
  document.head.appendChild(s);
  }

  function addMessage(text,role,typing,imageData=''){
    const box=document.getElementById('lucy-messages');if(!box)return null;
    const el=document.createElement('div');el.className=`lucy-message ${role}${typing?' lucy-typing':''}`;
    const value=String(text??'');
    if(imageData){const img=document.createElement('img');img.src=imageData;img.alt=L(S.alt);img.style.cssText='display:block;max-width:210px;max-height:180px;width:auto;height:auto;border-radius:10px;margin-bottom:6px;object-fit:cover;';el.appendChild(img);}
    let last=0;const re=/(https:\/\/lueriinternational\.com\/(?:corporate|rewards)\.html)/g;let m;
    while((m=re.exec(value))){el.append(document.createTextNode(value.slice(last,m.index)));const a=document.createElement('a');a.href=m[1];a.target='_self';a.rel='noopener';a.textContent=m[1];a.style.textDecoration='underline';a.style.fontWeight='600';el.append(a);last=m.index+m[1].length;}
    el.append(document.createTextNode(value.slice(last)));
    box.appendChild(el);box.scrollTop=box.scrollHeight;return el;
  }
  function renderPendingPhotoAction(){
    const box=document.getElementById('lucy-parcel-actions'); if(!box)return;
    const pending=!!getPendingPhoto();
    let retry=box.querySelector('[data-lucy-retry-photo]');
    if(pending && !retry){
      retry=document.createElement('button'); retry.type='button'; retry.className='lucy-parcel-btn'; retry.dataset.lucyRetryPhoto='';
      retry.addEventListener('click',()=>{const p=getPendingPhoto();if(p){clearPendingPhoto();sendMessage('', '', p);}});
      box.appendChild(retry);
    }
    if(retry){retry.textContent=L(S.retryPhoto);retry.style.display=pending?'inline-flex':'none';}
  }
  function renderDeliveryTypeActions(){
    const box=document.getElementById('lucy-delivery-type-actions'); if(!box)return;
    const visible=deliveryState?.step==='DELIVERY_TYPE';
    box.classList.toggle('is-visible',visible);
    if(!visible)return;
    box.replaceChildren();
    (DT[locale]||DT.en).forEach((label,index)=>{
      const b=document.createElement('button');
      b.type='button';b.className='lucy-delivery-type-btn';b.textContent=(index+1)+'. '+label;
      b.addEventListener('click',()=>sendMessage(String(index+1)));
      box.appendChild(b);
    });
  }
  function renderParcelActions(){
    const box=document.getElementById('lucy-parcel-actions');if(!box)return;
    box.classList.toggle('is-visible',deliveryState?.step==='PARCEL');
    const photo=box.querySelector('[data-lucy-photo]'),type=box.querySelector('[data-lucy-type]');
    if(photo)photo.textContent=L(S.upload);
    if(type)type.textContent=L(S.typeDetails);
  }
  function renderTopics(){const box=document.getElementById('lucy-topics');if(!box)return;box.replaceChildren();const intents=['PRICING','CORPORATE','REWARDS','COVERAGE','HOURS','TRACK','BOOK'];(t('topics')||[]).forEach((topic,index)=>{const b=document.createElement('button');b.type='button';b.className='lucy-topic-btn';b.textContent=topic;b.addEventListener('click',()=>sendMessage(topic,intents[index]||''));box.appendChild(b);});}

  function applyLocale(next){
    const previous=locale;
    locale=SUPPORTED_LOCALES.includes(next)?next:currentLocale()||'en';
    document.documentElement.dir=locale==='ar'?'rtl':'ltr';
    document.documentElement.dataset.lucyLanguage=locale;
    document.documentElement.lang=locale==='zh'?'zh-CN':locale;
    const panel=document.getElementById('lucy-panel');
    const launcher=document.getElementById('lucy-launcher');
    if(panel){
      panel.dir=locale==='ar'?'rtl':'ltr';
      panel.lang=document.documentElement.lang;
      const title=panel.querySelector('[data-lucy-title]'),status=panel.querySelector('[data-lucy-status]'),input=panel.querySelector('#lucy-input'),close=panel.querySelector('#lucy-close'),send=panel.querySelector('#lucy-send'),camera=panel.querySelector('#lucy-camera');
      if(title)title.textContent=t('name');
      if(status)status.textContent=t('status');
      if(input){input.placeholder=t('placeholder');input.dir=panel.dir;}
      if(close)close.setAttribute('aria-label',t('close'));
      if(send)send.setAttribute('aria-label',t('send'));
      if(camera)camera.setAttribute('aria-label',L(S.cam));
      const greeting=panel.querySelector('.lucy-message.bot');
      const messages=panel.querySelector('#lucy-messages');
      if(previous!==locale && messages && messages.children.length===1 && greeting)greeting.textContent=t('greeting');
    }
    if(launcher){
      launcher.setAttribute('aria-label',t('open'));launcher.title=t('open');launcher.dir='ltr';
      launcher.classList.remove('locale-ar','locale-sw','locale-fr');
      if(locale==='ar'||locale==='sw'||locale==='fr')launcher.classList.add('locale-'+locale);
    }
    const launcherTitle=document.querySelector('[data-lucy-launcher-title]');
    if(launcherTitle)launcherTitle.textContent=L(S.lTitle);
    renderTopics();renderParcelActions();renderPendingPhotoAction();renderDeliveryTypeActions();
  }

  function build(){
    if(document.getElementById('lucy-panel'))return;
    const launcher=document.createElement('button');launcher.id='lucy-launcher';launcher.type='button';launcher.setAttribute('aria-label',UI.en.open);launcher.title=UI.en.open;
    launcher.innerHTML='<span class="lucy-launcher-avatar" aria-hidden="true"></span><span class="lucy-launcher-copy"><span class="lucy-launcher-title" data-lucy-launcher-title>Chat with Lucy</span></span>';
    launcher.addEventListener('click',toggle);
    const panel=document.createElement('section');panel.id='lucy-panel';panel.setAttribute('aria-label','Lucy');
    const head=document.createElement('div');head.className='lucy-head';const headMain=document.createElement('div');headMain.className='lucy-head-main';
    const avatar=document.createElement('div');avatar.className='lucy-avatar';avatar.setAttribute('aria-hidden','true');
    const identity=document.createElement('div');const title=document.createElement('div');title.className='lucy-title';title.dataset.lucyTitle='';
    const status=document.createElement('div');status.className='lucy-status';status.dataset.lucyStatus='';
    identity.append(title,status);headMain.append(avatar,identity);
    const close=document.createElement('button');close.className='lucy-close';close.id='lucy-close';close.type='button';close.setAttribute('aria-label','Close');close.textContent='×';
    head.append(headMain,close);
    const body=document.createElement('div');body.className='lucy-body';
    const messages=document.createElement('div');messages.className='lucy-messages';messages.id='lucy-messages';
    const deliveryTypeActions=document.createElement('div');deliveryTypeActions.className='lucy-delivery-type-actions';deliveryTypeActions.id='lucy-delivery-type-actions';
    const parcelActions=document.createElement('div');parcelActions.className='lucy-parcel-actions';parcelActions.id='lucy-parcel-actions';
    const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='image/jpeg,image/png,image/webp';fileInput.setAttribute('capture','environment');fileInput.hidden=true;fileInput.id='lucy-parcel-photo';
    const photoBtn=document.createElement('button');photoBtn.type='button';photoBtn.className='lucy-parcel-btn primary';photoBtn.dataset.lucyPhoto='';
    const typeBtn=document.createElement('button');typeBtn.type='button';typeBtn.className='lucy-parcel-btn';typeBtn.dataset.lucyType='';
    photoBtn.addEventListener('click',()=>fileInput.click());
    typeBtn.addEventListener('click',()=>document.getElementById('lucy-input')?.focus());
    fileInput.addEventListener('change',()=>{
      const file=fileInput.files?.[0];if(!file)return;
      const sendData=d=>{sendMessage('','',d);fileInput.value='';};
      const legacy=()=>{
        if(file.size>4*1024*1024){addMessage(L(S.tooBig),'bot');fileInput.value='';return;}
        const reader=new FileReader();reader.onload=()=>{sendMessage('', '', String(reader.result||''));fileInput.value='';};reader.readAsDataURL(file);
      };
      if(file.size>25*1024*1024){legacy();return;}
      compressImage(file).then(sendData).catch(legacy);
    });
    parcelActions.append(photoBtn,typeBtn,fileInput);
    const topics=document.createElement('div');topics.className='lucy-topics';topics.id='lucy-topics';
    const compose=document.createElement('div');compose.className='lucy-compose';
    const camera=document.createElement('button');camera.className='lucy-camera';camera.type='button';camera.textContent='📷';camera.id='lucy-camera';
    const input=document.createElement('input');input.className='lucy-input';input.id='lucy-input';input.autocomplete='off';
    const send=document.createElement('button');send.className='lucy-send';send.id='lucy-send';send.type='button';send.setAttribute('aria-label','Send');
    compose.append(camera,input,send);
    body.append(messages,deliveryTypeActions,parcelActions,topics,compose);panel.append(head,body);
    close.addEventListener('click',toggle);camera.addEventListener('click',()=>fileInput.click());send.addEventListener('click',()=>sendMessage());
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
    document.body.appendChild(launcher);document.body.appendChild(panel);
    restoreSession();applyLocale(currentLocale());
    if(history.length)history.forEach(item=>addMessage(item.content,item.role==='user'?'user':'bot'));else addMessage(t('greeting'),'bot');
    renderParcelActions();renderDeliveryTypeActions();
  }
  function toggle(){const panel=document.getElementById('lucy-panel');if(!panel)return;isOpen=!isOpen;panel.classList.toggle('is-open',isOpen);if(isOpen)document.getElementById('lucy-input')?.focus();}

  /* ---------- Payment handoff (direct call, no events) ---------- */
  async function startPayment(data){
    if(payBusy)return;
    payBusy=true;
    const p=(data&&data.payload)||{};
    const phone=p.phone||p.customer_phone;
    const note=addMessage(L(S.prep),'bot',true);
    const fail=(msg,canRetry)=>{
      note?.remove();payBusy=false;
      const el=addMessage(msg,'bot');
      if(el&&canRetry){
        const b=document.createElement('button');b.type='button';b.className='lucy-parcel-btn primary lucy-pay-retry';b.textContent=L(S.payRetry);
        b.addEventListener('click',()=>{el.remove();startPayment(data);});
        el.appendChild(b);
      }
    };
    try{
      if(!p.pickup||!p.dropoff||!p.customer_name||!phone){fail(L(S.incomplete),false);return;}
      const res=await fetch(`${API_BASE}/delivery-payment-initiate`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          pickup:p.pickup,dropoff:p.dropoff,details:p.details||'',
          customer_name:p.customer_name,customer_phone:phone,customer_email:p.customer_email||'',
          preferred_time:p.preferred_time||'',member_id:p.member_id||null,
          parcel_photo_path:p.parcel_photo_path||null,
          delivery_type:p.delivery_type||'one_off',trip_count:Number(p.trip_count||1)
        })
      });
      const d=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(d.error||'payment init failed');
      if(d.status==='awaiting_quote'){
        note?.remove();payBusy=false;
        deliveryState={step:'IDLE'};clearPendingPhoto();saveSession();
        renderDeliveryTypeActions();renderParcelActions();
        addMessage(L(S.quote).replace('{ref}',String(d.bookingReference||'')),'bot');
        return;
      }
      if(d.paymentMethod==='ncba_till'){
        clearSession();
        window.location.assign('/delivery-checkout.html?reference='+encodeURIComponent(String(d.bookingReference||'')));
        return;
      }
      if(!/^https:\/\//.test(String(d.redirectUrl||'')))throw new Error(d.error||'no secure payment page');
      note?.remove();addMessage(L(S.opening),'bot');
      clearSession();
      window.location.href=d.redirectUrl;
    }catch(err){
      console.error('Lucy payment handoff failed',err);
      fail(L(S.payFail),true);
    }
  }

  async function sendMessage(text,topicIntent='',imageData=''){
    if(busy)return;
    const input=document.getElementById('lucy-input');
    const message=imageData?L(S.attached):String(text??input?.value??'').trim();
    if(!message)return;
    if(input)input.value='';
    addMessage(message,'user',false,imageData);
    busy=true;
    const send=document.getElementById('lucy-send');if(send)send.disabled=true;
    const typing=addMessage(L(S.typing),'bot',true);
    if(imageData)savePendingPhoto(imageData);
    saveSession();
    try{
      const res=await fetch(`${API_BASE}/lucy-chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,locale,topic_intent:topicIntent,delivery_state:deliveryState,history:history.slice(-9),...(imageData?{image_data:imageData}:{})})});
      const data=await res.json().catch(()=>({}));
      typing?.remove();
      if(!res.ok)throw new Error(data?.error||'Request failed');
      const reply=String(data?.reply||'');
      const isPayment=['PAYMENT_READY','INITIATE_PAYMENT'].includes(data?.action);
      if(reply&&!isPayment)addMessage(reply,'bot');
      if(data?.delivery_state&&typeof data.delivery_state==='object')deliveryState=data.delivery_state;
      renderDeliveryTypeActions();renderParcelActions();clearPendingPhoto();renderPendingPhotoAction();
      history.push({role:'user',content:message});
      if(reply)history.push({role:'assistant',content:reply});
      history=history.slice(-20);saveSession();
      if(isPayment)startPayment(data);
      if(data?.action==='START_MEMBERSHIP_CHECKOUT'&&data?.payload?.checkout_url){
        const url=String(data.payload.checkout_url);
        if(/^https:\/\/lueriinternational\.com\/checkout\.html\?/.test(url)){clearSession();window.location.assign(url);}
      }
    }catch(err){
      typing?.remove();
      if(imageData)savePendingPhoto(imageData);
      addMessage(L(S.connErr),'bot');renderPendingPhotoAction();
      console.error('Lucy chat error',err);
    }finally{busy=false;if(send)send.disabled=false;}
  }

  function bindLanguage(){
    let last=currentLocale();
    const sync=value=>{
      const next=value&&SUPPORTED_LOCALES.includes(value)?value:currentLocale();
      if(next!==locale||next!==last){last=next;applyLocale(next);}
    };
    window.addEventListener('lueri:languagechange',e=>sync(e?.detail?.language));
    document.addEventListener('lueri:languagechange',e=>sync(e?.detail?.language));
    window.addEventListener('lueri-language-change',e=>sync(e?.detail?.locale));
    document.addEventListener('lueri-language-change',e=>sync(e?.detail?.locale));
    const selector=document.getElementById('languageSelector');
    if(selector)selector.addEventListener('change',()=>sync(selector.value));
    window.addEventListener('storage',e=>{if(['lueri_language','lueri-language','lueri_lang','lueri_locale'].includes(e.key))sync(e.newValue);});
    new MutationObserver(()=>{
      const next=document.documentElement.dataset.lueriLanguage||document.documentElement.dataset.lucyLanguage;
      if(next&&SUPPORTED_LOCALES.includes(next))sync(next);
    }).observe(document.documentElement,{attributes:true,attributeFilter:['data-lueri-language','data-lucy-language','lang','dir']});
    sync(document.documentElement.dataset.lueriLanguage||currentLocale());
  }

  function init(){injectStyles();build();bindLanguage();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.LucyChatbot={setLanguage:applyLocale,open:()=>{isOpen=true;document.getElementById('lucy-panel')?.classList.add('is-open');},close:()=>{isOpen=false;document.getElementById('lucy-panel')?.classList.remove('is-open');}};
})();
