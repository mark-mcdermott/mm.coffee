import { expect, test } from '@playwright/test'
import { COLLECTIONS } from '../src/lib/admin/collections'

/**
 * The suite runs against Astro's dev server, so the admin is in local mode:
 * no sign-in, and writes land in the working tree. That's what makes the
 * editor testable at all — but it also means the mutating tests are editing
 * real content, so they use their own slug and clean up after themselves.
 *
 * Both Playwright projects run concurrently against one server, so the slug is
 * per-project or the two runs would fight over the same file.
 */
const scratchSlug = (project: string) => `admin-e2e-${project}`

test.describe('admin shell', () => {
  test('lists every collection with a count', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: 'Content', exact: true })).toBeVisible()

    // Labels come from the registry rather than being restated: they are copy,
    // and a rename should not read as a broken admin.
    for (const { label } of Object.values(COLLECTIONS)) {
      await expect(page.getByRole('link', { name: new RegExp(label) })).toBeVisible()
    }

    await expect(page.getByText(/entries/).first()).toBeVisible()
  })

  test('says which mode it is in, so a local edit is never mistaken for a commit', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Local mode — editing the working tree')).toBeVisible()
  })

  test('keeps itself out of search results', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow'
    )
  })

  test('lists the entries in a collection', async ({ page }) => {
    await page.goto('/admin/batches')
    await expect(page.getByRole('link', { name: /Mockingboard/ })).toBeVisible()
  })
})

test.describe('the form is derived from the schema', () => {
  test('renders a control per field, typed by what the schema says', async ({ page }) => {
    await page.goto('/admin/batches/mockingboard')

    // An enum becomes a select carrying exactly the schema's members.
    const accent = page.locator('#field-accent')
    await expect(accent).toHaveValue('gold')
    await expect(accent.locator('option')).toHaveText(['red', 'blue', 'gold', 'orange'])

    // `.positive()` reaches the input as a floor, not just a server-side rule.
    const order = page.locator('#field-order')
    await expect(order).toHaveAttribute('type', 'number')
    await expect(order).toHaveAttribute('min', '1')

    // `.optional()` is the only difference between these two.
    await expect(page.locator('#field-url')).toHaveAttribute('required', '')
    await expect(page.locator('#field-repo')).not.toHaveAttribute('required', '')
  })

  test('honours the control hints the schema carries', async ({ page }) => {
    await page.goto('/admin/press/twenty-years-in-austin')

    await expect(page.locator('#field-date')).toHaveAttribute('type', 'date')
    await expect(page.locator('#field-date')).toHaveValue('2026-08-15')
    await expect(page.locator('#field-draft')).toHaveAttribute('type', 'checkbox')
    await expect(page.locator('#field-tags')).toHaveValue('studio, writing')
  })
})

