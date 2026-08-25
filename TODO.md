# TODO

Running list of ideas and fixes for mm.coffee. Items marked "consider" are
undecided — think before doing.

## Wordmark

- [x] Use the full "O" and start the swirls just above it
- [x] Make the swirls smaller
- [x] Remove the period — dropped from the lockup and wordmark. The `mark`
      variant keeps it: at favicon size the dot is a distinguishing feature, and
      removing it means regenerating the committed icon PNGs
- [x] Maybe add "Co" at the end — done, and the name the studio goes by is now
      **MM Coffee Co**. New artwork also swaps the full stop for a heart. The
      outlines now live in `src/lib/logo.ts` and the three variants are `viewBox`
      crops of one drawing, so the component, the icons and the share image can't
      drift apart the way they did over the full stop

## Navigation & header

- [x] Consider larger/bolder type for nav items in the header — new `.nav-link`
      class, 13px/700, using the `--tracking-nav` token that was defined but
      never wired up
- [x] Change "Programs" in nav to "Batches" or something else?
- [x] Change "Lab" in nav to something more obviously blog — set to "PR" as
      asked. Still worth a rethink: on a software studio site PR reads as "pull
      request" first, which is the opposite of blog-obvious
- [x] Push the origin line and globe to the bottom right of their cell

## Copy

- [x] All the copy needs a once over — manifesto rewritten first-person with a
      stated position on AI; "we" eliminated site-wide (the studio is one person
      and the heading already said "My manifesto")
- [x] About page copy needs a rethink — now first person, with a new "About the
      machines" section and a sharper line on attention-as-raw-material
- [x] Change "our manifesto" to "my manifesto" — both homepage and /about

## Homepage & layout

- [x] Consider removing the whitespace to the right of "Software Roasted In
      Austin, Texas" — resolved by moving the origin line into that space
- [x] Consider moving the hero bottom border up to the bottom of the rainbow —
      done the other way round: the ribbon grew down to the border, so the copy
      keeps its padding
- [x] Consider pushing the terminal line further — `mt-7` → `mt-12`
- [ ] Consider a real typeface for the "MM" in the Est. 2026 / By Mark McDermott
      homepage block — **not done, conflicts with the dot-matrix blink below.**
      Pick one: the mark is either a dot matrix that can blink, or type

## Visual direction

- [x] Consider making the colour palette a little less "amazon retro adhesive
      car stripes" — went to **dark roast**: oxblood, forest, ochre and walnut
      on a deeper paper, picked from three candidates shot against the real
      homepage. Every colour gained contrast headroom; rust went from 3.05:1 to
      4.07:1, so display type no longer sits 0.05 above its floor. Icons and the
      share image regenerated. The ochre band is still the brightest thing on
      the page — if it keeps reading as a stripe, that's the one token to pull
- [x] Consider how to make the site a little more grimy — the fine paper grain
      already existed; added a coarse low-frequency mottle over it, which is
      what reads as uneven absorption rather than screen noise
- [ ] Consider using an Unsplash image for the computer — **not done.** The
      current photo was deliberately replaced two commits ago, and swapping in a
      stock image undoes that

## Animation & interaction

- [x] Make the glove icons spin on hover, and link them to a new post about
      Austin — the globe turns its meridian rather than rotating the whole icon,
      and now links to `/press/twenty-years-in-austin`
- [x] Short blink on the dot matrix "MM" letters — one dot at a time, slowly
      iterating through both "m"s
- [x] Consider making CTA buttons alternate black / dark orange-red on hover,
      slowly — 0.75s per state, hard-switched with `steps(1)` so it reads as a
      hazard lamp rather than a fade

## Footer

- [x] Light new treatment — 2026 is mentioned twice — it was three times.
      Bottom bar now carries the copyright (muted, it's boilerplate) and the
      signature; the founding year lives on the packaging panel

## Features

- [x] Make a real /admin CMS for all content — the "needs a persistence layer"
      objection was wrong: git is the persistence layer and GitHub is the
      identity provider, so nothing about "static output, no database" had to
      change. Forms are generated from the existing zod schemas, so there's
      still exactly one definition of a field. See the admin section in
      CLAUDE.md, and `.env.example` for the GitHub OAuth app it needs

---

## Follow-ups from this pass

- The new Austin post is **my draft, not your writing** — rewrite it in your own
  voice before it ships. The globe links to it, so deleting it breaks that link
- `fable@xhard` in the hero drops the brand tie-in the old `mm@coffee` had
- Nav labels changed but URLs didn't: still `/programs` and `/lab`, and the lab
  page title still reads "Lab"
- "bug free" in the hero joke reads as "bug-free" in most style guides
