/**
 * Frontmatter schemas for every content collection.
 *
 * These live apart from `content.config.ts` because three things need them and
 * only one of those can import `astro:content`: the content layer validates
 * against them at build time, the admin derives its edit forms from them, and
 * the admin's save route re-validates against them before committing. One
 * definition, so a form can't drift from what the build will accept.
 *
 * Imported from zod directly: astro:content's `z` re-export is deprecated in
 * Astro 7, and zod v4 moved string formats to top level (`z.url()`).
 */
import { z } from 'zod'

/**
 * How the admin renders a field. Everything the form needs is normally read
 * straight off the JSON Schema — `enum` becomes a select, `boolean` a checkbox
 * — so this is only for the cases the type can't express: which strings want a
 * textarea, and which want a date picker.
 */
export type Control = 'textarea' | 'date' | 'markdown'

const renderedAs = (control: Control) => ({ control })

export const batchSchema = z.object({
  title: z.string().min(1),
  /** Controls display order and the BATCH 00N number in the comps. */
  order: z.number().int().positive(),
  tagline: z.string().min(1),
  summary: z.string().min(1).meta(renderedAs('textarea')),
  stack: z.array(z.string()).min(1),
  url: z.url(),
  repo: z.url().optional(),
  status: z.enum(['live', 'building', 'paused']),
  accent: z.enum(['red', 'blue', 'gold', 'orange']),
  /** Which art component fronts the card. */
  art: z.enum(['wolf', 'waves', 'chevrons']),
})

export const labSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  /**
   * Normalised to `YYYY-MM-DD`. Coerced because YAML parses an unquoted
   * `2026-08-14` into a Date, and requiring quotes is a footgun that only
   * shows up as a confusing schema error later.
   */
  date: z.coerce
    .date()
    .transform((d) => d.toISOString().slice(0, 10))
    .meta(renderedAs('date')),
  tags: z.array(z.string()).default([]),
  /**
   * `longform` widens the measure for essay-length posts. The column stays
   * pinned left either way — the asymmetry is the site's, not an oversight.
   */
  layout: z.enum(['standard', 'longform']).default('standard'),
  /** Drafts are written locally but excluded from production builds. */
  draft: z.boolean().default(false),
  /**
   * Keeps a post off the index, the feed and the older/newer chain without
   * hiding it: the page still builds, still carries its metadata and is still
   * in the sitemap. For a piece that belongs on the site but not in the run of
   * build logs — it is linked to on purpose rather than found by scrolling.
   */
  unlisted: z.boolean().default(false),
})
