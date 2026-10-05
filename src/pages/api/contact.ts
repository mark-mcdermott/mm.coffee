import type { APIRoute } from 'astro'
import { Resend } from 'resend'
import { SITE } from '@lib/site'
import { evaluateSubmission, type ContactResponse } from '@lib/contact'

export const prerender = false

/**
 * Resend's shared sender, not a typo.
 *
 * `mm.coffee` was a verified Resend domain until 2026-10-05, when the free tier's three
 * domain slots were given over to the apps that need auth mail — frunk.cloud, tova.so and
 * diamondheart.app. Sending from an unverified domain is a 403, so this form had to move or
 * stop working.
 *
 * `onboarding@resend.dev` is Resend's shared sender and carries one hard restriction: it
 * delivers **only to the address the Resend account is registered under**. That is
 * `SITE.email`, which is exactly where this form already sends, so the restriction costs
 * nothing here — but it is why the recipient below cannot be changed to anything else
 * without verifying a domain again.
 *
 * Replies still go to whoever filled the form in, via `replyTo`.
 */
const FROM = `mm.coffee <onboarding@resend.dev>`

const json = (body: ContactResponse, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

/** Without JavaScript the browser expects a redirect, not JSON. */
const wantsJson = (request: Request) =>
  (request.headers.get('accept') ?? '').includes('application/json')

const redirect = (url: URL, params: Record<string, string>) => {
  const target = new URL('/mailroom', url.origin)
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value)
  }
  return new Response(null, { status: 303, headers: { location: target.href } })
}

export const POST: APIRoute = async ({ request, url }) => {
  const asJson = wantsJson(request)

  const contentType = request.headers.get('content-type') ?? ''
  const raw = contentType.includes('application/json')
    ? await request.json().catch(() => null)
    : Object.fromEntries(await request.formData())

  if (!raw) {
    return asJson
      ? json({ ok: false, message: "That didn't parse. Try again." }, 400)
      : redirect(url, { error: '1' })
  }

  const verdict = evaluateSubmission(raw)

  if (verdict.outcome === 'invalid') {
    return asJson
      ? json({ ok: false, errors: verdict.errors }, 422)
      : redirect(url, { error: '1' })
  }

  // Honeypot and timing traps answer 200 so a bot learns nothing about which
  // signal caught it — and nothing is sent.
  if (verdict.outcome === 'trap') {
    return asJson ? json({ ok: true }, 200) : redirect(url, { sent: '1' })
  }

  const { name, email, message } = verdict.data

  // `import.meta.env` is inlined by Vite at build time; process.env is what the
  // function actually sees at runtime on Vercel.
  const key = import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY
  if (!key) {
    console.error('RESEND_API_KEY is not set — contact form cannot send')
    return asJson
      ? json(
          {
            ok: false,
            message: `Mail isn't configured yet. Email ${SITE.email} directly.`,
          },
          503
        )
      : redirect(url, { error: '1' })
  }

  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from: FROM,
      to: SITE.email,
      replyTo: email,
      subject: `mm.coffee — ${name}`,
      text: `From: ${name} <${email}>\n\n${message}\n`,
    })

    if (error) {
      console.error('Resend rejected the message:', error)
      return asJson
        ? json(
            {
              ok: false,
              message: `That didn't send. Email ${SITE.email} directly.`,
            },
            502
          )
        : redirect(url, { error: '1' })
    }
  } catch (cause) {
    console.error('Contact send failed:', cause)
    return asJson
      ? json(
          { ok: false, message: `That didn't send. Email ${SITE.email} directly.` },
          502
        )
      : redirect(url, { error: '1' })
  }

  return asJson ? json({ ok: true }, 200) : redirect(url, { sent: '1' })
}
