import { test, expect } from '@playwright/test'
import { STATUS_TARGETS } from '../src/lib/status'

const STATES = ['online', 'offline', 'unconfigured', 'unknown']

test.describe('the status endpoint', () => {
  test('reports one result per target, each a known state', async ({ request }) => {
    const response = await request.get('/api/status')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(new Date(body.checkedAt).toString()).not.toBe('Invalid Date')
    expect(body.results.map((r: { id: string }) => r.id).sort()).toEqual(
      STATUS_TARGETS.map((t) => t.id).sort()
    )
    for (const result of body.results) {
      expect(STATES, `${result.id} returned an unknown state`).toContain(result.state)
    }
  })

  test('is cached so traffic does not hammer the checked hosts', async ({ request }) => {
    const cacheControl = (await request.get('/api/status')).headers()['cache-control']
    expect(cacheControl).toContain('s-maxage=300')
    expect(cacheControl).toContain('stale-while-revalidate')
  })

  test('distinguishes unconfigured email from a failure', async ({ request }) => {
    const body = await (await request.get('/api/status')).json()
    const email = body.results.find((r: { id: string }) => r.id === 'email')

    // Without a key this must read "unconfigured", never "online" — a green
    // light for mail this site can't actually send would be a lie.
    expect(email.state).not.toBe('online')
    expect(['unconfigured', 'offline', 'unknown']).toContain(email.state)
  })
})

test.describe('the footer strip', () => {
  test('starts neutral before anything has been checked', async ({ page }) => {
    // Block the endpoint so the pre-fetch state is what renders.
    await page.route('**/api/status', (route) => route.abort())
    await page.goto('/')

    const first = page.locator('[data-status-for]').first()
    await expect(first).not.toHaveClass(/text-signal/)
  })

  test('fills in each row from the response', async ({ page }) => {
    await page.route('**/api/status', (route) =>
      route.fulfill({
        json: {
          checkedAt: new Date().toISOString(),
          results: [
            { id: 'wolfpack', state: 'online' },
            { id: 'mockingboard', state: 'online' },
            { id: 'markmcdermott', state: 'online' },
            { id: 'email', state: 'online' },
          ],
        },
      })
    )
    await page.goto('/')

    await expect(page.locator('[data-status-for="wolfpack"]')).toHaveText('Online')
    await expect(page.locator('[data-status-for="wolfpack"]')).toHaveClass(/text-signal/)
    await expect(page.locator('[data-status-light]').first()).toHaveClass(/bg-signal/)
  })

  test('shows a downed target in red, and never summarizes as green', async ({ page }) => {
    await page.route('**/api/status', (route) =>
      route.fulfill({
        json: {
          checkedAt: new Date().toISOString(),
          results: [
            { id: 'wolfpack', state: 'offline' },
            { id: 'mockingboard', state: 'online' },
            { id: 'markmcdermott', state: 'online' },
            { id: 'email', state: 'online' },
          ],
        },
      })
    )
    await page.goto('/')

    await expect(page.locator('[data-status-for="wolfpack"]')).toHaveText('Offline')
    await expect(page.locator('[data-status-for="wolfpack"]')).toHaveClass(/text-red-deep/)

    // One failure must poison the summary light.
    await expect(page.locator('[data-status-light]').first()).not.toHaveClass(/bg-signal/)
  })

  test('degrades to unknown when the endpoint fails', async ({ page }) => {
    await page.route('**/api/status', (route) => route.fulfill({ status: 500, body: 'nope' }))
    await page.goto('/')

    const row = page.locator('[data-status-for]').first()
    await expect(row).toHaveText('Unknown')
    await expect(row).not.toHaveClass(/text-signal/)
    await expect(page.locator('[data-status-light]').first()).not.toHaveClass(/bg-signal/)
  })

  test('labels unconfigured email distinctly from online', async ({ page }) => {
    await page.route('**/api/status', (route) =>
      route.fulfill({
        json: {
          checkedAt: new Date().toISOString(),
          results: [
            { id: 'wolfpack', state: 'online' },
            { id: 'mockingboard', state: 'online' },
            { id: 'markmcdermott', state: 'online' },
            { id: 'email', state: 'unconfigured' },
          ],
        },
      })
    )
    await page.goto('/')

    await expect(page.locator('[data-status-for="email"]')).toHaveText('Not configured')
    await expect(page.locator('[data-status-for="email"]')).not.toHaveClass(/text-signal/)
  })
})
