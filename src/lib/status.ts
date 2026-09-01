/**
 * Targets for the footer's system-status strip.
 *
 * The comps label these rows API / DATABASE / AUTH / STORAGE / EMAIL, but this
 * site has no database, auth, or storage — with real checks those rows would be
 * permanently dark or simply untrue. So the rows are the things that genuinely
 * can be checked: the studio's live batches, and mail delivery.
 */
export type StatusKind = 'http' | 'email'

export interface StatusTarget {
  id: string
  label: string
  kind: StatusKind
  /** Only meaningful for `http` targets. */
  url?: string
}

export const STATUS_TARGETS: StatusTarget[] = [
  {
    id: 'wolfpack',
    label: 'Fullstack Wolfpack',
    kind: 'http',
    url: 'https://www.fullstackwolfpack.com',
  },
  {
    id: 'mockingboard',
    label: 'Mockingboard',
    kind: 'http',
    url: 'https://www.mockingboard.design',
  },
  {
    id: 'markmcdermott',
    label: 'markmcdermott.io',
    kind: 'http',
    url: 'https://markmcdermott.io',
  },
  { id: 'email', label: 'Email', kind: 'email' },
]

/**
 * `unconfigured` is deliberately distinct from `offline`. Mail delivery isn't
 * wired up yet, and a green light for "resend.com is reachable" would say
 * something this site can't actually do.
 */
export type StatusState = 'online' | 'offline' | 'unconfigured' | 'unknown'

export interface StatusResult {
  id: string
  state: StatusState
}

export interface StatusPayload {
  checkedAt: string
  results: StatusResult[]
}

export const STATUS_LABELS: Record<StatusState, string> = {
  online: 'Online',
  offline: 'Offline',
  unconfigured: 'Not configured',
  unknown: 'Unknown',
}

/** Tailwind text color per state. Nothing but a real pass reads as green. */
export const STATUS_COLOURS: Record<StatusState, string> = {
  online: 'text-signal',
  offline: 'text-red-deep',
  unconfigured: 'text-ink opacity-45',
  unknown: 'text-ink opacity-45',
}
