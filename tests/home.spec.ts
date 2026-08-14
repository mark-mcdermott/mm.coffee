import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('has one h1, and it is the headline', async ({ page }) => {
  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  await expect(h1).toContainText('Software')
  await expect(h1).toContainText('modern')
})

test('renders every section', async ({ page }) => {
  for (const heading of ['Selected programs', 'Brewing now', 'Our manifesto', 'System status']) {
    await expect(
      page.getByRole('heading', { name: heading, exact: true })
    ).toBeVisible()
  }
})

test('lists all three programs, each linking to its page', async ({ page }) => {
  const cards = page.locator('article')
  await expect(cards).toHaveCount(3)

  for (const slug of ['fullstack-wolfpack', 'mockingboard', 'markmcdermott-io']) {
    await expect(page.locator(`a[href="/programs/${slug}"]`)).toHaveCount(1)
  }
})

test('program cards are equal height and bottom-aligned', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'grid is single-column below lg')

  const boxes = await page.locator('article').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      const foot = el.querySelector('a > div:last-child')!.getBoundingClientRect()
      return { bottom: Math.round(r.bottom), footTop: Math.round(foot.top) }
    })
  )

  const bottoms = new Set(boxes.map((b) => b.bottom))
  expect(bottoms.size, 'cards should share a baseline').toBe(1)

  // The rule above the stack line should sit at the same height on every card.
  const footTops = new Set(boxes.map((b) => b.footTop))
  expect(footTops.size, 'stack bars should align').toBe(1)
})

test('the section headings link onward', async ({ page }) => {
  // Scoped to main: the nav also links to these, and on mobile it's hidden.
  const main = page.locator('main')
  await expect(main.locator('a[href="/programs"]').first()).toBeVisible()
  await expect(main.locator('a[href="/lab"]').first()).toBeVisible()
})

test('decorative art is hidden from assistive tech', async ({ page }) => {
  // Every inline SVG should either be labelled or explicitly hidden.
  const unlabelled = await page.locator('svg').evaluateAll((els) =>
    els
      .filter(
        (el) =>
          el.getAttribute('aria-hidden') !== 'true' &&
          !el.getAttribute('aria-label') &&
          !el.querySelector('title')
      )
      .map((el) => el.getAttribute('class') ?? '(no class)')
  )
  expect(unlabelled, `unlabelled svgs: ${unlabelled.join(', ')}`).toEqual([])
})
