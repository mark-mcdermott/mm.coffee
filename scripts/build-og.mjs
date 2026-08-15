/**
 * Generates the social share image.
 *
 * Built from the same glyph and palette as the rest of the site rather than
 * exported by hand, so it can't drift from the brand. Run `pnpm build:og`.
 *
 * Run by hand, not at deploy time — `public/og.png` is committed. That matters
 * because the two `<text>` elements rasterise with whatever font the machine
 * has (Anton, falling back to a condensed system face), so regenerating
 * elsewhere can shift the headline. The wordmark itself is outlined paths and
 * is unaffected. If the headline ever needs to be typographically exact, outline
 * it in the design file and paste the paths here.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

/** Read the palette from globals.css so this can never disagree with the site. */
const css = readFileSync(join(ROOT, 'src/styles/globals.css'), 'utf8')
const token = (name) => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`--color-${name} not found`)
  return match[1]
}

const paper = token('paper')
const ink = token('ink')
const red = token('red')
const gold = token('gold')
const orange = token('orange')
const blue = token('blue')

const W = 1200
const H = 630

/** The outlined `mm.coffee` wordmark, in its own 1041.39 x 145.6 space. */
const WORDMARK = [
  'M0,2.8h103c35.6,0,50.8,16.6,50.8,52.2v87.8h-38.4V59.2c0-13.6-4.2-22.8-18.6-22.8h-58.4v106.4H0V2.8ZM58.4,56.2h37.2v86.6h-37.2V56.2Z',
  'M167.8,2.8h103c35.6,0,50.8,16.6,50.8,52.2v87.8h-38.4V59.2c0-13.6-4.2-22.8-18.6-22.8h-58.4v106.4h-38.4V2.8ZM226.2,56.2h37.2v86.6h-37.2V56.2Z',
  'M335.6,109.8h35.6v33h-35.6v-33Z',
  'M371.2,73c0-42.4,32-70.2,76.4-70.2h18.2v33.4h-11.4c-24.6,0-42.6,12.2-42.6,36.8s18,36.8,42.6,36.8h11.4v33h-18.2c-44.4,0-76.4-27.4-76.4-69.8Z',
  'M467.8,72.8c0-43.6,30.4-72.8,72.8-72.8s72.8,29.2,72.8,72.8-30.4,72.8-72.8,72.8-72.8-29.2-72.8-72.8ZM572.79,72.8c0-24.8-11.2-40.2-32.2-40.2s-32.2,15.4-32.2,40.2,11.2,40,32.2,40.2,32.2-15.2,32.2-40.2Z',
  'M623.39,2.8h93v33.6h-93V2.8ZM623.39,56.2h92v33h-53.6v53.6h-38.4V56.2Z',
  'M730.39,2.8h93v33.6h-93V2.8ZM730.39,56.2h92v33h-53.6v53.6h-38.4V56.2Z',
  'M837.39,2.8h95v33.6h-95V2.8ZM837.39,56.2h94v33h-55.6v20.6h56.6v33h-95V56.2Z',
  'M946.39,2.8h95v33.6h-95V2.8ZM946.39,56.2h94v33h-55.6v20.6h56.6v33h-95V56.2Z',
]

/** Ribbon sweeping across the lower right, echoing the hero. */
const ribbon = [gold, orange, red, blue]
  .map((colour, i) => {
    const y = 470 + i * 46
    return `<path d="M-40 ${y}C220 ${y - 90} 470 ${y + 70} 1240 ${y - 120}" stroke="${colour}" stroke-width="34" fill="none"/>`
  })
  .join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${paper}"/>
  <g opacity="0.95">${ribbon}</g>
  <g transform="translate(80 96) scale(0.72)" fill="${ink}">
    ${WORDMARK.map((d) => `<path d="${d}"/>`).join('')}
  </g>
  <text x="80" y="300" font-family="Anton, 'Arial Narrow', sans-serif" font-size="86" fill="${ink}" letter-spacing="-1">
    SOFTWARE FOR THE
  </text>
  <text x="80" y="386" font-family="Anton, 'Arial Narrow', sans-serif" font-size="86" fill="${red}" letter-spacing="-1">
    MODERN AGE.
  </text>
  <text x="82" y="440" font-family="ui-monospace, monospace" font-size="21" fill="${ink}" opacity="0.7" letter-spacing="1.6">
    A SOFTWARE STUDIO IN AUSTIN, TEXAS
  </text>
</svg>`

const png = await sharp(Buffer.from(svg)).png().toBuffer()
writeFileSync(join(PUBLIC, 'og.png'), png)
console.log(`wrote public/og.png (${W}x${H}, ${(png.length / 1024).toFixed(0)}kB)`)
