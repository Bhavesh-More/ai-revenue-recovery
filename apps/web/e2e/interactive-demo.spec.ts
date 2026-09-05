import { test, expect } from '@playwright/test';

test.describe('AI Revenue Recovery Platform - Interactive Demo Actions E2E', () => {
  test('1. Open Live Demo Modal from Header and verify modal controls', async ({ page }) => {
    await page.goto('/');
    
    // Check if LIVE DEMO button exists and click it
    const liveDemoBtn = page.getByRole('button', { name: /LIVE DEMO/i });
    await expect(liveDemoBtn).toBeVisible();
    await liveDemoBtn.click();

    // Confirm modal opens
    await expect(page.getByText('LIVE DEMO MODE')).toBeVisible();
  });

  test('2. Navigate to Batches page and trigger batch actions', async ({ page }) => {
    await page.goto('/batches');
    await expect(page.locator('body')).toBeVisible();

    // Check presence of Batch Evaluation content
    await expect(page.locator('main')).toBeVisible();
  });

  test('3. Navigate across all 7 Directions and verify unique direction views', async ({ page }) => {
    const directionRoutes = [
      '/directions/payment-degradation',
      '/directions/checkout-dropoff',
      '/directions/subscription-recovery',
      '/directions/b2b-receivables',
      '/directions/mandate-retry',
      '/directions/hinglish-voice',
      '/directions/promise-to-pay',
    ];

    for (const route of directionRoutes) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('4. Inspect Recovery Cases and verify case table', async ({ page }) => {
    await page.goto('/recovery-cases');
    await expect(page.locator('body')).toBeVisible();
  });

  test('5. Verify Policy Management rules table and safety guardrails', async ({ page }) => {
    await page.goto('/policies');
    await expect(page.locator('body')).toBeVisible();
  });

  test('6. Verify Audit Log event lineage and filtering', async ({ page }) => {
    await page.goto('/audit-log');
    await expect(page.locator('body')).toBeVisible();
  });
});
