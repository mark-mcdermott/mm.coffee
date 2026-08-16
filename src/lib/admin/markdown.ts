/**
 * Frontmatter in and out of a Markdown file.
 *
 * Serialising YAML by hand is a trap — taglines here contain colons and
 * apostrophes, both of which need context-dependent quoting — so `yaml` does
 * it. It's a server-only dependency: the admin routes are the only importers
 * and they never prerender, so none of it reaches the browser.
 */
import { parse, stringify } from 'yaml'

export interface Document {
  data: Record<string, unknown>
  body: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export const parseDocument = (raw: string): Document => {
  const match = raw.match(FRONTMATTER)
  if (!match) return { data: {}, body: raw.trim() }

  const parsed: unknown = parse(match[1])
  const data = parsed !== null && typeof parsed === 'object' ? parsed : {}

  return {
    data: data as Record<string, unknown>,
    body: raw.slice(match[0].length).trim(),
  }
}

export const serializeDocument = ({ data, body }: Document): string => {
  // `lineWidth: 0` keeps long summaries on one line; folded YAML is valid but
  // makes for a miserable diff when a single word changes.
  const frontmatter = stringify(data, { lineWidth: 0 })
  const trimmed = body.trim()

  return `---\n${frontmatter}---\n\n${trimmed}${trimmed ? '\n' : ''}`
}
