import { test, expect } from '@playwright/test'
import { NAV } from '../src/lib/nav'

/**
 * Labels come from `NAV` rather than being restated here: these are copy, they
 * have already been reworded several times, and a test that hardcodes them fails
 * on a rename instead of on a regression.
 */
const labelFor = (href: string) => {
  const item = NAV.find((entry) => entry.href === href)
  if (!item) throw new Error(`nav has no entry for ${href}`)
  return item.label
}

test.describe('desktop nav', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'desktop only')

  test('marks the current section', async ({ page }) => {
    await page.goto('/batches')
    await expect(
      page.getByRole('link', { name: labelFor('/batches'), exact: true })
    ).toHaveAttribute('aria-current', 'page')
  })

  test('links to every section', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    for (const { label } of NAV) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible()
    }
  })
})

test.describe('mobile nav', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, 'mobile only')

  test('toggle is reachable and reports its state', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Open menu' })

    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  })

  test('closes on Escape and restores focus', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Open menu' })

    await toggle.click()
    await page.keyboard.press('Escape')

    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()
  })

  test('traps focus while open', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()

    // Tab well past the number of focusable items; focus must stay in the panel.
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')

    const insidePanel = await page.evaluate(
      () => document.getElementById('nav-panel')?.contains(document.activeElement) ?? false
    )
    expect(insidePanel).toBe(true)
  })

  test('navigates from the panel', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: labelFor('/batches') })
      .click()
    await expect(page).toHaveURL(/\/batches\/?$/)
  })
})
