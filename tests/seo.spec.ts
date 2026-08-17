import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The sitemap is emitted by the build, not served by the dev server the suite
 * runs against — so it's read from the build output. `pnpm test` builds first,
 * so this is always current.
 */
const buildOutput = (file: string) =>
  readFileSync(join(process.cwd(), '.vercel/output/static', file), 'utf8')

const PAGES = ['/', '/batches', '/press', '/company', '/mailroom']

test.describe('metadata', () => {
  for (const path of PAGES) {
    test(`${path} carries the essentials`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveTitle(/mm\.coffee/)

      const description = page.locator('meta[name="description"]')
      await expect(description).toHaveCount(1)
      expect((await description.getAttribute('content'))!.length).toBeGreaterThan(30)

      // Canonical must be absolute and point at the real domain, not the
      // preview host it happens to be served from.
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      expect(canonical).toMatch(/^https:\/\/mm\.coffee/)

      for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']) {
        await expect(
          page.locator(`meta[property="${property}"]`),
          `${path} is missing ${property}`
        ).toHaveCount(1)
      }

      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image'
      )
    })
  }

  test('every page has a distinct title and description', async ({ page }) => {
    const seen = new Map<string, string>()

    for (const path of PAGES) {
      await page.goto(path)
      const title = await page.title()
      const description = await page
        .locator('meta[name="description"]')
        .getAttribute('content')

      const key = `${title}||${description}`
      expect(seen.has(key), `${path} duplicates ${seen.get(key)}`).toBe(false)
      seen.set(key, path)
    }
  })

  test('the share image is absolute and actually exists', async ({ page, request }) => {
    await page.goto('/')
    const image = await page.locator('meta[property="og:image"]').getAttribute('href')
      ?? await page.locator('meta[property="og:image"]').getAttribute('content')

    expect(image).toMatch(/^https:\/\//)
    const response = await request.get(new URL(image!).pathname)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
  })

  test('lab posts declare themselves as articles', async ({ page }) => {
    await page.goto('/press/outline-the-logo')

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
      'content',
      '2026-08-14'
    )
    expect(await page.locator('meta[property="article:tag"]').count()).toBeGreaterThan(0)
  })

  test('the styleguide is kept out of search results', async ({ page }) => {
    await page.goto('/styleguide')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/
    )
  })

  test('describes the studio in structured data', async ({ page }) => {
    await page.goto('/')
    const raw = await page.locator('script[type="application/ld+json"]').textContent()
    const data = JSON.parse(raw!)

    expect(data['@type']).toBe('Organization')
    expect(data.url).toBe('https://mm.coffee')
    expect(data.founder.name).toBe('Mark McDermott')
  })
})

test.describe('crawlability', () => {
  test('robots.txt points at the sitemap and blocks the styleguide', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toContain('Sitemap: https://mm.coffee/sitemap-index.xml')
    expect(body).toContain('Disallow: /styleguide')
  })

  test('the sitemap lists real pages and omits the styleguide', () => {
    expect(buildOutput('sitemap-index.xml')).toContain('sitemap-0.xml')

    const locs = [...buildOutput('sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => m[1]
    )

    expect(locs.length).toBeGreaterThan(5)
    expect(locs.some((l) => l.includes('/styleguide'))).toBe(false)
    for (const path of ['/', '/company/', '/press/', '/batches/']) {
      expect(locs, `sitemap missing ${path}`).toContain(`https://mm.coffee${path}`)
    }
  })

  test('every sitemap url resolves', async ({ request }) => {
    const paths = [...buildOutput('sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => new URL(m[1]).pathname
    )

    // Guard against passing vacuously if the sitemap were ever empty.
    expect(paths.length).toBeGreaterThan(5)

    for (const path of paths) {
      const response = await request.get(path)
      expect(response.status(), `${path} is in the sitemap but returns ${response.status()}`).toBe(200)
    }
  })
})
