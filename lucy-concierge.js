/* Lueri Lucy Concierge — guided booking assistant. No invented backend booking RPC. */
(function(){'use strict';
function init(){
 const panel=document.getElementById('lucy-panel');
 if(!panel||panel.dataset.conciergeReady==='1')return;
 const body=panel.querySelector('.lucy-body'),options=panel.querySelector('.lucy-options'),input=panel.querySelector('input'),send=panel.querySelector('.lucy-send');
 if(!body||!options||!input||!send)return;
 panel.dataset.conciergeReady='1';
 const state={active:false,step:0,data:{}};
 const steps=[['pickup','What is the pickup location or area?'],['dropoff','Where should we deliver it?'],['details','What are you sending? Include parcel type and approximate size if relevant.'],['name','What name should we put on the booking?'],['phone','What Kenyan phone number should Lueri use to contact you?'],['time','When would you like the pickup? You can say “as soon as possible”, a time, or a date and time.']];
 const add=(text,user)=>{const el=document.createElement('div');el.className='lucy-message'+(user?' user':'');el.textContent=text;body.insertBefore(el,body.querySelector('.lucy-typing'));body.scrollTop=body.scrollHeight;};
 const busy=v=>{input.disabled=v;send.disabled=v;};
 const ask=()=>{if(steps[state.step])add(steps[state.step][1],false)};
 function start(){state.active=true;state.step=0;state.data={};options.querySelectorAll('[data-concierge-generated]').forEach(x=>x.remove());add('Absolutely — I’ll take you through the booking step by step. I’ll collect the route, parcel and contact details, then prepare the booking request for Lueri to confirm.',false);ask();}
 function valid(key,v){if(v.length<2)return false;if(key==='phone')return /^(?:\+254|254|0)(?:7|1)\d{8}$/.test(v.replace(/\s+/g,''));return true;}
 function finish(){
   busy(true);
   const d=state.data;
   const message='Hello Lueri, I would like to make a booking.\nName: '+d.name+'\nPhone: '+d.phone+'\nPickup: '+d.pickup+'\nDrop-off: '+d.dropoff+'\nParcel details: '+d.details+'\nPreferred pickup time: '+d.time;
   const formMap={pickup:['pickup'],dropoff:['dropoff'],details:['details','parcelDetails'],name:['name','fullName'],phone:['phone','contactPhone'],time:['time','pickupTime']};
   Object.entries(formMap).forEach(([key,ids])=>{for(const id of ids){const el=document.getElementById(id);if(el){el.value=d[key];el.dispatchEvent(new Event('input',{bubbles:true}));break;}}});
   add('Everything is collected. I have prepared your booking request with the exact details you gave me. Lueri will confirm the route, quote and availability before dispatch.',false);
   const link=document.createElement('a');link.href='https://wa.me/254713261719?text='+encodeURIComponent(message);link.target='_blank';link.rel='noopener noreferrer';link.className='lucy-booking-secondary';link.setAttribute('data-concierge-generated','1');link.textContent='Send booking to Lueri on WhatsApp';link.style.cssText='display:block;text-align:center;text-decoration:none;border-radius:10px;padding:11px;margin-top:10px;font:700 12px system-ui,sans-serif;background:#25D366;color:#fff';body.insertBefore(link,body.querySelector('.lucy-typing'));
   state.active=false;state.step=0;busy(false);input.value='';input.focus();
 }
 async function accept(){const value=input.value.trim();if(!state.active||!value)return;const key=steps[state.step][0];add(value,true);input.value='';if(!valid(key,value)){add(key==='phone'?'Please enter a valid Kenyan phone number, for example 0712 345 678.':'Please give me a little more detail so I can complete the booking.',false);return}state.data[key]=value;state.step++;if(state.step<steps.length)ask();else finish();}
 const startButton=document.createElement('button');startButton.type='button';startButton.textContent='Start a booking with Lucy';startButton.setAttribute('data-concierge-generated','1');startButton.addEventListener('click',start);options.prepend(startButton);
 send.addEventListener('click',()=>{if(state.active)accept();});
 input.addEventListener('keydown',e=>{if(state.active&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();accept();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
