/* Lueri Lucy Concierge — guided booking assistant. Loaded by lueri-common.js after Lucy is available. */
(function(){'use strict';
  function init(){
    const panel=document.getElementById('lucy-panel');
    if(!panel||panel.dataset.conciergeReady==='1')return;
    const body=panel.querySelector('.lucy-body'), options=panel.querySelector('.lucy-options'), input=panel.querySelector('input'), send=panel.querySelector('.lucy-send');
    if(!body||!options||!input||!send)return;
    panel.dataset.conciergeReady='1';
    const state={active:false,step:0,data:{}};
    const steps=[
      ['pickup','What is the pickup location or area?'],
      ['dropoff','Where should we deliver it?'],
      ['details','What are you sending? Please include the parcel type and approximate size if relevant.'],
      ['name','What name should we put on the booking?'],
      ['phone','What Kenyan phone number should Lueri use to contact you?'],
      ['time','When would you like the pickup? You can say “as soon as possible”, a time, or a date and time.']
    ];
    const add=(text,user)=>{const el=document.createElement('div');el.className='lucy-message'+(user?' user':'');el.textContent=text;body.insertBefore(el,body.querySelector('.lucy-typing'));body.scrollTop=body.scrollHeight;};
    const setBusy=(busy)=>{input.disabled=busy;send.disabled=busy;};
    const resetOptions=()=>{options.innerHTML='';};
    function start(){state.active=true;state.step=0;state.data={};resetOptions();add('Absolutely — I can guide you through the booking from start to finish. I’ll collect the pickup, drop-off, parcel details and contact information, then submit the booking to Lueri for confirmation.',false);ask();}
    function ask(){const s=steps[state.step];if(s)add(s[1],false);}
    function valid(key,value){if(value.length<2)return false;if(key==='phone')return /^(?:\+254|254|0)(?:7|1)\d{8}$/.test(value.replace(/\s+/g,''));return true;}
    async function submit(){
      setBusy(true);add('I have everything I need. Submitting your booking to Lueri now…',false);
      try{
        const result=await window.lueri.booking.create({name:state.data.name,phone:state.data.phone,pickup:state.data.pickup,dropoff:state.data.dropoff,details:state.data.details,time:state.data.time});
        if(!result||result.success===false)throw new Error(result?.error||'Booking could not be created');
        const ref=result.booking?.reference||result.reference||result.booking_reference||'';
        add('Booking received successfully.'+(ref?' Your reference is '+ref+'.':'')+' Lueri will confirm the route, price and pickup details. I can also open WhatsApp for direct confirmation.',false);
        const wa=document.createElement('a');wa.href='https://wa.me/254713261719?text='+encodeURIComponent('Hello Lueri, I just submitted a booking. Name: '+state.data.name+' | Phone: '+state.data.phone+' | Pickup: '+state.data.pickup+' | Drop-off: '+state.data.dropoff+' | Parcel: '+state.data.details+' | Pickup time: '+state.data.time+(ref?' | Ref: '+ref:''));wa.target='_blank';wa.rel='noopener noreferrer';wa.className='lucy-booking-secondary';wa.textContent='Confirm on WhatsApp';wa.style.cssText='display:block;text-align:center;text-decoration:none;border-radius:10px;padding:10px;margin-top:10px;font:700 12px system-ui,sans-serif;background:#25D366;color:#fff';body.insertBefore(wa,body.querySelector('.lucy-typing'));state.active=false;state.step=0;state.data={};
      }catch(e){console.error('Lucy concierge booking error',e);add('I could not complete the booking submission. Nothing has been marked as completed. Please try again or use WhatsApp and the Lueri team will finish it with you.',false);state.active=false;}
      finally{setBusy(false);input.focus();}
    }
    async function accept(){
      const value=input.value.trim();if(!state.active||!value)return;
      const key=steps[state.step][0];if(!valid(key,value)){add(value,true);input.value='';add(key==='phone'?'Please enter a valid Kenyan phone number, for example 0712 345 678.':'Please give me a little more detail so I can complete the booking.',false);return;}
      add(value,true);input.value='';state.data[key]=value;state.step++;
      if(state.step<steps.length)ask();else await submit();
    }
    const startButton=document.createElement('button');startButton.type='button';startButton.textContent='Start a booking with Lucy';startButton.addEventListener('click',start);options.prepend(startButton);
    const originalPlaceholder=input.getAttribute('placeholder');
    const observer=new MutationObserver(()=>{if(!state.active&&input.getAttribute('placeholder')!==originalPlaceholder)input.setAttribute('placeholder',originalPlaceholder||'Ask Lucy anything…');});observer.observe(input,{attributes:true,attributeFilter:['placeholder']});
    const originalSend=send.onclick;send.addEventListener('click',()=>{if(state.active)accept();});input.addEventListener('keydown',e=>{if(state.active&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();accept();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
