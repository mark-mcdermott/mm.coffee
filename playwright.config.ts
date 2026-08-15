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
    // Astro's programmatic dev server: it renders `/contact` and `/api/*` per
    // request, which a static file server can't, and it reads from source — so
    // the suite can't pass against a stale build. `pnpm test` still runs a real
    // build first, to catch build-time failures.
    command: `node scripts/test-server.mjs`,
    env: { PORT: String(PORT) },
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
