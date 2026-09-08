/**
 * LUERI SECURE PAYMENT INITIATION
 * Connects to the pesapal-initiate Edge Function.
 * Enforces server-side pricing and handles UI states.
 */
async function startMembershipPurchase(planCode) {
    // 1. Get the button to manage UI states
    const button = document.getElementById(`btn-${planCode}`);
    if (!button) return;

    // 2. Prevent double clicks
    button.disabled = true;
    const originalText = button.innerText;
    button.innerText = 'Preparing secure payment…';
    button.style.opacity = '0.7';

    try {
        // 3. Verify user is logged in (Adjust this based on your actual Supabase auth setup)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            alert('Please log in or create an account to purchase a membership.');
            // Reset button
            button.disabled = false;
            button.innerText = originalText;
            button.style.opacity = '1';
            return; // Stop here
        }

        // 4. Call the secure Edge Function
        // Note: Ensure your Supabase client is initialized as 'supabase' in your file
        const response = await fetch('/functions/v1/pesapal-initiate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
            },
            body: JSON.stringify({
                member_id: user.id,
                plan_code: planCode // e.g., 'silver', 'gold'
            })
        });

        const data = await response.json();

        // 5. Handle Errors from Edge Function
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Payment initiation failed');
        }

        // 6. Success - Redirect to Pesapal
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
