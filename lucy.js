// ============================================
// LUERI INTERNATIONAL - LUCY CHATBOT
// Complete Multilingual Concierge System
// ============================================

// 1. SEVEN-LANGUAGE UI DICTIONARY
const SUPPORTED_LOCALES = ['en', 'sw', 'fr', 'es', 'ar', 'pt', 'zh'];

const LUCY_UI_I18N = {
  en: { 
    status: "Online and ready to help", 
    greeting: "Hi, I'm Lucy, Lueri's digital concierge. How can I assist you today?", 
    placeholder: "Ask me anything...", 
    sendBtn: "Send", 
    whatsapp: "Chat with Lueri on WhatsApp", 
    error: "I'm temporarily offline. Please WhatsApp Lueri directly.",
    topics: ["Delivery Pricing", "Corporate Plans", "Service Areas", "Opening Hours", "Track Delivery"]
  },
  sw: { 
    status: "Mtandaoni na tayari kukusaidia", 
    greeting: "Habari, mimi ni Lucy, msaidizi wa kidijitali wa Lueri. Ninaweza kukusaidia vipi leo?", 
    placeholder: "Niulize chochote...", 
    sendBtn: "Tuma", 
    whatsapp: "Chat na Lueri kwenye WhatsApp", 
    error: "Nje ya mtandao kwa sasa. Tafadhali wasiliana na Lueri kupitia WhatsApp.",
    topics: ["Bei ya Usafirishaji", "Mipango ya Biashara", "Maeneo Tunayofikia", "Saa za Kazi", "Fuatilia Oda"]
  },
  fr: { 
    status: "En ligne et prêt à aider", 
    greeting: "Bonjour, je suis Lucy, la concierge numérique de Lueri. Comment puis-je vous aider aujourd'hui?", 
    placeholder: "Demandez-moi n'importe quoi...", 
    sendBtn: "Envoyer", 
    whatsapp: "Discuter avec Lueri sur WhatsApp", 
    error: "Je suis temporairement hors ligne. Veuillez contacter Lueri directement.",
    topics: ["Tarifs de Livraison", "Plans d'Entreprise", "Zones de Service", "Heures d'Ouverture", "Suivre une Livraison"]
  },
  es: { 
    status: "En línea y listo para ayudar", 
    greeting: "Hola, soy Lucy, la conserje digital de Lueri. ¿Cómo puedo ayudarte hoy?", 
    placeholder: "Pregúntame lo que sea...", 
    sendBtn: "Enviar", 
    whatsapp: "Chatear con Lueri en WhatsApp", 
    error: "Estoy temporalmente fuera de línea. Por favor, contacta a Lueri directamente.",
    topics: ["Precios de Entrega", "Planes Corporativos", "Áreas de Servicio", "Horario de Atención", "Rastrear Entrega"]
  },
  ar: { 
    status: "متصل وجاهز للمساعدة", 
    greeting: "مرحباً، أنا لوسي، المساعدة الرقمية لـ Lueri. كيف يمكنني مساعدتك اليوم؟", 
    placeholder: "اسألني أي شيء...", 
    sendBtn: "إرسال", 
    whatsapp: "دردش مع Lueri على واتساب", 
    error: "أنا غير متصل مؤقتاً. يرجى التواصل مع Lueri مباشرة.",
    topics: ["أسعار التوصيل", "خطط الشركات", "مناطق الخدمة", "ساعات العمل", "تتبع التوصيل"]
  },
  pt: { 
    status: "Online e pronto para ajudar", 
    greeting: "Olá, eu sou a Lucy, a concierge digital da Lueri. Como posso ajudar você hoje?", 
    placeholder: "Pergunte-me qualquer coisa...", 
    sendBtn: "Enviar", 
    whatsapp: "Conversar com a Lueri no WhatsApp", 
    error: "Estou temporariamente offline. Por favor, contate a Lueri diretamente.",
    topics: ["Preços de Entrega", "Planos Corporativos", "Áreas de Serviço", "Horário de Funcionamento", "Rastrear Entrega"]
  },
  zh: { 
    status: "在线并准备提供帮助", 
    greeting: "您好，我是Lucy，Lueri的数字礼宾。今天我能帮您什么？", 
    placeholder: "问我任何问题...", 
    sendBtn: "发送", 
    whatsapp: "在WhatsApp上与Lueri聊天", 
    error: "我暂时离线。请直接联系Lueri。",
    topics: ["送货价格", "企业计划", "服务区域", "营业时间", "追踪送货"]
  }
};

