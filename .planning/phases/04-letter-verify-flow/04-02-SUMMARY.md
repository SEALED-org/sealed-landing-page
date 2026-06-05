---
phase: 04-letter-verify-flow
plan: "02"
subsystem: landing-page
tags: [verify, email-verification, standalone-html, vite-multipage]
dependency_graph:
  requires: []
  provides: [verify.html, vite-multipage-build]
  affects: [vite.config.ts]
tech_stack:
  added: []
  patterns: [standalone-html-no-react, vite-html-env-replacement, vite-multipage]
key_files:
  created: [verify.html]
  modified: [vite.config.ts]
decisions:
  - "Used Vite %VITE_*% HTML env replacement tokens (not import.meta.env) — correct approach for standalone HTML in multi-page Vite build"
  - "already_sealed renders as success state (✦ icon, positive copy) not an error — per CONTEXT Discretion and Pitfall 5"
  - "No email-sending logic in verify.html — EMAIL-B2 compliant (verify-email Edge Function handles all emails)"
  - "Token never logged in inline script — only { state } logged on resolution (T-04-09 mitigation)"
metrics:
  duration: "~2 min"
  completed_date: "2026-06-05"
  tasks_completed: 2
  files_changed: 2
---

# Phase 04 Plan 02: Verify Page + Vite Multi-page Build Summary

Standalone `/verify` page created with locked Claude Design aesthetic (cream paper, Instrument Serif, Space Mono), calling the `verify-email` Edge Function and rendering four states. Vite build wired to emit `dist/verify.html` as a multi-page output.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create verify.html — four-state token verification page | a2332e5 | verify.html (new, 340 lines) |
| 2 | Add verify.html as Vite multi-page input | a358c39 | vite.config.ts (+8 lines) |

## What Was Built

### verify.html

Standalone HTML page (no React, no Tailwind processing) at the repo root. Mirrors `privacy.html` structure exactly:

- Full `:root` token block: `--paper: #fefcf8`, `--ink`, `--ink-70` through `--ink-06`, all three font stacks
- Paper grain overlay (`body::before` radial-gradient, `mix-blend-mode: multiply, opacity: 0.6`)
- Fixed nav with `nav.top` / `.mark` / `.btn-back` — identical CSS to privacy.html
- Same footer pattern (black background, `foot-inner` grid, `foot-brand`, `foot-col`, `foot-bottom`)
- Google Fonts link: Plus Jakarta Sans, Instrument Serif, Space Mono (identical `<link>` tag)

**Layout:** Flexbox-centered single column, `padding-top: 160px` (clears fixed nav), `max-width: 480px`, `text-align: center`.

**Vite env replacement confirmed working:** `const SUPABASE_URL = '%VITE_SUPABASE_URL%'` and `const SUPABASE_ANON_KEY = '%VITE_SUPABASE_ANON_KEY%'` — Vite replaces these `%VITE_*%` tokens in HTML files during build. Confirmed in `dist/verify.html` output (12.44 kB).

### Four State Copy

| State | Icon | Title | Sub-text |
|-------|------|-------|----------|
| `sealed` | ✦ | Your letter is *sealed.* | We'll deliver it on January 1, 2027. Until then, it's safe with us. |
| `already_sealed` | ✦ | Already *sealed.* | Your letter is on its way to January 1, 2027. No further action needed. |
| `expired` | ○ | This link *expired.* | Verification links are valid for 7 days. Sign up again to get a fresh link. |
| `invalid` | ○ | Invalid *link.* | This verification link isn't valid. If you think this is an error, try returning to the landing page. |

`sealed` and `already_sealed` use ✦ (success icon). `expired` and `invalid` use ○ (hollow circle). Both `expired` and `invalid` include a "Return home" CTA linking to `/`.

**`already_sealed` rendered as success, not error** — per CONTEXT Discretion and RESEARCH Pitfall 5. This handles double-click / re-verification gracefully.

### Loading State

Initial HTML shows: ✦ icon, "SEALED" mono label, "Verifying *your letter…*" heading, animated "One moment" label (CSS `@keyframes pulse`, 2s, opacity 0.3→1→0.3). This is immediately visible before the fetch completes.

### vite.config.ts

Added `build.rollupOptions.input`:
```ts
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'index.html'),
      verify: path.resolve(__dirname, 'verify.html'),
    },
  },
},
```

All existing configuration (plugins, resolve.alias) unchanged. `path` was already imported.

**Build output confirmed:**
```
dist/index.html   1.17 kB
dist/verify.html 12.44 kB  ← new
```
`npm run build` exits 0. Vercel will serve `dist/verify.html` at `/verify` (clean URL, no rewrite config needed — confirmed in RESEARCH Assumption A2).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

The inline script uses `%VITE_SUPABASE_URL%` and `%VITE_SUPABASE_ANON_KEY%` Vite HTML env replacement tokens. In local dev (`npm run dev`), these tokens are **not** replaced — Vite's dev server does not process HTML env tokens the same way as build. The page will fail to call the function in dev unless `.env.local` values are manually substituted. This is expected and intentional — the page is production-targeted. The `verify-email` Edge Function (Plan 04-04) is not yet implemented; the fetch will return an error and fall through to `renderState('invalid')` until 04-04 is deployed.

## Threat Surface Scan

No new security-relevant surface beyond what is in the plan's threat model:
- T-04-08: Token passthrough only — no client-side validation
- T-04-09: `console.log('[verify]', { state })` — token never logged
- T-04-10: Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` injected (public values)
- `VITE_SUPABASE_SERVICE_ROLE_KEY` is not in `.env.example` with a VITE_ prefix — no bundle leak risk

## Self-Check

- [x] verify.html exists at `/Users/nourismaiel/Downloads/SEALED Landing Page Claude Design/verify.html`
- [x] vite.config.ts contains `rollupOptions.input` with both entries
- [x] `dist/verify.html` produced by `npm run build` (12.44 kB)
- [x] Commit a2332e5 — feat(04-02): create verify.html
- [x] Commit a358c39 — feat(04-02): add verify.html as Vite multi-page build input
- [x] No email-sending logic (grep returns 0)
- [x] All four state keys present in verify.html
- [x] Two VITE_ env tokens present

## Self-Check: PASSED
