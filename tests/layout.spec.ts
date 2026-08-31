import { test, expect } from '@playwright/test'

const ROUTES = [
  '/',
  '/batches',
  '/batches/fullstack-wolfpack',
  '/batches/mockingboard',
  '/batches/markmcdermott-io',
  '/press',
  '/press/outline-the-logo',
  '/press/display-colours-arent-text-colours',
  '/company',
  '/mailroom',
]

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route} responds and renders`, async ({ page }) => {
      const response = await page.goto(route)
      expect(response?.status()).toBe(200)
      await expect(page.locator('main')).toBeVisible()
    })
  }
})

test.describe('no horizontal overflow', () => {
  for (const route of ROUTES) {
    test(`${route} fits the viewport`, async ({ page }) => {
      await page.goto(route)

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      // 1px of slack for sub-pixel rounding on fractional layouts.
      expect(
        scrollWidth,
        `${route} overflows by ${scrollWidth - clientWidth}px`
      ).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})

/**
 * Names the element responsible when a page overflows.
 *
 * Bounding boxes alone aren't enough: an unbreakable word overflows its own
 * box without the box ever exceeding the viewport, so this also reports any
 * element whose content scrolls past its width without being clipped.
 */
for (const route of ROUTES) {
  test(`${route} names its overflow source`, async ({ page }) => {
    await page.goto(route)

    const offenders = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth
      const found: Array<Record<string, unknown>> = []

      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const rect = el.getBoundingClientRect()
        const clipped = getComputedStyle(el).overflowX !== 'visible'
        const leak = el.scrollWidth - el.clientWidth

        const overhangs = rect.right > limit + 1
        const leaks = !clipped && leak > 1 && el.clientWidth > 0

        if (overhangs || leaks) {
          found.push({
            tag: el.tagName.toLowerCase(),
            cls: el.getAttribute('class')?.slice(0, 70) ?? '',
            right: Math.round(rect.right),
            leak,
            limit,
          })
        }
      }

      // Only the deepest offenders matter — ancestors inherit the overflow.
      return found.filter((f) => (f.leak as number) > 1).slice(-4)
    })

    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([])
  })
}

/**
 * The heading column has to stay clear of the ribbon's coil.
 *
 * The coil sits at a fixed fraction of the artwork and the artwork is placed as
 * a percentage of the header, so the two only stay apart because the heading
 * column is capped. It was — but only at `lg`, so below that a long article
 * title ran straight under the coil. These widths bracket that breakpoint.
 */
const RIBBON_ROUTES = [
  '/press',
  '/press/outline-the-logo',
  '/press/the-test-that-passed-against-nothing',
  '/batches',
  '/batches/fullstack-wolfpack',
  '/company',
  '/mailroom',
]

/** The coil's left edge as a fraction of the artwork: its centre, 1363.5, less
 *  its outer radius — a 172.5 band plus 16 of casing — over the 1855 viewBox. */
const COIL_LEFT = (1363.5 - 188.5) / 1855

test.describe('the ribbon header', () => {
  for (const route of RIBBON_ROUTES) {
    test(`${route} keeps its heading clear of the coil`, async ({ page }) => {
      await page.goto(route)

      for (const width of [320, 390, 640, 768, 1023, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })

        const clearance = await page.evaluate((coilLeft) => {
          const heading = document.querySelector('h1')
          const artwork = [...document.querySelectorAll('svg')].find(
            (svg) => svg.getAttribute('viewBox') === '0 0 1855 375.02'
          )
          if (!heading || !artwork) return null

          // Line boxes rather than the block box: an uncapped heading is full
          // width whatever its text actually reaches.
          const lines = document.createRange()
          lines.selectNodeContents(heading)
          const ink = [...lines.getClientRects()].filter((line) => line.width > 0)
          const art = artwork.getBoundingClientRect()

          return art.left + coilLeft * art.width - Math.max(...ink.map((line) => line.right))
        }, COIL_LEFT)

        expect(
          clearance,
          `${route} at ${width}px: the heading runs under the coil`
        ).toBeGreaterThanOrEqual(0)
      }
    })
  }
})
