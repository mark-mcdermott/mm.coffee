// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import vercel from '@astrojs/vercel'

// https://astro.build/config
export default defineConfig({
  site: 'https://mm.coffee',
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()],
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
