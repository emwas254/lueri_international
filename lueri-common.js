/**
 * LUERI INTERNATIONAL - COMMON JAVASCRIPT
 * Shared utilities, theme management, and payment functions
 */

// =============================================================================
// 1. SUPABASE INITIALIZATION
// =============================================================================

const SUPABASE_URL = 'https://ylifvexqamxwvzvhmwex.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaWZ2ZXhxYW14dnd6dmhtd2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODY0NTEsImV4cCI6MjEwMzc2MjQ1MX0.BqQ2vht0GOO3nlpYMdaTIz4q63XuzRH86N5L9QNaDKw';

let supabase;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized successfully');
    } else {
        console.error('❌ Supabase library not loaded!');
    }
} catch (error) {
    console.error('❌ Error initializing Supabase:', error);
}

// =============================================================================
// 2. THEME BOOT
// =============================================================================

function lueriBootTheme() {
    const saved = localStorage.getItem('theme');
    const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

// =============================================================================
// 3. PHONE VALIDATION & NORMALIZATION
// =============================================================================

function lueriIsValidPhone(phone) {
    const p = String(phone || '').trim().replace(/\s+/g, '');
    return /^(?:\+254|254|0)(7|1)\d{8}$/.test(p);
}

function lueriNormalizePhone(phone) {
    const p = String(phone || '').trim().replace(/\s+/g, '');
    if (/^0(7|1)\d{8}$/.test(p)) return '254' + p.slice(1);
    if (/^\+254(7|1)\d{8}$/.test(p)) return p.slice(1);
    if (/^254(7|1)\d{8}$/.test(p)) return p;
    return null;
}

// =============================================================================
// 4. WHATSAPP OPEN HELPER
// =============================================================================

function lueriOpenWhatsApp(number, message) {
    const cleanNumber = String(number || '').replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return { opened: !!win, url };
}

// =============================================================================
// 5. UTILITY FUNCTIONS
// =============================================================================

function formatKES(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency', currency: 'KES', minimumFractionDigits: 0
    }).format(amount);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 24px;
        background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'};
        color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// =============================================================================
// 6. CHECKOUT MODAL — in-page Pesapal checkout with live status polling.
//
// Why polling instead of trusting the iframe's post-payment redirect:
// Pesapal's own developer forum documents that the automatic redirect to
// your callback URL does not reliably fire inside an iframe — the
// customer sometimes has to click a manual "continue" link. Rather than
// depend on that, this modal polls get_payment_status() (a narrow,
// token-gated RPC) every 3 seconds. The moment pesapal-ipn's webhook
// confirms payment server-side, the modal shows success — completely
// independent of whether the iframe's own redirect ever fires.
// =============================================================================

let _lueriCheckoutPoll = null;
let _lueriCheckoutAttempts = 0;
const LUERI_CHECKOUT_MAX_ATTEMPTS = 200; // ~10 minutes at 3s intervals

