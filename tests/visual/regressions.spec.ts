import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SAMPLE_PAGES = ['/', '/studio', '/chat'];
const PIXEL_DIFF_RATIO = 0.05;

const waitForStableRender = async (page: any) => {
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
};

for (const route of SAMPLE_PAGES) {
  test(`Visual regression: ${route}`, async ({ page }) => {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await waitForStableRender(page);

    const screenshot = await page.screenshot({ fullPage: false });
    await expect(screenshot).toMatchSnapshot(`visual-${route.replace(/\W+/g, '_')}.png`, {
      maxDiffPixelRatio: PIXEL_DIFF_RATIO,
    });
  });
}

test('Studio page loads and renders the core studio UI', async ({ page }) => {
  await page.goto(`${BASE_URL}/studio`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await waitForStableRender(page);

  await expect(page.locator('text=PARADIGM v2.0')).toBeVisible();
  await expect(page.locator('text=Seed Vault')).toBeVisible();
  await expect(page.locator('text=Type a description in the prompt bar below')).toBeVisible();
  await expect(page.locator('input[placeholder*="compose a character"]')).toBeVisible();
});

test('Landing page loads and contains CTA buttons', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await expect(page.locator('a', { hasText: 'Enter Studio' })).toBeVisible();
  await expect(page.locator('a', { hasText: 'Try Chat' })).toBeVisible();
});
