/**
 * Test server for the Playwright suite.
 *
 * The site is mostly static, but `/mailroom` and `/api/*` render per request, so
 * a plain file server can't exercise them. Astro's programmatic `dev()` runs
 * both, and — unlike the `astro dev` CLI, which daemonises and exits — it stays
 * in the foreground, so Playwright can own its lifecycle.
 */
import { dev } from 'astro'

const port = Number(process.env.PORT ?? 4399)

const server = await dev({
  root: new URL('..', import.meta.url).pathname,
  server: { port, host: false },
  logLevel: 'error',
  // The toolbar injects its own headings and landmarks, which production never
  // has — leaving it on makes the DOM under test differ from what ships.
  devToolbar: { enabled: false },
})

console.log(`test server on http://localhost:${port}`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.stop()
    process.exit(0)
  })
}
