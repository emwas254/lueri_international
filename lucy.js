/* Lueri International — Lucy customer-facing concierge
 * Fix: restore visible launcher/panel, synchronize language state, use the
 * deployed lucy-chat contract, remove Book Now from Lucy, and render messages
 * safely without innerHTML.
 */
(function () {
  'use strict';

  const API_BASE = 'https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1';
  const WA_URL = 'https://wa.link/qk7m3b';
  const SUPPORTED_LOCALES = ['en', 'sw', 'fr', 'es', 'ar', 'pt', 'zh'];

  const UI = {
    en: { name:'Lucy', status:'Online and ready to help', greeting:"Hi, I'm Lucy, Lueri's digital concierge. How can I assist you today?", placeholder:'Ask me anything...', send:'Send', close:'Close', open:'Open Lucy', whatsapp:'Chat with Lueri on WhatsApp', pay:'Proceed to secure payment', processing:'Processing…', paymentFailed:'Payment setup failed. Please try again or contact Lueri on WhatsApp.', network:'Network error. Please try again or contact Lueri on WhatsApp.', success:'Payment successful! Your booking is confirmed. You will receive a receipt by email shortly.', failed:'Payment failed. Please try again or contact Lueri on WhatsApp.', topics:['Delivery Pricing','Corporate Plans','Service Areas','Opening Hours','Track Delivery'] },
    sw: { name:'Lucy', status:'Mtandaoni na tayari kukusaidia', greeting:'Habari, mimi ni Lucy, msaidizi wa kidijitali wa Lueri. Ninaweza kukusaidia vipi leo?', placeholder:'Niulize chochote...', send:'Tuma', close:'Funga', open:'Fungua Lucy', whatsapp:'Chat na Lueri kwenye WhatsApp', pay:'Endelea kwenye malipo salama', processing:'Inachakatwa…', paymentFailed:'Kuweka malipo kumeshindikana. Tafadhali jaribu tena au wasiliana na Lueri kupitia WhatsApp.', network:'Hitilafu ya mtandao. Tafadhali jaribu tena au wasiliana na Lueri kupitia WhatsApp.', success:'Malipo yamefanikiwa! Oda yako imethibitishwa. Utapokea risiti kwa barua pepe hivi karibuni.', failed:'Malipo yameshindikana. Tafadhali jaribu tena au wasiliana na Lueri kupitia WhatsApp.', topics:['Bei ya Usafirishaji','Mipango ya Biashara','Maeneo Tunayofikia','Saa za Kazi','Fuatilia Oda'] },
    fr: { name:'Lucy', status:'En ligne et prête à aider', greeting:"Bonjour, je suis Lucy, la concierge numérique de Lueri. Comment puis-je vous aider aujourd'hui ?", placeholder:"Demandez-moi n'importe quoi...", send:'Envoyer', close:'Fermer', open:'Ouvrir Lucy', whatsapp:'Discuter avec Lueri sur WhatsApp', pay:'Passer au paiement sécurisé', processing:'Traitement…', paymentFailed:'La préparation du paiement a échoué. Veuillez réessayer ou contacter Lueri sur WhatsApp.', network:'Erreur réseau. Veuillez réessayer ou contacter Lueri sur WhatsApp.', success:'Paiement réussi ! Votre réservation est confirmée. Vous recevrez bientôt un reçu par e-mail.', failed:'Le paiement a échoué. Veuillez réessayer ou contacter Lueri sur WhatsApp.', topics:['Tarifs de livraison','Plans d’entreprise','Zones de service','Heures d’ouverture','Suivre une livraison'] },
    es: { name:'Lucy', status:'En línea y lista para ayudar', greeting:'Hola, soy Lucy, la conserje digital de Lueri. ¿Cómo puedo ayudarte hoy?', placeholder:'Pregúntame lo que quieras...', send:'Enviar', close:'Cerrar', open:'Abrir Lucy', whatsapp:'Chatear con Lueri por WhatsApp', pay:'Continuar al pago seguro', processing:'Procesando…', paymentFailed:'No se pudo preparar el pago. Inténtalo de nuevo o contacta con Lueri por WhatsApp.', network:'Error de red. Inténtalo de nuevo o contacta con Lueri por WhatsApp.', success:'¡Pago realizado correctamente! Tu reserva está confirmada. Recibirás el recibo por correo electrónico.', failed:'El pago falló. Inténtalo de nuevo o contacta con Lueri por WhatsApp.', topics:['Precios de entrega','Planes corporativos','Áreas de servicio','Horario','Rastrear entrega'] },
    ar: { name:'لوسي', status:'متصلة وجاهزة للمساعدة', greeting:'مرحباً، أنا لوسي، المساعدة الرقمية لـ Lueri. كيف يمكنني مساعدتك اليوم؟', placeholder:'اسألني أي شيء...', send:'إرسال', close:'إغلاق', open:'فتح لوسي', whatsapp:'الدردشة مع Lueri عبر واتساب', pay:'المتابعة إلى الدفع الآمن', processing:'جارٍ المعالجة…', paymentFailed:'تعذر إعداد الدفع. يرجى المحاولة مرة أخرى أو التواصل مع Lueri عبر واتساب.', network:'حدث خطأ في الشبكة. يرجى المحاولة مرة أخرى أو التواصل مع Lueri عبر واتساب.', success:'تم الدفع بنجاح! تم تأكيد حجزك. ستصلك الإيصال عبر البريد الإلكتروني قريباً.', failed:'فشل الدفع. يرجى المحاولة مرة أخرى أو التواصل مع Lueri عبر واتساب.', topics:['أسعار التوصيل','خطط الشركات','مناطق الخدمة','ساعات العمل','تتبع التوصيل'] },
    pt: { name:'Lucy', status:'Online e pronta para ajudar', greeting:'Olá, eu sou a Lucy, a concierge digital da Lueri. Como posso ajudar você hoje?', placeholder:'Pergunte-me qualquer coisa...', send:'Enviar', close:'Fechar', open:'Abrir Lucy', whatsapp:'Conversar com a Lueri no WhatsApp', pay:'Prosseguir para pagamento seguro', processing:'Processando…', paymentFailed:'Não foi possível preparar o pagamento. Tente novamente ou fale com a Lueri pelo WhatsApp.', network:'Erro de rede. Tente novamente ou fale com a Lueri pelo WhatsApp.', success:'Pagamento realizado com sucesso! Sua reserva está confirmada. Você receberá o recibo por e-mail em breve.', failed:'O pagamento falhou. Tente novamente ou fale com a Lueri pelo WhatsApp.', topics:['Preços de entrega','Planos empresariais','Áreas de serviço','Horário de funcionamento','Rastrear entrega'] },
    zh: { name:'Lucy', status:'在线并准备提供帮助', greeting:'您好，我是 Lucy，Lueri 的数字礼宾。今天我能帮您什么？', placeholder:'问我任何问题...', send:'发送', close:'关闭', open:'打开 Lucy', whatsapp:'在 WhatsApp 上联系 Lueri', pay:'继续安全付款', processing:'处理中…', paymentFailed:'付款设置失败。请重试，或通过 WhatsApp 联系 Lueri。', network:'网络错误。请重试，或通过 WhatsApp 联系 Lueri。', success:'付款成功！您的预约已确认。电子收据将很快发送到您的邮箱。', failed:'付款失败。请重试，或通过 WhatsApp 联系 Lueri。', topics:['配送价格','企业计划','服务区域','营业时间','追踪配送'] }
  };

  let locale = 'en';
  let bookingState = null;
  let conversationHistory = [];
  let open = false;
  let sending = false;

  function getLocale() {
    try {
      const candidates = [
        window.LueriI18n && typeof window.LueriI18n.get === 'function' ? window.LueriI18n.get() : null,
        localStorage.getItem('lueri-language'),
        localStorage.getItem('lueri_lang')
      ];
      return candidates.find(v => SUPPORTED_LOCALES.includes(v)) || 'en';
    } catch (_) { return 'en'; }
  }

  function t(key) { return (UI[locale] || UI.en)[key]; }

  function setLocale(next) {
    locale = SUPPORTED_LOCALES.includes(next) ? next : 'en';
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.lucyLanguage = locale;
    const panel = document.getElementById('lucy-panel');
    const launcherLabel = document.querySelector('[data-lucy-launcher-label]');
    if (launcherLabel) launcherLabel.textContent = t('name');
    if (!panel) return;
    panel.dir = locale === 'ar' ? 'rtl' : 'ltr';
    const status = panel.querySelector('[data-lucy-status]');
    const greeting = panel.querySelector('[data-lucy-greeting]');
    const input = panel.querySelector('#lucy-input');
    const send = panel.querySelector('#lucy-send');
    const wa = panel.querySelector('#lucy-whatsapp');
    const close = panel.querySelector('#lucy-close');
    const title = panel.querySelector('[data-lucy-title]');
    if (status) status.textContent = t('status');
    if (greeting && !greeting.dataset.customized) greeting.textContent = t('greeting');
    if (input) { input.placeholder = t('placeholder'); input.dir = locale === 'ar' ? 'rtl' : 'ltr'; }
    if (send) send.textContent = t('send');
    if (wa) wa.textContent = t('whatsapp');
    if (close) close.setAttribute('aria-label', t('close'));
    if (title) title.textContent = t('name');
    renderTopics();
    updatePaymentButtons();
  }

  function injectStyles() {
    if (document.getElementById('lucy-runtime-styles')) return;
    const style = document.createElement('style');
    style.id = 'lucy-runtime-styles';
    style.textContent = `
      #lucy-launcher{position:fixed;right:22px;bottom:22px;z-index:10000;border:1px solid #1b2620;background:#274238;color:#f0ead8;border-radius:999px;min-width:64px;height:64px;padding:0 18px;display:flex;align-items:center;justify-content:center;gap:9px;font:600 14px/1 'IBM Plex Sans',sans-serif;letter-spacing:.03em;box-shadow:0 10px 30px rgba(0,0,0,.22);cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}#lucy-launcher:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.28)}#lucy-launcher .lucy-dot{width:10px;height:10px;border-radius:50%;background:#e8b93d;box-shadow:0 0 0 4px rgba(232,185,61,.18)}
      #lucy-panel{position:fixed;right:22px;bottom:96px;z-index:10001;width:min(410px,calc(100vw - 28px));height:min(690px,calc(100vh - 120px));display:none;flex-direction:column;overflow:hidden;background:var(--paper,#f0ead8);color:var(--ink,#1b2620);border:1px solid var(--line,rgba(27,38,32,.16));border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.28)}#lucy-panel.is-open{display:flex}
      .lucy-head{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;background:#274238;color:#f0ead8}.lucy-head-main{display:flex;align-items:center;gap:11px}.lucy-avatar{width:38px;height:38px;border-radius:50%;background:#e8b93d;color:#1b2620;display:flex;align-items:center;justify-content:center;font-weight:800}.lucy-title{font-weight:700}.lucy-status{font-size:11px;opacity:.82;margin-top:3px}.lucy-close{border:0;background:transparent;color:inherit;font-size:25px;line-height:1;cursor:pointer;padding:4px}.lucy-body{display:flex;flex-direction:column;min-height:0;flex:1}.lucy-messages{flex:1;overflow:auto;padding:15px;display:flex;flex-direction:column;gap:5px;scroll-behavior:smooth}.lucy-message{max-width:84%;padding:10px 13px;margin:3px 0;border-radius:13px;line-height:1.48;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}.lucy-message.user{align-self:flex-end;background:#274238;color:#f0ead8;border-bottom-right-radius:4px}.lucy-message.bot{align-self:flex-start;background:rgba(255,255,255,.55);border:1px solid var(--line,rgba(27,38,32,.12));border-bottom-left-radius:4px}.lucy-typing{opacity:.65;font-style:italic}.lucy-topics{padding:0 15px 8px;display:flex;gap:7px;flex-wrap:wrap}.lucy-topic-btn{border:1px solid #274238;background:transparent;color:inherit;border-radius:999px;padding:7px 10px;font:500 11px/1.1 'IBM Plex Sans',sans-serif;cursor:pointer}.lucy-topic-btn:hover{background:#274238;color:#f0ead8}.lucy-compose{padding:10px 12px;border-top:1px solid var(--line,rgba(27,38,32,.16));display:flex;gap:8px}.lucy-input{flex:1;min-width:0;border:1px solid var(--line,rgba(27,38,32,.25));background:rgba(255,255,255,.42);color:inherit;border-radius:9px;padding:11px 12px;font:400 14px/1.3 'IBM Plex Sans',sans-serif;resize:none}.lucy-input:focus{outline:2px solid #e8b93d;outline-offset:1px}.lucy-send{border:0;border-radius:9px;background:#274238;color:#f0ead8;padding:0 15px;font-weight:700;cursor:pointer}.lucy-send:disabled{opacity:.55;cursor:not-allowed}.lucy-footer{padding:0 12px 12px}.lucy-wa{width:100%;border:1px solid #274238;background:transparent;color:inherit;border-radius:8px;padding:9px;font:600 12px 'IBM Plex Sans',sans-serif;cursor:pointer}.lucy-pay{width:100%;border:0;background:#b8321f;color:#fff;border-radius:9px;padding:12px;margin:5px 0;font:700 13px 'IBM Plex Sans',sans-serif;cursor:pointer}.lucy-pay:disabled{opacity:.55;cursor:not-allowed}.lucy-payment-note{font-size:11px;opacity:.7;padding:4px 0 8px}.lucy-modal{position:fixed;inset:0;z-index:10020;background:rgba(27,38,32,.84);display:flex;align-items:center;justify-content:center;padding:14px}.lucy-modal-card{width:min(920px,100%);height:min(760px,94vh);background:var(--paper,#f0ead8);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}.lucy-modal-head{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#274238;color:#f0ead8}.lucy-modal-close{background:transparent;color:inherit;border:0;font-size:24px;cursor:pointer}.lucy-payment-frame{flex:1;border:0;width:100%;background:#fff}
      @media(max-width:560px){#lucy-launcher{right:14px;bottom:14px;height:58px;min-width:58px;padding:0 14px}#lucy-panel{right:7px;bottom:82px;width:calc(100vw - 14px);height:calc(100vh - 96px);border-radius:10px}.lucy-message{max-width:90%}}
    `;
    document.head.appendChild(style);
  }

  function buildUI() {
    if (document.getElementById('lucy-launcher')) return;
    injectStyles();
    const launcher = document.createElement('button');
    launcher.id = 'lucy-launcher'; launcher.type = 'button'; launcher.setAttribute('aria-controls','lucy-panel'); launcher.setAttribute('aria-expanded','false'); launcher.setAttribute('aria-label','Open Lucy');
    const dot = document.createElement('span'); dot.className = 'lucy-dot'; dot.setAttribute('aria-hidden','true');
    const label = document.createElement('span'); label.setAttribute('data-lucy-launcher-label',''); label.textContent = 'Lucy';
    launcher.append(dot,label); launcher.addEventListener('click', togglePanel);

    const panel = document.createElement('section');
    panel.id = 'lucy-panel'; panel.setAttribute('aria-label','Lucy chat');
    panel.innerHTML = `
      <header class="lucy-head"><div class="lucy-head-main"><div class="lucy-avatar" aria-hidden="true">L</div><div><div class="lucy-title" data-lucy-title>Lucy</div><div class="lucy-status" data-lucy-status></div></div></div><button class="lucy-close" id="lucy-close" type="button" aria-label="Close">×</button></header>
      <div class="lucy-body"><div class="lucy-messages" id="lucy-messages" aria-live="polite"></div><div class="lucy-topics" id="lucy-topics"></div><div class="lucy-footer" id="lucy-footer"></div><form class="lucy-compose" id="lucy-form"><textarea class="lucy-input" id="lucy-input" rows="1" maxlength="500" autocomplete="off"></textarea><button class="lucy-send" id="lucy-send" type="submit"></button></form></div>`;

    document.body.appendChild(launcher); document.body.appendChild(panel);
    panel.querySelector('#lucy-close').addEventListener('click', () => setPanel(false));
    panel.querySelector('#lucy-form').addEventListener('submit', e => { e.preventDefault(); sendCurrentMessage(); });
    setLocale(getLocale());
    appendMessage(t('greeting'), 'bot');
  }

  function togglePanel(){ setPanel(!open); }
  function setPanel(value){ open = Boolean(value); const panel=document.getElementById('lucy-panel'); const launcher=document.getElementById('lucy-launcher'); if(!panel||!launcher)return; panel.classList.toggle('is-open',open); launcher.setAttribute('aria-expanded',String(open)); launcher.setAttribute('aria-label',open?t('close'):t('open')); if(open)setTimeout(()=>document.getElementById('lucy-input')?.focus(),50); }

  function appendMessage(text, sender){ const container=document.getElementById('lucy-messages'); if(!container)return; const div=document.createElement('div'); div.className=`lucy-message ${sender}`; div.textContent=String(text??''); container.appendChild(div); container.scrollTop=container.scrollHeight; }
  function showTyping(show){ const existing=document.getElementById('lucy-typing'); if(!show){existing?.remove();return;} if(existing)return; const c=document.getElementById('lucy-messages'); if(!c)return; const d=document.createElement('div'); d.id='lucy-typing'; d.className='lucy-message bot lucy-typing'; d.textContent='…'; c.appendChild(d); c.scrollTop=c.scrollHeight; }
  function renderTopics(){ const c=document.getElementById('lucy-topics'); if(!c)return; c.replaceChildren(); for(const topic of t('topics')){const b=document.createElement('button');b.type='button';b.className='lucy-topic-btn';b.textContent=topic;b.addEventListener('click',()=>sendMessage(topic));c.appendChild(b);} }
  function updatePaymentButtons(){document.querySelectorAll('.lucy-pay').forEach(btn=>{btn.textContent=btn.disabled?t('processing'):t('pay');});}
  async function sendCurrentMessage(){const input=document.getElementById('lucy-input');if(!input)return;const text=input.value.trim();if(!text||sending)return;input.value='';await sendMessage(text);}

  async function sendMessage(message){
    if(sending||!message.trim())return; sending=true; const send=document.getElementById('lucy-send');if(send)send.disabled=true; appendMessage(message,'user'); conversationHistory.push({role:'user',content:message}); showTyping(true);
    const activeLocale=getLocale(); if(activeLocale!==locale)setLocale(activeLocale);
    try{
      const response=await fetch(`${API_BASE}/lucy-chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,locale,booking_state:bookingState||null,conversation_history:conversationHistory.slice(-10)})});
      const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data?.error||`Lucy API ${response.status}`);
      bookingState=data.booking_state||null;
      if(data.reply){appendMessage(data.reply,'bot');conversationHistory.push({role:'assistant',content:String(data.reply)});}
      if(data.action==='INITIATE_PAYMENT'&&data.payload)showPaymentButton(data.payload);
    }catch(error){console.error('Lucy error:',error);appendMessage(t('network'),'bot');}
    finally{showTyping(false);sending=false;if(send)send.disabled=false;}
  }

  function showPaymentButton(payload){const footer=document.getElementById('lucy-footer');if(!footer)return;footer.replaceChildren();const note=document.createElement('div');note.className='lucy-payment-note';note.textContent=t('pay');const button=document.createElement('button');button.type='button';button.className='lucy-pay';button.textContent=t('pay');button.addEventListener('click',()=>initiatePayment(button,payload));footer.append(note,button);}

  async function initiatePayment(button,payload){button.disabled=true;button.textContent=t('processing');try{const res=await fetch(`${API_BASE}/delivery-payment-initiate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await res.json().catch(()=>({}));if(!res.ok||!result.success)throw new Error(result?.error||'Payment setup failed');if(!result.redirectUrl||!result.trackingId)throw new Error('Payment response incomplete');openPaymentModal(result.redirectUrl,result.trackingId);}catch(error){console.error('Payment initiation error:',error);appendMessage(t('paymentFailed'),'bot');button.disabled=false;button.textContent=t('pay');}}

  function openPaymentModal(url,trackingId){closePaymentModal();const modal=document.createElement('div');modal.className='lucy-modal';modal.id='lucy-payment-modal';const card=document.createElement('div');card.className='lucy-modal-card';const head=document.createElement('div');head.className='lucy-modal-head';const title=document.createElement('strong');title.textContent=t('pay');const close=document.createElement('button');close.className='lucy-modal-close';close.type='button';close.textContent='×';close.setAttribute('aria-label',t('close'));close.addEventListener('click',closePaymentModal);head.append(title,close);const iframe=document.createElement('iframe');iframe.className='lucy-payment-frame';iframe.title='Secure payment';iframe.src=url;iframe.referrerPolicy='strict-origin-when-cross-origin';card.append(head,iframe);modal.appendChild(card);document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closePaymentModal();});pollPaymentStatus(trackingId);}
  function closePaymentModal(){document.getElementById('lucy-payment-modal')?.remove();}
  function pollPaymentStatus(trackingId){let attempts=0;const maxAttempts=120;const timer=setInterval(async()=>{attempts++;if(attempts>maxAttempts){clearInterval(timer);return;}try{const res=await fetch(`${API_BASE}/pesapal-status?orderTrackingId=${encodeURIComponent(trackingId)}`);const data=await res.json().catch(()=>({}));const status=String(data.status||'').toLowerCase();if(['completed','successful'].includes(status)){clearInterval(timer);closePaymentModal();appendMessage(t('success'),'bot');bookingState=null;conversationHistory=[];}else if(['failed','cancelled'].includes(status)){clearInterval(timer);closePaymentModal();appendMessage(t('failed'),'bot');}}catch(error){console.warn('Payment status polling error',error);}},5000);}

  function watchLanguage(){window.addEventListener('storage',e=>{if(e.key==='lueri-language'||e.key==='lueri_lang')setLocale(getLocale());});document.addEventListener('change',e=>{const target=e.target;if(target&&target.matches&&target.matches('[data-lueri-language], .lueri-language-picker select, #langSelector'))setTimeout(()=>setLocale(getLocale()),0);},true);}
  function init(){buildUI();watchLanguage();setLocale(getLocale());}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();