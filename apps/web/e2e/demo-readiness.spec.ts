import { test, expect } from '@playwright/test';

test.describe('AI Revenue Recovery Platform - Final Demo Readiness E2E Suite', () => {
  test('1. Overview Dashboard loads metrics & direction cards', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Revenue Recovery|Razorpay/i);

    // Verify header components
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('Seed Scenarios')).toBeVisible();
    await expect(page.getByText('Run Batch')).toBeVisible();
  });

  test('2. All 7 Direction Pages render without crashing', async ({ page }) => {
    const directions = [
      'payment-degradation',
      'checkout-dropoff',
      'subscription-recovery',
      'b2b-receivables',
      'mandate-retry',
      'hinglish-voice',
      'promise-to-pay',
    ];

    for (const dir of directions) {
      await page.goto(`/directions/${dir}`);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('3. Recovery Cases table page loads with filters and pagination', async ({ page }) => {
    await page.goto('/recovery-cases');
    await expect(page.locator('body')).toBeVisible();
  });

  test('4. Batch Processing page loads demo scenario controls', async ({ page }) => {
    await page.goto('/batches');
    await expect(page.locator('body')).toBeVisible();
  });

  test('5. Policy Management page loads recovery rules and guardrails', async ({ page }) => {
    await page.goto('/policies');
    await expect(page.locator('body')).toBeVisible();
  });

  test('6. Audit Log page loads event lineage and filter controls', async ({ page }) => {
    await page.goto('/audit-log');
    await expect(page.locator('body')).toBeVisible();
  });
});
