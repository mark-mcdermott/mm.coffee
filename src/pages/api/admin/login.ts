import type { APIRoute } from 'astro'
import { adminEnv } from '@lib/admin/env'
import { cookieOptions, newState, STATE_COOKIE } from '@lib/admin/session'

export const prerender = false

/** Long enough to sign in, short enough that a stale tab doesn't hold a nonce open. */
const STATE_MAX_AGE = 60 * 10

export const GET: APIRoute = ({ cookies, url, redirect }) => {
  const env = adminEnv()
  if (!env) return redirect('/admin?error=unconfigured', 303)

  const state = newState()
  cookies.set(STATE_COOKIE, state, cookieOptions(STATE_MAX_AGE))

  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', env.clientId)
  authorize.searchParams.set('redirect_uri', new URL('/api/admin/callback', url.origin).href)
  // `repo` is what the Contents API needs to commit. Public-only repos could
  // narrow this to `public_repo`; this one is private, so it can't.
  authorize.searchParams.set('scope', 'repo')
  authorize.searchParams.set('state', state)

  return redirect(authorize.href, 302)
}
