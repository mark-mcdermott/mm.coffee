import { test, expect } from '@playwright/test'

test.describe('about', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about')
  })

  test('renders with a single h1', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toContainText('Small batch')
  })

  test('marks itself as the current section', async ({ page }) => {
    // The header renders a mobile panel and a desktop bar; each is display:none
    // at the other breakpoint. Below lg the nav lives behind the toggle, so
    // open it before looking for the marker.
    const toggle = page.getByRole('button', { name: 'Open menu' })
    if (await toggle.isVisible()) await toggle.click()

    await expect(
      page.locator('a[href="/about"][aria-current="page"]:visible')
    ).toHaveCount(1)
  })

  test('links out to the contact page and the personal site', async ({ page }) => {
    const main = page.locator('main')
    await expect(main.locator('a[href="/contact"]').first()).toBeVisible()
    await expect(main.locator('a[href="https://markmcdermott.io"]').first()).toBeVisible()
  })
})

test.describe('404', () => {
  test('unknown paths serve the 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.locator('h1')).toContainText('Nothing brewing here')
  })

  test('offers a way back', async ({ page }) => {
    await page.goto('/404')
    const nav = page.getByRole('navigation', { name: 'Where to next' })
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Programs' })).toBeVisible()
  })
})
