---
title: The test that passed against a stale build
subtitle: Green is only meaningful if the suite could have gone red.
date: 2026-08-12
tags:
  - testing
  - playwright
---

Playwright's `webServer` config is convenient:

```ts
webServer: {
  command: 'pnpm build && node scripts/serve.mjs',
  url: 'http://localhost:4399',
  reuseExistingServer: !process.env.CI,
}
```

Build the site, serve it, run the tests. The catch is that
`reuseExistingServer` doesn't just reuse the server, it skips the whole command,
build and all.

So if a server is already up from an earlier run, the suite tests whatever was
on disk from that earlier build. You can change some source, run the tests and
watch them pass without them ever having seen your change.

## How I found it

I didn't work it out from reading the config. I'd fixed a layout overflow and
wanted to confirm the new test would actually have caught it, so I put the bug
back and reran, and it still passed. That's the only reason I looked at the
config at all. If I hadn't bothered to check that the test could fail, I'd have
shipped a suite that was quietly testing a snapshot of the past.

## Two fixes

The first is to move the build out of the server command, so that reusing the
server doesn't skip it:

```json
"test": "pnpm build && playwright test"
```

The second one isn't about the config at all: check that your test actually
fails. Reintroduce the bug, watch it go red, then put the fix back. It takes a
minute, and without doing it you don't really know whether the test is doing
anything.

The overflow probe had the same problem. It compared bounding boxes against the
viewport, but the bug was a long unbreakable word overflowing its own box, which
never makes the box itself exceed the viewport. So the probe was checking
somewhere the bug couldn't show up. It reports unclipped `scrollWidth` now, and
I made sure it went red before I believed it again.
