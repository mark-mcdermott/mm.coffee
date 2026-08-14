/**
 * Verifies the palette's text colours clear WCAG AA against the paper
 * background, reading the tokens straight out of globals.css so the check can
 * never drift from what actually ships.
 *
 * The comp colours (red, gold, orange) are display colours and legitimately
 * fail at small sizes — they're asserted at the 3:1 large-text threshold, and
 * their `-deep` counterparts carry anything set at label size.
 */
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8')

const token = (name) => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`token --color-${name} not found in globals.css`)
  return match[1]
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
  ['red-deep', paper, 4.5, 'small red labels'],
  ['gold-deep', paper, 4.5, 'small gold labels'],
  ['orange-deep', paper, 4.5, 'small orange labels'],
  ['red', paper, 3, 'display headlines only'],
]

/** Printed for reference, not asserted — decorative fills carry no minimum. */
const DECORATIVE = ['gold', 'orange']

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

if (failed > 0) {
  console.error(`\n${failed} contrast check(s) failed`)
  process.exit(1)
}
console.log('\nall contrast checks passed')