function _lueriInjectCheckoutStyles() {
    if (document.getElementById('lueri-checkout-styles')) return;
    const style = document.createElement('style');
    style.id = 'lueri-checkout-styles';
    style.textContent = `
        .lueri-checkout-backdrop{position:fixed;inset:0;background:rgba(27,38,32,0.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .25s ease;}
        .lueri-checkout-backdrop.open{opacity:1;}
        .lueri-checkout-card{background:var(--paper,#F0EAD8);color:var(--ink,#1B2620);border-radius:10px;width:min(480px,100%);max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.35);transform:scale(.92) translateY(12px);transition:transform .3s cubic-bezier(0.16,1,0.3,1);}
        .lueri-checkout-backdrop.open .lueri-checkout-card{transform:scale(1) translateY(0);}
        .lueri-checkout-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--line,rgba(27,38,32,0.16));}
        .lueri-checkout-head h3{font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:.02em;font-size:1.1rem;margin:0;}
        .lueri-checkout-close{background:none;border:none;font-size:1.4rem;line-height:1;cursor:pointer;color:var(--slate,#4A5A52);padding:4px 8px;border-radius:4px;}
        .lueri-checkout-close:hover{color:var(--route,#B8321F);}
        .lueri-checkout-body{padding:24px;}
        .lueri-checkout-status{display:flex;align-items:center;gap:10px;font-family:'IBM Plex Mono',monospace;font-size:.78rem;letter-spacing:.03em;color:var(--slate,#4A5A52);margin-bottom:16px;padding:10px 14px;background:var(--paper-dim,#e6dfc9);border-radius:6px;}
        .lueri-checkout-dot{width:8px;height:8px;border-radius:50%;background:#E8B93D;flex-shrink:0;animation:lueriPulse 1.4s ease-in-out infinite;}
        .lueri-checkout-status.success .lueri-checkout-dot{background:#2e7d32;animation:none;}
        .lueri-checkout-status.failed .lueri-checkout-dot{background:#c62828;animation:none;}
        @keyframes lueriPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(0.7);}}
        .lueri-checkout-frame-wrap{position:relative;border:1px solid var(--line,rgba(27,38,32,0.16));border-radius:8px;overflow:hidden;background:#fff;}
        .lueri-checkout-frame-wrap iframe{width:100%;height:480px;border:0;display:block;}
        .lueri-checkout-fallback{display:none;text-align:center;padding:14px;font-size:.85rem;}
        .lueri-checkout-fallback.show{display:block;}
        .lueri-checkout-fallback a{color:var(--route,#B8321F);font-weight:600;text-decoration:underline;}
        .lueri-checkout-manual{display:block;width:100%;text-align:center;margin-top:14px;background:none;border:1px dashed var(--line,rgba(27,38,32,0.16));border-radius:6px;padding:10px;font-size:.82rem;color:var(--slate,#4A5A52);cursor:pointer;font-family:'IBM Plex Sans',sans-serif;}
        .lueri-checkout-manual:hover{border-color:var(--route,#B8321F);color:var(--route,#B8321F);}
        .lueri-checkout-result{text-align:center;padding:16px 0 8px;}
        .lueri-checkout-icon{width:72px;height:72px;margin:0 auto 20px;}
        .lueri-checkout-icon circle{stroke-dasharray:166;stroke-dashoffset:166;animation:lueriDrawCircle .5s ease forwards;}
        .lueri-checkout-icon path{stroke-dasharray:48;stroke-dashoffset:48;animation:lueriDrawCheck .35s .4s ease forwards;}
        @keyframes lueriDrawCircle{to{stroke-dashoffset:0;}}
        @keyframes lueriDrawCheck{to{stroke-dashoffset:0;}}
        .lueri-checkout-result h2{font-family:'Oswald',sans-serif;text-transform:uppercase;font-size:1.5rem;margin:0 0 8px;}
        .lueri-checkout-result p{color:var(--slate,#4A5A52);line-height:1.6;margin:0 0 6px;}
        .lueri-checkout-amount{font-family:'IBM Plex Mono',monospace;font-size:1.3rem;font-weight:600;margin:12px 0;}
        .lueri-checkout-btn{display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:12px 28px;border-radius:4px;font-weight:700;font-size:.85rem;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;border:none;font-family:'IBM Plex Sans',sans-serif;}
        .lueri-checkout-btn.primary{background:var(--route,#B8321F);color:#fff;}
        .lueri-checkout-btn.ghost{background:transparent;border:2px solid var(--ink,#1B2620);color:var(--ink,#1B2620);}
    `;
    document.head.appendChild(style);
}

function _lueriCloseCheckout() {
    if (_lueriCheckoutPoll) { clearInterval(_lueriCheckoutPoll); _lueriCheckoutPoll = null; }
    const backdrop = document.getElementById('lueri-checkout-backdrop');
    if (backdrop) { backdrop.classList.remove('open'); setTimeout(() => backdrop.remove(), 250); }
}

