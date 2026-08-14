/**
 * Minimal Code 39 encoder — enough to render a genuinely scannable barcode for
 * the batch number in the footer, rather than decorative noise.
 *
 * Each character is nine elements, alternating bar/space and starting on a bar.
 * `n` is a narrow element, `w` a wide one. Code 39 is self-checking, so no
 * check digit is required.
 */

const PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
}

// Every Code 39 symbol is nine elements with exactly three wide. Asserting this
// at module load turns a typo in the table above into an immediate build
// failure rather than a barcode that silently refuses to scan.
for (const [char, pattern] of Object.entries(PATTERNS)) {
  if (pattern.length !== 9) {
    throw new Error(`Code39: "${char}" has ${pattern.length} elements, expected 9`)
  }
  const wide = pattern.split('').filter((el) => el === 'w').length
  if (wide !== 3) {
    throw new Error(`Code39: "${char}" has ${wide} wide elements, expected 3`)
  }
}

export interface BarcodeBar {
  x: number
  width: number
}

export interface Barcode {
  bars: BarcodeBar[]
  width: number
}

/**
 * Returns the dark bars only — spaces are the gaps between them.
 * `narrow` is the width of a narrow element; wide elements are 3x narrow.
 */
export function encodeCode39(value: string, narrow = 2): Barcode {
  const text = `*${value.toUpperCase()}*`
  const bars: BarcodeBar[] = []
  let x = 0

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const pattern = PATTERNS[char]
    if (!pattern) {
      throw new Error(`Code39 cannot encode "${char}"`)
    }

    for (let e = 0; e < pattern.length; e++) {
      const width = pattern[e] === 'w' ? narrow * 3 : narrow
      // Even indices are bars, odd are spaces.
      if (e % 2 === 0) bars.push({ x, width })
      x += width
    }

    // Inter-character gap: one narrow space.
    if (i < text.length - 1) x += narrow
  }

  return { bars, width: x }
}
