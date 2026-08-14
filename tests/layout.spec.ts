import { test, expect } from '@playwright/test'

const ROUTES = [
  '/',
  '/programs',
  '/programs/fullstack-wolfpack',
  '/programs/mockingboard',
  '/programs/markmcdermott-io',
  '/lab',
  '/lab/outline-the-logo',
  '/lab/display-colours-arent-text-colours',
  '/about',
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
