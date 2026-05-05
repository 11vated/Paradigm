import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BASELINE_DIR = path.resolve('tests/visual/baselines');
const ROUTES = ['/', '/studio', '/chat'];
const WAIT_MS = 1500;

async function ensureBaselineDir() {
  await fs.promises.mkdir(BASELINE_DIR, { recursive: true });
}

async function capture(route: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = `${BASE_URL}${route}`;
  const startTime = Date.now();

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    if (!response || response.status() >= 400) {
      throw new Error(`HTTP ${response?.status() || 'unknown'} loading ${url}`);
    }

    await page.waitForTimeout(WAIT_MS);
    await page.evaluate(() => {
      return new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    });

    const screenshot = await page.screenshot({ fullPage: false });
    const fileName = `${route === '/' ? 'landing' : route.replace(/\W+/g, '_')}.png`;
    const filePath = path.join(BASELINE_DIR, fileName);
    await fs.promises.writeFile(filePath, screenshot);

    return {
      route,
      filePath,
      status: 'success',
      renderTimeMs: Date.now() - startTime,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  await ensureBaselineDir();

  const results = [] as Array<{
    route: string;
    filePath: string;
    status: string;
    renderTimeMs: number;
    error?: string;
  }>;

  for (const route of ROUTES) {
    try {
      const result = await capture(route);
      console.log(`Captured baseline for ${route}: ${result.filePath}`);
      results.push(result);
    } catch (error) {
      results.push({
        route,
        filePath: '',
        status: 'failed',
        renderTimeMs: 0,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed to capture baseline for ${route}:`, error);
    }
  }

  const metadataPath = path.join(BASELINE_DIR, 'baseline-metadata.json');
  await fs.promises.writeFile(metadataPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    results,
  }, null, 2));

  const failed = results.filter(r => r.status !== 'success');
  if (failed.length > 0) {
    console.error(`\n${failed.length} baseline capture(s) failed.`);
    process.exit(1);
  }

  console.log('\nBaseline screenshot generation complete.');
}

main().catch(error => {
  console.error('Baseline screenshot generation failed:', error);
  process.exit(1);
});