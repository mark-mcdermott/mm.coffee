import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'lab'>

/**
 * Posts newest first. Drafts are visible while developing and dropped from
 * production builds, so an unfinished post can live in the repo safely.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('lab', ({ data }) => import.meta.env.DEV || !data.draft)
  return posts.sort((a, b) => b.data.date.localeCompare(a.data.date))
}

/** `2026.08.14` — matches the build stamp in the footer. */
export function formatDate(iso: string): string {
  return iso.replace(/-/g, '.')
}

/** `14 August 2026`, for the byline on a post. */
export function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