function _lueriRenderCheckoutShell(planDisplayName) {
    _lueriInjectCheckoutStyles();
    const backdrop = document.createElement('div');
    backdrop.className = 'lueri-checkout-backdrop';
    backdrop.id = 'lueri-checkout-backdrop';
    backdrop.innerHTML = `
        <div class="lueri-checkout-card" role="dialog" aria-modal="true" aria-labelledby="lueriCheckoutTitle">
            <div class="lueri-checkout-head">
                <h3 id="lueriCheckoutTitle"></h3>
                <button type="button" class="lueri-checkout-close" aria-label="Close">&times;</button>
            </div>
            <div class="lueri-checkout-body" id="lueriCheckoutBody"></div>
        </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('h3').textContent = `${planDisplayName} membership`;
    backdrop.querySelector('.lueri-checkout-close').addEventListener('click', _lueriCloseCheckout);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) _lueriCloseCheckout(); });
    requestAnimationFrame(() => backdrop.classList.add('open'));
    return backdrop;
}

function _lueriRenderCheckoutFrame(body, redirectUrl) {
    body.innerHTML = `
        <div class="lueri-checkout-status" id="lueriCheckoutStatus">
            <span class="lueri-checkout-dot"></span>
            <span id="lueriCheckoutStatusText">Waiting for payment confirmation…</span>
        </div>
        <div class="lueri-checkout-frame-wrap">
            <iframe id="lueriCheckoutIframe" title="Secure Pesapal checkout"></iframe>
        </div>
        <p class="lueri-checkout-fallback" id="lueriCheckoutFallback">
            Checkout not loading? <a id="lueriCheckoutOpenNewTab" href="#" target="_blank" rel="noopener noreferrer">Open it in a new tab</a> — we'll keep watching for your payment here.
        </p>
        <button type="button" class="lueri-checkout-manual" id="lueriCheckoutManualCheck">Already paid? Check now</button>
    `;
    const iframe = body.querySelector('#lueriCheckoutIframe');
    iframe.src = redirectUrl;
    body.querySelector('#lueriCheckoutOpenNewTab').href = redirectUrl;

    let loaded = false;
    iframe.addEventListener('load', () => { loaded = true; });
    setTimeout(() => {
        if (!loaded) body.querySelector('#lueriCheckoutFallback').classList.add('show');
    }, 4000);
}

function _lueriRenderCheckoutResult(body, { success, planDisplayName, amount, message }) {
    const iconSuccess = `<svg class="lueri-checkout-icon" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="24" stroke="#2e7d32" stroke-width="3"/><path stroke="#2e7d32" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" d="M16 27l7 7 13-15"/></svg>`;
    const iconFail = `<svg class="lueri-checkout-icon" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="24" stroke="#c62828" stroke-width="3"/><path stroke="#c62828" stroke-width="3.5" stroke-linecap="round" d="M18 18l16 16M34 18L18 34"/></svg>`;
    body.innerHTML = `
        <div class="lueri-checkout-result">
            ${success ? iconSuccess : iconFail}
            <h2 id="lueriResultTitle"></h2>
            <p id="lueriResultBody"></p>
            ${success ? '<div class="lueri-checkout-amount" id="lueriResultAmount"></div><p>A receipt has been sent to your email.</p>' : ''}
            <div>
                ${success
                    ? '<button type="button" class="lueri-checkout-btn primary" id="lueriResultClose">Done</button>'
                    : '<a class="lueri-checkout-btn primary" href="https://wa.link/qk7m3b" target="_blank" rel="noopener noreferrer">WhatsApp Lueri</a> <button type="button" class="lueri-checkout-btn ghost" id="lueriResultClose">Close</button>'
                }
            </div>
        </div>`;
    body.querySelector('#lueriResultTitle').textContent = success ? 'Congratulations!' : 'Payment not completed';
    body.querySelector('#lueriResultBody').textContent = success
        ? `You're now a ${planDisplayName} member with Lueri International.`
        : (message || "We couldn't confirm your payment. Nothing was charged if it truly failed — if you were debited, please contact us.");
    if (success) body.querySelector('#lueriResultAmount').textContent = formatKES(amount);
    body.querySelector('#lueriResultClose').addEventListener('click', _lueriCloseCheckout);
}

