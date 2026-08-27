# mm.coffee

Studio site for MM Coffee Co. Front door for the studio's software work. Personal
essays live separately at markmcdermott.io — don't duplicate them here.

## Stack

Astro 7 (static output) · Tailwind CSS v4 · Vercel · pnpm. No database.

Pages prerender. Only `src/pages/api/*` and `src/pages/admin/*` opt into server
rendering with `export const prerender = false`.

## Conventions

- **Path aliases**: `@assets/*`, `@components/*`, `@layouts/*`, `@lib/*`, `@styles/*`
- **Design tokens** live in `src/styles/globals.css` under `@theme` — never hardcode
  a hex value in a component
- **Content** is Markdown in `src/content/`. Adding a project is one file in
  `src/content/batches/`; adding a post is one file in `src/content/press/`
- **Frontmatter schemas live in `src/lib/schemas.ts`**, not in
  `content.config.ts` — three things need them and only one can import
  `astro:content`. Change a schema there and the build, the admin's form and
  the admin's save validation all follow. Nothing should ever restate a field
  list; if you're typing one out, you're undoing the point
- **Press posts** support `draft: true` — visible in `pnpm dev`, excluded from
  production builds and from the RSS feed. Dates are coerced, so an unquoted
  `date: 2026-08-14` in frontmatter is fine
- **`unlisted: true`** is the other half of that: the post still builds, keeps
  its URL and its place in the sitemap, but drops out of the press index, the
  feed and the older/newer chain. For a piece that belongs on the site but not
  in the run of build logs — something links to it on purpose. `getPosts()` is
  everything; `getListedPosts()` is what the site lists, and is what a listing
  should call
- **Longform posts** set `layout: longform` in frontmatter, which widens the
  measure from 61 characters to 71 and unlocks plates. Everything else stays on
  the standard measure
- **Image treatment** is written as the image's title: `inline` (the default,
  needs no marker), `aside` (breaks into the empty right of a longform post) or
  `wide` (runs past the measure, still in flow) — `![alt](./x.jpg "aside")`.
  `src/lib/satteri-image-treatment.mjs` turns it into a `data-treatment`
  attribute and drops the title. **Never derive the treatment from the image** —
  not from its aspect ratio, its size or its position. It is a decision written
  down per image, and asides are meant to stay occasional: the whitespace beside
  the column is part of the design, not a column waiting to be filled
- **Image captions** are the line directly under the image, inside the same
  paragraph — no blank line between them. A captioned image renders as a
  `<figure>`; an uncaptioned one stays the paragraph it was. The caption is
  ordinary Markdown, so it can carry a link. **It is never the alt text and
  never repeats it**: the alt describes the picture for someone who can't see
  it, the caption says what it has to do with the paragraph above. Captions are
  set to the width of their picture rather than the column, so an image
  narrower than the measure doesn't get a caption overhanging it
- **TypeScript is strict.** No `any`

## Typography

Two faces, both self-hosted and subset at build time via Astro's font API — the site
makes **no third-party font requests**, and it should stay that way.

- `font-display` → Anton (headlines, uppercase)
- `font-mono` → JetBrains Mono (body copy, labels, the status strip)

The wordmark is R41 Stop, but shipped as **outlined paths**, not a webfont. Never
reintroduce a font CDN to render it.

Those paths live in **`src/lib/logo.ts`** and nowhere else. Four things draw the
mark — the `Logo` component, the icon set, the share image, and whatever comes
next — and they all import from there. They used to keep private copies, which is
how `og.png` went on drawing a full stop for two releases after the wordmark
dropped it. The `lockup` / `wordmark` / `mark` variants are `viewBox` crops of one
artwork, so there is no second coordinate space to keep in step. Re-run
`pnpm build:icons` and `pnpm build:og` after any change to it.

## Design

Retro print / coffee-packaging aesthetic. Hard-ruled 1px black grid, cells butted
together — no gaps, no rounded corners, no drop shadows.

**Light theme only.** No dark mode; a dark variant fights the paper-and-ink conceit.

Gold fails AA contrast on the paper background, so it is restricted to large display
type, rules, and fills — never small text.

## Toolchain notes

- **Don't turn on Sätteri's `directive` feature.** It reads `:1` as a text
  directive and silently eats it, which quietly rewrites every contrast ratio on
  the site — `3.94:1` renders as `3.94`. That is why a plate is marked with an
  image title rather than the `:::plate` syntax that would otherwise be the
  obvious way to write it.
- `markdown.processor` is named explicitly in `astro.config.mjs` so a plugin can
  be attached. It is the same Sätteri processor Astro 7 uses by default, with
  features left alone, so naming it changes no rendered output — the build was
  diffed page by page to confirm that.
