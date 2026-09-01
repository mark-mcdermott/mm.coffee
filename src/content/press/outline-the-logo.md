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

## What you're actually shipping

Don't do that. A webfont for the logo means a request to a third-party host, and
the Adobe kit that carries it is a stylesheet, so it blocks rendering. You also
get a flash of the wrong typeface while the font loads, and you have to keep the
license valid for as long as the site is up. That's a lot of machinery for ten
letters and a heart that never move.

A logo is one fixed shape, so I converted it to outlines instead. It comes out
as a couple of kilobytes of `<path>` data that renders the same way everywhere,
with no request to make and no license to keep track of.

## Live text in the export

Illustrator's SVG export keeps type as live text by default:

```svg
<text font-family="R41Stop-Regular, 'R41 Stop'" font-size="200">
  mm coffee co
</text>
```

That renders correctly on your own machine, because you have the font
installed. On anyone else's it quietly falls back to a default sans, and it
looks close enough that you might not catch it.

The fix is to select all, do **Type → Create Outlines**, and save again. The
file should then contain `<path>` and no `<text>`.

## Inheriting color

Outlining also means the mark can inherit color. I set `fill="currentColor"`
on the root `<svg>`, so the wordmark picks up whatever color it is sitting in:
ink on paper in the header, paper on red where it reverses out. That all comes
from one file.

The site makes no third-party font requests now. The two faces that are actually
type are self-hosted and subset at build time, and the logo is just paths.
