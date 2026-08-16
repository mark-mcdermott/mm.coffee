import type { APIRoute } from 'astro'
import { sameOrigin } from '@lib/admin/guard'
import { SESSION_COOKIE } from '@lib/admin/session'

export const prerender = false

/** POST so a stray link or a prefetch can't sign anyone out. */
export const POST: APIRoute = ({ cookies, request, url, redirect }) => {
  if (!sameOrigin(request, url)) return new Response('Bad origin', { status: 403 })

  cookies.delete(SESSION_COOKIE, { path: '/' })
  return redirect('/admin', 303)
}
