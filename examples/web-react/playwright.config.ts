import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3199',
  },
  webServer: {
    command: 'npx vite --port 3199',
    port: 3199,
    reuseExistingServer: !process.env.CI,
  },
});
