import { test, expect, type Page } from '@playwright/test'
import { SITE } from '../src/lib/site'

test.describe('press index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/press')
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
      .locator('a[href^="/press/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')!))

    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      expect((await request.get(href)).status(), `${href} is missing`).toBe(200)
    }
  })
})

test.describe('a post', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/press/outline-the-logo')
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
    await expect(page.locator('a[href="/press"]').last()).toBeVisible()
  })
})

test.describe('feed', () => {
  test('is served as xml and lists the posts', async ({ request }) => {
    const response = await request.get('/rss.xml')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/xml/)

    const body = await response.text()
    expect(body).toContain('<rss')
    expect(body).toContain(`${SITE.name} — ${SITE.feedTitle}`)
    expect(body).toContain('https://mm.coffee/press/outline-the-logo')
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

/**
 * The longform layout is opted into per post and a treatment per image, so
 * these check both halves: that an aside leaves the measure when there is room,
 * that it falls back into the column when there is not, and that neither
 * happens to a post that never asked for it.
 *
 * One of them guards the rule that treatment is a decision written down per
 * image, never read off the image itself.
 */
test.describe('the longform layout', () => {
  const geometry = (page: Page) =>
    page.evaluate(() => {
      const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect()
      return {
        textRight: Math.round(box('.prose > p:not([data-treatment])').right),
        asideLeft: Math.round(box('.prose > [data-treatment="aside"]').left),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }
    })

  test('breaks an aside out of the measure when the window is wide enough', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/press/twenty-years-in-austin')

    const { textRight, asideLeft, scrollWidth, clientWidth } = await geometry(page)

    expect(asideLeft).toBeGreaterThan(textRight)
    // Breaking out must not be the same thing as pushing the page sideways.
    expect(scrollWidth).toBe(clientWidth)
  })

  test('keeps the aside in the column when there is no room beside it', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    await page.goto('/press/twenty-years-in-austin')

    const { textRight, asideLeft, scrollWidth, clientWidth } = await geometry(page)

    expect(asideLeft).toBeLessThan(textRight)
    expect(scrollWidth).toBe(clientWidth)
  })

  test('leaves a post that did not ask for it on the standard measure', async ({ page }) => {
    await page.goto('/press/outline-the-logo')

    await expect(page.locator('.prose')).toHaveCount(1)
    await expect(page.locator('.prose-longform')).toHaveCount(0)
  })

  test('gives every treated image a treatment from the vocabulary', async ({ page }) => {
    await page.goto('/press/twenty-years-in-austin')

    const treatments = await page
      .locator('.prose [data-treatment]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-treatment')))

    expect(treatments.length).toBeGreaterThan(0)
    expect(treatments.every((t) => t === 'aside' || t === 'wide')).toBe(true)

    // Untreated images are the default, so the two counts have to add up.
    const total = await page.locator('.prose img').count()
    const treated = await page.locator('.prose [data-treatment] img').count()
    expect(treated).toBe(treatments.length)
    expect(total).toBeGreaterThan(treated)
  })

  test('does not derive treatment from the shape of the image', async ({ page }) => {
    await page.goto('/press/twenty-years-in-austin')

    // Astro sets width/height on every image, so shape is readable without
    // waiting for any of them to load.
    const images = await page.locator('.prose img').evaluateAll((imgs) =>
      imgs.map((img) => ({
        aside: img.closest('[data-treatment="aside"]') !== null,
        portrait: Number(img.getAttribute('height')) > Number(img.getAttribute('width')),
      }))
    )

    // Both treatments carry both shapes. No rule keyed on aspect ratio could
    // produce this article, which is the point — the Markdown decides.
    for (const aside of [true, false]) {
      for (const portrait of [true, false]) {
        expect(images.some((i) => i.aside === aside && i.portrait === portrait)).toBe(true)
      }
    }
  })

  test('leaves no treatment marker behind on the image', async ({ page }) => {
    await page.goto('/press/twenty-years-in-austin')

    // The marker is written as the image title; the plugin has to strip it or
    // it surfaces as a tooltip reading "aside".
    await expect(page.locator('.prose img[title]')).toHaveCount(0)
  })
})