// 2. HELPER FUNCTIONS
function getValidLocale() {
  const value = localStorage.getItem('lueri_lang');
  return SUPPORTED_LOCALES.includes(value) ? value : 'en';
}

function applyLucyUI() {
  const lang = getValidLocale();
  const dict = LUCY_UI_I18N[lang];
  
  // Update UI elements
  const statusEl = document.getElementById('lucy-status');
  const greetingEl = document.getElementById('lucy-greeting');
  const inputEl = document.getElementById('lucy-input');
  const sendBtn = document.getElementById('lucy-send-btn');
  const whatsappCta = document.getElementById('lucy-whatsapp-cta');
  
  if (statusEl) statusEl.textContent = dict.status;
  if (greetingEl) greetingEl.textContent = dict.greeting;
  if (inputEl) {
    inputEl.placeholder = dict.placeholder;
    inputEl.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
  if (sendBtn) sendBtn.textContent = dict.sendBtn;
  if (whatsappCta) whatsappCta.textContent = dict.whatsapp;
  
  // Handle RTL for Arabic
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  
  // Update quick action buttons
  updateQuickActions(dict.topics);
}

function updateQuickActions(topics) {
  const container = document.getElementById('lucy-topics');
  if (!container) return;
  
  container.innerHTML = '';
  topics.forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'lucy-topic-btn';
    btn.textContent = topic;
    btn.onclick = () => sendMessage(topic);
    container.appendChild(btn);
  });
}

// 3. STATE MANAGEMENT
let currentDeliveryState = null;
let conversationHistory = [];

// 4. MESSAGE HANDLING
async function sendMessage(question) {
  if (!question.trim()) return;
  
  // Display user message
  appendMessage(question, 'user');
  document.getElementById('lucy-input').value = '';
  showTypingIndicator();
  
  // Add to history
  conversationHistory.push({ role: 'user', content: question });
  
  try {
    const response = await fetch('https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1/lucy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question,
        history: conversationHistory.slice(-5), // Last 5 messages for context
        locale: getValidLocale(),
        delivery_state: currentDeliveryState || null
      })
    });
    
    const data = await response.json();
    hideTypingIndicator();
    
    // Persist delivery state
    if (data.delivery_state) {
      currentDeliveryState = data.delivery_state;
    }
    
    // Handle bot response
    if (data.reply) {
      appendMessage(data.reply, 'bot');
      conversationHistory.push({ role: 'assistant', content: data.reply });
    }
    
    // Handle payment initiation
    if (data.action === 'INITIATE_PAYMENT' && data.payload) {
      showPaymentButton(data.payload);
    }
    
    // Scroll to bottom
    const chatContainer = document.getElementById('lucy-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
  } catch (error) {
    console.error('Lucy error:', error);
    hideTypingIndicator();
    appendMessage(LUCY_UI_I18N[getValidLocale()].error, 'bot');
  }
}

// 5. UI HELPERS
function appendMessage(text, sender) {
  const container = document.getElementById('lucy-messages');
  if (!container) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `lucy-message ${sender}`;
  
  // Convert newlines to <br>
  msgDiv.innerHTML = text.replace(/\n/g, '<br>');
  
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById('lucy-messages');
  if (!container) return;
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'lucy-message bot typing';
  typingDiv.id = 'lucy-typing';
  typingDiv.innerHTML = '...';
  
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
  const typingEl = document.getElementById('lucy-typing');
  if (typingEl) typingEl.remove();
}

