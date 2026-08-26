# mm.coffee

Studio site for MM Coffee Co. — a small software studio in Austin, Texas.

The front door for the studio's work. Personal essays and writing live separately at
[markmcdermott.io](https://markmcdermott.io).

## Stack

- [Astro](https://astro.build) — static output, with two server routes
- [Tailwind CSS](https://tailwindcss.com) v4
- [Vercel](https://vercel.com) — hosting, functions, analytics
- [Resend](https://resend.com) — contact form delivery

No database.

## Development

```sh
pnpm install
pnpm dev
```

| Command | Does |
| --- | --- |
| `pnpm dev` | Start the dev server at `localhost:4321` |
| `pnpm build` | Build to `./dist/` |
| `pnpm preview` | Preview the build locally |
| `pnpm check` | Type-check with `astro check` |

## Structure

```
src/
  assets/       logo and imagery
  components/   ui and svg art
  content/
    batches/    one markdown file per project
    press/      blog posts
  layouts/
  pages/
  styles/
```

Adding a project is a single Markdown file in `src/content/batches/`.

## Typography

Anton (display) and JetBrains Mono (everything else), both self-hosted via Astro's
font API. The wordmark is set in R41 Stop, shipped as an outlined SVG — so the site
makes no third-party font requests.
