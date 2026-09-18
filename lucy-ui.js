/* Lueri International — Lucy customer-facing concierge
 * Restored compact chat layout using the supplied Lucy avatar.
 * Booking remains conversational; no Book Now or WhatsApp action buttons are rendered.
 */
(function () {
  'use strict';

  const API_BASE = 'https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1';
  const SUPPORTED_LOCALES = ['en','sw','fr','es','ar','pt','zh'];
  const LUCY_AVATAR = 'assets/lucy-avatar.webp';
  const LUCY_AVATAR_SMALL = 'assets/lucy-avatar-sm.webp';

  const UI = {
    en: {name:'Lucy',status:'Online and ready to help',greeting:"Hi, I'm Lucy, Lueri's digital concierge. How can I assist you today?",placeholder:'Ask me anything...',send:'Send',close:'Close',open:'Open Lucy',topics:['Delivery Pricing','Corporate Plans','Service Areas','Opening Hours','Track Delivery']},
    sw: {name:'Lucy',status:'Mtandaoni na tayari kukusaidia',greeting:'Habari, mimi ni Lucy, msaidizi wa kidijitali wa Lueri. Ninaweza kukusaidia vipi leo?',placeholder:'Niulize chochote...',send:'Tuma',close:'Funga',open:'Fungua Lucy',topics:['Bei ya Usafirishaji','Mipango ya Biashara','Maeneo Tunayofikia','Saa za Kazi','Fuatilia Oda']},
    fr: {name:'Lucy',status:'En ligne et prête à aider',greeting:"Bonjour, je suis Lucy, la concierge numérique de Lueri. Comment puis-je vous aider aujourd'hui ?",placeholder:"Demandez-moi n'importe quoi...",send:'Envoyer',close:'Fermer',open:'Ouvrir Lucy',topics:['Tarifs de livraison','Plans d’entreprise','Zones de service','Heures d’ouverture','Suivre une livraison']},
    es: {name:'Lucy',status:'En línea y lista para ayudar',greeting:'Hola, soy Lucy, la conserje digital de Lueri. ¿Cómo puedo ayudarte hoy?',placeholder:'Pregúntame lo que quieras...',send:'Enviar',close:'Cerrar',open:'Abrir Lucy',topics:['Precios de entrega','Planes corporativos','Áreas de servicio','Horario','Rastrear entrega']},
    ar: {name:'لوسي',status:'متصلة وجاهزة للمساعدة',greeting:'مرحباً، أنا لوسي، المساعدة الرقمية لـ Lueri. كيف يمكنني مساعدتك اليوم؟',placeholder:'اسألني أي شيء...',send:'إرسال',close:'إغلاق',open:'فتح لوسي',topics:['أسعار التوصيل','خطط الشركات','مناطق الخدمة','ساعات العمل','تتبع التوصيل']},
    pt: {name:'Lucy',status:'Online e pronta para ajudar',greeting:'Olá, eu sou a Lucy, a concierge digital da Lueri. Como posso ajudar você hoje?',placeholder:'Pergunte-me qualquer coisa...',send:'Enviar',close:'Fechar',open:'Abrir Lucy',topics:['Preços de entrega','Planos empresariais','Áreas de serviço','Horário de funcionamento','Rastrear entrega']},
    zh: {name:'露西',status:'在线并准备提供帮助',greeting:'您好，我是露西，Lueri 的数字礼宾。今天我能帮您什么？',placeholder:'问问露西任何事情……',send:'发送',close:'关闭',open:'打开露西',topics:['配送价格','企业计划','服务区域','营业时间','追踪配送']}
  };

  let locale='en', deliveryState={step:'IDLE'}, history=[], isOpen=false, busy=false;

  function currentLocale(){try{const c=[window.LueriI18n&&typeof window.LueriI18n.get==='function'?window.LueriI18n.get():null,localStorage.getItem('lueri_language'),localStorage.getItem('lueri-language'),localStorage.getItem('lueri_lang'),localStorage.getItem('lueri_locale')];return c.find(v=>SUPPORTED_LOCALES.includes(v))||'en';}catch(_){return'en';}}
  function t(k){return(UI[locale]||UI.en)[k];}

  function injectStyles(){if(document.getElementById('lucy-restored-styles'))return;const s=document.createElement('style');s.id='lucy-restored-styles';s.textContent=`
#lucy-launcher{display:flex!important;position:fixed;right:24px;bottom:22px;z-index:2147483000;width:166px;min-width:166px;height:52px;padding:4px 12px 4px 4px;border:1px solid rgba(240,234,216,.35);border-radius:28px;background:#274238;color:#f0ead8;box-shadow:0 10px 26px rgba(0,0,0,.22);cursor:pointer;align-items:center;gap:9px;transition:transform .18s ease,box-shadow .18s ease;font-family:'IBM Plex Sans',Arial,sans-serif}#lucy-launcher:hover{transform:translateY(-2px);box-shadow:0 13px 30px rgba(0,0,0,.28)}#lucy-launcher .lucy-dot,#lucy-launcher [data-lucy-launcher-label]{display:none!important}#lucy-launcher .lucy-launcher-avatar{width:44px;height:44px;min-width:44px;border-radius:50%;background:url("${LUCY_AVATAR_SMALL}") center/cover no-repeat;border:2px solid #f0ead8;box-shadow:0 2px 7px rgba(0,0,0,.22)}#lucy-launcher .lucy-launcher-copy{display:flex;flex-direction:column;align-items:flex-start;line-height:1.1;color:#f0ead8}.lucy-launcher-title{font:800 14px/1.1 'IBM Plex Sans',Arial,sans-serif;white-space:nowrap}.lucy-launcher-status{display:flex;align-items:center;gap:5px;margin-top:4px;font:500 10.5px/1.1 'IBM Plex Sans',Arial,sans-serif;opacity:.78}.lucy-online-dot{width:7px;height:7px;border-radius:50%;background:#72d88c;box-shadow:0 0 0 3px rgba(114,216,140,.12)}
#lucy-panel{position:fixed;right:24px;bottom:84px;z-index:2147482999;width:350px;height:420px;display:none;flex-direction:column;overflow:hidden;background:#f0ead8;color:#1b2620;border:1px solid rgba(27,38,32,.18);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.25)}#lucy-panel.is-open{display:flex}.lucy-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#274238;color:#f0ead8;border-bottom:1px solid rgba(255,255,255,.12);min-height:62px}.lucy-head-main{display:flex;align-items:center;gap:10px}.lucy-avatar{width:43px;height:43px;min-width:43px;border-radius:50%;background-image:url("${LUCY_AVATAR}");background-size:cover;background-position:center;border:2px solid #f0ead8;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:0;overflow:hidden}.lucy-title{font-weight:800;font-size:16px;line-height:1.1}.lucy-status{font-size:11px;opacity:.82;margin-top:4px}.lucy-close{border:0;background:transparent;color:inherit;font-size:25px;line-height:1;cursor:pointer;padding:2px 5px}.lucy-body{display:flex;flex-direction:column;min-height:0;flex:1}.lucy-messages{flex:1;overflow:auto;padding:12px 14px 7px;display:flex;flex-direction:column;gap:5px;scroll-behavior:smooth}.lucy-message{max-width:88%;padding:8px 10px;margin:2px 0;border-radius:14px;line-height:1.38;white-space:pre-wrap;overflow-wrap:anywhere;font:400 12.5px/1.38 'IBM Plex Sans',Arial,sans-serif}.lucy-message.user{align-self:flex-end;background:#274238;color:#f0ead8;border-bottom-right-radius:5px}.lucy-message.bot{align-self:flex-start;background:#e7ece5;border-bottom-left-radius:5px}.lucy-typing{opacity:.65;font-style:italic}.lucy-topics{padding:0 14px 9px;display:flex;gap:6px;flex-wrap:wrap}.lucy-topic-btn{border:1px solid rgba(27,38,32,.55);background:transparent;color:#1b2620;border-radius:999px;padding:6px 8px;font:600 10px/1.1 'IBM Plex Sans',Arial,sans-serif;cursor:pointer}.lucy-topic-btn:hover{background:#274238;color:#f0ead8}.lucy-compose{padding:8px 9px;border-top:1px solid rgba(27,38,32,.12);display:flex;gap:7px;background:#f0ead8}.lucy-input{flex:1;min-width:0;height:39px;border:1px solid rgba(27,38,32,.22);background:#fff;color:#1b2620;border-radius:21px;padding:0 12px;font:400 12.5px/1.3 'IBM Plex Sans',Arial,sans-serif}.lucy-input:focus{outline:2px solid #e8b93d;outline-offset:1px}.lucy-send{width:39px;height:39px;border:0;border-radius:50%;background:#1b2620;color:#fff;font-weight:800;cursor:pointer;font-size:0;display:grid;place-items:center}.lucy-send::before{content:'➤';font-size:18px;transform:translateX(1px)}.lucy-send:disabled{opacity:.55;cursor:not-allowed}.lucy-footer{display:none!important}@media(max-width:560px){#lucy-launcher{right:14px;bottom:14px;width:158px;min-width:158px;height:49px;padding:4px 10px 4px 4px}#lucy-launcher .lucy-launcher-avatar{width:40px;height:40px;min-width:40px}.lucy-launcher-title{font-size:13px}.lucy-launcher-status{font-size:9.5px}#lucy-panel{right:14px;bottom:70px;width:min(335px,calc(100vw - 28px));height:min(410px,calc(100vh - 90px));border-radius:15px}.lucy-head{padding:9px 11px;min-height:59px}.lucy-avatar{width:40px;height:40px;min-width:40px}.lucy-messages{padding:11px 11px 6px}.lucy-topics{padding:0 11px 7px}.lucy-compose{padding:7px 8px}.lucy-input{height:38px}.lucy-send{width:38px;height:38px}}

  function addMessage(text,role,typing){const box=document.getElementById('lucy-messages');if(!box)return null;const el=document.createElement('div');el.className=`lucy-message ${role}${typing?' lucy-typing':''}`;el.textContent=String(text??'');box.appendChild(el);box.scrollTop=box.scrollHeight;return el;}
  function renderTopics(){const box=document.getElementById('lucy-topics');if(!box)return;box.replaceChildren();(t('topics')||[]).forEach(topic=>{const b=document.createElement('button');b.type='button';b.className='lucy-topic-btn';b.textContent=topic;b.addEventListener('click',()=>sendMessage(topic));box.appendChild(b);});}
  function applyLocale(next){locale=SUPPORTED_LOCALES.includes(next)?next:'en';document.documentElement.dir=locale==='ar'?'rtl':'ltr';document.documentElement.dataset.lucyLanguage=locale;const panel=document.getElementById('lucy-panel');if(!panel)return;panel.dir=locale==='ar'?'rtl':'ltr';const title=panel.querySelector('[data-lucy-title]'),status=panel.querySelector('[data-lucy-status]'),input=panel.querySelector('#lucy-input'),close=panel.querySelector('#lucy-close');if(title)title.textContent=t('name');if(status)status.textContent=t('status');const launcherTitle=document.querySelector('[data-lucy-launcher-title]');const launcherStatus=document.querySelector('[data-lucy-launcher-status]');if(launcherTitle)launcherTitle.textContent=locale==='ar'?'تحدث مع لوسي':locale==='zh'?'与露西聊天':locale==='sw'?'Zungumza na Lucy':locale==='fr'?'Discuter avec Lucy':locale==='es'?'Habla con Lucy':locale==='pt'?'Falar com a Lucy':'Chat with Lucy';if(launcherStatus)launcherStatus.textContent=locale==='ar'?'متصلة':locale==='zh'?'在线':locale==='sw'?'Mtandaoni':locale==='fr'?'En ligne':locale==='es'?'En línea':locale==='pt'?'Online':'Online';if(input){input.placeholder=t('placeholder');input.dir=panel.dir;}if(close)close.setAttribute('aria-label',t('close'));renderTopics();}

  function build(){if(document.getElementById('lucy-panel'))return;const launcher=document.createElement('button');launcher.id='lucy-launcher';launcher.type='button';launcher.setAttribute('aria-label',UI.en.open);launcher.title=UI.en.open;launcher.innerHTML='<span class="lucy-launcher-avatar" aria-hidden="true"></span><span class="lucy-launcher-copy"><span class="lucy-launcher-title" data-lucy-launcher-title>Chat with Lucy</span><span class="lucy-launcher-status"><span class="lucy-online-dot"></span><span data-lucy-launcher-status>Online</span></span></span>';launcher.addEventListener('click',toggle);
    const panel=document.createElement('section');panel.id='lucy-panel';panel.setAttribute('aria-label','Lucy');
    const head=document.createElement('div');head.className='lucy-head';const headMain=document.createElement('div');headMain.className='lucy-head-main';const avatar=document.createElement('div');avatar.className='lucy-avatar';avatar.setAttribute('aria-hidden','true');const identity=document.createElement('div');const title=document.createElement('div');title.className='lucy-title';title.dataset.lucyTitle='';const status=document.createElement('div');status.className='lucy-status';status.dataset.lucyStatus='';identity.append(title,status);headMain.append(avatar,identity);const close=document.createElement('button');close.className='lucy-close';close.id='lucy-close';close.type='button';close.setAttribute('aria-label','Close');close.textContent='×';head.append(headMain,close);
    const body=document.createElement('div');body.className='lucy-body';const messages=document.createElement('div');messages.className='lucy-messages';messages.id='lucy-messages';const topics=document.createElement('div');topics.className='lucy-topics';topics.id='lucy-topics';const compose=document.createElement('div');compose.className='lucy-compose';const input=document.createElement('input');input.className='lucy-input';input.id='lucy-input';input.autocomplete='off';const send=document.createElement('button');send.className='lucy-send';send.id='lucy-send';send.type='button';send.setAttribute('aria-label','Send');compose.append(input,send);body.append(messages,topics,compose);panel.append(head,body);
    close.addEventListener('click',toggle);send.addEventListener('click',()=>sendMessage());input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});document.body.appendChild(launcher);document.body.appendChild(panel);applyLocale(currentLocale());addMessage(t('greeting'),'bot');
  }
  function toggle(){const panel=document.getElementById('lucy-panel');if(!panel)return;isOpen=!isOpen;panel.classList.toggle('is-open',isOpen);if(isOpen)document.getElementById('lucy-input')?.focus();}

  async function sendMessage(text){if(busy)return;const input=document.getElementById('lucy-input');const message=String(text??input?.value??'').trim();if(!message)return;if(input)input.value='';addMessage(message,'user');busy=true;const send=document.getElementById('lucy-send');if(send)send.disabled=true;const typing=addMessage(locale==='zh'?'正在输入…':locale==='sw'?'Inaandika…':locale==='fr'?'Saisie…':locale==='es'?'Escribiendo…':locale==='ar'?'يكتب الآن…':locale==='pt'?'Digitando…':'Typing…','bot',true);
    try{const res=await fetch(`${API_BASE}/lucy-chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,locale,delivery_state:deliveryState,history:history.slice(-9)})});const data=await res.json().catch(()=>({}));typing?.remove();if(!res.ok)throw new Error(data?.error||'Request failed');const reply=String(data?.reply||'');if(reply)addMessage(reply,'bot');if(data?.delivery_state&&typeof data.delivery_state==='object')deliveryState=data.delivery_state;history.push({role:'user',content:message});if(reply)history.push({role:'assistant',content:reply});history=history.slice(-9);if(data?.action==='INITIATE_PAYMENT')document.dispatchEvent(new CustomEvent('lueri-lucy-payment-ready',{detail:data}));}
    catch(err){typing?.remove();addMessage(locale==='zh'?'抱歉，Lucy 暂时无法连接。请稍后再试。':locale==='sw'?'Samahani, Lucy hawezi kuunganishwa kwa sasa. Jaribu tena baadaye.':locale==='fr'?'Désolée, Lucy ne peut pas se connecter pour le moment. Réessayez plus tard.':locale==='es'?'Lo siento, Lucy no puede conectarse ahora. Inténtalo de nuevo más tarde.':locale==='ar'?'عذراً، لا تستطيع لوسي الاتصال الآن. يرجى المحاولة لاحقاً.':locale==='pt'?'Desculpe, a Lucy não consegue conectar-se agora. Tente novamente mais tarde.':'Sorry, Lucy cannot connect right now. Please try again later.','bot');console.error('Lucy chat error',err);}
    finally{busy=false;if(send)send.disabled=false;}
  }
  function bindLanguage(){
    const sync=(value)=>applyLocale(value && SUPPORTED_LOCALES.includes(value) ? value : currentLocale());
    window.addEventListener('lueri:languagechange',e=>sync(e?.detail?.language));
    document.addEventListener('lueri:languagechange',e=>sync(e?.detail?.language));
    window.addEventListener('lueri-language-change',e=>sync(e?.detail?.locale));
    document.addEventListener('lueri-language-change',e=>sync(e?.detail?.locale));
    window.addEventListener('storage',e=>{if(['lueri_language','lueri-language','lueri_lang','lueri_locale'].includes(e.key))sync();});
  }
  function bindPaymentHandoff(){
    if(window.__lueriLucyPaymentBound)return;
    window.__lueriLucyPaymentBound=true;
    window.addEventListener('lueri-lucy-payment-ready',async(e)=>{
      const detail=e?.detail||{};
      const payload=detail.payload||{};
      const input=document.getElementById('lucy-input');
      const send=document.getElementById('lucy-send');
      try{
        if(!payload.pickup||!payload.dropoff||!payload.customer_name||!payload.phone){
          throw new Error('The booking details are incomplete. Please restart the booking.');
        }
        const res=await fetch(`${API_BASE.replace('/functions/v1','')}/functions/v1/delivery-payment-initiate`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            pickup:payload.pickup,
            dropoff:payload.dropoff,
            details:payload.details||'',
            customer_name:payload.customer_name,
            customer_phone:payload.phone,
            customer_email:payload.customer_email||'',
            preferred_time:payload.preferred_time||'',
            member_id:payload.member_id||null
          })
        });
        const data=await res.json().catch(()=>({}));
        if(!res.ok||!data.redirectUrl)throw new Error(data.error||'We could not open the secure payment page.');
        addMessage(locale==='zh'?'正在打开安全付款页面…':locale==='sw'?'Tunafungua ukurasa salama wa malipo…':locale==='fr'?'Ouverture de la page de paiement sécurisée…':locale==='es'?'Abriendo la página de pago seguro…':locale==='ar'?'جارٍ فتح صفحة الدفع الآمنة…':locale==='pt'?'A abrir a página de pagamento segura…':'Opening the secure payment page…','bot');
        window.location.href=data.redirectUrl;
      }catch(err){
        console.error('Lucy payment handoff failed',err);
        addMessage(locale==='zh'?'无法打开付款页面，请稍后再试。':locale==='sw'?'Hatukuweza kufungua ukurasa wa malipo. Tafadhali jaribu tena.':locale==='fr'?'Impossible d’ouvrir la page de paiement. Veuillez réessayer.':locale==='es'?'No pudimos abrir la página de pago. Inténtalo de nuevo.':locale==='ar'?'تعذر فتح صفحة الدفع. يرجى المحاولة مرة أخرى.':locale==='pt'?'Não foi possível abrir a página de pagamento. Tente novamente.':'We could not open the payment page. Please try again.','bot');
        if(input)input.focus();
      }finally{if(send)send.disabled=false;}
    });
  }
  function init(){injectStyles();build();bindLanguage();bindPaymentHandoff();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.LucyChatbot={setLanguage:applyLocale,open:()=>{isOpen=true;document.getElementById('lucy-panel')?.classList.add('is-open');},close:()=>{isOpen=false;document.getElementById('lucy-panel')?.classList.remove('is-open');}};
})();
