---
phase: 01-foundation
plan: 01
subsystem: data-access
tags: [supabase, typescript, env-config, package-install]
dependency_graph:
  requires: []
  provides: [src/lib/supabase.ts, src/vite-env.d.ts, .env.example, package-lock.json]
  affects: [plans 02, 03, 04 — all consume src/lib/supabase.ts]
tech_stack:
  added: ["@supabase/supabase-js@2.103.2"]
  patterns: [named-exports-only module, module-load assertion, AbortSignal.timeout, Phase-1-stub contract]
key_files:
  created:
    - src/lib/supabase.ts
    - src/vite-env.d.ts
    - .env.example
    - package-lock.json
  modified:
    - package.json
decisions:
  - "@supabase/supabase-js pinned exactly at 2.103.2 (no caret) per D-08 to match SEALED-org app version"
  - "joinWaitlistLocal stub accepts email param and returns void — locks Phase 2 call-site shape"
  - "Module-load assertion throws readable error if either VITE_SUPABASE_* var is missing"
  - "AbortSignal.timeout(3000) cancels slow requests at 3s; caller falls back to 115 per D-11"
metrics:
  duration: "3 minutes"
  completed_date: "2026-05-27T19:47:10Z"
  tasks_completed: 3
  files_changed: 5
---

# Phase 1 Plan 1: Supabase Client Foundation Summary

**One-liner:** Pinned @supabase/supabase-js@2.103.2, created the single browser-side data-access module with fail-loud env validation, typed env declarations, and the joinWaitlistLocal Phase-1 stub that locks the Phase-2 call-site contract.

## What Was Built

### Files Created

| File | Role |
|------|------|
| `src/lib/supabase.ts` | Single Supabase client instance + Phase 1 helpers. Exports: `supabase`, `getSignupCount`, `joinWaitlistLocal`. |
| `src/vite-env.d.ts` | Ambient TypeScript declarations for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as `readonly string`. |
| `.env.example` | Documented env var contract — lists both VITE_SUPABASE_* keys (no values) with comment block explaining the VITE_ prefix requirement and where to get the values. |
| `package-lock.json` | Committed lockfile for reproducible installs (previously absent from repo). |

### Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `"@supabase/supabase-js": "2.103.2"` — exact pin, no caret, first in the `@`-scoped group. |

## Named Exports of src/lib/supabase.ts

| Export | Type | Description |
|--------|------|-------------|
| `supabase` | `SupabaseClient` | Single browser client created with `createClient(url, key)`. Module throws at load if either env var is missing. |
| `getSignupCount` | `() => Promise<number>` | Reads `public.signup_counter` view. Uses `.single()` + `.abortSignal(AbortSignal.timeout(3000))`. Throws on error — caller falls back to 115. |
| `joinWaitlistLocal` | `(email: string) => Promise<void>` | Phase 1 stub. No network call. Returns void immediately. Phase 2 replaces the body with the real Edge Function fetch without touching the `await joinWaitlistLocal(email)` call sites in App.tsx. |

## Env Vars Now Required

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project REST endpoint URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public — gated by RLS/grants, not secrecy) |

Both vars are identical to the SEALED-org app's Supabase project. Copy from `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/.env.local`.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-01-02: Silent broken client if env vars missing | Module throws a readable `Error` at load naming both vars and how to set them |
| T-01-03: Hung fetch to Supabase REST | `.abortSignal(AbortSignal.timeout(3000))` cancels the request after 3s |
| T-01-17: joinWaitlistLocal signature drift | Stub accepts `email: string` and returns `Promise<void>` — locked; Phase 2 must preserve this signature |

## Commits

| Task | Description | Hash |
|------|-------------|------|
| 1 | Install @supabase/supabase-js@2.103.2 + lockfile | 8092d92 |
| 2 | Create src/lib/supabase.ts + src/vite-env.d.ts | 2429908 |
| 3 | Create .env.example | 805861c |

## Important Notes

- **No Firebase work done in this plan.** Firebase removal from `src/App.tsx` (import, useEffect, useState) is handled in plan 04 (App.tsx surgery).
- **Nothing is callable end-to-end yet.** `getSignupCount()` queries the `public.signup_counter` view, which does not exist in Supabase until plan 03's migration is applied in the SEALED-org repo.
- **No edits to src/App.tsx, src/main.tsx, or vite.config.ts.** This plan is strictly additive.
- **No .gitignore created.** Deferred to Phase 5 per plan scope (CONTEXT.md discretion).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `joinWaitlistLocal(email)` returns void immediately | `src/lib/supabase.ts:40-43` | Phase 1 intentional no-op. Plan 04 wires call sites; Phase 2 replaces body with real Edge Function fetch. |

The stub is intentional and documented. Plan 04 depends on this stub being present. Phase 2 removes the stub body.

## Self-Check: PASSED

- [x] `src/lib/supabase.ts` exists with 3 named exports
- [x] `src/vite-env.d.ts` exists with typed ImportMetaEnv
- [x] `.env.example` exists with both VITE_SUPABASE_* keys
- [x] `package-lock.json` exists and resolves @supabase/supabase-js to 2.103.2
- [x] `package.json` has `"@supabase/supabase-js": "2.103.2"` (exact, no caret)
- [x] Commits 8092d92, 2429908, 805861c exist in git log
- [x] All 8 plan verification checks pass
