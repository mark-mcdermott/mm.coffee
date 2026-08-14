# mm.coffee

Studio site for MM Coffee Co. Front door for the studio's software work. Personal
essays live separately at markmcdermott.io — don't duplicate them here.

## Stack

Astro 7 (static output) · Tailwind CSS v4 · Vercel · pnpm. No database.

Pages prerender. Only `src/pages/api/*` opts into server rendering with
`export const prerender = false`.

## Conventions

- **Path aliases**: `@assets/*`, `@components/*`, `@layouts/*`, `@lib/*`, `@styles/*`
- **Design tokens** live in `src/styles/globals.css` under `@theme` — never hardcode
  a hex value in a component
- **Content** is Markdown in `src/content/`. Adding a project is one file in
  `src/content/programs/`; adding a post is one file in `src/content/lab/`
- **Lab posts** support `draft: true` — visible in `pnpm dev`, excluded from
  production builds and from the RSS feed. Dates are coerced, so an unquoted
  `date: 2026-08-14` in frontmatter is fine
- **TypeScript is strict.** No `any`

## Typography

Two faces, both self-hosted and subset at build time via Astro's font API — the site
makes **no third-party font requests**, and it should stay that way.

- `font-display` → Anton (headlines, uppercase)
- `font-mono` → JetBrains Mono (body copy, labels, the status strip)

The wordmark is R41 Stop, but shipped as an **outlined SVG** (`src/assets/logo.svg`),
not a webfont. Never reintroduce a font CDN to render it.

## Design

Retro print / coffee-packaging aesthetic. Hard-ruled 1px black grid, cells butted
together — no gaps, no rounded corners, no drop shadows.

**Light theme only.** No dark mode; a dark variant fights the paper-and-ink conceit.

Gold fails AA contrast on the paper background, so it is restricted to large display
type, rules, and fills — never small text.

## Toolchain notes

- `astro check` needs **TypeScript 6.x**. TypeScript 7's native compiler doesn't yet
  expose the programmatic API the checker relies on, so don't bump it to 7.
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
- `astro preview` daemonises itself, which races Playwright's readiness probe —
  hence the plain foreground `scripts/serve.mjs` used by the test config.

## Colour and contrast

The comp colours are **display** colours. On paper, red is 3.94:1, orange 2.58:1 and
gold 1.44:1 — fine for large type and fills, but they fail AA at label size, and this
design sets most of its text at label size.

So: `red` / `gold` / `orange` for display type and graphics only; `red-deep` /
`gold-deep` / `orange-deep` for anything at label size. `pnpm check:contrast` reads
the tokens straight out of `globals.css` and fails the build if this slips.

## Before opening a PR

```sh
pnpm build && pnpm check && pnpm check:contrast && pnpm test
```

All must pass. Conventional commits, lowercase, no trailing period. No AI
attribution in commits or PR bodies.
