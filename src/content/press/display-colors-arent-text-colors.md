---
title: Your brand colors are display colors
subtitle: The red that looks great at 96px fails WCAG at 11px.
date: 2026-08-13
tags:
  - accessibility
  - design systems
---

I sampled this site's palette straight out of the design comps and assumed it
was fine. Cream paper, a rust red, a forest teal, an ochre. It looks right.
Then I actually measured it.

| Color | On paper | AA normal text |
| --- | --- | --- |
| Red `#B8442A` | 4.07:1 | **fails** |
| Gold `#C9A23A` | 1.82:1 | **fails** |
| Orange `#6D4630` | 6.17:1 | passes |
| Blue `#14423F` | 8.43:1 | passes |
| Ink `#2B2724` | 11.17:1 | passes |

Red was the problem, and not because it's a bad red. At 96px it's perfect, and
large text only needs 3:1 anyway. But this design sets almost everything at
label size: `BATCH 001`, `STACK: ASTRO / REACT`, the nav. All of that was red at
11px and all of it was failing.

## The fix

Changing the red would change the brand, so instead I gave the color two jobs
and two tokens:

```css
--color-red: #b8442a;       /* display type, fills, graphics */
--color-red-deep: #94331e;  /* anything at label size */
```

Same hue, darkened until it clears 4.5:1. Side by side you can tell them apart.
In context you can't, because one of them is at 96px and the other is at 11px
and you're never looking at the two together.

## Make it fail the build

The part I'd skip if I were being honest with myself is the part that matters.
This will drift. Someone adds a color, someone lightens a token, and six months
later the labels are failing again.

So the check reads the tokens out of the stylesheet and asserts them:

```
PASS  red-deep     #94331e  5.76:1  (needs 4.5:1 — small rust labels)
PASS  red          #b8442a  4.07:1  (needs 3:1 — display headlines only)

decorative only — must never carry text:
      gold         #c9a23a  1.82:1
```

The gold row taught me something. My first version asserted 3:1 on it and the
check failed, but gold is only ever a fill here, and purely decorative graphics
don't have a contrast minimum at all. So it was my assertion that was wrong
rather than the color. It's worth working out which one you're dealing with
before you start darkening things that don't need it.
