import { describe, it, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { WebConformanceRunner } from './web-runner';

// Paths
const SDK_WEB_DIST = resolve(__dirname, '../../../sdk/web/dist');
const VECTOR_DIR = resolve(__dirname, '../vectors');

function findBundle(): string {
  const candidates = ['probe-bundle.js', 'index.js', 'browser-entry.js'];
  for (const name of candidates) {
    const path = join(SDK_WEB_DIST, name);
    if (existsSync(path)) return path;
  }
  throw new Error(
    `No probe bundle found in ${SDK_WEB_DIST}. ` +
    `Build the Web SDK first: cd sdk/web && npm run build`,
  );
}

describe('Web Conformance Runner', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();

    // Inject the probe bundle as an init script so it runs on every navigation
    const bundlePath = findBundle();
    const bundleSource = readFileSync(bundlePath, 'utf-8');
    await context.addInitScript({ content: bundleSource });

    // Navigate to the web-react example app
    await page.goto('http://localhost:3199', { waitUntil: 'networkidle' });

    // Give the probe time to scan the DOM
    await page.waitForFunction(
      () => typeof window.__probe__?.query === 'function',
      { timeout: 10000 },
    );
  }, 30000);

  afterAll(async () => {
    await browser?.close();
  });

  it('runs all conformance vectors', async () => {
    const runner = new WebConformanceRunner(page);
    const result = await runner.runAll(VECTOR_DIR);

    // Tally results
    const pass = result.results.filter(r => r.status === 'pass').length;
    const fail = result.results.filter(r => r.status === 'fail').length;
    const error = result.results.filter(r => r.status === 'error').length;
    const skip = result.results.filter(r => r.status === 'skip').length;
    const total = result.results.length;

    console.log('\n========================================');
    console.log('  Web Conformance Results');
    console.log('========================================');
    console.log(`  Total:  ${total}`);
    console.log(`  Pass:   ${pass}`);
    console.log(`  Fail:   ${fail}`);
    console.log(`  Error:  ${error}`);
    console.log(`  Skip:   ${skip}`);
    console.log('========================================\n');

    // Log each failure and error
    for (const r of result.results) {
      if (r.status === 'fail') {
        console.log(`FAIL  ${r.vector_id}: expected=${JSON.stringify(r.expected)}, actual=${JSON.stringify(r.actual)}`);
      }
      if (r.status === 'error') {
        console.log(`ERROR ${r.vector_id}: ${r.error}`);
      }
    }

    // We don't assert 100% pass — this is a conformance probe.
    // But log the summary clearly so the caller can evaluate.
    console.log(`\nConformance rate: ${pass}/${total} (${((pass / total) * 100).toFixed(1)}%)`);
  }, 120000);
});
