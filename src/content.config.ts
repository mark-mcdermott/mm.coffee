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

export const collections = { programs }
