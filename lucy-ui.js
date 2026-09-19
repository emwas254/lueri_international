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
    en: {name:'Lucy',status:'Online and ready to help',greeting:"Hi, I'm Lucy, Lueri's digital concierge. How can I assist you today?",placeholder:'Ask me anything...',send:'Send',close:'Close',open:'Open Lucy',topics:['Delivery Pricing','Corporate Plans','Rewards Membership','Service Areas','Opening Hours','Track Delivery']},
    sw: {name:'Lucy',status:'Mtandaoni na tayari kukusaidia',greeting:'Habari, mimi ni Lucy, msaidizi wa kidijitali wa Lueri. Ninaweza kukusaidia vipi leo?',placeholder:'Niulize chochote...',send:'Tuma',close:'Funga',open:'Fungua Lucy',topics:['Bei ya Usafirishaji','Mipango ya Biashara','Uanachama wa Rewards','Maeneo Tunayofikia','Saa za Kazi','Fuatilia Oda']},
    fr: {name:'Lucy',status:'En ligne et prête à aider',greeting:"Bonjour, je suis Lucy, la concierge numérique de Lueri. Comment puis-je vous aider aujourd'hui ?",placeholder:"Demandez-moi n'importe quoi...",send:'Envoyer',close:'Fermer',open:'Ouvrir Lucy',topics:['Tarifs de livraison','Plans d’entreprise','Adhésion Rewards','Zones de service','Heures d’ouverture','Suivre une livraison']},
    es: {name:'Lucy',status:'En línea y lista para ayudar',greeting:'Hola, soy Lucy, la conserje digital de Lueri. ¿Cómo puedo ayudarte hoy?',placeholder:'Pregúntame lo que quieras...',send:'Enviar',close:'Cerrar',open:'Abrir Lucy',topics:['Precios de entrega','Planes corporativos','Membresía Rewards','Áreas de servicio','Horario','Rastrear entrega']},
    ar: {name:'لوسي',status:'متصلة وجاهزة للمساعدة',greeting:'مرحباً، أنا لوسي، المساعدة الرقمية لـ Lueri. كيف يمكنني مساعدتك اليوم؟',placeholder:'اسألني أي شيء...',send:'إرسال',close:'إغلاق',open:'فتح لوسي',topics:['أسعار التوصيل','خطط الشركات','عضوية Rewards','مناطق الخدمة','ساعات العمل','تتبع التوصيل']},
    pt: {name:'Lucy',status:'Online e pronta para ajudar',greeting:'Olá, eu sou a Lucy, a concierge digital da Lueri. Como posso ajudar você hoje?',placeholder:'Pergunte-me qualquer coisa...',send:'Enviar',close:'Fechar',open:'Abrir Lucy',topics:['Preços de entrega','Planos empresariais','Membresia Rewards','Áreas de serviço','Horário de funcionamento','Rastrear entrega']},
    zh: {name:'露西',status:'在线并准备提供帮助',greeting:'您好，我是露西，Lueri 的数字礼宾。今天我能帮您什么？',placeholder:'问问露西任何事情……',send:'发送',close:'关闭',open:'打开露西',topics:['配送价格','企业计划','Rewards 会员','服务区域','营业时间','追踪配送']}
  };

  let locale='en', deliveryState={step:'IDLE'}, history=[], isOpen=false, busy=false;

  function currentLocale(){try{const c=[document.documentElement.dataset.lueriLanguage,document.documentElement.dataset.lucyLanguage,window.LueriI18n&&typeof window.LueriI18n.get==='function'?window.LueriI18n.get():null,localStorage.getItem('lueri_language'),localStorage.getItem('lueri-language'),localStorage.getItem('lueri_lang'),localStorage.getItem('lueri_locale')];return c.find(v=>SUPPORTED_LOCALES.includes(v))||'en';}catch(_){return'en';}}
  function t(k){return(UI[locale]||UI.en)[k];}

  function injectStyles(){if(document.getElementById('lucy-restored-styles'))return;const s=document.createElement('style');s.id='lucy-restored-styles';s.textContent=`
#lucy-launcher{display:flex!important;position:fixed!important;right:22px!important;bottom:20px!important;z-index:2147483000!important;width:168px!important;min-width:168px!important;height:48px!important;padding:4px 11px 4px 4px!important;margin:0!important;border:1px solid rgba(240,234,216,.38)!important;border-radius:25px!important;background:#274238!important;color:#f0ead8!important;box-shadow:0 9px 24px rgba(0,0,0,.22)!important;cursor:pointer!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;font-family:'IBM Plex Sans',Arial,sans-serif!important;direction:ltr!important}#lucy-launcher:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,.28)}#lucy-launcher .lucy-dot,#lucy-launcher [data-lucy-launcher-label],#lucy-launcher .lucy-launcher-status{display:none!important}
#lucy-launcher .lucy-launcher-copy{position:relative}
#lucy-launcher .lucy-launcher-copy:before{content:'';width:7px;height:7px;min-width:7px;border-radius:50%;background:#39d353;box-shadow:0 0 0 2px rgba(57,211,83,.12);display:inline-block;margin-right:6px;vertical-align:middle}#lucy-launcher .lucy-launcher-avatar{width:40px;height:40px;min-width:40px;border-radius:50%;background:url("${LUCY_AVATAR_SMALL}") center/cover no-repeat;border:2px solid #f0ead8;box-shadow:0 2px 7px rgba(0,0,0,.22)}#lucy-launcher .lucy-launcher-copy{display:flex;flex:1;min-width:0;align-items:center;justify-content:center;line-height:1.1;color:#f0ead8;overflow:hidden}.lucy-launcher-title{display:block!important;font:800 12px/1.15 'IBM Plex Sans',Arial,sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;max-width:100%!important;letter-spacing:0!important;text-align:center!important;unicode-bidi:plaintext}
#lucy-panel{position:fixed!important;right:22px!important;bottom:82px!important;top:auto!important;left:auto!important;z-index:2147482999!important;width:350px!important;height:420px!important;min-height:0!important;max-height:calc(100vh - 104px)!important;margin:0!important;padding:0!important;display:none;flex-direction:column;overflow:hidden;background:#f0ead8;color:#1b2620;border:1px solid rgba(27,38,32,.18);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.25)}#lucy-panel.is-open{display:flex!important}.lucy-head{display:flex;flex:0 0 62px;box-sizing:border-box;align-items:center;justify-content:space-between;padding:8px 12px!important;margin:0!important;background:#274238;color:#f0ead8;border-bottom:1px solid rgba(255,255,255,.12);min-height:62px!important;height:62px!important}.lucy-head-main{display:flex;align-items:center;gap:9px;min-width:0}.lucy-avatar{width:43px;height:43px;min-width:43px;border-radius:50%;background-image:url("${LUCY_AVATAR}");background-size:cover;background-position:center;border:2px solid #f0ead8;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:0;overflow:hidden}.lucy-title{font-weight:800;font-size:16px;line-height:1.1}.lucy-status{font-size:11px;opacity:.82;margin-top:3px}.lucy-close{border:0;background:transparent;color:inherit;font-size:25px;line-height:1;cursor:pointer;padding:2px 5px;margin:0}.lucy-body{display:flex;flex-direction:column;min-height:0;flex:1;margin:0!important;padding:0!important}.lucy-messages{flex:1;overflow:auto;padding:11px 13px 6px;display:flex;flex-direction:column;gap:5px;scroll-behavior:smooth}.lucy-message{max-width:88%;padding:8px 10px;margin:2px 0;border-radius:14px;line-height:1.38;white-space:pre-wrap;overflow-wrap:anywhere;font:400 12.5px/1.38 'IBM Plex Sans',Arial,sans-serif}.lucy-message.user{align-self:flex-end;background:#274238;color:#f0ead8;border-bottom-right-radius:5px}.lucy-message.bot{align-self:flex-start;background:#e7ece5;color:#1b2620;border-bottom-left-radius:5px}.lucy-typing{opacity:.65;font-style:italic}.lucy-topics{padding:0 13px 8px;display:flex;gap:5px;flex-wrap:wrap}.lucy-topic-btn{border:1px solid rgba(27,38,32,.55);background:transparent;color:#1b2620;border-radius:999px;padding:6px 8px;font:600 10px/1.1 'IBM Plex Sans',Arial,sans-serif;cursor:pointer;white-space:nowrap}.lucy-topic-btn:hover{background:#274238;color:#f0ead8}.lucy-compose{padding:7px 8px;border-top:1px solid rgba(27,38,32,.12);display:flex;gap:7px;background:#f0ead8}.lucy-input{flex:1;min-width:0;height:38px;border:1px solid rgba(27,38,32,.22);background:#fff;color:#1b2620;border-radius:20px;padding:0 11px;font:400 12.5px/1.3 'IBM Plex Sans',Arial,sans-serif}.lucy-input:focus{outline:2px solid #e8b93d;outline-offset:1px}.lucy-send{width:39px;height:39px;border:0;border-radius:50%;background:#1b2620;color:#fff;font-weight:800;cursor:pointer;font-size:0;display:grid;place-items:center}.lucy-send::before{content:'➤';font-size:18px;transform:translateX(1px)}.lucy-send:disabled{opacity:.55;cursor:not-allowed}.lucy-footer{display:none!important}@media(max-width:560px){#lucy-launcher{right:12px!important;bottom:12px!important;width:168px!important;min-width:168px!important;height:46px!important;padding:3px 9px 3px 3px!important}#lucy-launcher .lucy-launcher-avatar{width:38px;height:38px;min-width:38px}.lucy-launcher-title{font-size:11.5px!important}#lucy-panel{right:12px!important;bottom:66px!important;width:min(330px,calc(100vw - 24px))!important;height:min(405px,calc(100vh - 82px))!important;max-height:calc(100vh - 82px)!important;border-radius:15px}.lucy-head{flex-basis:59px;height:59px!important;min-height:59px!important;padding:8px 10px!important}.lucy-avatar{width:40px;height:40px;min-width:40px}.lucy-messages{padding:10px}.lucy-topics{padding:0 10px 7px}.lucy-compose{padding:6px 7px}.lucy-input{height:37px}.lucy-send{width:37px;height:37px}}

  `;
  document.head.appendChild(s);
  }
  function addMessage(text,role,typing){const box=document.getElementById('lucy-messages');if(!box)return null;const el=document.createElement('div');el.className=`lucy-message ${role}${typing?' lucy-typing':''}`;const value=String(text??'');const urls=['https://lueriinternational.com/corporate.html','https://lueriinternational.com/rewards.html'];let last=0;const re=/(https:\/\/lueriinternational\.com\/(?:corporate|rewards)\.html)/g;let m;while((m=re.exec(value))){el.append(document.createTextNode(value.slice(last,m.index)));const a=document.createElement('a');a.href=m[1];a.target='_self';a.rel='noopener';a.textContent=m[1];a.style.textDecoration='underline';a.style.fontWeight='600';el.append(a);last=m.index+m[1].length;}el.append(document.createTextNode(value.slice(last)));box.appendChild(el);box.scrollTop=box.scrollHeight;return el;}
  function renderTopics(){const box=document.getElementById('lucy-topics');if(!box)return;box.replaceChildren();(t('topics')||[]).forEach(topic=>{const b=document.createElement('button');b.type='button';b.className='lucy-topic-btn';b.textContent=topic;b.addEventListener('click',()=>sendMessage(topic));box.appendChild(b);});}
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
      const title=panel.querySelector('[data-lucy-title]'),status=panel.querySelector('[data-lucy-status]'),input=panel.querySelector('#lucy-input'),close=panel.querySelector('#lucy-close'),send=panel.querySelector('#lucy-send');
      if(title)title.textContent=t('name');
      if(status)status.textContent=t('status');
      if(input){input.placeholder=t('placeholder');input.dir=panel.dir;}
      if(close)close.setAttribute('aria-label',t('close'));
      if(send)send.setAttribute('aria-label',t('send'));
      const greeting=panel.querySelector('.lucy-message.bot');
      const messages=panel.querySelector('#lucy-messages');
      if(previous!==locale && messages && messages.children.length===1 && greeting){
        greeting.textContent=t('greeting');
      }
    }
    if(launcher){
      launcher.setAttribute('aria-label',t('open'));
      launcher.title=t('open');
      launcher.dir='ltr';
    }
    const launcherTitle=document.querySelector('[data-lucy-launcher-title]');
    const launcherStatus=document.querySelector('[data-lucy-launcher-status]');
    if(launcherTitle)launcherTitle.textContent=locale==='ar'?'تحدث مع لوسي':locale==='zh'?'与露西聊天':locale==='sw'?'Zungumza na Lucy':locale==='fr'?'Discuter avec Lucy':locale==='es'?'Habla con Lucy':locale==='pt'?'Falar com a Lucy':'Chat with Lucy';
    if(launcherStatus)launcherStatus.textContent=locale==='ar'?'متصلة':locale==='zh'?'在线':locale==='sw'?'Mtandaoni':locale==='fr'?'En ligne':locale==='es'?'En línea':locale==='pt'?'Online':'Online';
    renderTopics();
  }

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
    let last=currentLocale();
    const sync=(value)=>{
      const next=value && SUPPORTED_LOCALES.includes(value) ? value : currentLocale();
      if(next!==locale || next!==last){last=next;applyLocale(next);}
    };
    window.addEventListener('lueri:languagechange',e=>sync(e?.detail?.language));
    document.addEventListener('lueri:languagechange',e=>sync(e?.detail?.language));
    window.addEventListener('lueri-language-change',e=>sync(e?.detail?.locale));
    document.addEventListener('lueri-language-change',e=>sync(e?.detail?.locale));
    const selector=document.getElementById('languageSelector');
    if(selector)selector.addEventListener('change',()=>sync(selector.value));
    window.addEventListener('storage',e=>{if(['lueri_language','lueri-language','lueri_lang','lueri_locale'].includes(e.key))sync(e.newValue);});
    if(document.documentElement){
      const observer=new MutationObserver(()=>{
        const next=document.documentElement.dataset.lueriLanguage||document.documentElement.dataset.lucyLanguage;
        if(next&&SUPPORTED_LOCALES.includes(next))sync(next);
      });
      observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-lueri-language','data-lucy-language','lang','dir']});
    }
    sync(document.documentElement.dataset.lueriLanguage||currentLocale());
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
