import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TS = Date.now();
const USERNAME = `e2e_${TS}`;
const PASSWORD = 'E2eTestPw123!';

test.describe('Paradigm Full User Journey', () => {

  test('Landing page loads with all sections', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByTestId('landing-nav')).toBeVisible();
    await expect(page.getByTestId('hero-section')).toBeVisible();
    await expect(page.locator('text=PARADIGM')).toBeVisible();
    await expect(page.getByTestId('architecture-section')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('inventions-section')).toBeVisible();

    // Stats bar
    await expect(page.getByTestId('stat-domains')).toContainText('27');
    await expect(page.getByTestId('stat-gene-types')).toContainText('17');
  });

  test('Unauthenticated user is redirected to auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/studio`);
    await page.waitForURL('**/auth');
    await expect(page.getByTestId('auth-username')).toBeVisible();
  });

  test('Register, login, and enter studio', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);

    // Switch to register mode
    await page.getByTestId('auth-toggle').click();
    await expect(page.locator('text=Create Account')).toBeVisible();

    // Register
    await page.getByTestId('auth-username').fill(USERNAME);
    await page.getByTestId('auth-password').fill(PASSWORD);
    await page.getByTestId('auth-submit').click();

    // Should redirect to studio
    await page.waitForURL('**/studio', { timeout: 10000 });
    await expect(page.getByTestId('creation-studio')).toBeVisible();
    await expect(page.getByTestId('studio-topbar')).toBeVisible();

    // User displayed in topbar
    await expect(page.locator(`text=${USERNAME}`)).toBeVisible();
  });

  test('Full studio workflow: create, evolve, compose, agent, mint', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth`);
    await page.getByTestId('auth-username').fill(USERNAME);
    await page.getByTestId('auth-password').fill(PASSWORD);
    await page.getByTestId('auth-submit').click();
    await page.waitForURL('**/studio', { timeout: 10000 });

    // ── Gallery should load ──────────────────────────────────────────
    await expect(page.getByTestId('tab-gallery')).toBeVisible();
    await expect(page.getByTestId('studio-sidebar-left')).toBeVisible();

    // ── Create seed via prompt bar ───────────────────────────────────
    const promptBar = page.getByTestId('studio-center').locator('input, textarea').first();
    if (await promptBar.isVisible()) {
      await promptBar.fill('a crystal dragon with quantum wings');
      await promptBar.press('Enter');
      // Wait for seed to appear in gallery
      await page.waitForTimeout(2000);
    }

    // ── Gene Editor tab ──────────────────────────────────────────────
    await page.getByTestId('tab-genes').click();
    await expect(page.getByTestId('studio-sidebar-right')).toBeVisible();

    // ── Evolve tab ───────────────────────────────────────────────────
    await page.getByTestId('tab-evolve').click();
    await page.waitForTimeout(500);

    // ── Breed tab ────────────────────────────────────────────────────
    await page.getByTestId('tab-breed').click();
    await page.waitForTimeout(500);

    // ── Composition tab ──────────────────────────────────────────────
    await page.getByTestId('tab-compose').click();
    await page.waitForTimeout(500);

    // ── GSPL Editor tab ──────────────────────────────────────────────
    await page.getByTestId('tab-gspl').click();
    await page.waitForTimeout(500);

    // ── Agent tab (native GSPL agent) ────────────────────────────────
    await page.getByTestId('tab-agent').click();
    await expect(page.getByTestId('agent-panel')).toBeVisible();

    // Send a query to the agent
    await page.getByTestId('agent-input').fill('list domains');
    await page.getByTestId('agent-send').click();
    // Wait for response
    await page.waitForTimeout(3000);

    // Agent should show at least one response bubble
    const agentMessages = page.getByTestId('agent-panel').locator('.font-mono.text-\\[11px\\]');
    await expect(agentMessages.first()).toBeVisible();

    // Create a seed via agent
    await page.getByTestId('agent-input').fill('create a music seed called E2E Symphony');
    await page.getByTestId('agent-send').click();
    await page.waitForTimeout(3000);

    // ── Mint tab ─────────────────────────────────────────────────────
    await page.getByTestId('tab-mint').click();
    await expect(page.getByTestId('mint-panel')).toBeVisible();

    // If a seed is selected, portrait and metadata should show
    const portrait = page.getByTestId('seed-portrait');
    if (await portrait.isVisible()) {
      await expect(portrait).toHaveAttribute('src', /portrait/);
    }

    // ── Export tab ───────────────────────────────────────────────────
    await page.getByTestId('tab-export').click();
    await expect(page.getByTestId('export-panel')).toBeVisible();

    // ── Library tab ──────────────────────────────────────────────────
    await page.getByTestId('tab-library').click();
    await page.waitForTimeout(1000);

    // ── Lineage tab ──────────────────────────────────────────────────
    await page.getByTestId('tab-lineage').click();
    await page.waitForTimeout(1000);

    // ── Sovereignty: generate keys & sign ────────────────────────────
    await page.getByTestId('tab-export').click();
    const genKeysBtn = page.getByTestId('generate-keys-btn');
    if (await genKeysBtn.isVisible()) {
      await genKeysBtn.click();
      await page.waitForTimeout(1000);
      // Sign button should appear
      const signBtn = page.getByTestId('sign-seed-btn');
      if (await signBtn.isVisible()) {
        await signBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // ── Status bar shows version ─────────────────────────────────────
    await expect(page.getByTestId('studio-statusbar')).toContainText('v2.0');
  });

  test('Logout returns to landing', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.getByTestId('auth-username').fill(USERNAME);
    await page.getByTestId('auth-password').fill(PASSWORD);
    await page.getByTestId('auth-submit').click();
    await page.waitForURL('**/studio', { timeout: 10000 });

    await page.getByTestId('logout-btn').click();
    await page.waitForURL(BASE_URL + '/');
    await expect(page.getByTestId('landing-nav')).toBeVisible();
  });

  test('Auth rejects wrong password', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.getByTestId('auth-username').fill(USERNAME);
    await page.getByTestId('auth-password').fill('wrongpassword');
    await page.getByTestId('auth-submit').click();

    // Should stay on auth page with error message
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*\/auth/);
  });
});
