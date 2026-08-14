/**
 * Minimal static server for the built output, used by the Playwright suite.
 *
 * `astro preview` daemonises itself, which races Playwright's readiness probe,
 * so the tests get a plain foreground server instead.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = new URL('../.vercel/output/static/', import.meta.url).pathname
const PORT = Number(process.env.PORT ?? 4399)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const send = (res, status, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'content-type': type })
  res.end(body)
}

createServer(async (req, res) => {
  // Strip the query string and block traversal above the output root.
  const path = normalize(decodeURIComponent(req.url.split('?')[0]))
  if (path.includes('..')) return send(res, 400, 'bad request')

  const candidates = path.endsWith('/')
    ? [join(ROOT, path, 'index.html')]
    : [join(ROOT, path), join(ROOT, `${path}.html`), join(ROOT, path, 'index.html')]

  for (const file of candidates) {
    try {
      const info = await stat(file)
      if (!info.isFile()) continue
      const body = await readFile(file)
      return send(res, 200, body, TYPES[extname(file)] ?? 'application/octet-stream')
    } catch {
      // try the next candidate
    }
  }

  try {
    return send(res, 404, await readFile(join(ROOT, '404.html')), TYPES['.html'])
  } catch {
    return send(res, 404, 'not found')
  }
}).listen(PORT, () => {
  console.log(`serving ${ROOT} on http://localhost:${PORT}`)
})
