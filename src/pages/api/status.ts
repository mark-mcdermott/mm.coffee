import type { APIRoute } from 'astro'
import {
  STATUS_TARGETS,
  type StatusPayload,
  type StatusResult,
  type StatusState,
  type StatusTarget,
} from '@lib/status'

export const prerender = false

/** One slow host must not stall the whole strip. */
const TIMEOUT_MS = 4000

async function checkHttp(url: string): Promise<StatusState> {
  const request = (method: string) =>
    fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'mm.coffee status check' },
    })

  try {
    let response = await request('HEAD')

    // Plenty of hosts don't implement HEAD; fall back rather than report a
    // healthy site as down.
    if (response.status === 405 || response.status === 501) {
      response = await request('GET')
    }

    return response.ok ? 'online' : 'offline'
  } catch {
    // A timeout or DNS failure is indistinguishable from the host being down
    // from where we're standing, which is what the row is claiming.
    return 'offline'
  }
}

/**
 * Verifies the studio can actually send mail — not merely that Resend's API
 * responds. Without a key there is nothing to verify, and saying so is more
 * honest than a green light.
 */
async function checkEmail(): Promise<StatusState> {
  const key = import.meta.env.RESEND_API_KEY
  if (!key) return 'unconfigured'

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return response.ok ? 'online' : 'offline'
  } catch {
    return 'offline'
  }
}

const check = (target: StatusTarget): Promise<StatusState> =>
  target.kind === 'email' ? checkEmail() : checkHttp(target.url!)

export const GET: APIRoute = async () => {
  const settled = await Promise.allSettled(STATUS_TARGETS.map(check))

  const results: StatusResult[] = STATUS_TARGETS.map((target, i) => {
    const outcome = settled[i]
    return {
      id: target.id,
      state: outcome.status === 'fulfilled' ? outcome.value : 'unknown',
    }
  })

  const payload: StatusPayload = {
    checkedAt: new Date().toISOString(),
    results,
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Check at most once every five minutes however much traffic arrives,
      // and keep serving the last answer while a new one is fetched.
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
