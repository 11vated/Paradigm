// One-off Studio visual verification.
// Uses Playwright (already installed). Navigates to /studio,
// asserts layout invariants, captures a screenshot.

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const URL = process.env.URL || 'http://localhost:3000/studio';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

console.log(`→ navigating to ${URL}`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500); // allow JS to mount
if (consoleErrors.length) { console.log('EARLY ERRORS:', consoleErrors); }

// 1) Top app-bar — Paradigm wordmark + ABSOLUTE chip
const wordmark = await page.locator('text=Paradigm').first().boundingBox();
const absoluteChip = await page.locator('text=Absolute').first().boundingBox();
console.log('topBar wordmark   :', wordmark);
console.log('topBar ABSOLUTE   :', absoluteChip);

// 2) 56px icon rail
const rail = await page.locator('nav.p-glass').first().boundingBox();
console.log('icon-rail         :', rail, '(expect width 56)');

// 3) Work pane (chat) and preview pane
const previewViewport = await page.locator('[data-testid="preview-viewport"]').boundingBox();
console.log('preview-viewport  :', previewViewport);

// 4) Primordium orb visible (rendered by inline style — has the keyword "PRIMORDIUM")
const primordiumLabel = await page.locator('text=PRIMORDIUM').first();
const primordiumVisible = await primordiumLabel.isVisible().catch(() => false);
console.log('primordium label  :', primordiumVisible);

// 5) Prompt bar present
const promptInput = await page.locator('[data-testid="prompt-input"]').boundingBox();
console.log('prompt input      :', promptInput);

// 6) Bottom tab strip with all 6 tabs
const tabs = ['Compose', 'Evolve', 'Breed', 'Export', 'Mint', 'Agent'];
const tabHits = await Promise.all(tabs.map(t => page.locator(`text=${t}`).first().isVisible().catch(() => false)));
console.log('bottom tabs       :', Object.fromEntries(tabs.map((t, i) => [t, tabHits[i]])));

// 7) Type in the prompt bar — primordium orb should change copy
await page.locator('[data-testid="prompt-input"]').fill('a glowing crystal warrior');
await page.waitForTimeout(400);
const germText = await page.locator('text=Germinating').first().isVisible().catch(() => false);
console.log('germinating after typing:', germText);

// 8) Open command palette via Ctrl+K — focus body first to make sure
await page.locator('body').click();
await page.keyboard.press('Control+K');
await page.waitForTimeout(500);
const cmdOpen = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
console.log('cmd palette opens :', cmdOpen);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// 9) Open bottom drawer (click "Compose")
await page.locator('button:has-text("Compose")').first().click().catch(() => {});
await page.waitForTimeout(500);
const drawerHeight = await page.locator('text=COMPOSE').first().isVisible().catch(() => false);
console.log('compose drawer    :', drawerHeight);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// Final screenshot
const shotPath = 'studio-verify.png';
await page.screenshot({ path: shotPath, fullPage: false });
console.log(`✓ screenshot: ${shotPath}`);

console.log('\n--- console errors ---');
console.log(consoleErrors.length === 0 ? '(none)' : consoleErrors.join('\n'));

await browser.close();

// Report
const railOK = rail && Math.abs(rail.width - 56) < 2;
const previewOK = previewViewport && previewViewport.width > 300;
const summary = {
  topBarOK: !!(wordmark && absoluteChip),
  railOK,
  previewVisible: previewOK,
  primordiumVisible,
  promptInputOK: !!promptInput,
  bottomTabsOK: tabHits.every(Boolean),
  germinationLive: germText,
  cmdPaletteOK: cmdOpen,
  drawerOpens: drawerHeight,
  consoleErrorCount: consoleErrors.length,
};
console.log('\n--- summary ---');
console.log(JSON.stringify(summary, null, 2));

writeFileSync('studio-verify.json', JSON.stringify({ summary, consoleErrors, rail, previewViewport, wordmark }, null, 2));
process.exit(consoleErrors.length || !railOK || !primordiumVisible ? 1 : 0);
