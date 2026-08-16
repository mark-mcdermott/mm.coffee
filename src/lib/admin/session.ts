/**
 * The admin session cookie.
 *
 * The cookie carries a GitHub access token, so it's encrypted rather than
 * merely signed — a signed cookie is readable, and this one holds a credential
 * that can write to the repo. AES-256-GCM gives confidentiality and
 * tamper-detection in one pass: a modified cookie fails its auth tag and is
 * treated as absent.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'mmc_admin'
export const STATE_COOKIE = 'mmc_admin_state'

/** Short enough that a forgotten open tab isn't a standing key to the repo. */
export const SESSION_MAX_AGE = 60 * 60 * 8

export interface Session {
  login: string
  token: string
  /** Unix seconds. Checked on open, so an old cookie can't outlive its Max-Age. */
  exp: number
}

const IV_BYTES = 12
const TAG_BYTES = 16

const keyFrom = (secret: string): Buffer => createHash('sha256').update(secret, 'utf8').digest()

export const sealSession = (session: Session, secret: string): string => {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const body = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final(),
  ])

  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

export const openSession = (raw: string | undefined, secret: string): Session | null => {
  if (!raw) return null

  try {
    const packed = Buffer.from(raw, 'base64url')
    if (packed.length <= IV_BYTES + TAG_BYTES) return null

    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyFrom(secret),
      packed.subarray(0, IV_BYTES)
    )
    decipher.setAuthTag(packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))

    const plain = Buffer.concat([
      decipher.update(packed.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8')

    const parsed: unknown = JSON.parse(plain)
    if (!isSession(parsed)) return null

    return parsed.exp > Math.floor(Date.now() / 1000) ? parsed : null
  } catch {
    // A bad tag, a truncated cookie or a rotated secret all land here, and all
    // of them mean the same thing: no session.
    return null
  }
}

const isSession = (value: unknown): value is Session =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Session).login === 'string' &&
  typeof (value as Session).token === 'string' &&
  typeof (value as Session).exp === 'number'

export const newState = (): string => randomBytes(32).toString('base64url')

/** Constant-time so the OAuth state check can't be narrowed down by timing. */
export const sameState = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** `Lax` still arrives on GitHub's top-level redirect back, and blocks cross-site POSTs. */
export const cookieOptions = (maxAge: number) =>
  ({
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: 'lax',
    path: '/',
    maxAge,
  }) as const
