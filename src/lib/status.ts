/**
 * Targets for the footer's system-status strip.
 *
 * The comps label these rows API / DATABASE / AUTH / STORAGE / EMAIL, but this
 * site has no database, auth, or storage — with real checks those rows would be
 * permanently dark or simply untrue. So the rows are the things that genuinely
 * can be checked: the studio's live programs, and mail delivery.
 */
export interface StatusTarget {
  id: string
  label: string
  url: string
}

export const STATUS_TARGETS: StatusTarget[] = [
  { id: 'wolfpack', label: 'Fullstack Wolfpack', url: 'https://www.fullstackwolfpack.com' },
  { id: 'mockingboard', label: 'Mockingboard', url: 'https://www.mockingboard.design' },
  { id: 'markmcdermott', label: 'markmcdermott.io', url: 'https://markmcdermott.io' },
  { id: 'email', label: 'Email', url: 'https://api.resend.com' },
]

export type StatusState = 'online' | 'offline' | 'unknown'

export interface StatusResult {
  id: string
  state: StatusState
}

export interface StatusPayload {
  checkedAt: string
  results: StatusResult[]
}
