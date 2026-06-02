/**
 * E2E Tests — Playwright
 * Features: Studio workflow, evolution, breeding, composition
 */

import { test, expect } from '@playwright/test';

test.describe('Paradigm Studio', () => {
  test('loads studio page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Paradigm/);
    await expect(page.locator('text=Studio')).toBeVisible();
  });

  test('creates a seed', async ({ page }) => {
    await page.goto('/studio');
    
    // Click create seed button
    await page.click('[data-testid="create-seed"]');
    
    // Fill seed name
    await page.fill('[data-testid="seed-name"]', 'Test Character');
    
    // Select domain
    await page.selectOption('[data-testid="seed-domain"]', 'character');
    
    // Click create
    await page.click('[data-testid="confirm-create"]');
    
    // Verify seed was created
    await expect(page.locator('[data-testid="seed-list"]')).toContainText('Test Character');
  });

  test('grows a character artifact', async ({ page }) => {
    await page.goto('/studio');
    
    // Create seed
    await page.click('[data-testid="create-seed"]');
    await page.fill('[data-testid="seed-name"]', 'Growth Test');
    await page.selectOption('[data-testid="seed-domain"]', 'character');
    await page.click('[data-testid="confirm-create"]');
    
    // Wait for seed to appear
    await page.waitForSelector('[data-testid="seed-item"]');
    
    // Click on seed
    await page.click('[data-testid="seed-item"]');
    
    // Click grow button
    await page.click('[data-testid="grow-artifact"]');
    
    // Wait for growth to complete
    await page.waitForSelector('[data-testid="artifact-preview"]', { timeout: 10000 });
    
    // Verify artifact is displayed
    await expect(page.locator('[data-testid="artifact-preview"]')).toBeVisible();
  });

  test('breeds two seeds', async ({ page }) => {
    await page.goto('/studio');
    
    // Create first seed
    await page.click('[data-testid="create-seed"]');
    await page.fill('[data-testid="seed-name"]', 'Parent 1');
    await page.selectOption('[data-testid="seed-domain"]', 'character');
    await page.click('[data-testid="confirm-create"]');
    await page.waitForSelector('[data-testid="seed-item"]');
    
    // Create second seed
    await page.click('[data-testid="create-seed"]');
    await page.fill('[data-testid="seed-name"]', 'Parent 2');
    await page.selectOption('[data-testid="seed-domain"]', 'character');
    await page.click('[data-testid="confirm-create"]');
    await page.waitForSelector('[data-testid="seed-item"]:nth-child(2)');
    
    // Select both seeds for breeding
    await page.click('[data-testid="seed-item"]:nth-child(1)');
    await page.click('[data-testid="seed-item"]:nth-child(2)', { modifiers: ['Control'] });
    
    // Click breed button
    await page.click('[data-testid="breed-seeds"]');
    
    // Verify child was created
    await expect(page.locator('[data-testid="seed-list"]')).toContainText('Child');
  });

  test('evolves a population', async ({ page }) => {
    await page.goto('/studio/evolve');
    
    // Configure evolution
    await page.fill('[data-testid="population-size"]', '50');
    await page.fill('[data-testid="generations"]', '10');
    await page.fill('[data-testid="mutation-rate"]', '0.1');
    
    // Start evolution
    await page.click('[data-testid="start-evolution"]');
    
    // Wait for evolution to start
    await page.waitForSelector('[data-testid="evolution-running"]', { timeout: 5000 });
    
    // Verify population is displayed
    await expect(page.locator('[data-testid="population-grid"]')).toBeVisible();
    
    // Wait for at least one generation
    await page.waitForSelector('[data-testid="generation-count"]', { timeout: 30000 });
    
    // Verify generation count increased
    const genCount = await page.locator('[data-testid="generation-count"]').textContent();
    expect(parseInt(genCount || '0')).toBeGreaterThan(0);
  });

  test('composes seeds across domains', async ({ page }) => {
    await page.goto('/studio/compose');
    
    // Select source domain
    await page.selectOption('[data-testid="source-domain"]', 'character');
    
    // Select target domain
    await page.selectOption('[data-testid="target-domain"]', 'sprite');
    
    // Find path
    await page.click('[data-testid="find-path"]');
    
    // Verify path is displayed
    await expect(page.locator('[data-testid="composition-path"]')).toContainText('character_to_sprite');
    
    // Execute composition
    await page.click('[data-testid="compose-seeds"]');
    
    // Verify result
    await expect(page.locator('[data-testid="composed-artifact"]')).toBeVisible();
  });

  test('views seed lineage', async ({ page }) => {
    await page.goto('/studio');
    
    // Create parent seed
    await page.click('[data-testid="create-seed"]');
    await page.fill('[data-testid="seed-name"]', 'Ancestor');
    await page.selectOption('[data-testid="seed-domain"]', 'character');
    await page.click('[data-testid="confirm-create"]');
    await page.waitForSelector('[data-testid="seed-item"]');
    
    // Create child through mutation
    await page.click('[data-testid="seed-item"]');
    await page.click('[data-testid="mutate-seed"]');
    await page.click('[data-testid="confirm-mutate"]');
    await page.waitForSelector('[data-testid="seed-item"]:nth-child(2)');
    
    // View lineage
    await page.click('[data-testid="view-lineage"]');
    
    // Verify lineage graph is displayed
    await expect(page.locator('[data-testid="lineage-graph"]')).toBeVisible();
    
    // Verify both ancestor and child are in graph
    await expect(page.locator('[data-testid="lineage-node"]')).toHaveCount(2);
  });

  test('agent creates seed from natural language', async ({ page }) => {
    await page.goto('/studio/agent');
    
    // Type natural language request
    await page.fill('[data-testid="agent-input"]', 'Create a warrior character with high strength');
    
    // Send request
    await page.click('[data-testid="agent-send"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="agent-response"]', { timeout: 10000 });
    
    // Verify seed was created
    await expect(page.locator('[data-testid="created-seed"]')).toBeVisible();
  });

  test('exports artifact', async ({ page }) => {
    await page.goto('/studio');
    
    // Create and grow a seed
    await page.click('[data-testid="create-seed"]');
    await page.fill('[data-testid="seed-name"]', 'Export Test');
    await page.selectOption('[data-testid="seed-domain"]', 'character');
    await page.click('[data-testid="confirm-create"]');
    await page.waitForSelector('[data-testid="seed-item"]');
    await page.click('[data-testid="seed-item"]');
    await page.click('[data-testid="grow-artifact"]');
    await page.waitForSelector('[data-testid="artifact-preview"]', { timeout: 10000 });
    
    // Click export
    await page.click('[data-testid="export-artifact"]');
    
    // Select format
    await page.selectOption('[data-testid="export-format"]', 'gltf');
    
    // Confirm export
    await page.click('[data-testid="confirm-export"]');
    
    // Verify download started (check for download event)
    const download = await page.waitForEvent('download', { timeout: 5000 });
    expect(download.suggestedFilename()).toContain('.gltf');
  });

  test('handles errors gracefully', async ({ page }) => {
    await page.goto('/studio');
    
    // Try to create seed with invalid data
    await page.click('[data-testid="create-seed"]');
    await page.fill('[data-testid="seed-name"]', ''); // Empty name
    await page.click('[data-testid="confirm-create"]');
    
    // Verify error is shown
    await expect(page.locator('[data-testid="error-message"]')).toContainText('name');
    
    // Verify app doesn't crash
    await expect(page.locator('[data-testid="studio-container"]')).toBeVisible();
  });

  test('keyboard shortcuts work', async ({ page }) => {
    await page.goto('/studio');
    
    // Test Cmd+K for command palette
    await page.keyboard.press('Control+K');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
    
    // Test Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/studio');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
  });
});

