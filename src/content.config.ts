import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
// Shared with the admin, which builds its forms from the same definitions and
// re-validates against them before it commits anything. See `@lib/schemas`.
import { pressSchema, batchSchema } from '@lib/schemas'

const batches = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/batches' }),
  schema: batchSchema,
})

const press = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/press' }),
  schema: pressSchema,
})

export const collections = { batches, press }
