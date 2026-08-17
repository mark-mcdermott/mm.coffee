import { getCollection, type CollectionEntry } from 'astro:content'

export type Batch = CollectionEntry<'batches'>

/** Batches in display order, as numbered in the comps (BATCH 001, 002, …). */
export async function getBatches(): Promise<Batch[]> {
  const batches = await getCollection('batches')
  return batches.sort((a, b) => a.data.order - b.data.order)
}

/** Zero-padded batch number, e.g. `001`. */
export function batchNumber(order: number): string {
  return String(order).padStart(3, '0')
}

/**
 * Accent colours for label-size text use the `-deep` variants — the comp
 * colours are display colours and fail AA below ~24px. See globals.css.
 */
const ACCENT_TEXT = {
  red: 'text-red-deep',
  blue: 'text-blue-deep',
  gold: 'text-gold-deep',
  orange: 'text-orange-deep',
} as const

export function accentText(accent: Batch['data']['accent']): string {
  return ACCENT_TEXT[accent]
}
