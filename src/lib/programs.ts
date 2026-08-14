import { getCollection, type CollectionEntry } from 'astro:content'

export type Program = CollectionEntry<'programs'>

/** Programs in display order, as numbered in the comps (PROGRAM 001, 002, …). */
export async function getPrograms(): Promise<Program[]> {
  const programs = await getCollection('programs')
  return programs.sort((a, b) => a.data.order - b.data.order)
}

/** Zero-padded program number, e.g. `001`. */
export function programNumber(order: number): string {
  return String(order).padStart(3, '0')
}

/**
 * Accent colours for label-size text use the `-deep` variants — the comp
 * colours are display colours and fail AA below ~24px. See globals.css.
 */
const ACCENT_TEXT = {
  red: 'text-red-deep',
  blue: 'text-blue',
  gold: 'text-gold-deep',
} as const

export function accentText(accent: Program['data']['accent']): string {
  return ACCENT_TEXT[accent]
}
