import { test, expect } from '@playwright/test';

test('delivery checkout renders payment instructions for a valid reference', async ({ page }) => {
  const reference = 'LR-DEL-1234567890-AbCd1234';

  await page.route('**/functions/v1/ncba-payment-status?reference=*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        paid: false,
        amount: 350,
        reference,
      }),
    });
  });

  await page.goto(`/delivery-checkout.html?reference=${reference}`);

  await expect(page.getByText('Amount due')).toBeVisible();
  await expect(page.getByText('KES 350')).toBeVisible();
  await expect(page.getByText('880100')).toBeVisible();
  await expect(page.getByText('PAYLUERIINT')).toBeVisible();
  await expect(page.getByText('How to pay')).toBeVisible();
  await expect(page.getByText(reference)).toBeVisible();
});
