import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getPosts } from '@lib/lab'
import { SITE } from '@lib/site'

export async function GET(context: APIContext) {
  const posts = await getPosts()

  return rss({
    title: `${SITE.name} — Lab`,
    description: 'Build logs and technical notes from the studio.',
    site: context.site ?? SITE.url,
    trailingSlash: false,
    items: posts
      // Drafts are visible in dev but must never reach the feed.
      .filter((post) => !post.data.draft)
      .map((post) => ({
        title: post.data.title,
        description: post.data.subtitle,
        pubDate: new Date(`${post.data.date}T00:00:00Z`),
        categories: [...post.data.tags],
        link: `/lab/${post.id}`,
      })),
    customData: '<language>en-gb</language>',
  })
}
