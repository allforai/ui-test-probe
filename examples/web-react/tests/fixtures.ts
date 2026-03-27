/**
 * Test fixtures — wraps probe injection + ProbePage for test convenience.
 */
import { test as base, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the pre-built probe bundle
const bundlePath = resolve(__dirname, '..', '..', '..', 'sdk', 'web', 'dist', 'probe-bundle.js');
const bundleScript = readFileSync(bundlePath, 'utf-8');

// Inline ProbePage to avoid cross-package CJS/ESM issues
class ProbePage {
  constructor(readonly page: Page) {}

  private eval<T>(fn: string, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(
      new Function('args', `return window.__probe__?.${fn}(...args)`) as (...a: unknown[]) => T,
      args,
    );
  }

  async query(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.query(i) ?? null, id);
  }

  async queryAll(type?: string) {
    return this.page.evaluate((t) => (window as any).__probe__?.queryAll(t) ?? [], type);
  }

  async queryPage() {
    return this.page.evaluate(() => (window as any).__probe__?.queryPage());
  }

  async queryChildren(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.queryChildren(i) ?? [], id);
  }

  async queryDescendants(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.queryDescendants(i) ?? [], id);
  }

  async queryParent(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.queryParent(i) ?? null, id);
  }

  async isEffectivelyVisible(id: string): Promise<boolean> {
    return this.page.evaluate((i) => (window as any).__probe__?.isEffectivelyVisible(i) ?? false, id) as Promise<boolean>;
  }

  async getState(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.getState(i), id);
  }

  async getStates(ids: string[]) {
    return this.page.evaluate((arr) => (window as any).__probe__?.getStates(arr) ?? {}, ids);
  }

  async waitForState(id: string, state: string, timeout?: number) {
    await this.page.evaluate(({ i, s, t }) => (window as any).__probe__?.waitForState(i, s, t), { i: id, s: state, t: timeout });
  }

  async waitForPageReady(timeout?: number) {
    await this.page.evaluate((t) => (window as any).__probe__?.waitForPageReady(t), timeout);
  }

  async getSource(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.getSource(i) ?? null, id);
  }

  async getNetworkLog() {
    return this.page.evaluate(() => (window as any).__probe__?.getNetworkLog() ?? []);
  }

  async getLayout(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.getLayout(i), id);
  }

  async getOverlaps() {
    return this.page.evaluate(() => (window as any).__probe__?.getOverlaps() ?? []);
  }

  async getScrollPosition(id: string) {
    return this.page.evaluate((i) => (window as any).__probe__?.getScrollPosition(i) ?? { scrollTop: 0, scrollLeft: 0 }, id);
  }

  async click(id: string) {
    await this.page.evaluate((i) => (window as any).__probe__?.click(i), id);
  }

  async fill(id: string, value: string) {
    await this.page.evaluate(({ i, v }) => (window as any).__probe__?.fill(i, v), { i: id, v: value });
  }

  async select(id: string, value: string) {
    await this.page.evaluate(({ i, v }) => (window as any).__probe__?.select(i, v), { i: id, v: value });
  }

  async pressShortcut(key: string) {
    await this.page.evaluate((k) => (window as any).__probe__?.pressShortcut(k), key);
  }

  async snapshot() {
    return this.page.evaluate(() => (window as any).__probe__?.snapshot());
  }

  async diff(a: unknown, b: unknown) {
    return this.page.evaluate(({ sa, sb }) => (window as any).__probe__?.diff(sa, sb) ?? [], { sa: a, sb: b });
  }

  async verifyLinkage(triggerId: string, action: string) {
    return this.page.evaluate(({ t, a }) => (window as any).__probe__?.verifyLinkage(t, a), { t: triggerId, a: action });
  }

  async actAndWait(id: string, action: string, waitFor: { target?: string; state?: string; timeout?: number }) {
    return this.page.evaluate(({ i, a, w }) => (window as any).__probe__?.actAndWait(i, a, w), { i: id, a: action, w: waitFor });
  }
}

export { ProbePage };

// Fixture that auto-injects probe and provides ProbePage
export const test = base.extend<{ probe: ProbePage }>({
  probe: async ({ page }, use) => {
    // Inject probe before navigation
    await page.addInitScript(`window.__probeConfig__ = { autoScan: true, interceptNetwork: true };`);
    await page.addInitScript(bundleScript);

    await page.goto('/');
    // Wait for probe to initialize
    await page.waitForFunction(() => !!(window as any).__probe__);

    const probe = new ProbePage(page);
    await use(probe);
  },
});
