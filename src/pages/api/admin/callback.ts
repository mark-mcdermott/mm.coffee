import type { APIRoute } from 'astro'
import { adminEnv } from '@lib/admin/env'
import {
  cookieOptions,
  sameState,
  sealSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  STATE_COOKIE,
} from '@lib/admin/session'

export const prerender = false

const exchange = async (
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> => {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  })

  if (!response.ok) return null

  const payload = (await response.json()) as { access_token?: string }
  return payload.access_token ?? null
}

const identify = async (token: string): Promise<string | null> => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'mm.coffee admin',
    },
  })

  if (!response.ok) return null

  const user = (await response.json()) as { login?: string }
  return user.login ?? null
}

export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  const env = adminEnv()
  if (!env) return redirect('/admin?error=unconfigured', 303)

  const expected = cookies.get(STATE_COOKIE)?.value
  cookies.delete(STATE_COOKIE, { path: '/' })

  // A callback that didn't start at our own login route — someone else's code,
  // or a replayed link — never gets as far as the token exchange.
  if (!sameState(url.searchParams.get('state') ?? undefined, expected)) {
    return redirect('/admin?error=state', 303)
  }

  const code = url.searchParams.get('code')
  if (!code) return redirect('/admin?error=denied', 303)

  try {
    const token = await exchange(code, env.clientId, env.clientSecret)
    if (!token) return redirect('/admin?error=exchange', 303)

    const login = await identify(token)
    if (!login) return redirect('/admin?error=exchange', 303)

    if (login.toLowerCase() !== env.login.toLowerCase()) {
      // Authenticating as someone real but unlisted is the interesting case to
      // see in the logs; the browser is told nothing beyond "no".
      console.warn(`Admin sign-in refused for GitHub user "${login}"`)
      return redirect('/admin?error=forbidden', 303)
    }

    const session = { login, token, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }
    cookies.set(SESSION_COOKIE, sealSession(session, env.sessionSecret), cookieOptions(SESSION_MAX_AGE))

    return redirect('/admin', 303)
  } catch (cause) {
    console.error('Admin sign-in failed:', cause)
    return redirect('/admin?error=exchange', 303)
  }
}
