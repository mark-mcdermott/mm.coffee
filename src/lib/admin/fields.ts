/**
 * Turns a collection's zod schema into the fields its edit form should render,
 * and turns a submitted form back into the shape that schema expects.
 *
 * The point is that neither direction hardcodes a field list. Add `featured` to
 * a schema and the form grows a checkbox; change an enum's members and the
 * select follows. `z.toJSONSchema` does the reading, so the vocabulary this
 * understands is JSON Schema's, not zod's internals.
 */
import { z, type ZodType } from 'zod'
import type { Control } from '@lib/schemas'

export type Field =
  | { kind: 'text' | 'textarea' | 'url' | 'date'; name: string; required: boolean }
  | { kind: 'number'; name: string; required: boolean; min?: number }
  | { kind: 'boolean'; name: string; required: boolean }
  | { kind: 'select'; name: string; required: boolean; options: readonly string[] }
  | { kind: 'list'; name: string; required: boolean; minItems: number }

/** What `z.toJSONSchema` hands back for a single property. */
interface JsonSchemaProperty {
  type?: string
  enum?: readonly string[]
  format?: string
  control?: Control
  minItems?: number
  exclusiveMinimum?: number
  minimum?: number
}

/**
 * `io: 'input'` describes what may be *written*, which is what a form produces
 * — the output side would describe the parsed value, and for `date` that's a
 * transform result no form could submit. `unrepresentable: 'any'` keeps that
 * same transformed date from throwing; it arrives as `{}` and its `.meta()`
 * control hint is what identifies it.
 */
export const fieldsFor = (schema: ZodType): Field[] => {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as {
    properties?: Record<string, JsonSchemaProperty>
    required?: readonly string[]
  }

  const required = new Set(json.required ?? [])

  return Object.entries(json.properties ?? {}).map(([name, prop]) =>
    toField(name, prop, required.has(name))
  )
}

const toField = (name: string, prop: JsonSchemaProperty, required: boolean): Field => {
  if (prop.control === 'textarea' || prop.control === 'markdown') {
    return { kind: 'textarea', name, required }
  }
  if (prop.control === 'date') return { kind: 'date', name, required }
  if (prop.enum) return { kind: 'select', name, required, options: prop.enum }
  if (prop.type === 'boolean') return { kind: 'boolean', name, required }
  if (prop.type === 'array') {
    return { kind: 'list', name, required, minItems: prop.minItems ?? 0 }
  }
  if (prop.type === 'integer' || prop.type === 'number') {
    const min = prop.minimum ?? (prop.exclusiveMinimum !== undefined ? prop.exclusiveMinimum + 1 : undefined)
    return { kind: 'number', name, required, min }
  }
  if (prop.format === 'uri') return { kind: 'url', name, required }
  return { kind: 'text', name, required }
}

/** Lists are comma-separated in the form — one input, and no JavaScript to add rows. */
const parseList = (raw: string): string[] =>
  raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/**
 * Reads the submitted form into the schema's shape.
 *
 * Optional fields left blank are dropped rather than sent as `''`, so
 * `.optional()` sees a missing key instead of failing a `min(1)`. Nothing here
 * decides whether a value is acceptable — the caller re-runs the schema.
 */
export const valuesFrom = (fields: readonly Field[], form: FormData): Record<string, unknown> => {
  const values: Record<string, unknown> = {}

  for (const field of fields) {
    // An unchecked checkbox submits nothing at all, which is the `false` case.
    if (field.kind === 'boolean') {
      values[field.name] = form.get(field.name) !== null
      continue
    }

    const raw = form.get(field.name)
    if (typeof raw !== 'string') continue

    const trimmed = raw.trim()

    if (field.kind === 'list') {
      values[field.name] = parseList(trimmed)
      continue
    }

    if (trimmed === '' && !field.required) continue

    if (field.kind === 'number') {
      // Left as a string when it isn't a number so zod reports the bad field
      // rather than a silent NaN.
      const parsed = Number(trimmed)
      values[field.name] = trimmed === '' || Number.isNaN(parsed) ? trimmed : parsed
      continue
    }

    values[field.name] = trimmed
  }

  return values
}

/** Frontmatter back into form values, so the editor can render what's on disk. */
export const displayValue = (field: Field, value: unknown): string => {
  if (value === undefined || value === null) return ''
  if (field.kind === 'list') return Array.isArray(value) ? value.join(', ') : ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}
