// This config is meant to be invoked from examples/web-react which has @playwright/test installed.
// Usage: cd examples/web-react && npx playwright test --config=../../.allforai/product-verify/playwright.config.ts
//
// However, due to module resolution, we run via symlink instead.
// See: examples/web-react/tests/e2e-verify.spec.ts (symlink)

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'e2e-test.spec.ts',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3199',
  },
  webServer: {
    command: 'npx vite --port 3199',
    cwd: '../../examples/web-react',
    port: 3199,
    reuseExistingServer: true,
  },
});
