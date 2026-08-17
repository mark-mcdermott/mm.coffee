import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
// Shared with the admin, which builds its forms from the same definitions and
// re-validates against them before it commits anything. See `@lib/schemas`.
import { labSchema, batchSchema } from '@lib/schemas'

const batches = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/batches' }),
  schema: batchSchema,
})

const lab = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lab' }),
  schema: labSchema,
})

export const collections = { batches, lab }
