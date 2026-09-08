/**
 * LUERI INTERNATIONAL - COMMON JAVASCRIPT
 * Shared utilities, theme management, and payment functions
 */

// =============================================================================
// 1. SUPABASE INITIALIZATION
// =============================================================================

const SUPABASE_URL = 'https://ylifvexqamxwvzvhmwex.supabase.co';
// ⚠️ PASTE YOUR ANON KEY BELOW between the quotes
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

// Initialize Supabase client
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
// 2. SECURE PAYMENT INITIATION FUNCTION
// =============================================================================

async function startMembershipPurchase(planCode) {
    console.log('🔔 Payment initiated for plan:', planCode);
    
    // Get the button
    const button = document.getElementById(`btn-${planCode}`);
    if (!button) {
        console.error(' Button not found:', `btn-${planCode}`);
        alert('Payment button not found. Please refresh the page.');
        return;
    }

    // Disable button to prevent double-clicks
    button.disabled = true;
    const originalText = button.innerText;
    button.innerText = 'Preparing secure payment…';
    button.style.opacity = '0.7';

    try {
        // Check if Supabase is available
        if (!supabase) {
            throw new Error('Payment system not initialized. Please refresh the page.');
        }

        // Check if user is logged in
        console.log('🔍 Checking authentication...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.log('⚠️ User not logged in');
            alert('Please log in or create an account to purchase a membership.');
            button.disabled = false;
            button.innerText = originalText;
            button.style.opacity = '1';
            
            // Optionally redirect to login
            // window.location.href = '/login.html';
            return;
        }

        console.log('✅ User authenticated:', user.id);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            throw new Error('No active session. Please log in again.');
        }

        // Call the Edge Function
        console.log('📡 Calling payment initiation...');
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

        console.log('📥 Response status:', response.status);
        const data = await response.json();
        console.log('📦 Response data:', data);

        // Handle errors
        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        if (data.error) {
            throw new Error(data.error);
        }

        // Success - redirect to Pesapal
        if (data.redirect_url) {
            console.log('✅ Redirecting to:', data.redirect_url);
            button.innerText = 'Redirecting to secure checkout…';
            
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 500);
        } else {
            throw new Error('No redirect URL received from payment server');
        }

    } catch (error) {
        console.error('❌ Payment Error:', error);
        
        // Reset button
        button.disabled = false;
        button.innerText = 'Try Again';
        button.style.opacity = '1';
        
        // Show user-friendly error
        let errorMessage = 'We couldn\'t start your payment. ';
        if (error.message.includes('authentication')) {
            errorMessage += 'Please log in and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection.';
        } else {
            errorMessage += 'Please try again or contact support.';
        }
        
        alert(errorMessage);
        
        // Reset to original text after 3 seconds
        setTimeout(() => {
            button.innerText = originalText;
        }, 3000);
    }
}

// =============================================================================
// 3. UTILITY FUNCTIONS
// =============================================================================

function formatKES(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0
    }).format(amount);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// =============================================================================
// 4. DEBUG HELPERS
// =============================================================================

// Check if page loaded correctly
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Lueri Rewards page loaded');
    console.log(' Supabase available:', !!window.supabase);
    console.log('🔧 Supabase client initialized:', !!supabase);
    
    // Check if buttons exist
    const buttons = ['silver', 'gold', 'platinum', 'vip'];
    buttons.forEach(plan => {
        const btn = document.getElementById(`btn-${plan}`);
        if (btn) {
            console.log(`✅ Button found: ${plan}`);
        } else {
            console.error(`❌ Button missing: ${plan}`);
        }
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { startMembershipPurchase, formatKES, showToast };
}