async function _lueriPollPaymentStatus(paymentId, internalReference, planDisplayName, backdrop) {
    _lueriCheckoutAttempts++;
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_payment_status', {
        p_payment_id: paymentId,
        p_reference: internalReference
    });
    if (error) { console.error('get_payment_status error', error); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;

    const statusEl = document.getElementById('lueriCheckoutStatus');
    const statusText = document.getElementById('lueriCheckoutStatusText');

    if (row.status === 'successful') {
        clearInterval(_lueriCheckoutPoll); _lueriCheckoutPoll = null;
        const body = document.getElementById('lueriCheckoutBody');
        _lueriRenderCheckoutResult(body, { success: true, planDisplayName, amount: row.amount });
    } else if (row.status === 'failed' || row.status === 'cancelled') {
        clearInterval(_lueriCheckoutPoll); _lueriCheckoutPoll = null;
        const body = document.getElementById('lueriCheckoutBody');
        _lueriRenderCheckoutResult(body, { success: false, planDisplayName, message: row.status === 'cancelled' ? 'You cancelled the payment.' : 'Your payment could not be confirmed.' });
    } else if (statusText) {
        if (statusEl) statusEl.className = 'lueri-checkout-status';
    }

    if (_lueriCheckoutAttempts >= LUERI_CHECKOUT_MAX_ATTEMPTS && _lueriCheckoutPoll) {
        clearInterval(_lueriCheckoutPoll); _lueriCheckoutPoll = null;
        const body = document.getElementById('lueriCheckoutBody');
        _lueriRenderCheckoutResult(body, { success: false, planDisplayName, message: "This is taking longer than expected. If you completed payment, it may still confirm shortly — otherwise please contact us." });
    }
}

async function startMembershipPurchase(planCode) {
    const button = document.getElementById(`btn-${planCode}`);
    if (button) {
        button.disabled = true;
        var originalText = button.innerText;
        button.innerText = 'Preparing secure payment…';
        button.style.opacity = '0.7';
    }

    const resetButton = () => { if (button) { button.disabled = false; button.innerText = originalText; button.style.opacity = '1'; } };

    try {
        if (!supabase) throw new Error('Payment system not initialized. Please refresh the page.');

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            alert('Please log in or create an account to purchase a membership.');
            resetButton();
            return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('No active session. Please log in again.');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/pesapal-initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ member_id: user.id, plan_code: planCode })
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || `Server error: ${response.status}`);
        if (!data.redirect_url || !data.payment_id) throw new Error('No checkout URL received from payment server');

        resetButton();

        const backdrop = _lueriRenderCheckoutShell(data.plan_display_name || planCode);
        const body = document.getElementById('lueriCheckoutBody');
        _lueriRenderCheckoutFrame(body, data.redirect_url);

        _lueriCheckoutAttempts = 0;
        _lueriCheckoutPoll = setInterval(
            () => _lueriPollPaymentStatus(data.payment_id, data.internal_reference, data.plan_display_name || planCode, backdrop),
            3000
        );

        document.addEventListener('click', function manualCheckHandler(e) {
            if (e.target && e.target.id === 'lueriCheckoutManualCheck') {
                _lueriPollPaymentStatus(data.payment_id, data.internal_reference, data.plan_display_name || planCode, backdrop);
            }
        });

    } catch (error) {
        console.error('❌ Payment Error:', error);
        resetButton();
        let errorMessage = 'We couldn\'t start your payment. ';
        if (error.message.includes('authentication')) errorMessage += 'Please log in and try again.';
        else if (error.message.includes('network') || error.message.includes('fetch')) errorMessage += 'Please check your internet connection.';
        else errorMessage += 'Please try again or contact support.';
        alert(errorMessage);
    }
}
