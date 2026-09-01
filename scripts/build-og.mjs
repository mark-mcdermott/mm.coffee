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
import { MONOGRAM, NAME, VIEW_BOX } from '../src/lib/logo.ts'

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

/** Drawn width of the wordmark. Adding `co` made the name wider, so this is set
 *  as a span rather than a scale factor — the mark keeps its place on the card
 *  whatever the letter count. */
const WORDMARK_SPAN = 940

/**
 * The wordmark, imported rather than restated. This file used to keep its own
 * copy, which is how the share image went on drawing a full stop for two
 * releases after `Logo.astro` dropped it — nothing regenerates og.png
 * automatically, so a stale copy here is invisible until someone looks.
 *
 * `WORDMARK_TOP` is the y the wordmark's ink starts at in the shared
 * coordinate space; the inner translate lifts it to the origin.
 */
const WORDMARK = [...MONOGRAM, ...NAME]
const [, WORDMARK_TOP, WORDMARK_WIDTH] = VIEW_BOX.wordmark.split(' ').map(Number)

/** Ribbon sweeping across the lower right, echoing the hero. */
const ribbon = [gold, orange, red, blue]
  .map((color, i) => {
    const y = 478 + i * 46
    return `<path d="M-40 ${y}C220 ${y - 90} 470 ${y + 70} 1240 ${y - 120}" stroke="${color}" stroke-width="34" fill="none"/>`
  })
  .join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${paper}"/>
  <g opacity="0.95">${ribbon}</g>
  <g transform="translate(80 96) scale(${(WORDMARK_SPAN / WORDMARK_WIDTH).toFixed(4)}) translate(0 ${-WORDMARK_TOP})" fill="${ink}">
    ${WORDMARK.map((d) => `<path d="${d}"/>`).join('')}
  </g>
  <text x="80" y="300" font-family="Anton, 'Arial Narrow', sans-serif" font-size="86" fill="${ink}" letter-spacing="-1">
    SOFTWARE FOR THE
  </text>
  <text x="80" y="386" font-family="Anton, 'Arial Narrow', sans-serif" font-size="86" fill="${red}" letter-spacing="-1">
    MODERN AGE.
  </text>
  <text x="82" y="416" font-family="ui-monospace, monospace" font-size="21" fill="${ink}" opacity="0.7" letter-spacing="1.6">
    A SOFTWARE STUDIO IN AUSTIN, TEXAS
  </text>
</svg>`

const png = await sharp(Buffer.from(svg)).png().toBuffer()
writeFileSync(join(PUBLIC, 'og.png'), png)
console.log(`wrote public/og.png (${W}x${H}, ${(png.length / 1024).toFixed(0)}kB)`)
