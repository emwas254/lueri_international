/**
 * LUERI INTERNATIONAL - COMMON JAVASCRIPT
 * Shared utilities, theme management, and payment functions
 */

// =============================================================================
// 1. SUPABASE INITIALIZATION
// =============================================================================

// IMPORTANT: Replace with your actual Supabase project details
const SUPABASE_URL = 'https://ylifvexqamxwvzvhmwex.supabase.co';

//  PASTE YOUR ANON KEY BETWEEN THE QUOTES BELOW 
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaWZ2ZXhxYW14dnd6dmhtd2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODY0NTEsImV4cCI6MjEwMzc2MjQ1MX0.BqQ2vht0GOO3nlpYMdaTIz4q63XuzRH86N5L9QNaDKw;

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================================================
// 2. THEME MANAGEMENT
// =============================================================================

/**
 * Initialize theme on page load
 * Checks localStorage for saved preference, defaults to system preference
 */
function lueriBootTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', initialTheme);
    localStorage.setItem('theme', initialTheme);
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Run theme boot on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lueriBootTheme);
} else {
    lueriBootTheme();
}

// =============================================================================
// 3. AUTHENTICATION HELPERS
// =============================================================================

/**
 * Check if user is logged in
 */
async function isLoggedIn() {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
}

/**
 * Get current user
 */
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// =============================================================================
// 4. SECURE PAYMENT INITIATION
// =============================================================================

/**
 * LUERI SECURE PAYMENT INITIATION
 * Connects to the pesapal-initiate Edge Function.
 * Enforces server-side pricing and handles UI states.
 */
async function startMembershipPurchase(planCode) {
    // 1. Get the button to manage UI states
    const button = document.getElementById(`btn-${planCode}`);
    if (!button) {
        console.error(`Button btn-${planCode} not found`);
        return;
    }

    // 2. Prevent double clicks
    button.disabled = true;
    const originalText = button.innerText;
    button.innerText = 'Preparing secure payment…';
    button.style.opacity = '0.7';

    try {
        // 3. Verify user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            alert('Please log in or create an account to purchase a membership.');
            // Reset button
            button.disabled = false;
            button.innerText = originalText;
            button.style.opacity = '1';
            return;
        }

        // 4. Get current session for authorization
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            throw new Error('No active session. Please log in again.');
        }

        // 5. Call the secure Edge Function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/pesapal-initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                member_id: user.id,
                plan_code: planCode // e.g., 'silver', 'gold', 'platinum', 'vip'
            })
        });

        const data = await response.json();

        // 6. Handle Errors from Edge Function
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Payment initiation failed');
        }

        // 7. Success - Redirect to Pesapal
        button.innerText = 'Redirecting to secure checkout…';
        
        if (data.redirect_url) {
            // Small delay to let the user read the text
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 800);
        } else {
            throw new Error('No redirect URL received from server');
        }

    } catch (error) {
        console.error('Lueri Payment Error:', error);
        
        // Reset button and show friendly error
        button.disabled = false;
        button.innerText = 'Try Again';
        button.style.opacity = '1';
        
        alert('We couldn\'t start your payment. Please try again or contact Lueri International for assistance.');
    }
}

// =============================================================================
// 5. UTILITY FUNCTIONS
// =============================================================================

/**
 * Format currency in KES
 */
function formatKES(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * Show loading state on button
 */
function setLoading(button, isLoading, originalText) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerText;
        button.innerText = 'Loading…';
        button.style.opacity = '0.7';
    } else {
        button.disabled = false;
        button.innerText = button.dataset.originalText || originalText;
        button.style.opacity = '1';
    }
}

/**
 * Show toast notification
 */
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
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =============================================================================
// 6. EVENT LISTENERS
// =============================================================================

// Add theme toggle listener if button exists
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        lueriBootTheme,
        toggleTheme,
        isLoggedIn,
        getCurrentUser,
        startMembershipPurchase,
        formatKES,
        setLoading,
        showToast
    };
}
