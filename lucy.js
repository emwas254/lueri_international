/* Lucy: Lueri's interactive digital assistant */
(function () {
  'use strict';

  const WA = 'https://wa.link/qk7m3b';
  const CHAT_ENDPOINT = 'https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1/lucy-chat';
  const LUCY_AVATAR = 'assets/lucy-avatar.webp';
  const LUCY_AVATAR_SMALL = 'assets/lucy-avatar-sm.webp';
  const RATE_LIMIT_MS = 2500;
  const MAX_HISTORY = 10;

  const quickTopics = [
    ['Book a pickup', 'booking'],
    ['Delivery pricing', 'pricing'],
    ['Corporate plans', 'corporate'],
    ['Service areas', 'coverage'],
    ['Opening hours', 'hours'],
    ['Track a delivery', 'tracking']
  ];

  const quickAnswers = {
    booking: 'Absolutely. You can start with the Book a Pickup form on this website, or WhatsApp Lueri with your pickup location, drop-off location and parcel details.',
    pricing: 'Single deliveries start from KES 350. The final quote depends on zones and parcel size, and Lueri confirms the price before pickup.',
    corporate: 'Lueri has Essential (KES 25,000/month), Professional (KES 45,000/month) and Elite (KES 75,000/month) corporate plans, with custom Enterprise agreements for higher volume.',
    coverage: 'Lueri provides Nairobi last-mile delivery and covers Nairobi CBD, Westlands, Kilimani, Kasarani, South B/South C, Embakasi, Ngong Road, Thika Road and surrounding towns. Send the two locations to confirm a route.',
    hours: 'Lueri is open Monday–Friday, 8:00 AM–5:00 PM and Saturday, 8:00 AM–3:00 PM. Sunday is closed.',
    tracking: 'I cannot access customer orders, payment records or live delivery locations. For a specific delivery update, please WhatsApp Lueri directly.'
  };

  const style = document.createElement('style');
  style.textContent = `
    .lucy-launch{position:fixed;right:22px;bottom:22px;z-index:1100;border:0;border-radius:999px;padding:9px 16px 9px 9px;background:linear-gradient(135deg,#1B2620,#34503E);color:#F0EAD8;font:700 14px system-ui,sans-serif;box-shadow:0 10px 28px #0005;cursor:pointer;display:flex;align-items:center;gap:9px;animation:lucyFloat 3s ease-in-out infinite;transition:transform .2s ease,box-shadow .2s ease}
    .lucy-launch:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 14px 32px #0006}
    .lucy-launch .lucy-avatar{width:34px;height:34px;flex:0 0 34px;display:block;border-radius:50%;object-fit:cover;background:#F0EAD8;border:1px solid #F0EAD8;box-shadow:0 2px 8px #0003}
    @keyframes lucyFloat{50%{transform:translateY(-5px)}}
    .lucy-panel{position:fixed;right:22px;bottom:86px;z-index:1100;width:min(390px,calc(100vw - 24px));max-height:min(720px,calc(100vh - 105px));overflow:hidden;border-radius:20px;background:#F8F4E9;color:#1B2620;box-shadow:0 20px 55px #0005;transform-origin:bottom right;animation:lucyOpen .28s ease both;display:flex;flex-direction:column}
    .lucy-panel[hidden]{display:none}
    @keyframes lucyOpen{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
    .lucy-header{padding:15px 17px;color:#F8F4E9;background:linear-gradient(135deg,#1B2620,#34503E);display:flex;align-items:center;gap:11px}
    .lucy-header-avatar{width:46px;height:46px;flex:0 0 46px;border-radius:50%;display:block;object-fit:cover;background:#F0EAD8;border:2px solid #F0EAD8;box-shadow:inset 0 0 0 1px #ffffff55,0 3px 10px #0003}
    .lucy-header-copy{min-width:0;flex:1}.lucy-header h2{margin:0;font:700 17px system-ui,sans-serif}.lucy-status{margin:2px 0 0;font:12px system-ui,sans-serif;color:#cfe6d3}.lucy-status::before{content:'●';color:#79db8a;margin-right:5px}
    .lucy-close{border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:4px 7px;border-radius:8px}.lucy-close:hover{background:#ffffff18}
    .lucy-body{padding:16px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
    .lucy-message{max-width:89%;padding:11px 13px;margin:0 0 10px;border-radius:4px 15px 15px 15px;line-height:1.48;font:14px/1.48 system-ui,sans-serif;background:#e7ede5;animation:lucyMessage .25s ease both;white-space:pre-wrap;overflow-wrap:anywhere}
    .lucy-message.user{margin-left:auto;border-radius:15px 4px 15px 15px;color:#fff;background:#B8321F}
    .lucy-message a{color:inherit;font-weight:700}.lucy-message.user a{color:#fff}
    @keyframes lucyMessage{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    .lucy-options{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0 16px}.lucy-options button{border:1px solid #34503E;border-radius:999px;padding:8px 11px;background:transparent;color:#1B2620;cursor:pointer;font:600 12px system-ui,sans-serif;transition:.18s ease}.lucy-options button:hover,.lucy-options button:focus-visible{background:#34503E;color:#fff;transform:translateY(-1px);outline:none}
    .lucy-booking{display:flex;gap:7px;margin:0 0 14px}.lucy-booking a{flex:1;text-align:center;text-decoration:none;border-radius:10px;padding:10px 9px;font:700 12px system-ui,sans-serif}.lucy-booking-primary{background:#B8321F;color:#fff}.lucy-booking-secondary{background:#25D366;color:#fff}
    .lucy-typing{display:none;padding:10px 13px;width:fit-content;border-radius:14px;background:#e7ede5}.lucy-typing.show{display:block}.lucy-typing span{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:#567060;animation:lucyTyping 1s infinite}.lucy-typing span:nth-child(2){animation-delay:.15s}.lucy-typing span:nth-child(3){animation-delay:.3s}@keyframes lucyTyping{50%{opacity:.3;transform:translateY(-3px)}}
    .lucy-footer{display:flex;gap:8px;padding:12px;border-top:1px solid #ddd6c5;background:#F8F4E9}.lucy-footer input{min-width:0;flex:1;padding:11px 12px;border:1px solid #c8c0ae;border-radius:999px;outline:none;font:14px system-ui,sans-serif}.lucy-footer input:focus{border-color:#34503E;box-shadow:0 0 0 3px #34503e22}.lucy-send{border:0;border-radius:50%;width:42px;height:42px;background:#1B2620;color:#fff;cursor:pointer;font-size:17px}.lucy-send:disabled{opacity:.5;cursor:default}
    .lucy-note{font:11px/1.4 system-ui,sans-serif;color:#6b6a62;text-align:center;padding:0 12px 10px;background:#F8F4E9}
    @media (max-width:520px){.lucy-panel{right:12px;bottom:78px;width:calc(100vw - 24px);max-height:calc(100vh - 92px);border-radius:18px}.lucy-launch{right:14px;bottom:14px}.lucy-body{padding:13px}.lucy-message{max-width:92%}.lucy-booking a{padding:11px 7px}}
    @media (prefers-reduced-motion:reduce){.lucy-launch,.lucy-panel,.lucy-message,.lucy-typing span{animation:none}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.className = 'lucy-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label','Lucy support chat');
  panel.innerHTML = `
    <div class="lucy-header">
      <img class="lucy-header-avatar" src="${LUCY_AVATAR}" alt="Lucy — Lueri Digital Assistant" width="46" height="46">
      <div class="lucy-header-copy"><h2>Lucy</h2><p class="lucy-status">Lueri Digital Assistant</p></div>
      <button class="lucy-close" type="button" aria-label="Close Lucy">×</button>
    </div>
    <div class="lucy-body">
      <div class="lucy-message">Hi, I’m Lucy. 👋 I can help you understand Lueri’s services, pricing, coverage and business plans — or guide you toward a booking.</div>
      <div class="lucy-options"></div>
      <div class="lucy-booking">
        <a class="lucy-booking-primary" href="#contact">Book a Pickup</a>
        <a class="lucy-booking-secondary" href="${WA}" target="_blank" rel="noopener noreferrer">WhatsApp Lueri</a>
      </div>
      <div class="lucy-typing" aria-label="Lucy is typing"><span></span><span></span><span></span></div>
    </div>
    <div class="lucy-footer"><input type="text" maxlength="500" placeholder="Ask Lucy anything…" aria-label="Ask Lucy"><button class="lucy-send" type="button" aria-label="Send message">➤</button></div>
    <div class="lucy-note">For privacy, Lucy does not access customer accounts, orders or payment records.</div>
  `;

  const body = panel.querySelector('.lucy-body');
  const options = panel.querySelector('.lucy-options');
  const input = panel.querySelector('input');
  const send = panel.querySelector('.lucy-send');
  const typing = panel.querySelector('.lucy-typing');
  const close = panel.querySelector('.lucy-close');
  const history = [];
  let lastCall = 0;
  let failures = 0;
  let llmDisabled = false;

  function scrollToBottom(){ body.scrollTop = body.scrollHeight; }
  function addMessage(text,isUser){
    const message=document.createElement('div');
    message.className=`lucy-message${isUser?' user':''}`;
    message.textContent=String(text);
    body.insertBefore(message,typing);
    scrollToBottom();
  }
  function respond(text){
    typing.classList.add('show'); scrollToBottom();
    window.setTimeout(()=>{typing.classList.remove('show');addMessage(text,false)},450);
  }
  function pushHistory(role,content){
    history.push({role,content});
    if(history.length>MAX_HISTORY) history.splice(0,history.length-MAX_HISTORY);
  }

  quickTopics.forEach(([label,key])=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('click',()=>{addMessage(label,true);pushHistory('user',label);pushHistory('assistant',quickAnswers[key]);respond(quickAnswers[key])});
    options.appendChild(button);
  });

  async function askLucy(){
    const question=input.value.trim(); if(!question||input.disabled)return;
    const now=Date.now();
    if(llmDisabled){addMessage(question,true);input.value='';respond('I’m temporarily resting. Please WhatsApp Lueri directly and the team will help you.');return;}
    if(now-lastCall<RATE_LIMIT_MS){addMessage(question,true);input.value='';respond('Give me a moment, or choose one of the quick topics above.');return;}
    lastCall=now;
    addMessage(question,true);pushHistory('user',question);input.value='';input.disabled=true;send.disabled=true;typing.classList.add('show');scrollToBottom();
    try{
      const response=await fetch(CHAT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:question,history:history.slice(0,-1)})});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();
      typing.classList.remove('show');
      const reply=data.reply||'I’m not certain about that. Please WhatsApp Lueri for help.';
      addMessage(reply,false);pushHistory('assistant',reply);failures=0;
    }catch(error){
      console.error('Lucy chat error',error);typing.classList.remove('show');failures++;if(failures>=3)llmDisabled=true;
      addMessage('I’m temporarily offline. Please WhatsApp Lueri and the team will assist you.',false);
    }finally{input.disabled=false;send.disabled=false;input.focus()}
  }

  send.addEventListener('click',askLucy);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askLucy()}});
  close.addEventListener('click',()=>{panel.hidden=true;launch.setAttribute('aria-expanded','false')});

  const launch=document.createElement('button');
  launch.type='button';launch.className='lucy-launch';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls','lucy-panel');
  launch.innerHTML=`<img class="lucy-avatar" src="${LUCY_AVATAR_SMALL}" alt="Lucy" width="34" height="34"><span>Chat with Lucy</span>`;
  panel.id='lucy-panel';
  launch.addEventListener('click',()=>{panel.hidden=!panel.hidden;launch.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)input.focus()});
  document.body.append(panel,launch);
})();