---
title: Mockingboard
order: 2
tagline: Drop mockups. Arrange freely. Export one PNG.
summary: A free tool for arranging screenshots into a single shareable image.
stack:
  - React
  - Vite
  - TypeScript
  - shadcn/ui
url: https://mockingboard.design
status: live
accent: gold
art: waves
---

No accounts, no upload servers, no settings. Drop your screenshots in, rearrange
them, and export one PNG.

## Everything stays on your machine

There is no backend. Images never leave the browser — layout, reordering, and
export all happen client-side, and your board persists in `localStorage` so it
survives a refresh. Nothing to sign up for, nothing to delete later.

## Details that took the longest

A masonry layout that reflows as tiles change size. Drag-to-reorder that is fully
keyboard accessible, not just pointer-driven. And export at three scales, with
iOS canvas-limit detection — mobile Safari silently caps canvas area, so the
export warns you before it would have quietly produced a blank image.
