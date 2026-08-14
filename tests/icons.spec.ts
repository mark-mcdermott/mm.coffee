import { test, expect } from '@playwright/test'

const ICONS = [
  { path: '/favicon.svg', type: /image\/svg/ },
  { path: '/favicon.ico', type: /icon|image/ },
  { path: '/apple-touch-icon.png', type: /image\/png/ },
  { path: '/icon-192.png', type: /image\/png/ },
  { path: '/icon-512.png', type: /image\/png/ },
  { path: '/site.webmanifest', type: /json/ },
]

test.describe('icons', () => {
  for (const { path, type } of ICONS) {
    test(`${path} is served`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toMatch(type)
    })
  }

  test('the head declares every icon', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="icon"][href="/favicon.svg"]')).toHaveCount(1)
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1)
  })

  test('the manifest is valid and points at real files', async ({ request }) => {
    const manifest = await (await request.get('/site.webmanifest')).json()
    expect(manifest.name).toBe('mm.coffee')
    expect(manifest.icons.length).toBeGreaterThan(0)

    for (const icon of manifest.icons) {
      const response = await request.get(icon.src)
      expect(response.status(), `${icon.src} missing`).toBe(200)
    }
  })
})
