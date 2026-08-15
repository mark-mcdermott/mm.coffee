/**
 * Generates the icon set from a single source glyph.
 *
 * The wordmark `m` is R41 Stop, outlined — same provenance as the logo, so the
 * favicon and the wordmark can never drift apart.
 *
 * Two treatments:
 *  - `favicon.svg`      cream disc + glyph. Legible at 16px, and the disc keeps
 *                       it visible against dark browser chrome, which a bare
 *                       black glyph on transparent would not be.
 *  - touch/PWA icons    the same disc plus the rainbow swoosh. At 180px+ there's
 *                       room for it to read; at 16px it just smears.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

/** Outlined `m` from R41 Stop, in its own 55.3 x 50.34 space. */
const GLYPH = {
  d: 'M0,0h37.03c12.8,0,18.26,5.97,18.26,18.77v31.57h-13.81v-30.06c0-4.89-1.51-8.2-6.69-8.2H13.81v38.26H0V0ZM21,19.2h13.38v31.14h-13.38v-31.14Z',
  width: 55.3,
  height: 50.34,
}

/** Read the palette from globals.css so the icons can't drift from the site. */
const css = readFileSync(join(ROOT, 'src/styles/globals.css'), 'utf8')
const token = (name) => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`--color-${name} not found in globals.css`)
  return match[1]
}

const PAPER = token('paper')
const INK = token('ink')
/** Ribbon order matches the hero: mustard, brown, rust, teal. */
const BANDS = [token('gold'), token('orange'), token('red'), token('blue')]
const BOX = 64

/** Centre the glyph in the 64-unit box at the given width. */
function placeGlyph(glyphWidth, offsetY = 0) {
  const scale = glyphWidth / GLYPH.width
  const w = GLYPH.width * scale
  const h = GLYPH.height * scale
  const x = (BOX - w) / 2
  const y = (BOX - h) / 2 + offsetY
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})"><path d="${GLYPH.d}" fill="${INK}"/></g>`
}

/** Swoosh bands arcing across the lower third. */
function swooshBands() {
  return BANDS.map((colour, i) => {
    const y = 44 + i * 4.4
    return `<path d="M-2 ${y}C14 ${(y - 7).toFixed(1)} 26 ${(y + 6).toFixed(1)} 66 ${(y - 4).toFixed(1)}" stroke="${colour}" stroke-width="3.2" fill="none" stroke-linecap="butt"/>`
  }).join('')
}

/** Clipped to the disc, for the round treatment. */
function swooshInDisc() {
  return `<clipPath id="disc"><circle cx="32" cy="32" r="32"/></clipPath><g clip-path="url(#disc)">${swooshBands()}</g>`
}

const flat = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" role="img" aria-label="mm.coffee">
  <title>mm.coffee</title>
  <circle cx="32" cy="32" r="32" fill="${PAPER}"/>
  ${placeGlyph(34)}
</svg>
`

/** Round treatment — the disc reads as the icon's own edge. */
const rich = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" role="img" aria-label="mm.coffee">
  <title>mm.coffee</title>
  <circle cx="32" cy="32" r="32" fill="${PAPER}"/>
  ${swooshInDisc()}
  ${placeGlyph(32, -5)}
</svg>
`

/**
 * Square treatment for iOS, which masks the icon itself — so the swoosh runs
 * edge to edge instead of clipping to a disc that would be invisible against a
 * same-coloured square.
 */
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" role="img" aria-label="mm.coffee">
  <title>mm.coffee</title>
  <rect width="${BOX}" height="${BOX}" fill="${PAPER}"/>
  ${swooshBands()}
  ${placeGlyph(32, -5)}
</svg>
`

mkdirSync(PUBLIC, { recursive: true })
writeFileSync(join(PUBLIC, 'favicon.svg'), flat)
console.log('wrote public/favicon.svg')

// Touch and PWA icons are raster: iOS ignores SVG favicons entirely.
const RASTER = [
  { file: 'apple-touch-icon.png', size: 180, source: square },
  { file: 'icon-192.png', size: 192, source: square },
  { file: 'icon-512.png', size: 512, source: square },
  { file: 'icon-round-512.png', size: 512, source: rich },
]

for (const { file, size, source } of RASTER) {
  const png = await sharp(Buffer.from(source), { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer()
  writeFileSync(join(PUBLIC, file), png)
  console.log(`wrote public/${file} (${size}x${size})`)
}

/**
 * favicon.ico for the places that still ask for it by name — search results,
 * feed readers, older tooling. An ICO may hold PNG payloads directly, so this
 * is just the directory header wrapped around PNGs sharp already renders.
 */
const ICO_SIZES = [16, 32, 48]
const images = await Promise.all(
  ICO_SIZES.map((size) =>
    sharp(Buffer.from(flat), { density: 384 }).resize(size, size).png().toBuffer()
  )
)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(ICO_SIZES.length, 4)

let offset = 6 + ICO_SIZES.length * 16
const entries = ICO_SIZES.map((size, i) => {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0) // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
  entry.writeUInt8(0, 2) // palette size
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(images[i].length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += images[i].length
  return entry
})

writeFileSync(join(PUBLIC, 'favicon.ico'), Buffer.concat([header, ...entries, ...images]))
console.log(`wrote public/favicon.ico (${ICO_SIZES.join(', ')})`)
