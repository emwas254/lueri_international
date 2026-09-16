// =========================================================
// LUERI INTERNATIONAL - LUCY CHATBOT & PAYMENT API (FINAL)
// =========================================================

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIGURATION ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PESAPAL_BASE_URL = process.env.PESAPAL_ENV === 'production' ? 'https://pay.pesapal.com/v3' : 'https://cybqa.pesapal.com/pesapalv3';

// --- HELPER: Get Pesapal Token ---
async function getPesapalToken() {
  const res = await axios.post(`${PESAPAL_BASE_URL}/api/merchant/oauth/requesttoken`, {
    consumer_key: process.env.PESAPAL_CONSUMER_KEY,
    consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
  });
  return res.data.token;
}

// --- HELPER: Calculate Price ---
function calculateServerPrice(pickup, dropoff, details) {
  let base = 350;
  const text = `${pickup} ${dropoff}`.toLowerCase();
  if (['westlands', 'kilimani', 'karen'].some(z => text.includes(z))) base += 150;
  if (details.toLowerCase().includes('heavy') || details.toLowerCase().includes('large')) base += 200;
  return base;
}

// =========================================================
// BACKEND API ROUTES
// =========================================================

// 1. Initiate Payment
app.post('/api/pesapal-initiate', async (req, res) => {
  try {
    const { pickup, dropoff, details, name, phone, time } = req.body;
    if (!pickup || !dropoff || !phone || !name) return res.status(400).json({ success: false, message: 'Missing fields' });

    const amount = calculateServerPrice(pickup, dropoff, details);
    const orderTrackingId = `LUERI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const token = await getPesapalToken();

    const registerRes = await axios.post(`${PESAPAL_BASE_URL}/api/transactions/registerorder`, {
      id: orderTrackingId, currency: 'KES', amount, description: `Lueri Delivery: ${pickup} to ${dropoff}`,
      callback_url: `${process.env.FRONTEND_URL}/payment-callback`,
      billing_address: { email_address: 'booking@lueriinternational.com', phone_number: phone.startsWith('0') ? `254${phone.substring(1)}` : phone, country_code: 'KE', first_name: name.split(' ')[0], last_name: name.split(' ').slice(1).join(' ') || 'Customer' }
    }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

    await supabase.from('bookings').insert({ order_tracking_id: orderTrackingId, customer_name: name, customer_phone: phone, pickup_location: pickup, dropoff_location: dropoff, parcel_details: details, pickup_time: time, amount, status: 'pending_payment', source: 'lucy_chatbot' });

    res.json({ success: true, redirectUrl: registerRes.data.redirect_url, orderTrackingId, amount });
  } catch (error) {
    console.error('Initiate Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to initiate payment.' });
  }
});

// 2. Check Payment Status
app.get('/api/pesapal-status', async (req, res) => {
  try {
    const { orderTrackingId } = req.query;
    if (!orderTrackingId) return res.status(400).json({ success: false });
    const token = await getPesapalToken();
    const statusRes = await axios.get(`${PESAPAL_BASE_URL}/api/transactions/gettransactionstatus?orderTrackingId=${orderTrackingId}`, { headers: { Authorization: `Bearer ${token}` } });
    const status = statusRes.data.payment_status_description;
    if (status === 'COMPLETED') await supabase.from('bookings').update({ status: 'confirmed', paid_at: new Date().toISOString() }).eq('order_tracking_id', orderTrackingId);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// =========================================================
// FRONTEND: SERVE LUCY CHATBOT UI
// =========================================================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lueri - Lucy Chatbot</title>
<style>
  /* Hide old red quick topic buttons */
  .options, .quick-topics { display: none !important; }
  
  /* Clean Chat UI */
  body { font-family: 'IBM Plex Sans', sans-serif; background: #f4f4f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; transition: direction 0.3s ease; }
  .chat-container { width: 400px; height: 600px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; }
  .chat-header { background: #274238; color: white; padding: 16px; font-weight: 700; font-family: 'Oswald', sans-serif; }
  .chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
  .message { padding: 12px 16px; border-radius: 12px; max-width: 80%; line-height: 1.5; font-size: 0.95rem; white-space: pre-wrap; }
  .message.bot { background: #f0f0f0; align-self: flex-start; border-bottom-left-radius: 4px; }
  .message.user { background: #B8321F; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
  .chat-input-area { padding: 16px; border-top: 1px solid #eee; display: flex; gap: 8px; }
  .chat-input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; outline: none; font-size: 0.95rem; }
  .chat-input:focus { border-color: #B8321F; }
  .send-btn { background: #B8321F; color: white; border: none; padding: 0 20px; border-radius: 8px; cursor: pointer; font-weight: 700; }
  
  /* Clean Action Buttons */
  .action-buttons { display: flex; gap: 8px; margin-top: 8px; }
  .action-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
  .btn-primary { background: #B8321F; color: white; }
  .btn-secondary { background: transparent; border: 1px solid #274238; color: #274238; }
  
  /* Payment Modal */
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: none; justify-content: center; align-items: center; z-index: 1000; }
  .modal-content { background: white; width: 90%; max-width: 500px; height: 600px; border-radius: 12px; overflow: hidden; }
  .modal-content iframe { width: 100%; height: 100%; border: none; }

  /* --- ARABIC RTL SUPPORT --- */
  body.rtl { direction: rtl; }
  body.rtl .message.bot { align-self: flex-end; border-bottom-left-radius: 12px; border-bottom-right-radius: 4px; }
  body.rtl .message.user { align-self: flex-start; border-bottom-right-radius: 12px; border-bottom-left-radius: 4px; }
</style>
</head>
<body>

<div class="chat-container">
  <div class="chat-header">LUCY - Lueri Assistant</div>
  <div class="chat-messages" id="chatMessages"></div>
  <div class="chat-input-area">
    <input type="text" class="chat-input" id="chatInput" placeholder="Ask Lucy anything...">
    <button class="send-btn" id="sendBtn">Send</button>
  </div>
</div>

<div class="modal-overlay" id="paymentModal">
  <div class="modal-content"><iframe id="paymentFrame" src=""></iframe></div>
</div>

<script>
  // --- COMPLETE 7-LANGUAGE I18N DICTIONARY ---
  const i18n = {
    en: { 
      welcome: "Hello! I'm Lucy. How can I help?", 
      booking: "Let's book a delivery. What's your pickup location?", 
      askDropoff: "What's the drop-off location?", 
      askDetails: "Describe the parcel (size, weight):", 
      askName: "Your full name?", 
      askPhone: "Your phone number?", 
      askTime: "Pickup time? (ASAP, Morning, Afternoon, Evening)", 
      confirm: "Summary:\\n {p} to {d}\\n📦 {det}\\n👤 {n}\\n {ph}\\n⏰ {t}\\n💰 KES {price}\\nProceed to payment?", 
      processing: "Processing payment...", 
      success: "✅ Payment successful! Ref: {ref}", 
      failed: "Payment failed. Try again?", 
      yes: "Yes", no: "No", placeholder: "Ask Lucy..." 
    },
    sw: { 
      welcome: "Habari! Mimi ni Lucy. Nikusaidie vipi?", 
      booking: "Tuweke oda. Mahali pa kuchukua?", 
      askDropoff: "Mahali pa kupeleka?", 
      askDetails: "Eleza kifurushi (ukubwa, uzito):", 
      askName: "Jina lako kamili?", 
      askPhone: "Namba ya simu?", 
      askTime: "Muda wa kuchukua? (HARAKA, Asubuhi, Mchana, Jioni)", 
      confirm: "Muhtasari:\\n📍 {p} hadi {d}\\n📦 {det}\\n👤 {n}\\n📱 {ph}\\n⏰ {t}\\n KES {price}\\nEndelea na malipo?", 
      processing: "Tunachakata malipo...", 
      success: "✅ Malipo yamefanikiwa! Ref: {ref}", 
      failed: "Malipo yameshindikana. Jaribu tena?", 
      yes: "Ndiyo", no: "Hapana", placeholder: "Muulize Lucy..." 
    },
    fr: { 
      welcome: "Bonjour! Je suis Lucy. Comment puis-je aider?", 
      booking: "Réservons une livraison. Lieu de ramassage?", 
      askDropoff: "Lieu de livraison?", 
      askDetails: "Décrivez le colis (taille, poids):", 
      askName: "Votre nom complet?", 
      askPhone: "Votre numéro de téléphone?", 
      askTime: "Heure de ramassage? (Dès que possible, Matin, Après-midi, Soir)", 
      confirm: "Résumé:\\n📍 {p} à {d}\\n {det}\\n👤 {n}\\n📱 {ph}\\n⏰ {t}\\n💰 KES {price}\\nProcéder au paiement?", 
      processing: "Traitement du paiement...", 
      success: "✅ Paiement réussi! Ref: {ref}", 
      failed: "Paiement échoué. Réessayer?", 
      yes: "Oui", no: "Non", placeholder: "Demandez à Lucy..." 
    },
    es: { 
      welcome: "¡Hola! Soy Lucy. ¿Cómo puedo ayudar?", 
      booking: "Reservemos un envío. ¿Lugar de recogida?", 
      askDropoff: "¿Lugar de entrega?", 
      askDetails: "Describa el paquete (tamaño, peso):", 
      askName: "¿Su nombre completo?", 
      askPhone: "¿Su número de teléfono?", 
      askTime: "¿Hora de recogida? (ASAP, Mañana, Tarde, Noche)", 
      confirm: "Resumen:\\n📍 {p} a {d}\\n📦 {det}\\n👤 {n}\\n📱 {ph}\\n {t}\\n💰 KES {price}\\n¿Proceder al pago?", 
      processing: "Procesando pago...", 
      success: "✅ ¡Pago exitoso! Ref: {ref}", 
      failed: "Pago fallido. ¿Intentar de nuevo?", 
      yes: "Sí", no: "No", placeholder: "Pregunte a Lucy..." 
    },
    ar: { 
      welcome: "مرحباً! أنا لوسي. كيف يمكنني المساعدة؟", 
      booking: "لنحجز توصيلاً. مكان الاستلام؟", 
      askDropoff: "مكان التسليم؟", 
      askDetails: "صف الطرد (الحجم، الوزن):", 
      askName: "اسمك الكامل؟", 
      askPhone: "رقم هاتفك؟", 
      askTime: "وقت الاستلام؟ (في أقرب وقت، صباحاً، ظهراً، مساءً)", 
      confirm: "الملخص:\\n📍 {p} إلى {d}\\n📦 {det}\\n👤 {n}\\n📱 {ph}\\n⏰ {t}\\n💰 KES {price}\\nالمتابعة للدفع؟", 
      processing: "معالجة الدفع...", 
      success: "✅ تم الدفع بنجاح! المرجع: {ref}", 
      failed: "فشل الدفع. حاول مرة أخرى؟", 
      yes: "نعم", no: "لا", placeholder: "اسأل لوسي..." 
    },
    pt: { 
      welcome: "Olá! Sou a Lucy. Como posso ajudar?", 
      booking: "Vamos agendar uma entrega. Local de coleta?", 
      askDropoff: "Local de entrega?", 
      askDetails: "Descreva a encomenda (tamanho, peso):", 
      askName: "Seu nome completo?", 
      askPhone: "Seu número de telefone?", 
      askTime: "Hora da coleta? (ASAP, Manhã, Tarde, Noite)", 
      confirm: "Resumo:\\n📍 {p} para {d}\\n📦 {det}\\n👤 {n}\\n📱 {ph}\\n {t}\\n💰 KES {price}\\nProsseguir para o pagamento?", 
      processing: "Processando pagamento...", 
      success: "✅ Pagamento bem-sucedido! Ref: {ref}", 
      failed: "Pagamento falhou. Tentar novamente?", 
      yes: "Sim", no: "Não", placeholder: "Pergunte à Lucy..." 
    },
    zh: { 
      welcome: "您好！我是Lucy。我能帮您什么？", 
      booking: "我们预订送货。取件地点？", 
      askDropoff: "送货地点？", 
      askDetails: "描述包裹（大小、重量）：", 
      askName: "您的全名？", 
      askPhone: "您的电话号码？", 
      askTime: "取件时间？（尽快、上午、下午、晚上）", 
      confirm: "摘要：\\n {p} 到 {d}\\n {det}\\n👤 {n}\\n📱 {ph}\\n⏰ {t}\\n💰 KES {price}\\n继续付款？", 
      processing: "正在处理付款...", 
      success: "✅ 付款成功！参考号：{ref}", 
      failed: "付款失败。重试？", 
      yes: "是", no: "否", placeholder: "询问Lucy..." 
    }
  };

  // --- STATE & LANGUAGE DETECTION ---
  // This is where the RTL logic is applied for Arabic
  let lang = localStorage.getItem('lueri_lang') || 'en';
  if (lang === 'ar') document.body.classList.add('rtl');
  
  let booking = { active: false, step: 0, data: {} };
  const t = (key) => i18n[lang][key] || i18n['en'][key];

  // --- UI HELPERS ---
  const messagesDiv = document.getElementById('chatMessages');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const modal = document.getElementById('paymentModal');
  const frame = document.getElementById('paymentFrame');

  function addMsg(text, isUser) {
    const div = document.createElement('div');
    div.className = 'message ' + (isUser ? 'user' : 'bot');
    div.innerText = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function addButtons(yesText, noText, onYes, onNo) {
    const div = document.createElement('div');
    div.className = 'action-buttons';
    const yBtn = document.createElement('button'); yBtn.className = 'action-btn btn-primary'; yBtn.innerText = yesText; yBtn.onclick = onYes;
    const nBtn = document.createElement('button'); nBtn.className = 'action-btn btn-secondary'; nBtn.innerText = noText; nBtn.onclick = onNo;
    div.appendChild(yBtn); div.appendChild(nBtn);
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // --- BOOKING FLOW ---
  async function handleBooking(msg) {
    if (!booking.active) { booking.active = true; booking.step = 1; addMsg(t('booking'), false); return; }
    
    const keys = ['pickup','dropoff','details','name','phone','time'];
    booking.data[keys[booking.step-1]] = msg;
    booking.step++;
    
    const steps = [t('askDropoff'), t('askDetails'), t('askName'), t('askPhone'), t('askTime')];
    
    if (booking.step <= 5) {
      addMsg(steps[booking.step-1], false);
    } else {
      const price = 350 + (booking.data.pickup.toLowerCase().includes('westlands') ? 150 : 0);
      booking.data.price = price;
      const summary = t('confirm')
        .replace('{p}', booking.data.pickup)
        .replace('{d}', booking.data.dropoff)
        .replace('{det}', booking.data.details)
        .replace('{n}', booking.data.name)
        .replace('{ph}', booking.data.phone)
        .replace('{t}', booking.data.time)
        .replace('{price}', price);
      
      addMsg(summary, false);
      addButtons(t('yes'), t('no'), processPayment, resetBooking);
    }
  }

  async function processPayment() {
    addMsg(t('processing'), false);
    try {
      const res = await fetch('/api/pesapal-initiate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(booking.data) });
      const data = await res.json();
      if (data.success) {
        frame.src = data.redirectUrl;
        modal.style.display = 'flex';
        pollStatus(data.orderTrackingId);
      } else { throw new Error('API Error'); }
    } catch (e) { addMsg(t('failed'), false); }
  }

  async function pollStatus(id) {
    const interval = setInterval(async () => {
      const res = await fetch('/api/pesapal-status?orderTrackingId=' + id);
      const data = await res.json();
      if (data.status === 'COMPLETED') {
        clearInterval(interval);
        modal.style.display = 'none';
        addMsg(t('success').replace('{ref}', id), false);
        resetBooking();
      }
    }, 5000);
  }

  function resetBooking() { booking = { active: false, step: 0, data: {} }; addMsg(t('welcome'), false); }

  // --- EVENT LISTENERS ---
  sendBtn.onclick = () => {
    const msg = input.value.trim();
    if (!msg) return;
    addMsg(msg, true);
    input.value = '';
    if (msg.toLowerCase().includes('book') || booking.active) handleBooking(msg);
    else addMsg("I can help you book a delivery. Type 'book' to start.", false);
  };
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });

  // Init
  addMsg(t('welcome'), false);
  input.placeholder = t('placeholder');
</script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lueri Server running on http://localhost:${PORT}`));
