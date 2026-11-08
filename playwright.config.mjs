import {defineConfig} from '@playwright/test';
export default defineConfig({testDir: './tests/browser', workers: 1, retries: 0, timeout: 30000,
  use: {baseURL: 'http://127.0.0.1:4417', trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  webServer: {command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4417', reuseExistingServer: false, gracefulShutdown: {signal: 'SIGTERM', timeout: 5000}}});
