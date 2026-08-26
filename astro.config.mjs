// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'
import { satteri } from '@astrojs/markdown-satteri'
import { satteriImageTreatment } from './src/lib/satteri-image-treatment.mjs'

// https://astro.build/config
export default defineConfig({
  site: 'https://mm.coffee',
  adapter: vercel(),

  /**
   * The sections were renamed after the site was live, so the old paths still
   * exist in search results, in anything anyone linked, and — for the lab —
   * in the item URLs of a feed people may already be subscribed to. These keep
   * them working; without them every one of those becomes a 404.
   *
   * The `[slug]` forms forward the entries too, so `/lab/twenty-years-in-austin`
   * lands on its post rather than on the index. The parameter has to be spelled
   * the way the destination route spells it — `[slug]`, not `[...slug]`, or the
   * build rejects it. 301, because these moves are permanent and search engines
   * should transfer rather than index both.
   */
  redirects: {
    '/programs': { status: 301, destination: '/batches' },
    '/programs/[slug]': { status: 301, destination: '/batches/[slug]' },
    '/lab': { status: 301, destination: '/press' },
    '/lab/[slug]': { status: 301, destination: '/press/[slug]' },
    '/about': { status: 301, destination: '/company' },
    '/contact': { status: 301, destination: '/mailroom' },
  },

  integrations: [
    sitemap({
      // The styleguide is a working tool and the admin is behind a login —
      // neither is a page anyone should find in search results.
      filter: (page) => !page.includes('/styleguide') && !page.includes('/admin'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    // Sätteri is Astro 7's default Markdown processor; naming it explicitly is
    // what allows a plugin to be added. Features are left at their defaults, so
    // this parses exactly as it did before.
    processor: satteri({ mdastPlugins: [satteriImageTreatment] }),

    shikiConfig: {
      // Muted and low-chroma, so highlighted code sits beside the palette
      // rather than competing with it. The block's background is overridden to
      // ink in globals.css so it matches the rest of the design.
      theme: 'vitesse-dark',
      wrap: false,
    },
  },

  // Self-hosted and subset at build time — no request ever leaves for a font CDN.
  fonts: [
    {
      name: 'Anton',
      cssVariable: '--font-anton',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Arial Narrow', 'Helvetica Neue', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      provider: fontProviders.google(),
      weights: [400, 500, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
  ],
})
