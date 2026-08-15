// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  site: 'https://mm.coffee',
  adapter: vercel(),

  integrations: [
    sitemap({
      // The styleguide is a working tool, not a page anyone should find in
      // search results.
      filter: (page) => !page.includes('/styleguide'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
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
