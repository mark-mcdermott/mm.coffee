import { defineConfig, devices } from '@playwright/test'

const PORT = 4399
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  // Uses the locally installed Chrome rather than downloading Playwright's
  // browser bundles.
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 390, height: 844 }, isMobile: false },
    },
  ],

  webServer: {
    // `pnpm test` builds first. The server only serves whatever is already in
    // .vercel/output/static — reusing it must never mean skipping a build.
    command: `node scripts/serve.mjs`,
    env: { PORT: String(PORT) },
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
