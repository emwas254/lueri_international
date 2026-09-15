/* Lucy: animated, interactive Lueri support assistant */
(function () {
  'use strict';

  const wa = 'https://wa.link/qk7m3b';
  const CHAT_ENDPOINT = 'https://ylifvexqamxvwzvhmwex.supabase.co/functions/v1/lucy-chat';

  // Lucy brand assets - MUST match the filename in your GitHub assets folder exactly
  const LUCY_AVATAR = 'assets/lucy-avatar.webp';
  const LUCY_AVATAR_SMALL = 'assets/lucy-avatar.webp';

  // Fallback SVG avatar (green gradient with "L") - used if image fails to load
  const LUCY_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="lucyGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1B2620;stop-opacity:1" /><stop offset="100%" style="stop-color:#34503E;stop-opacity:1" /></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#lucyGrad)"/><text x="50" y="68" text-anchor="middle" font-family="system-ui,sans-serif" font-size="55" font-weight="bold" fill="#F0EAD8">L</text></svg>'
  );

  const answers = {
    'Book a delivery': 'I\'d be happy to help! Use "Book a Pickup" or message Lueri on WhatsApp with your pickup, drop-off and parcel details.',
    'Corporate plans': 'Lueri offers Essential (KES 25,000/mo), Professional (KES 45,000/mo) and Elite (KES 75,000/mo) corporate plans, plus custom Enterprise agreements for larger volume. Our team reviews each corporate activation personally.',
    'Service area': 'Lueri delivers across Nairobi and surrounding towns. Send both locations on WhatsApp and we\'ll confirm the route for you.',
    'Opening hours': 'We\'re open Monday–Friday, 8:00 AM–5:00 PM, and Saturday, 8:00 AM–3:00 PM. We\'re closed on Sunday.',
    'Track a delivery': 'For privacy, I can\'t access delivery records or locations. Please message Lueri on WhatsApp for a live update.'
  };

  const style = document.createElement('style');
  style.textContent = `
    .lucy-launch {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 1100;
      border: 0;
      border-radius: 999px;
      padding: 14px 19px;
      background: linear-gradient(135deg, #1B2620, #34503E);
      color: #F0EAD8;
      font: 700 14px system-ui, sans-serif;
      box-shadow: 0 10px 28px #0005;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 9px;
      animation: lucyFloat 3s ease-in-out infinite;
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .lucy-launch:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 14px 32px #0006;
    }

    .lucy-launch .lucy-avatar {
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      display: block;
      border-radius: 50%;
      object-fit: cover;
      object-position: center;
      background: #F0EAD8;
      border: 1px solid #F0EAD8;
      box-shadow: 0 2px 8px #0003;
    }

    @keyframes lucyFloat {
      50% {
        transform: translateY(-5px);
      }
    }

    .lucy-panel {
      position: fixed;
      right: 22px;
      bottom: 84px;
      z-index: 1100;
      width: min(375px, calc(100vw - 32px));
      overflow: hidden;
      border-radius: 18px;
      background: #F8F4E9;
      color: #1B2620;
      box-shadow: 0 20px 50px #0005;
      transform-origin: bottom right;
      animation: lucyOpen .28s ease both;
    }

    .lucy-panel[hidden] {
      display: none;
    }

    @keyframes lucyOpen {
      from {
        opacity: 0;
        transform: translateY(18px) scale(.92);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .lucy-header {
      padding: 17px 18px;
      color: #F8F4E9;
      background: linear-gradient(135deg, #1B2620, #34503E);
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .lucy-header-avatar {
      width: 46px;
      height: 46px;
      flex: 0 0 46px;
      border-radius: 50%;
      display: block;
      object-fit: cover;
      object-position: center;
      background: #F0EAD8;
      border: 2px solid #F0EAD8;
      box-shadow: inset 0 0 0 1px #ffffff55, 0 3px 10px #0003;
    }

    .lucy-header h2 {
      margin: 0;
      font: 700 17px system-ui, sans-serif;
    }

    .lucy-status {
      margin: 2px 0 0;
      font: 12px system-ui, sans-serif;
      color: #cfe6d3;
    }

    .lucy-status::before {
      content: '●';
      color: #79db8a;
      margin-right: 5px;
    }

    .lucy-body {
      padding: 16px;
      max-height: 55vh;
      overflow-y: auto;
    }

    .lucy-message {
      max-width: 88%;
      padding: 11px 13px;
      margin: 0 0 12px;
      border-radius: 4px 15px 15px 15px;
      line-height: 1.45;
      font: 14px/1.45 system-ui, sans-serif;
      background: #e7ede5;
      animation: lucyMessage .25s ease both;
    }

    .lucy-message.user {
      margin-left: auto;
      border-radius: 15px 4px 15px 15px;
      color: #fff;
      background: #B8321F;
    }

    @keyframes lucyMessage {
      from {
        opacity: 0;
        transform: translateY(7px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .lucy-options {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin: 14px 0;
    }

    .lucy-options button {
      border: 1px solid #34503E;
      border-radius: 999px;
      padding: 8px 11px;
      background: transparent;
      color: #1B2620;
      cursor: pointer;
      font: 600 12px system-ui, sans-serif;
      transition: .18s ease;
    }

    .lucy-options button:hover {
      background: #34503E;
      color: #fff;
      transform: translateY(-1px);
    }

    .lucy-typing {
      display: none;
      padding: 10px 13px;
      width: fit-content;
      border-radius: 14px;
      background: #e7ede5;
    }

    .lucy-typing.show {
      display: block;
    }

    .lucy-typing span {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin: 0 2px;
      border-radius: 50%;
      background: #567060;
      animation: lucyTyping 1s infinite;
    }

    .lucy-typing span:nth-child(2) {
      animation-delay: .15s;
    }

    .lucy-typing span:nth-child(3) {
      animation-delay: .3s;
    }

    @keyframes lucyTyping {
      50% {
        opacity: .3;
        transform: translateY(-3px);
      }
    }

    .lucy-footer {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #ddd6c5;
    }

    .lucy-footer input {
      min-width: 0;
      flex: 1;
      padding: 11px 12px;
      border: 1px solid #c8c0ae;
      border-radius: 999px;
      outline: none;
      font: 14px system-ui, sans-serif;
    }

    .lucy-footer input:focus {
      border-color: #34503E;
      box-shadow: 0 0 0 3px #34503e22;
    }

    .lucy-send {
      border: 0;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      background: #1B2620;
      color: #fff;
      cursor: pointer;
      font-size: 17px;
    }

    .lucy-send:disabled {
      opacity: .5;
      cursor: default;
    }

    .lucy-whatsapp {
      display: block;
      margin: 0 12px 13px;
      padding: 10px;
      text-align: center;
      border-radius: 999px;
      background: #25D366;
      color: #fff;
      text-decoration: none;
      font: 700 13px system-ui, sans-serif;
    }
  `;

  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.className = 'lucy-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Lucy support chat');

  panel.innerHTML = `
    <div class="lucy-header">
      <img class="lucy-header-avatar" src="${LUCY_AVATAR}" alt="Lucy — Lueri Digital Assistant" width="46" height="46" />
      <div>
        <h2>Lucy</h2>
        <p class="lucy-status">Online and ready to help</p>
      </div>
    </div>

    <div class="lucy-body">
      <div class="lucy-message">
        Hi, I'm Lucy! ✨ I can help with Lueri deliveries, business plans,
        service areas, and more. What would you like to know?
      </div>

      <div class="lucy-options"></div>

      <div class="lucy-typing" aria-label="Lucy is typing">
        <span></span><span></span><span></span>
      </div>
    </div>

    <div class="lucy-footer">
      <input
        type="text"
        maxlength="500"
        placeholder="Type your question…"
        aria-label="Ask Lucy"
      >
      <button class="lucy-send" type="button" aria-label="Send message">➤</button>
    </div>

    <a
      class="lucy-whatsapp"
      href="${wa}"
      target="_blank"
      rel="noopener noreferrer"
    >
      Chat with Lueri on WhatsApp
    </a>
  `;

  const body = panel.querySelector('.lucy-body');
  const options = panel.querySelector('.lucy-options');
  const input = panel.querySelector('input');
  const send = panel.querySelector('.lucy-send');
  const typing = panel.querySelector('.lucy-typing');

  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  function addMessage(text, isUser) {
    const message = document.createElement('div');
    message.className = `lucy-message${isUser ? ' user' : ''}`;
    message.textContent = text;
    body.insertBefore(message, typing);
    scrollToBottom();
  }

  function respond(text) {
    typing.classList.add('show');
    scrollToBottom();

    setTimeout(() => {
      typing.classList.remove('show');
      addMessage(text, false);
    }, 700);
  }

  Object.keys(answers).forEach((topic) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = topic;

    button.addEventListener('click', () => {
      addMessage(topic, true);
      respond(answers[topic]);
    });

    options.appendChild(button);
  });

  const RATE_LIMIT_MS = 6000;
  const MAX_FAILURES = 3;
  let lastCall = 0;
  let failures = 0;
  let llmDisabled = false;

  async function askLucy() {
    const question = input.value.trim();
    if (!question) return;

    if (llmDisabled) {
      addMessage(question, true);
      input.value = '';
      respond('I\'m resting for now — please chat with Lueri directly on WhatsApp.');
      return;
    }
    const now = Date.now();
    if (now - lastCall < RATE_LIMIT_MS) {
      addMessage(question, true);
      input.value = '';
      respond('One moment — or pick a topic above for an instant answer.');
      return;
    }
    lastCall = now;

    addMessage(question, true);
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    typing.classList.add('show');
    scrollToBottom();

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: question
        })
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();

      typing.classList.remove('show');

      addMessage(
        data.reply ||
        'I\'m not certain about that. Please chat with Lueri on WhatsApp for help.',
        false
      );
      failures = 0;
    } catch (error) {
      typing.classList.remove('show');
      failures++;
      if (failures >= MAX_FAILURES) llmDisabled = true;

      addMessage(
        'I\'m temporarily offline. Please chat with Lueri on WhatsApp and the team will assist you.',
        false
      );
    } finally {
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  }

  send.addEventListener('click', askLucy);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      askLucy();
    }
  });

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'lucy-launch';
  launch.innerHTML = `
    <img
      class="lucy-avatar"
      src="${LUCY_AVATAR_SMALL}"
      alt="Lucy — Lueri Digital Assistant"
      width="30"
      height="30"
    />
    <span>Chat with Lucy</span>
  `;
  launch.setAttribute('aria-expanded', 'false');

  launch.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    launch.setAttribute('aria-expanded', String(!panel.hidden));

    if (!panel.hidden) {
      input.focus();
    }
  });

  document.body.append(panel, launch);

  // === FALLBACK SYSTEM: If images fail to load, use SVG fallback ===
  setTimeout(() => {
    document.querySelectorAll('.lucy-header-avatar, .lucy-avatar').forEach(img => {
      if (img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
        img.src = LUCY_FALLBACK;
      }
      img.addEventListener('error', function() {
        this.src = LUCY_FALLBACK;
      });
    });
  }, 100);
})();
