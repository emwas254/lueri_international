// Add to rewards.html / rewards-cloud.js — replaces the "Pay for membership" button handler.
// This is the ONLY Pesapal-related code that runs in the browser. No keys here.

async function payForMembership({ phoneNumber, email, fullName, amountKES, planCode }) {
  const res = await fetch(
    "https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/pesapal-initiate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer <YOUR-SUPABASE-ANON-KEY>`, // safe to expose, same key rewards-cloud.js already uses
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        email,
        full_name: fullName,
        amount: amountKES,
        plan_code: planCode, // e.g. "silver", "gold" — whatever your plan codes are
      }),
    },
  );

  const data = await res.json();
  if (!data.redirect_url) {
    alert("Could not start payment. Please try again or contact support@lueriinternational.com");
    return;
  }

  window.location.href = data.redirect_url; // hands off to Pesapal's hosted checkout
}
