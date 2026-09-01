/**
 * Verifies the palette's text colors clear WCAG AA against the paper
 * background, reading the tokens straight out of globals.css so the check can
 * never drift from what actually ships.
 *
 * The comp colors (red, gold, orange) are display colors and legitimately
 * fail at small sizes — they're asserted at the 3:1 large-text threshold, and
 * their `-deep` counterparts carry anything set at label size.
 */
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8')

/**
 * Resolves a color token to a hex value, following `var()` aliases — some
 * tokens alias another rather than repeating a literal, so that a change to one
 * can't silently desync the other.
 */
const token = (name, seen = new Set()) => {
  if (seen.has(name)) throw new Error(`circular alias at --color-${name}`)
  seen.add(name)

  const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`token --color-${name} not found in globals.css`)

  const value = match[1].trim()
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value

  const alias = value.match(/^var\(\s*--color-([\w-]+)\s*\)$/)
  if (alias) return token(alias[1], seen)

  throw new Error(`--color-${name} is neither a hex nor a var() alias: ${value}`)
}

const luminance = (hex) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((v) =>
    v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const paper = token('paper')

/** [foreground, background, minimum ratio, why] */
const CASES = [
  ['ink', paper, 4.5, 'body text'],
  ['blue', paper, 4.5, 'sub-headings and taglines'],
  ['signal', paper, 4.5, 'status text'],
  ['red-deep', paper, 4.5, 'small rust labels'],
  ['gold-deep', paper, 4.5, 'small mustard labels'],
  ['orange-deep', paper, 4.5, 'small brown labels'],
  ['blue-deep', paper, 4.5, 'small teal labels'],
  ['orange', paper, 4.5, 'brown clears AA on its own'],
  ['red', paper, 3, 'display headlines only'],
]

/** Printed for reference, not asserted — decorative fills carry no minimum. */
const DECORATIVE = ['gold']

let failed = 0
console.log(`background: paper ${paper}\n`)

for (const [name, bg, min, why] of CASES) {
  const fg = token(name)
  const ratio = contrast(fg, bg)
  const ok = ratio >= min
  if (!ok) failed++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(12)} ${fg}  ${ratio.toFixed(2)}:1` +
      `  (needs ${min}:1 — ${why})`
  )
}

// Reversed-out text on solid panels.
for (const [bgName, min, why] of [
  ['crate', 4.5, 'handle-with-care bar'],
  ['ink', 4.5, 'buttons'],
]) {
  const bg = token(bgName)
  const ratio = contrast(paper, bg)
  const ok = ratio >= min
  if (!ok) failed++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  paper on ${bgName.padEnd(6)} ${bg}  ` +
      `${ratio.toFixed(2)}:1  (needs ${min}:1 — ${why})`
  )
}

console.log('\ndecorative only — must never carry text:')
for (const name of DECORATIVE) {
  const hex = token(name)
  console.log(`      ${name.padEnd(12)} ${hex}  ${contrast(hex, paper).toFixed(2)}:1`)
}

/**
 * Two places name the paper color outside the stylesheet, because neither can
 * read a CSS variable: the `theme-color` meta tag and the web manifest. They
 * are the only hardcoded colors left in the project, so they're asserted here
 * rather than left to be remembered during a palette change.
 */
const PAPER_COPIES = [
  ['src/layouts/Layout.astro', /<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/],
  ['public/site.webmanifest', /"background_color":\s*"(#[0-9a-fA-F]{6})"/],
  ['public/site.webmanifest', /"theme_color":\s*"(#[0-9a-fA-F]{6})"/],
]

console.log('\npaper is also named outside globals.css:')
for (const [file, pattern] of PAPER_COPIES) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const found = source.match(pattern)?.[1]

  if (!found) {
    failed++
    console.log(`FAIL  ${file.padEnd(26)} no color matched — did the markup change?`)
    continue
  }

  const ok = found.toLowerCase() === paper.toLowerCase()
  if (!ok) failed++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${file.padEnd(26)} ${found}` +
      (ok ? '  matches --color-paper' : `  should be ${paper}`)
  )
}

if (failed > 0) {
  console.error(`\n${failed} contrast check(s) failed`)
  process.exit(1)
}
console.log('\nall contrast checks passed')
