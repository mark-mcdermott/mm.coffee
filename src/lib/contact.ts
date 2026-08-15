import { z } from 'zod'

/**
 * Shared between the API route and the form so the two can't drift.
 *
 * `company` is a honeypot: it's hidden from people and left empty, so anything
 * in it came from a bot. `startedAt` carries when the form was rendered — real
 * submissions take a few seconds, scripted ones are usually instant.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name').max(120, 'That name is too long'),
  email: z.email('That email address looks wrong').max(254),
  message: z
    .string()
    .trim()
    .min(10, 'A little more detail, please')
    .max(5000, 'That message is too long — email directly instead'),
  /** Accepts anything: the check belongs in evaluateSubmission, not here,
      or a filled trap would come back as a 422 naming the field. */
  company: z.string().optional().default(''),
  startedAt: z.coerce.number().optional(),
})

export type ContactInput = z.infer<typeof contactSchema>

/** Submissions faster than this are almost certainly scripted. */
export const MIN_FILL_MS = 2500

export interface ContactErrors {
  [field: string]: string
}

export interface ContactResponse {
  ok: boolean
  errors?: ContactErrors
  message?: string
}

/** Flattens zod issues into one message per field, for rendering beside inputs. */
export function fieldErrors(error: z.ZodError): ContactErrors {
  const errors: ContactErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    errors[key] ??= issue.message
  }
  return errors
}

export type Verdict =
  | { outcome: 'invalid'; errors: ContactErrors }
  /** Caught by the honeypot or the timing floor. Answer 200, send nothing. */
  | { outcome: 'trap' }
  | { outcome: 'send'; data: ContactInput }

/**
 * Decides what to do with a submission. Kept separate from the route so it can
 * be tested without standing up a server — the route is then only transport.
 */
export function evaluateSubmission(raw: unknown, now = Date.now()): Verdict {
  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) {
    return { outcome: 'invalid', errors: fieldErrors(parsed.error) }
  }

  const { company, startedAt } = parsed.data
  const tooFast = typeof startedAt === 'number' && now - startedAt < MIN_FILL_MS
  if (company || tooFast) return { outcome: 'trap' }

  return { outcome: 'send', data: parsed.data }
}
