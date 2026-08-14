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

Build the site, serve it, run the tests. Except `reuseExistingServer` doesn't
just reuse the *server* — it skips the whole command. Build included.

So if a server is already up from an earlier run, the suite tests whatever was
on disk from that earlier build. Change some source, run the tests, watch them
pass. They never saw your change.

## How I found it

Not by reasoning about it. I'd fixed a layout overflow and wanted to confirm the
new test would actually have caught it, so I put the bug back and reran.

It passed.

That's the only reason I looked at the config at all. Had I not bothered to
check the test could fail, I'd have shipped a suite that was quietly testing a
snapshot of the past.

## Two fixes

Move the build out of the server command, so reuse only ever means reuse:

```json
"test": "pnpm build && playwright test"
```

And then, separately: **check that your test fails.** Reintroduce the bug, watch
it go red, put the fix back. It takes a minute and it's the only thing that
distinguishes a test from a decoration.

The overflow probe had the same problem, incidentally. It compared bounding
boxes against the viewport — but the bug was a long unbreakable word overflowing
*its own box*, which never makes the box exceed the viewport. The probe was
looking in a place the bug could never be. It reports unclipped `scrollWidth`
now, and I made sure it goes red before believing it again.
