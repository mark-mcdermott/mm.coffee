import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
// Imported from zod directly: astro:content's `z` re-export is deprecated in
// Astro 7, and zod v4 moved string formats to top level (`z.url()`).
import { z } from 'zod'

const programs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/programs' }),
  schema: z.object({
    title: z.string(),
    /** Controls display order and the PROGRAM 00N number in the comps. */
    order: z.number().int().positive(),
    tagline: z.string(),
    summary: z.string(),
    stack: z.array(z.string()).min(1),
    url: z.url(),
    repo: z.url().optional(),
    status: z.enum(['live', 'building', 'paused']),
    accent: z.enum(['red', 'blue', 'gold']),
    /** Which art component fronts the card. */
    art: z.enum(['wolf', 'waves', 'chevrons']),
  }),
})

const lab = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lab' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    /**
     * Normalised to `YYYY-MM-DD`. Coerced because YAML parses an unquoted
     * `2026-08-14` into a Date, and requiring quotes is a footgun that only
     * shows up as a confusing schema error later.
     */
    date: z.coerce.date().transform((d) => d.toISOString().slice(0, 10)),
    tags: z.array(z.string()).default([]),
    /** Drafts are written locally but excluded from production builds. */
    draft: z.boolean().default(false),
  }),
})

export const collections = { programs, lab }