test.describe('Marketplace', () => {
  test('browses seeds', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Verify marketplace loads
    await expect(page.locator('[data-testid="marketplace-grid"]')).toBeVisible();
    
    // Filter by domain
    await page.selectOption('[data-testid="domain-filter"]', 'character');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="seed-card"]')).toHaveCount.greaterThan(0);
  });

  test('purchases a seed', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Select a seed
    await page.click('[data-testid="seed-card"]:first-child');
    
    // Click buy
    await page.click('[data-testid="buy-seed"]');
    
    // Confirm purchase
    await page.click('[data-testid="confirm-purchase"]');
    
    // Verify ownership transferred
    await expect(page.locator('[data-testid="purchase-success"]')).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('registers new user', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill registration form
    await page.fill('[data-testid="register-email"]', 'test@example.com');
    await page.fill('[data-testid="register-password"]', 'TestPass123!');
    await page.fill('[data-testid="register-confirm"]', 'TestPass123!');
    
    // Submit
    await page.click('[data-testid="register-submit"]');
    
    // Verify registration success
    await expect(page).toHaveURL('/studio');
  });

  test('logs in existing user', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill login form
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'TestPass123!');
    
    // Submit
    await page.click('[data-testid="login-submit"]');
    
    // Verify login success
    await expect(page).toHaveURL('/studio');
  });

  test('rate limiting works', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Make multiple rapid requests
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'wrong');
      await page.click('[data-testid="login-submit"]');
    }
    
    // Verify rate limit message
    await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('Too many attempts');
  });
});
