/**
 * Entry summaries for the list screens.
 *
 * Reading every file to show a title is one request per entry against GitHub.
 * That's fine at this site's size — single figures per collection — and the
 * alternative is a second index that could disagree with the files themselves.
 * Revisit if a collection ever runs to hundreds.
 */
import type { CollectionKey } from './collections'
import { parseDocument } from './markdown'
import type { Store } from './storage'

export interface EntrySummary {
  slug: string
  title: string
  draft: boolean
  /** Press posts sort by this; collections without a date fall back to slug order. */
  date?: string
  order?: number
}

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return undefined
}

export const listEntries = async (
  store: Store,
  collection: CollectionKey
): Promise<EntrySummary[]> => {
  const slugs = await store.slugs(collection)

  const summaries = await Promise.all(
    slugs.map(async (slug): Promise<EntrySummary> => {
      const file = await store.read(collection, slug)
      if (!file) return { slug, title: slug, draft: false }

      const { data } = parseDocument(file.text)

      return {
        slug,
        // A file whose frontmatter is broken still has to be listable, or the
        // admin can't be used to fix it.
        title: asString(data.title) ?? slug,
        draft: data.draft === true,
        date: asString(data.date),
        order: typeof data.order === 'number' ? data.order : undefined,
      }
    })
  )

  return summaries.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order
    if (a.date && b.date) return b.date.localeCompare(a.date)
    return a.slug.localeCompare(b.slug)
  })
}
