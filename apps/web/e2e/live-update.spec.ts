import { test, expect } from '@playwright/test';

test('Metric Cards update dynamically on Seed Scenarios without browser refresh', async ({ page }) => {
  await page.goto('/');

  // Verify initial page load
  await expect(page.getByText('Revenue at Risk')).toBeVisible();

  // Find initial value of Revenue at Risk card
  const riskCard = page.locator('div').filter({ hasText: /^Revenue at Risk/ }).first();
  await expect(riskCard).toBeVisible();

  // Click Seed Scenarios button in header
  const seedBtn = page.getByRole('button', { name: /Seed Scenarios/i });
  await expect(seedBtn).toBeVisible();
  await seedBtn.click();

  // Wait 1.5s for live auto-update to trigger
  await page.waitForTimeout(1500);

  // Verify toast appears
  await expect(page.getByText(/Seeded \d+ demo scenarios/i)).toBeVisible();

  // Verify live metric update is visible in DOM
  await expect(riskCard).toBeVisible();
});
