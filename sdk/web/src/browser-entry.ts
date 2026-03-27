/**
 * Browser entry point for the Web SDK.
 * This file is bundled into a single IIFE script for injection via Playwright.
 * It auto-instantiates WebProbe with config from window.__probeConfig__.
 *
 * Network interception is installed immediately (before any fetches).
 * DOM scanning is deferred until the document is ready.
 */
import { WebProbe } from './probe.js';

const config = (globalThis as unknown as { __probeConfig__?: Record<string, unknown> }).__probeConfig__ ?? {};

// Create probe with autoScan disabled — we'll scan after DOM is ready
const probe = new WebProbe({
  autoScan: false,
  interceptNetwork: config.interceptNetwork !== false,
  exposeGlobal: true,
});

// Scan + observe once DOM is available
function initDOM() {
  if (config.autoScan !== false) {
    probe.registry.scan();
    probe.registry.startObserving();
    probe.stateObserver.observe();
    probe.layoutTracker.startVisibilityTracking();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOM);
} else {
  initDOM();
}
