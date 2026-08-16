/**
 * Admin configuration, all of it from the environment.
 *
 * `import.meta.env` is inlined by Vite at build time; `process.env` is what the
 * function actually sees at runtime on Vercel — same pattern the contact route
 * uses for its API key.
 */
const read = (name: string): string | undefined => {
  const value = import.meta.env[name] ?? process.env[name]
  return typeof value === 'string' && value !== '' ? value : undefined
}

export interface AdminEnv {
  clientId: string
  clientSecret: string
  sessionSecret: string
  /** The single GitHub account allowed to sign in. */
  login: string
  owner: string
  repo: string
  branch: string
}

/**
 * Returns the config only when every part of it is present. A half-configured
 * admin is worse than a missing one — it would authenticate people and then
 * fail at the commit — so the routes treat `null` as "not deployed yet".
 */
export const adminEnv = (): AdminEnv | null => {
  const clientId = read('GITHUB_CLIENT_ID')
  const clientSecret = read('GITHUB_CLIENT_SECRET')
  const sessionSecret = read('SESSION_SECRET')
  const login = read('ADMIN_GITHUB_LOGIN')
  const slug = read('GITHUB_REPO')

  if (!clientId || !clientSecret || !sessionSecret || !login || !slug) return null

  const [owner, repo] = slug.split('/')
  if (!owner || !repo) return null

  return {
    clientId,
    clientSecret,
    sessionSecret,
    login,
    owner,
    repo,
    branch: read('GITHUB_BRANCH') ?? 'main',
  }
}

/**
 * In `pnpm dev` the admin edits the working tree and skips the GitHub round
 * trip entirely, so there's nothing to authenticate against and no token to
 * hold. Vite replaces `import.meta.env.DEV` at build time, so this is `false`
 * in the deployed bundle no matter what the runtime environment says.
 */
export const isLocalMode = (): boolean => import.meta.env.DEV