- `astro check` needs **TypeScript 6.x**. TypeScript 7's native compiler doesn't yet
  expose the programmatic API the checker relies on, so don't bump it to 7.
- `build:icons` and `build:og` import `src/lib/logo.ts` directly and rely on Node's
  built-in type stripping, so they need **Node 23.6+** — looser than `engines.node`,
  which stays at 22.12 because it describes the app, and neither script runs at
  deploy time. Keep the syntax in `logo.ts` erasable (no enums, no namespaces).
- The `Font` component is imported from `astro:assets` (not `astro:fonts`, which was
  the Astro 5 experimental name).
- Astro 7 keeps a **persistent background dev server** and reuses it across `pnpm dev`
  invocations, so it can serve stale CSS after config changes and silently pick a
  different port than the one you asked for. If styles look wrong, check
  `pnpm astro dev status` for the real port and `pnpm astro dev stop` before trusting
  what you see. A production build is the reliable signal.
- **Screenshot with Playwright, not `chrome --headless --screenshot`.** The raw
  Chrome flag silently drops some elements (it lost the mobile nav button entirely
  in both old and new headless modes) while Playwright renders them correctly. If a
  screenshot disagrees with a passing test, suspect the screenshot.
- Both `astro dev` and `astro preview` **daemonise and exit**, which races Playwright's
  readiness probe. `scripts/test-server.mjs` uses Astro's programmatic `dev()` instead:
  it stays in the foreground, renders SSR routes (`/mailroom`, `/api/*`), and reads from
  source so the suite can't pass against a stale build.

## Colour and contrast

The comp colours are **display** colours. On paper, red is 3.94:1, orange 2.58:1 and
gold 1.44:1 — fine for large type and fills, but they fail AA at label size, and this
design sets most of its text at label size.

So: `red` / `gold` / `orange` for display type and graphics only; `red-deep` /
`gold-deep` / `orange-deep` for anything at label size. `pnpm check:contrast` reads
the tokens straight out of `globals.css` and fails the build if this slips.

## The admin

`/admin` edits the Markdown in `src/content/`. There's no database and no
second copy of the content: git is the persistence layer and GitHub is the
identity provider.

It runs in one of two modes, and the header always says which:

- **Local** (`pnpm dev`) — writes straight to the working tree, no sign-in.
  `isLocalMode()` is `import.meta.env.DEV`, which Vite replaces at build time,
  so the deployed bundle cannot enter this mode however it's configured.
- **GitHub** (deployed) — sign in with GitHub, and only `ADMIN_GITHUB_LOGIN`
  is let through. Saves commit through the Contents API **as the signed-in
  user**, so the site never holds a write credential of its own. A commit
  triggers the usual Vercel deploy.

The forms are generated from the zod schemas via `z.toJSONSchema(…, { io: 'input' })`
— an enum becomes a select, `.optional()` drops the `required`, `.positive()`
becomes `min="1"`. Anything the type can't express (which strings want a
textarea, which want a date picker) is a `.meta({ control })` hint on the field
itself. Add a field to a schema and the form grows a control; no list of fields
exists anywhere to fall out of sync.

Every write re-validates against that same schema server-side, so the admin
cannot produce a file that fails the build.

Guards worth not removing: the slug regex is what keeps a URL from addressing a
path outside its collection, `sameOrigin` is checked on every POST, and the
session cookie is AES-256-GCM **encrypted** rather than signed because it
carries a GitHub token. `/admin` is `noindex`, disallowed in robots.txt and
filtered out of the sitemap.

Setup is in `.env.example`. Unset, `/admin` reports that it isn't wired up
rather than half working.

## SEO

`Seo.astro` owns every meta tag; pages pass `title`, `description`, and — for press
posts — `publishedAt` and `tags`, which switch the OG type to `article`. Canonicals
are always absolute against `SITE.url`, so a preview host can never leak into one.

Generated assets are **built by hand and committed**, not produced at deploy time:

- `pnpm build:icons` — favicon, touch and PWA icons
- `pnpm build:og` — the 1200×630 share image

Both read the palette out of `globals.css`, so they can't drift from the site. Re-run
them after any palette change. Note `build:og` rasterises two `<text>` elements with
whatever font the machine has, so the headline can shift if regenerated elsewhere;
the wordmark is outlined paths and is immune.

The styleguide is `noindex`, excluded from the sitemap, and disallowed in robots.txt.

## Before opening a PR

```sh
pnpm build && pnpm check && pnpm check:contrast && pnpm test
```

All must pass. Conventional commits, lowercase, no trailing period. No AI
attribution in commits or PR bodies.
