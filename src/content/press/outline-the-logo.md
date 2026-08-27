---
title: Outline the logo, don't load the font
subtitle: A wordmark is one shape. It doesn't need a typeface at runtime.
date: 2026-08-14
tags:
  - typography
  - performance
---

The mm.coffee wordmark is set in R41 Stop, an Adobe Font. The obvious way to put
that on a website is an Adobe Fonts web project: add the family, get a kit ID,
drop a `<link>` in the head.

Don't.

## What you're actually shipping

A webfont for a logo means a render-blocking request to a third-party host, a
flash of the wrong typeface while it loads, and a licence that has to stay valid
for as long as the site is up. All so the browser can render nine glyphs it will
never rearrange.

A logo isn't text. It's one fixed shape. Convert it to outlines once and it
becomes a few hundred bytes of `<path>` data that renders identically forever,
with no request, no licence question, and no flash.

## The catch

Illustrator's SVG export keeps type as live text by default:

```svg
<text font-family="R41Stop-Regular, 'R41 Stop'" font-size="200">
  mm.coffee
</text>
```

That renders correctly on your machine, because you have the font installed. On
anyone else's it silently falls back to a default sans — and it looks fine
enough that you might not notice.

Select all, **Type → Create Outlines**, save again. The file should contain
`<path>` and no `<text>`. That's the whole fix.

## Worth doing anyway

Outlining also means the mark can inherit colour. Set `fill="currentColor"` on
the root `<svg>` and the wordmark recolours by context — black on paper in the
header, paper on red in the footer — from one file.

The site now makes zero third-party font requests. The two faces that *are* type
are self-hosted and subset at build time; the logo isn't type at all.
