import { test, expect } from '@playwright/test'
import { evaluateSubmission, MIN_FILL_MS } from '../src/lib/contact'

const NOW = 1_760_000_000_000
const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'I have an idea that needs building. Can we talk about it?',
  company: '',
  startedAt: NOW - 30_000,
}

test.describe('submission rules', () => {
  test('accepts a well-formed message', () => {
    const verdict = evaluateSubmission(valid, NOW)
    expect(verdict.outcome).toBe('send')
  })

  test('rejects a missing name, bad email and thin message, all at once', () => {
    const verdict = evaluateSubmission(
      { ...valid, name: '  ', email: 'not-an-email', message: 'hi' },
      NOW
    )

    expect(verdict.outcome).toBe('invalid')
    if (verdict.outcome !== 'invalid') return

    // Every bad field reports, so the form can show them together rather than
    // making someone fix one error per round trip.
    expect(Object.keys(verdict.errors).sort()).toEqual(['email', 'message', 'name'])
  })

  test('treats a filled honeypot as a trap, not an error', () => {
    const verdict = evaluateSubmission({ ...valid, company: 'Acme Corp' }, NOW)
    expect(verdict.outcome).toBe('trap')
  })

  test('treats an instant submission as a trap', () => {
    const verdict = evaluateSubmission({ ...valid, startedAt: NOW - 200 }, NOW)
    expect(verdict.outcome).toBe('trap')
  })

  test('allows a submission just past the timing floor', () => {
    const verdict = evaluateSubmission({ ...valid, startedAt: NOW - MIN_FILL_MS - 1 }, NOW)
    expect(verdict.outcome).toBe('send')
  })

  test('accepts a submission with no timestamp at all', () => {
    // Someone with JS disabled never gets the stamp; that must not block them.
    const { startedAt, ...withoutStamp } = valid
    expect(evaluateSubmission(withoutStamp, NOW).outcome).toBe('send')
  })

  test('trims whitespace so a spaces-only name cannot pass', () => {
    expect(evaluateSubmission({ ...valid, name: '     ' }, NOW).outcome).toBe('invalid')
  })

  test('rejects an over-long message rather than truncating it', () => {
    const verdict = evaluateSubmission({ ...valid, message: 'x'.repeat(5001) }, NOW)
    expect(verdict.outcome).toBe('invalid')
  })
})

test.describe('the api endpoint', () => {
  const good = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'A real message, long enough to clear the minimum.',
  }

  test('reports every invalid field at once', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { accept: 'application/json' },
      data: { name: '', email: 'nope', message: 'hi' },
    })

    expect(response.status()).toBe(422)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(Object.keys(body.errors).sort()).toEqual(['email', 'message', 'name'])
  })

  test('answers a tripped honeypot exactly like a success', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { accept: 'application/json' },
      data: { ...good, company: 'Acme Corp' },
    })

    // Indistinguishable from a real send, so a bot learns nothing — and because
    // this returns before the send path, no mail goes out and no key is needed.
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  test('says so plainly when mail is not configured', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { accept: 'application/json' },
      data: good,
    })

    // Without RESEND_API_KEY this must fail loudly rather than pretend to send.
    if (response.status() === 200) {
      test.info().annotations.push({ type: 'note', description: 'RESEND_API_KEY is set; live send path exercised' })
      return
    }

    expect(response.status()).toBe(503)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.message).toContain('@')
  })

  test('redirects rather than returning json when the client is a plain form', async ({
    request,
    baseURL,
  }) => {
    const response = await request.post('/api/contact', {
      // Browsers send Origin on same-site form posts; Astro's CSRF check
      // requires it for form-encoded bodies, so the test has to send it too.
      headers: { origin: baseURL! },
      form: { ...good, company: 'Acme Corp' },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(303)
    expect(response.headers()['location']).toContain('/mailroom?sent=1')
  })

  test('blocks a cross-origin form post', async ({ request }) => {
    // Astro's checkOrigin covers exactly the content types a cross-origin form
    // can send without a preflight. Worth pinning: turning it off would quietly
    // open the endpoint to CSRF.
    const response = await request.post('/api/contact', {
      headers: { origin: 'https://not-mm.coffee' },
      form: good,
      maxRedirects: 0,
    })

    expect(response.status()).toBe(403)
  })

  test('rejects a malformed body without throwing', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      data: 'not json at all',
    })

    expect([400, 422]).toContain(response.status())
  })
})

test.describe('the contact page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mailroom')
  })

  test('labels every field', async ({ page }) => {
    for (const label of ['Name', 'Email', 'Message']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
  })

  test('works without JavaScript as a plain form post', async ({ page }) => {
    const form = page.locator('#contact-form')
    await expect(form).toHaveAttribute('method', /post/i)
    await expect(form).toHaveAttribute('action', '/api/contact')
  })

  test('hides the honeypot from people and assistive tech', async ({ page }) => {
    const honeypot = page.locator('input[name="company"]')
    await expect(honeypot).toHaveCount(1)

    // Kept in the layout but pushed off-screen, rather than display:none — some
    // bots skip fields they can tell are hidden.
    const box = await honeypot.boundingBox()
    expect(box, 'honeypot should still be laid out').not.toBeNull()
    expect(box!.x + box!.width, 'honeypot should sit off-screen').toBeLessThan(0)

    await expect(honeypot).toHaveAttribute('tabindex', '-1')
    await expect(honeypot).toHaveAttribute('autocomplete', 'off')
    await expect(page.locator('[aria-hidden="true"] input[name="company"]')).toHaveCount(1)
  })

  test('offers a direct address as a fallback route', async ({ page }) => {
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(1)
  })

  test('confirms a send via the query string, for the no-JS path', async ({ page }) => {
    await page.goto('/mailroom?sent=1')
    await expect(page.getByRole('status')).toContainText('Message sent')
  })

  test('reports a failure via the query string', async ({ page }) => {
    await page.goto('/mailroom?error=1')
    await expect(page.getByRole('alert').first()).toContainText("didn't send")
  })
})
