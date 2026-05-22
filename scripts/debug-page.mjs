import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => logs.push(`[pageerror] ${err.message}\n${err.stack}`));
page.on('requestfailed', req => logs.push(`[reqfail] ${req.url()} - ${req.failure()?.errorText}`));

try {
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
} catch (e) {
  logs.push(`[goto-error] ${e.message}`);
}

await page.waitForTimeout(2000);
const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 500));
console.log('=== ROOT HTML (first 500 chars) ===');
console.log(rootHtml || '(empty)');
console.log('\n=== LOGS ===');
console.log(logs.join('\n'));

await browser.close();
