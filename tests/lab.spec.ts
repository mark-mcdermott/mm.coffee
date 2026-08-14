import { test, expect } from '@playwright/test'

test.describe('lab index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lab')
  })

  test('lists posts newest first', async ({ page }) => {
    const dates = await page.locator('time[datetime]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('datetime')!)
    )

    expect(dates.length).toBeGreaterThan(1)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  test('every post links to a page that exists', async ({ page, request }) => {
    const hrefs = await page
      .locator('a[href^="/lab/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')!))

    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      expect((await request.get(href)).status(), `${href} is missing`).toBe(200)
    }
  })
})

test.describe('a post', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lab/outline-the-logo')
  })

  test('renders its title, date and body', async ({ page }) => {
    await expect(page.locator('h1')).toContainText("Outline the logo")
    await expect(page.locator('time[datetime="2026-08-14"]')).toBeVisible()
    await expect(page.locator('.prose h2').first()).toBeVisible()
  })

  test('code blocks scroll rather than widening the page', async ({ page }) => {
    const pre = page.locator('.prose pre').first()
    await expect(pre).toBeVisible()

    const overflowX = await pre.evaluate((el) => getComputedStyle(el).overflowX)
    expect(overflowX).toBe('auto')
  })

  test('offers navigation to adjacent posts', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'More posts' })).toBeVisible()
    await expect(page.locator('a[href="/lab"]').last()).toBeVisible()
  })
})

test.describe('feed', () => {
  test('is served as xml and lists the posts', async ({ request }) => {
    const response = await request.get('/rss.xml')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/xml/)

    const body = await response.text()
    expect(body).toContain('<rss')
    expect(body).toContain('mm.coffee — Lab')
    expect(body).toContain('https://mm.coffee/lab/outline-the-logo')
  })

  test('excludes drafts', async ({ request }) => {
    const body = await (await request.get('/rss.xml')).text()
    expect(body).not.toContain('<title>Draft')
  })

  test('is discoverable from the head', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('link[rel="alternate"][type="application/rss+xml"]')
    ).toHaveCount(1)
  })
})
