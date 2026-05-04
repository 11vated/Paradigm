import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_FILE = path.resolve('data/performance-baseline.json');
const ROUTES = ['/', '/studio', '/chat'];
const SAMPLE_FRAMES = 60;

async function collectPerformance(page: any, route: string) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const perf = await page.evaluate(async (frames) => {
    const timings: number[] = [];
    let last = performance.now();

    await new Promise<void>(resolve => {
      let count = 0;
      function frame(now: number) {
        if (count >= frames) {
          resolve();
          return;
        }
        timings.push(now - last);
        last = now;
        count += 1;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });

    const avgFrame = timings.reduce((sum, value) => sum + value, 0) / timings.length;
    return {
      avgFrameTimeMs: avgFrame,
      averageFps: 1000 / avgFrame,
      frameSamples: timings.length,
      rendererCalls: (window as any)?.renderer?.info?.render?.calls ?? null,
      gpuFrameTime: (window as any)?.performance?.gpu?.frameTime ?? null,
    };
  }, SAMPLE_FRAMES);

  return {
    route,
    timestamp: new Date().toISOString(),
    metrics: perf,
  };
}

async function main() {
  await fs.promises.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const records = [] as Array<Awaited<ReturnType<typeof collectPerformance>>>;

  try {
    for (const route of ROUTES) {
      const record = await collectPerformance(page, route);
      records.push(record);
      console.log(`Route ${route}: ${record.metrics.averageFps.toFixed(1)} FPS`);
    }

    await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify({
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      samples: records,
    }, null, 2));

    console.log(`Performance baseline saved to ${OUTPUT_FILE}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error('Engine profiling failed:', error);
  process.exit(1);
});