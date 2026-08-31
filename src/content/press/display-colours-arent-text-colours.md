---
title: Your brand colours are display colours
subtitle: The red that looks great at 96px fails WCAG at 11px.
date: 2026-08-13
tags:
  - accessibility
  - design systems
---

I sampled this site's palette straight out of the design comps and assumed it
was fine. Cream paper, a rust red, a forest teal, an ochre. It looks right.

Then I actually measured it.

| Colour | On paper | AA normal text |
| --- | --- | --- |
| Red `#B8442A` | 4.07:1 | **fails** |
| Gold `#C9A23A` | 1.82:1 | **fails** |
| Orange `#6D4630` | 6.17:1 | passes |
| Blue `#14423F` | 8.43:1 | passes |
| Ink `#2B2724` | 11.17:1 | passes |

Red was the problem. Not because it's a bad red — at 96px it's perfect, and
large text only needs 3:1. But this design sets almost everything at label size:
`BATCH 001`, `STACK: ASTRO / REACT`, the nav. All of it was red at 11px, all
of it failing.

## The fix isn't a different palette

Changing the red would change the brand. The fix is admitting there are two
jobs and two colours:

```css
--color-red: #b8442a;       /* display type, fills, graphics */
--color-red-deep: #94331e;  /* anything at label size */
```

Same hue, darkened until it clears 4.5:1. Side by side you can tell them apart.
In context — one at 96px, one at 11px — nobody can, because you're never
comparing them directly.

## Make it fail the build

The part I'd skip if I were being honest with myself is the part that matters:
this will drift. Someone adds a colour, someone lightens a token, and six months
later the labels fail again.

So the check reads the tokens out of the stylesheet and asserts them:

```
PASS  red-deep     #94331e  5.76:1  (needs 4.5:1 — small rust labels)
PASS  red          #b8442a  4.07:1  (needs 3:1 — display headlines only)

decorative only — must never carry text:
      gold         #c9a23a  1.82:1
```

The gold row was informative. My first version asserted 3:1 on it and failed —
but gold is only ever a fill here, and purely decorative graphics carry no
contrast minimum at all. A bad assertion, not a bad colour. Worth knowing the
difference before you go darkening things that don't need it.
