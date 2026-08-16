/**
 * Where the admin reads and writes content.
 *
 * Two backends behind one interface. In `pnpm dev` it edits the working tree
 * directly, so drafting locally behaves like editing the files by hand and
 * nothing needs a network round trip. Deployed, it commits through the GitHub
 * Contents API using the signed-in user's own token, which is what makes the
 * commit show up as them and what stops the site from holding a standing
 * write credential of its own.
 */
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { COLLECTIONS, entryPath, isSlug, type CollectionKey } from './collections'
import type { AdminEnv } from './env'

export interface StoredFile {
  text: string
  /** GitHub's blob sha. Absent locally; required to update or delete remotely. */
  sha?: string
}

export interface Store {
  slugs(collection: CollectionKey): Promise<string[]>
  read(collection: CollectionKey, slug: string): Promise<StoredFile | null>
  write(input: WriteInput): Promise<void>
  remove(input: RemoveInput): Promise<void>
}

interface WriteInput {
  collection: CollectionKey
  slug: string
  text: string
  sha?: string
  message: string
}

interface RemoveInput {
  collection: CollectionKey
  slug: string
  sha?: string
  message: string
}

export class ConflictError extends Error {
  constructor() {
    super('That entry changed somewhere else since this form was opened.')
    this.name = 'ConflictError'
  }
}

const slugsFromNames = (names: readonly string[]): string[] =>
  names
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .filter(isSlug)
    .sort()

/** Guards against a path escaping the repo even if a slug check were ever missed. */
const withinRepo = (repoRelative: string): string => {
  const root = resolve(process.cwd())
  const target = resolve(root, repoRelative)
  if (target !== root && !target.startsWith(root + '/')) {
    throw new Error(`Refusing to touch a path outside the project: ${repoRelative}`)
  }
  return target
}

export const localStore = (): Store => ({
  async slugs(collection) {
    try {
      return slugsFromNames(await readdir(withinRepo(COLLECTIONS[collection].dir)))
    } catch {
      return []
    }
  },

  async read(collection, slug) {
    try {
      return { text: await readFile(withinRepo(entryPath(collection, slug)), 'utf8') }
    } catch {
      return null
    }
  },

  async write({ collection, slug, text }) {
    const path = withinRepo(entryPath(collection, slug))
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, text, 'utf8')
  },

  async remove({ collection, slug }) {
    await unlink(withinRepo(entryPath(collection, slug)))
  },
})

interface ContentsEntry {
  name: string
  sha: string
  type: string
}

export const githubStore = (env: AdminEnv, token: string): Store => {
  const api = async (path: string, init?: RequestInit): Promise<Response> =>
    fetch(`https://api.github.com/repos/${env.owner}/${env.repo}/contents/${path}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'mm.coffee admin',
        'x-github-api-version': '2022-11-28',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
      },
    })

  const commit = async (path: string, method: 'PUT' | 'DELETE', body: object) => {
    const response = await api(path, {
      method,
      body: JSON.stringify({ ...body, branch: env.branch }),
    })

    // GitHub answers 409 when the sha is stale and 422 when it's missing on an
    // update — both mean the file moved under the form.
    if (response.status === 409 || response.status === 422) throw new ConflictError()

    if (!response.ok) {
      throw new Error(`GitHub refused the commit (${response.status}): ${await response.text()}`)
    }
  }

  return {
    async slugs(collection) {
      const response = await api(`${COLLECTIONS[collection].dir}?ref=${env.branch}`)
      if (response.status === 404) return []
      if (!response.ok) throw new Error(`GitHub listing failed (${response.status})`)

      const entries: unknown = await response.json()
      if (!Array.isArray(entries)) return []

      return slugsFromNames(
        (entries as ContentsEntry[]).filter((e) => e.type === 'file').map((e) => e.name)
      )
    },

    async read(collection, slug) {
      const response = await api(`${entryPath(collection, slug)}?ref=${env.branch}`)
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`GitHub read failed (${response.status})`)

      const file = (await response.json()) as { content?: string; sha: string }
      if (typeof file.content !== 'string') return null

      return { text: Buffer.from(file.content, 'base64').toString('utf8'), sha: file.sha }
    },

    async write({ collection, slug, text, sha, message }) {
      await commit(entryPath(collection, slug), 'PUT', {
        message,
        content: Buffer.from(text, 'utf8').toString('base64'),
        ...(sha ? { sha } : {}),
      })
    },

    async remove({ collection, slug, sha, message }) {
      if (!sha) throw new ConflictError()
      await commit(entryPath(collection, slug), 'DELETE', { message, sha })
    },
  }
}
