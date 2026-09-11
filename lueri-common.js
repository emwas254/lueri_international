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
// 2. THEME BOOT (prevents flash of wrong theme before paint)
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
// 5. SECURE PAYMENT INITIATION FUNCTION
// =============================================================================

async function startMembershipPurchase(planCode) {
    const button = document.getElementById(`btn-${planCode}`);
    if (!button) {
        alert('Payment button not found. Please refresh the page.');
        return;
    }

    button.disabled = true;
    const originalText = button.innerText;
    button.innerText = 'Preparing secure payment…';
    button.style.opacity = '0.7';

    try {
        if (!supabase) {
            throw new Error('Payment system not initialized. Please refresh the page.');
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            alert('Please log in or create an account to purchase a membership.');
            button.disabled = false;
            button.innerText = originalText;
            button.style.opacity = '1';
            return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            throw new Error('No active session. Please log in again.');
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/pesapal-initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                member_id: user.id,
                plan_code: planCode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }
        if (data.error) {
            throw new Error(data.error);
        }

        if (data.redirect_url) {
            button.innerText = 'Redirecting to secure checkout…';
            setTimeout(() => { window.location.href = data.redirect_url; }, 500);
        } else {
            throw new Error('No redirect URL received from payment server');
        }

    } catch (error) {
        console.error('❌ Payment Error:', error);
        button.disabled = false;
        button.innerText = 'Try Again';
        button.style.opacity = '1';

        let errorMessage = 'We couldn\'t start your payment. ';
        if (error.message.includes('authentication')) {
            errorMessage += 'Please log in and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection.';
        } else {
            errorMessage += 'Please try again or contact support.';
        }
        alert(errorMessage);
        setTimeout(() => { button.innerText = originalText; }, 3000);
    }
}

// =============================================================================
// 6. UTILITY FUNCTIONS
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
