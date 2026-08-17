export const SITE = {
  name: 'mm.coffee',
  url: 'https://mm.coffee',
  company: 'MM Coffee Co.',
  tagline: 'A software studio',
  location: 'Austin, Texas',
  author: 'Mark McDermott',
  email: 'mark@markmcdermott.io',
  description:
    'A software studio in Austin, Texas. Small-batch software, built with care.',

  // The feed's title. Named once because the feed itself and the `<link
  // rel="alternate">` that advertises it have to agree, and they live in
  // different files — they drifted from "Lab" to "Press" as a pair.
  feedTitle: 'Press',

  // The comps disagree with themselves — the packaging panel reads
  // "SINCE 2024" while the manifesto block and the favicon sheet both read
  // "EST. 2026". Single source of truth so it stays consistent everywhere.
  established: 2026,

  // Packaging panel copy.
  batch: '0001',
  batchCode: 'MM013379602024',
  roast: 'Full City',
  weight: 'Net 12oz (340g)',
  notes: 'Clean code, good taste, and a little bit weird.',
} as const

/**
 * Build stamp shown in the footer. Real values on Vercel, fallbacks locally.
 *
 * `import.meta.env` only exists under Vite, and this module is also imported
 * directly by the test suite for `SITE` — which runs in plain Node, where
 * reading a property off it would throw at module scope and take the whole file
 * down with it. Hence the fallback rather than a direct access.
 */
const env: Record<string, string | undefined> = import.meta.env ?? {}

export const BUILD = {
  sha: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  env: env.VERCEL_ENV ?? 'development',
  date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
} as const
