import { test, expect } from '@playwright/test'

const ROUTES = ['/', '/programs', '/programs/fullstack-wolfpack', '/programs/mockingboard', '/programs/markmcdermott-io']

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

test('reports the widest element when something overflows', async ({ page }) => {
  await page.goto('/programs')

  const offenders = await page.evaluate(() => {
    const limit = document.documentElement.clientWidth
    return [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => el.getBoundingClientRect().right > limit + 1)
      .slice(0, 5)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: el.getAttribute('class')?.slice(0, 80) ?? '',
        right: Math.round(el.getBoundingClientRect().right),
        limit,
      }))
  })

  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([])
})