function showPaymentButton(payload) {
  const container = document.getElementById('lucy-messages');
  if (!container) return;
  
  const payBtn = document.createElement('button');
  payBtn.className = 'lucy-pay-btn';
  payBtn.textContent = 'Proceed to Secure Payment';
  payBtn.onclick = async () => {
    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';
    
    try {
      const res = await fetch('https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1/delivery-payment-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      
      if (result.success) {
        openPesapalModal(result.redirectUrl, result.trackingId);
      } else {
        appendMessage('Payment setup failed. Please try again or contact support.', 'bot');
        payBtn.disabled = false;
        payBtn.textContent = 'Retry Payment';
      }
    } catch (e) {
      console.error('Payment error:', e);
      appendMessage('Network error during payment setup.', 'bot');
      payBtn.disabled = false;
      payBtn.textContent = 'Retry Payment';
    }
  };
  
  container.appendChild(payBtn);
  container.scrollTop = container.scrollHeight;
}

function openPesapalModal(url, trackingId) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'pesapal-modal-overlay';
  modal.id = 'pesapal-modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'pesapal-modal-content';
  
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  
  modalContent.appendChild(iframe);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Start polling for payment status
  pollPaymentStatus(trackingId);
}

async function pollPaymentStatus(trackingId) {
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1/pesapal-status?orderTrackingId=${trackingId}`);
      const data = await res.json();
      
      if (data.status === 'COMPLETED' || data.status === 'successful') {
        clearInterval(pollInterval);
        closePesapalModal();
        appendMessage('✅ Payment successful! Your booking is confirmed. You will receive a receipt via email shortly.', 'bot');
        currentDeliveryState = null; // Reset state
      } else if (data.status === 'FAILED') {
        clearInterval(pollInterval);
        closePesapalModal();
        appendMessage('Payment failed. Please try again or contact support.', 'bot');
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 5000); // Poll every 5 seconds
}

function closePesapalModal() {
  const modal = document.getElementById('pesapal-modal');
  if (modal) modal.remove();
}

// 6. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  applyLucyUI();
  
  // Listen for language changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'lueri_lang') applyLucyUI();
  });
  
  // Handle send button
  const sendBtn = document.getElementById('lucy-send-btn');
  const inputEl = document.getElementById('lucy-input');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      sendMessage(inputEl.value);
    });
  }
  
  if (inputEl) {
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage(inputEl.value);
      }
    });
  }
  
  // Handle language selector if it exists
  const langSelector = document.getElementById('langSelector');
  if (langSelector) {
    langSelector.addEventListener('change', (e) => {
      localStorage.setItem('lueri_lang', e.target.value);
      applyLucyUI();
    });
    
    // Set initial value
    langSelector.value = getValidLocale();
  }
});

// 7. CSS STYLES (Add to your stylesheet or inline)
const lucyStyles = `
<style>
.lucy-message {
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 12px;
  max-width: 80%;
  line-height: 1.5;
  word-wrap: break-word;
}

.lucy-message.user {
  background: #B8321F;
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.lucy-message.bot {
  background: #f0f0f0;
  color: #1B2620;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.lucy-message.typing {
  font-style: italic;
  opacity: 0.7;
}

.lucy-topic-btn {
  display: inline-block;
  padding: 8px 16px;
  margin: 4px;
  background: transparent;
  border: 1px solid #274238;
  color: #274238;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.lucy-topic-btn:hover {
  background: #274238;
  color: white;
}

.lucy-pay-btn {
  display: block;
  width: 100%;
  padding: 14px;
  margin: 12px 0;
  background: #B8321F;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lucy-pay-btn:hover:not(:disabled) {
  background: #a02b1a;
  transform: translateY(-2px);
}

.lucy-pay-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.pesapal-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.pesapal-modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
}

[dir="rtl"] .lucy-message.user {
  align-self: flex-start;
  border-bottom-right-radius: 12px;
  border-bottom-left-radius: 4px;
}

[dir="rtl"] .lucy-message.bot {
  align-self: flex-end;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 4px;
}
</style>
`;

// Inject styles if not already present
if (!document.getElementById('lucy-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'lucy-styles';
  styleEl.textContent = lucyStyles;
  document.head.appendChild(styleEl);
}
