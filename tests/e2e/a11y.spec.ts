/**
 * E2E Tests — Accessibility (WCAG 2.2 AAA)
 *
 * Scans all flagship surfaces with @axe-core/playwright for automated
 * accessibility violation detection. Each test loads a page, waits for
 * the content to settle, then runs axe analysis.
 *
 * WCAG 2.2 AAA gates:
 *   wcag2a, wcag2aa, wcag2aaa, wcag21a, wcag21aa, wcag21aaa, wcag22aa, wcag22aaa
 */
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const WCAG_AAA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag2aaa',
  'wcag21a',
  'wcag21aa',
  'wcag21aaa',
  'wcag22aa',
  'wcag22aaa',
  'best-practice',
];

async function assertNoAxeViolations(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  // Wait for the page to finish rendering (hydration, data fetches, etc.)
  await page.waitForTimeout(2000);

  const results = await new AxeBuilder({ page })
    .withTags(WCAG_AAA_TAGS)
    .analyze();

  expect(results.violations, `${url} — ${results.violations.length} WCAG violations found`).toEqual([]);
}

test.describe('Accessibility — WCAG 2.2 AAA', () => {
  test('root (3-pane studio) has zero WCAG violations', async ({ page }) => {
    await assertNoAxeViolations(page, '/');
  });

  test('health page has zero WCAG violations', async ({ page }) => {
    await assertNoAxeViolations(page, '/health');
  });

  test('substrate page has zero WCAG violations', async ({ page }) => {
    await assertNoAxeViolations(page, '/substrate');
  });

  test('OS shell has zero WCAG violations', async ({ page }) => {
    await assertNoAxeViolations(page, '/os');
  });

  test('public site has zero WCAG violations', async ({ page }) => {
    await assertNoAxeViolations(page, '/public');
  });
});
