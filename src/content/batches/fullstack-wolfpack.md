---
title: Fullstack Wolfpack
order: 1
tagline: Learn. Play. Level up. Repeat.
summary: A learning app built around one loop — play a game, then learn a skill.
stack:
  - Astro
  - React
url: https://fullstackwolfpack.com
status: building
accent: red
art: wolf
---

Short arcade sessions paired with AI-generated lessons, so a study habit rides on
top of something you already want to do. Guests can try it without an account;
signing up keeps the XP.

## The loop

Most learning apps ask you to want to learn first. Wolfpack inverts that. You show
up to play, and the lesson arrives while you're already engaged — a few minutes of
game, then a few minutes of the thing the game was quietly teaching.

## How it's built

Astro with React islands, so the marketing surface stays static and only the game
ships JavaScript. Drizzle ORM on Neon Postgres. Auth is passkeys with TOTP as the
no-password fallback.

Capacitor and Tauri wrap the same origin rather than bundling the app — passkeys
are bound to their originating domain, so a `capacitor://localhost` webview could
never authenticate against the production credential.
