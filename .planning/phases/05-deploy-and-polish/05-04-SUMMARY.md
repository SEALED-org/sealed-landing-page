---
phase: 05-deploy-and-polish
plan: "04"
subsystem: infra
tags: [security, bundle-leak, ci-gate, node, esm, npm-scripts]

# Dependency graph
requires: []
provides:
  - "scripts/check-bundle.mjs: ESM Node script scanning dist/ for four service-role-specific leak patterns"
  - "npm run verify:no-secrets: runs the detector against dist/"
  - "npm run build:check: chains vite build + gate for use as Vercel Build Command"
affects:
  - 05-deploy-and-polish/05-05 (Vercel build command should use build:check)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Post-build leak gate: node scripts/check-bundle.mjs runs against dist/ after every vite build"
    - "Service-role-specific patterns only (no bare eyJ) to avoid false-positives on legitimate anon JWT"
    - "Optional SERVICE_ROLE_KEY_PREFIX env var for exact-key-prefix check (zero false positives)"

key-files:
  created:
    - scripts/check-bundle.mjs
  modified:
    - package.json

key-decisions:
  - "D-18: Gate uses sb_secret_, \"role\":\"service_role\", service_role, SERVICE_ROLE_KEY — NOT bare eyJ (anon key is also a JWT and belongs in the bundle)"
  - "Dependency-free implementation using Node built-ins (fs/path only) per T-05-SC"
  - "Exits 1 on missing dist/ so gate cannot silently pass when nothing has been built"
  - "build:check script chains vite build + gate for Vercel Build Command usage in Plan 05"

patterns-established:
  - "Pattern: Post-build secret scan — run node scripts/check-bundle.mjs after every vite build before deploy"
  - "Pattern: Service-role-specific pattern matching — avoid naive eyJ grep that false-positives on anon key"

requirements-completed: [DEPLOY-05]

# Metrics
duration: 10min
completed: "2026-06-26"
---

# Phase 5 Plan 04: Service-Role-Key Bundle-Leak Gate Summary

**ESM Node script (scripts/check-bundle.mjs) scanning dist/ for four service-role-specific patterns, wired as `npm run verify:no-secrets` and `npm run build:check` — exits 1 on any hit, closes the STATE.md secret-leak blocker**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-26T09:12:22Z
- **Completed:** 2026-06-26T09:22:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `scripts/check-bundle.mjs` — dependency-free ESM Node script that recursively scans all text-readable files in `dist/` for four service-role-specific leak patterns
- Wired `verify:no-secrets` and `build:check` npm scripts into `package.json` without changing existing `dev`/`build`/`preview` scripts
- Proved the gate catches a planted `"role":"service_role"` string (leak-exit:1) and passes on clean dist/ (clean-exit:0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/check-bundle.mjs** - `46b887f` (feat)
2. **Task 2: Wire verify:no-secrets into package.json** - `d26d21f` (feat)

**Plan metadata:** `[pending — see below]` (docs: complete plan)

## Files Created/Modified

- `scripts/check-bundle.mjs` - ESM leak detector; scans dist/ for sb_secret_, "role":"service_role", service_role, SERVICE_ROLE_KEY; exits 0 clean / 1 on any hit / 1 if dist/ missing
- `package.json` - Added `verify:no-secrets` and `build:check` scripts

## Gate Verification Results

| Run | Condition | Exit code | Output |
|-----|-----------|-----------|--------|
| 1 | Planted `"role":"service_role"` in `dist/__leak_test.js` | **1 (non-zero)** | `LEAK: "role":"service_role" found in dist/__leak_test.js` + `LEAK: "service_role" found in...` + FAIL |
| 2 | Clean dist/ (file removed) | **0** | `OK: no service-role secret in dist/` |
| 3 | dist/ missing (ran from /tmp) | **1 (non-zero)** | `ERROR: dist/ directory not found. Run npm run build first.` |

Note: The planted `"role":"service_role"` correctly triggered two pattern matches — the literal `"role":"service_role"` AND the `service_role` substring match. This is expected and correct behavior (belt-and-suspenders).

## Why eyJ is NOT matched

The anon key is a JWT and starts with `eyJ` — it legitimately belongs in the public bundle. A naive `grep eyJ dist/` false-positives on every build. The gate targets patterns that should NEVER appear client-side: the service-role-specific strings and env var name. The current dist/ contains 4 `eyJ`-prefixed tokens (the anon key and its fragments) — all clean. (D-18)

## Decisions Made

- Service-role-specific patterns only (no bare `eyJ`) per D-18 — the anon key is also a JWT and belongs in the bundle; only `sb_secret_`, `"role":"service_role"`, `service_role`, and `SERVICE_ROLE_KEY` are scanned
- Node built-ins only (fs/path) — zero new npm packages required (T-05-SC mitigation)
- Gate exits 1 on missing dist/ — cannot silently pass when nothing has been built; must run after `vite build`
- Optional `SERVICE_ROLE_KEY_PREFIX` env var for exact key-value prefix check (most robust, zero false positives) — never hardcoded in the file

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Threat Flags

None — the gate itself is the mitigation for T-05-LEAK and T-05-FP. No new security surface introduced.

## User Setup Required

None — no external service configuration required. The gate runs locally via `npm run verify:no-secrets` and will be chained into the Vercel Build Command in Plan 05-05 (`build:check`).

## Next Phase Readiness

- `npm run build:check` is ready for Plan 05-05 to paste into Vercel's Build Command field
- Gate closes the STATE.md "service role key bundle leak risk" blocker once chained into the deploy (Plan 05-05)
- `scripts/check-bundle.mjs` can optionally be run as a pre-push hook for fast local feedback

---
*Phase: 05-deploy-and-polish*
*Completed: 2026-06-26*
