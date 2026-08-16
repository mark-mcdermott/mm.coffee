/**
 * The single gate every admin route goes through.
 *
 * Centralised so that "is this person allowed, and what may they write to" is
 * answered in exactly one place. A route that forgets to call this gets no
 * store, so it can't reach content at all.
 */
import type { AstroCookies } from 'astro'
import { adminEnv, isLocalMode } from './env'
import { openSession, SESSION_COOKIE } from './session'
import { githubStore, localStore, type Store } from './storage'

export type Access =
  | { ok: true; store: Store; login: string; local: boolean }
  | { ok: false; reason: 'unconfigured' | 'anonymous' }

export const access = (cookies: AstroCookies): Access => {
  // Dev edits the working tree. There's no token to hold and nothing deployed
  // to protect, and `isLocalMode` is compiled to `false` in the built bundle.
  if (isLocalMode()) {
    return { ok: true, store: localStore(), login: 'local', local: true }
  }

  const env = adminEnv()
  if (!env) return { ok: false, reason: 'unconfigured' }

  const session = openSession(cookies.get(SESSION_COOKIE)?.value, env.sessionSecret)
  if (!session) return { ok: false, reason: 'anonymous' }

  // The allowlist is re-checked on every request rather than trusted from the
  // moment the cookie was minted, so revoking access is a config change and not
  // a wait for sessions to lapse.
  if (session.login.toLowerCase() !== env.login.toLowerCase()) {
    return { ok: false, reason: 'anonymous' }
  }

  return { ok: true, store: githubStore(env, session.token), login: session.login, local: false }
}

/**
 * Same-origin check for anything that writes. The session cookie is `SameSite=Lax`,
 * which already keeps a cross-site POST from carrying it, so this is the second
 * of two locks rather than the only one.
 */
export const sameOrigin = (request: Request, url: URL): boolean => {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === url.origin
  } catch {
    return false
  }
}
