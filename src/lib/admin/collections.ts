/**
 * The collections the admin can edit, and where their files live.
 *
 * A closed registry on purpose: every route takes the collection from the URL,
 * so this is what stops a crafted path from pointing the editor at somewhere
 * that isn't content.
 */
import type { ZodType } from 'zod'
import { pressSchema, batchSchema } from '@lib/schemas'

export interface AdminCollection {
  readonly label: string
  /** Repo-relative, and the only directory this collection may touch. */
  readonly dir: string
  readonly schema: ZodType
  /** Shown in the entry list and used for the browser title. */
  readonly blurb: string
}

export const COLLECTIONS = {
  batches: {
    label: 'Batches',
    dir: 'src/content/batches',
    schema: batchSchema,
    blurb: 'Projects on the roster',
  },
  press: {
    label: 'Press',
    dir: 'src/content/press',
    schema: pressSchema,
    blurb: 'Posts and writing',
  },
} as const satisfies Record<string, AdminCollection>

export type CollectionKey = keyof typeof COLLECTIONS

export const isCollectionKey = (value: string): value is CollectionKey =>
  Object.hasOwn(COLLECTIONS, value)

/**
 * Filenames are the slug, so anything that isn't a plain kebab word could climb
 * out of the collection directory. Checked on every read and every write rather
 * than once at the edge, because it's the only thing standing between a URL and
 * an arbitrary path in the repo.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** `/admin/press/new` is the editor's create mode, so nothing may be filed under it. */
const RESERVED = new Set(['new'])

export const isSlug = (value: string): boolean =>
  SLUG.test(value) && value.length <= 80 && !RESERVED.has(value)

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')

export const entryPath = (collection: CollectionKey, slug: string): string => {
  if (!isSlug(slug)) throw new Error(`Refusing to build a path for slug "${slug}"`)
  return `${COLLECTIONS[collection].dir}/${slug}.md`
}