test.describe('refusing bad input', () => {
  /**
   * `required` and `type="url"` stop most of this in the browser, so the case
   * worth driving through the UI is one the browser is happy with and the
   * schema is not: `required` counts whitespace as filled in, `.min(1)` after
   * a trim does not.
   */
  test('rejects a save, keeps what was typed, and writes nothing', async ({ page }) => {
    await page.goto('/admin/batches/mockingboard')

    await page.locator('#field-title').fill('   ')
    await page.locator('#field-tagline').fill('Edited but not saved')
    await page.getByRole('button', { name: /Save changes/ }).click()

    await expect(page.getByRole('alert')).toContainText(/need another look|needs another look/)
    await expect(page.locator('#field-title-error')).toBeVisible()

    // Still in the boxes — a rejected save must not cost you the rest of the edit.
    await expect(page.locator('#field-tagline')).toHaveValue('Edited but not saved')

    // And the entry on disk is untouched.
    await page.goto('/admin/batches/mockingboard')
    await expect(page.locator('#field-title')).toHaveValue('Mockingboard')
    await expect(page.locator('#field-tagline')).toHaveValue(
      'Drop mockups. Arrange freely. Export one PNG.'
    )
  })

  /** The browser's validation is a convenience; this is the one that counts. */
  test('rejects the same values when the browser is taken out of it', async ({
    page,
    request,
    baseURL,
  }) => {
    const response = await request.post('/admin/batches/mockingboard', {
      headers: { origin: new URL(baseURL ?? '').origin },
      form: {
        intent: 'save',
        title: '',
        order: '2',
        tagline: 'T',
        summary: 'S',
        stack: 'React',
        url: 'not-a-url',
        status: 'live',
        accent: 'gold',
        art: 'waves',
        body: 'x',
      },
    })

    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('field-title-error')
    expect(html).toContain('field-url-error')

    await page.goto('/admin/batches/mockingboard')
    await expect(page.locator('#field-url')).toHaveValue('https://mockingboard.design')
  })

  test('refuses a slug that already exists', async ({ page }) => {
    await page.goto('/admin/press/new')
    await page.locator('#field-slug').fill('twenty-years-in-austin')
    await page.locator('#field-title').fill('Dupe')
    await page.locator('#field-date').fill('2026-08-16')
    await page.getByRole('button', { name: /Create entry/ }).click()

    await expect(page.locator('#field-slug-error')).toContainText('already exists')
  })
})

test.describe('paths it must not follow', () => {
  const refused = [
    ['traversal', '/admin/press/..%2f..%2f..%2fetc%2fpasswd'],
    ['underscores', '/admin/press/not_a_slug'],
    ['unknown collection', '/admin/nope'],
    ['unknown entry', '/admin/press/no-such-post'],
  ] as const

  for (const [name, path] of refused) {
    test(`404s on ${name}`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(404)
    })
  }

  test('refuses a cross-site write even with a valid body', async ({ request }) => {
    const response = await request.post('/admin/press/new', {
      headers: { origin: 'https://evil.example' },
      form: { intent: 'save', slug: 'evil', title: 'Evil', date: '2026-08-16' },
    })
    expect(response.status()).toBe(403)
  })

  test('refuses a write with no origin at all', async ({ request }) => {
    const response = await request.post('/admin/press/new', {
      form: { intent: 'save', slug: 'evil', title: 'Evil', date: '2026-08-16' },
    })
    expect(response.status()).toBe(403)
  })
})

test.describe('round trip', () => {
  test('creates an entry, reads it back, and deletes it', async ({ page }, testInfo) => {
    const slug = scratchSlug(testInfo.project.name)

    await page.goto('/admin/press/new')
    await page.locator('#field-slug').fill(slug)
    // Quoting this wrong is the classic hand-rolled-YAML bug, so it's the title.
    await page.locator('#field-title').fill('Round trip: quotes & colons')
    await page.locator('#field-date').fill('2026-08-16')
    await page.locator('#field-tags').fill('alpha, beta')
    // Drafts are excluded from the production build, so a leaked scratch entry
    // could never reach the live site.
    await page.locator('#field-draft').check()
    await page.locator('#field-body').fill('# Heading\n\nBody text.')

    await page.getByRole('button', { name: /Create entry/ }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/press/${slug}\\?saved=1$`))
    await expect(page.getByRole('status')).toContainText('Saved')

    // Re-read from disk: the frontmatter survived the YAML round trip intact.
    await page.goto(`/admin/press/${slug}`)
    await expect(page.locator('#field-title')).toHaveValue('Round trip: quotes & colons')
    await expect(page.locator('#field-tags')).toHaveValue('alpha, beta')
    await expect(page.locator('#field-draft')).toBeChecked()
    await expect(page.locator('#field-body')).toHaveValue(/# Heading/)

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Delete this entry/ }).click()

    await expect(page).toHaveURL(/\/admin\/press\?deleted=/)
    expect((await page.request.get(`/admin/press/${slug}`)).status()).toBe(404)
  })
})
