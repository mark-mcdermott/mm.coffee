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
  for (const heading of ['Selected batches', 'Brewing now', 'My manifesto', 'System status']) {
    await expect(
      page.getByRole('heading', { name: heading, exact: true })
    ).toBeVisible()
  }
})

test('lists all three batches, each linking to its page', async ({ page }) => {
  const cards = page.locator('article')
  await expect(cards).toHaveCount(3)

  for (const slug of ['fullstack-wolfpack', 'mockingboard', 'markmcdermott-io']) {
    await expect(page.locator(`a[href="/batches/${slug}"]`)).toHaveCount(1)
  }
})

test('batch cards are equal height and bottom-aligned', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'grid is single-column below lg')

  // Retried: the admin suite writes real files into src/content, which makes the
  // dev server re-sync the collections and reload whatever page is open. That
  // can destroy this page's execution context mid-measurement. The assertion is
  // unchanged — only the read is repeated until it happens against a live page.
  await expect(async () => {
    const boxes = await page.locator('article').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        const foot = el.querySelector('a > div:last-child')!.getBoundingClientRect()
        return { bottom: Math.round(r.bottom), footTop: Math.round(foot.top) }
      })
    )

    expect(boxes.length, 'three cards to compare').toBe(3)

    const bottoms = new Set(boxes.map((b) => b.bottom))
    expect(bottoms.size, 'cards should share a baseline').toBe(1)

    // The rule above the stack line should sit at the same height on every card.
    const footTops = new Set(boxes.map((b) => b.footTop))
    expect(footTops.size, 'stack bars should align').toBe(1)
  }).toPass()
})

test('the section headings link onward', async ({ page }) => {
  // Scoped to main: the nav also links to these, and on mobile it's hidden.
  const main = page.locator('main')
  await expect(main.locator('a[href="/batches"]').first()).toBeVisible()
  await expect(main.locator('a[href="/press"]').first()).toBeVisible()
})

test('decorative art is hidden from assistive tech', async ({ page }) => {
  // Retried for the same reason as the card measurement above — a content
  // re-sync elsewhere in the suite can reload this page while the read runs.
  await expect(async () => {
    // Every inline SVG should either be labelled or explicitly hidden.
    const svgs = page.locator('svg')
    expect(await svgs.count(), 'page has rendered its art').toBeGreaterThan(0)

    const unlabelled = await svgs.evaluateAll((els) =>
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
  }).toPass()
})
