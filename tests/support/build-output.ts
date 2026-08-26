import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The sitemap is emitted by the build, not served by the dev server the suite
 * runs against — so it's read from the build output. `pnpm test` builds first,
 * so this is always current.
 */
export const buildOutput = (file: string) =>
  readFileSync(join(process.cwd(), '.vercel/output/static', file), 'utf8')
