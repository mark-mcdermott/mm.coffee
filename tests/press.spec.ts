import { test, expect, type Page } from '@playwright/test'
import { SITE } from '../src/lib/site'
import { buildOutput } from './support/build-output'

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

/**
 * What the site lists is decided at build time, so these read the build output
 * rather than the dev server. The admin suite writes a scratch entry into
 * `src/content/press/` while it runs, which makes the dev server re-sync the
 * collection underneath whatever else is mid-request — and a listing read
 * during that window is a coin toss. The built pages can't move.
 */
test.describe('an unlisted post', () => {
  const UNLISTED = '/press/twenty-years-in-austin'

  /** Post links inside a built page's `<main>`, in document order. */
  const postLinks = (page: string) => {
    const main = buildOutput(page).match(/<main[^>]*>([\s\S]*)<\/main>/)![1]
    return [...main.matchAll(/href="(\/press\/[a-z0-9-]+)"/g)].map((m) => m[1])
  }

  test('is kept off the index and the feed', () => {
    const listed = postLinks('press/index.html')

    expect(listed.length).toBeGreaterThan(0)
    expect(listed).not.toContain(UNLISTED)

    expect(buildOutput('rss.xml')).not.toContain(`${SITE.url}${UNLISTED}`)
  })

  test('is stepped over by the older/newer chain', () => {
    // The newest listed post would otherwise have it as its older neighbour.
    expect(postLinks('press/outline-the-logo/index.html')).not.toContain(UNLISTED)
  })

  test('is still a real page, in the sitemap and linked to', async ({ page, request }) => {
    expect((await request.get(UNLISTED)).status()).toBe(200)
    expect(buildOutput('sitemap-0.xml')).toContain(`${SITE.url}${UNLISTED}`)

    // The origin line in the header is what carries people to it.
    await page.goto('/')
    await expect(page.locator(`header a[href="${UNLISTED}"]`)).toHaveCount(1)
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

/**
 * A caption is set to the width of its picture rather than to the column, so
 * these check the geometry that makes that true — several of the article's
 * photos are narrower than the measure, and a caption running past its own
 * image reads as a stray paragraph.
 */
test.describe('image captions', () => {
  test('sets a caption to its image rather than to the column', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/press/twenty-years-in-austin')

    const measure = await page
      .locator('.prose > p:not([data-treatment])')
      .first()
      .evaluate((el) => el.getBoundingClientRect().width)

    const figures = await page
      .locator('.prose figure:not([data-treatment])')
      .evaluateAll((els) =>
        els.map((el) => ({
          image: el.querySelector('img')!.getBoundingClientRect().width,
          caption: el.querySelector('figcaption')!.getBoundingClientRect().width,
        }))
      )

    expect(figures.length).toBeGreaterThan(0)
    for (const { image, caption } of figures) {
      expect(Math.round(caption)).toBe(Math.round(image))
    }

    // And at least one of them is genuinely narrower than the column, or the
    // assertion above would hold whether or not the rule works.
    expect(figures.some((f) => f.image < measure - 1)).toBe(true)
  })

  test('gives the caption something the alt text does not already say', async ({ page }) => {
    await page.goto('/press/twenty-years-in-austin')

    const figures = await page.locator('.prose figure').evaluateAll((els) =>
      els.map((el) => ({
        alt: el.querySelector('img')!.getAttribute('alt') ?? '',
        caption: el.querySelector('figcaption')!.textContent!.trim(),
      }))
    )

    expect(figures.length).toBeGreaterThan(0)
    for (const { alt, caption } of figures) {
      // The alt describes the picture for someone who can't see it; the caption
      // says what it has to do with the paragraph above. Never the same string.
      expect(alt.length).toBeGreaterThan(0)
      expect(caption.length).toBeGreaterThan(0)
      expect(caption).not.toBe(alt)
    }
  })
})
