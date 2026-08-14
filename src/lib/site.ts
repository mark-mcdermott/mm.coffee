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

/** Build stamp shown in the footer. Real values on Vercel, fallbacks locally. */
export const BUILD = {
  sha: (import.meta.env.VERCEL_GIT_COMMIT_SHA as string | undefined)?.slice(0, 7) ?? 'local',
  env: (import.meta.env.VERCEL_ENV as string | undefined) ?? 'development',
  date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
} as const
