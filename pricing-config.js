/* Lueri published pricing configuration.
 * Values are unchanged from the current published/configured rates; this file centralizes
 * browser-side copy only. Backend quote calculations remain authoritative.
 */
(function (root) {
  'use strict';
  root.LUERI_PRICING = Object.freeze({
    currency: 'KES',
    delivery: Object.freeze({
      standard: 350,
      express: 800,
      documents: 400,
      errandsFrom: 600
    }),
    corporate: Object.freeze({
      goldMonthly: 25000,
      goldOverage: 600,
      platinumMonthly: 45000,
      platinumOverage: 550,
      vipMonthly: 75000,
      vipOverage: 500
    }),
    rewards: Object.freeze({
      bronzePurchase: null,
      silverPurchase: 5000,
      goldPurchase: 15000,
      platinumPurchase: 35000,
      vipPurchase: 75000
    })
  });
})(window);
