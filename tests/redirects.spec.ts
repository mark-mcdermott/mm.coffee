import { test, expect } from '@playwright/test'

/**
 * Every section was renamed after the site was live, so each of these paths is
 * something that still exists in search results, in other people's links and —
 * for the press — in the item URLs of a feed people may be subscribed to.
 *
 * Nothing else checks them. The rename of a collection or a directory looks
 * entirely internal right up until one of these quietly becomes a 404, so this
 * is the guard that says the old front doors are still doors.
 */
const MOVED = [
  ['/programs', '/batches'],
  ['/programs/mockingboard', '/batches/mockingboard'],
  ['/lab', '/press'],
  ['/lab/outline-the-logo', '/press/outline-the-logo'],
  ['/about', '/company'],
  ['/contact', '/mailroom'],
] as const

test.describe('paths that moved', () => {
  for (const [from, to] of MOVED) {
    test(`${from} still leads to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 })

      // 301, so search engines transfer rather than index both.
      expect(response.status()).toBe(301)
      expect(response.headers()['location']).toBe(to)

      // And what it forwards to is a page, not another dead end.
      expect((await request.get(to)).status()).toBe(200)
    })
  }
})
