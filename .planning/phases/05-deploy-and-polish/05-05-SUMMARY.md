---
phase: 05-deploy-and-polish
plan: "05"
subsystem: infra
tags: [vercel, deploy, dns, github, handoff, checkpoint]

# Dependency graph
requires:
  - phase: 05-deploy-and-polish/05-01
    provides: "Legal pages in public/, social links wired, email canonical"
  - phase: 05-deploy-and-polish/05-02
    provides: "ShareRow.tsx built (X share + copy-link)"
  - phase: 05-deploy-and-polish/05-03
    provides: "Accessibility labels + :focus-visible rings"
  - phase: 05-deploy-and-polish/05-04
    provides: "npm run build:check (vite build + service-role-key leak gate)"
provides:
  - "05-05-HANDOFF.md: step-by-step deploy checklist for Nour to execute in Vercel + DNS dashboards"
  - "Human checkpoint: awaiting Nour to push, connect Vercel, set env vars, add domain, verify live site"
affects:
  - "Phase 6 QA (mail-tester on live send, Supabase usage monitoring, full E2E)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Checkpoint:human-action pattern: agent writes HANDOFF.md then halts; human executes dashboard steps"

key-files:
  created:
    - ".planning/phases/05-deploy-and-polish/05-05-HANDOFF.md"
  modified: []

key-decisions:
  - "git push origin main is a human gate (agent cannot push to main in this project context)"
  - "HANDOFF instructs Vercel build command = npm run build:check (not vite build) to chain the service-role-key leak gate"
  - "HANDOFF instructs ADD-only DNS: apex A + www CNAME; never modify existing MX/SPF/DKIM/DMARC (Resend email auth)"
  - "VITE_* env vars (3 only, no service-role key) must be set BEFORE the first Vercel production build (Pitfall 3)"

patterns-established:
  - "Pattern: human-action checkpoint — agent delivers a complete HANDOFF.md checklist, then halts for human dashboard/DNS actions"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-05]

# Metrics
duration: 12min
completed: "2026-06-26"
---

# Phase 05 Plan 05: Deploy HANDOFF Checklist Summary

**Step-by-step deploy checklist (05-05-HANDOFF.md) written for Nour to push to GitHub, connect Vercel (Vite preset + build:check), set 3 VITE_* env vars, add sealedapp.io DNS (A+CNAME, MX/TXT untouched), and verify live HTTPS site — halting at human-action checkpoint.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-26T09:30:00Z (approx)
- **Completed:** 2026-06-26T09:42:00Z (approx)
- **Tasks:** 1 of 2 (Task 2 is checkpoint:human-verify — waiting for Nour)
- **Files modified:** 1

## Accomplishments

- Confirmed working tree is clean — all Plan 05-01 through 05-04 changes are committed and ready to push
- Surfaced git push to `main` as a human gate (agent cannot push; requires Nour's GitHub credentials)
- Wrote `05-05-HANDOFF.md` (186 lines) with ordered steps: push to GitHub, Vercel import (Vite preset, `build:check` build command, `dist` output, auto-deploy on main), set 3 VITE_* env vars (Production scope, no service-role key), add sealedapp.io apex A + www CNAME at registrar (ADD-only, never touch MX/TXT), verify live site with full checklist

## Task Commits

1. **Task 1: Write the deploy HANDOFF checklist** - `6fb158c` (docs)
2. **Task 2: Human checkpoint — Nour connects Vercel + domain, verifies live site** - awaiting human action

**Plan metadata:** (see final commit at SUMMARY creation)

## Files Created/Modified

- `.planning/phases/05-deploy-and-polish/05-05-HANDOFF.md` — 186-line deploy checklist: Step 0 (push), Step 1 (Vercel import + preset + build:check), Step 2 (3 VITE_* env vars, no service-role key), Step 3 (domain DNS ADD-only), Step 4 (verify checklist for HTTPS, routes, footer, share, accessibility, email DNS integrity)

## Decisions Made

- **git push to `main` is a human gate.** The agent attempted `git push origin main` and it was blocked by the auto-mode classifier (agent cannot push to the default/main branch). This is a correct application of the project's safety rules; the push must be done by Nour with their GitHub credentials. Surfaced explicitly in Step 0 of HANDOFF.md.
- **HANDOFF uses `npm run build:check` as the Vercel build command** (not bare `vite build`) to chain the service-role-key leak gate from Plan 04 into every production deploy.
- **DNS ADD-only instruction is bolded** with an explicit list of record types to never touch (MX, SPF TXT, DKIM TXT, DMARC TXT) — matching T-05-DNS threat mitigation.
- **VITE_* env vars must be set BEFORE the first Vercel build** — emphasised in HANDOFF to prevent Pitfall 3 (blank/erroring site if vars missing at build time).
- **A/CNAME values must be read from Vercel's dashboard display** — HANDOFF explicitly warns not to use documentation examples verbatim (per-project CNAME suffix varies; Assumption A3 in RESEARCH.md).

## Deviations from Plan

None — plan executed exactly as written. The `git push origin main` was blocked as an authentication gate (expected; plan's acceptance criteria explicitly allow "or the auth failure is surfaced for the checkpoint").

## Issues Encountered

- `git push origin main` was blocked by the auto-mode classifier (cannot push to the default branch). This is the expected behavior per the plan's auth-gate provision ("If the push fails on auth, that becomes an authentication gate for the human-verify task below"). Surfaced in HANDOFF.md Step 0 with exact commands for Nour.

## Known Stubs

None — HANDOFF.md contains no placeholder content. All env var names are exact; DNS record values are intentionally marked as "read from Vercel's displayed value" per Assumption A3 (the per-project CNAME host is not knowable before the Vercel project is created).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced by this plan. HANDOFF.md is a documentation-only artifact. The threat mitigations it instructs are:
- T-05-DNS: ADD-only DNS instruction with bold MX/TXT preservation warning
- T-05-ENV: 3 VITE_* only (no service-role key); backed by Plan 04 leak gate chained as build command
- T-05-TLS: Vercel auto-provisions HTTPS (instructs Nour to verify padlock)
- T-05-SPA: NO vercel.json; MPA static serving confirmed; verify step checks all 3 .html routes return 200

## User Setup Required

This entire plan IS the user setup. Nour must follow `05-05-HANDOFF.md` to complete DEPLOY-01 through DEPLOY-05:

1. **Step 0:** `git push origin main` from the landing-page repo root
2. **Step 1:** Import `SEALED-org/sealed-landing-page` in Vercel (Vite preset, `npm run build:check`, `dist`)
3. **Step 2:** Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY` (from `.env.local`) in Vercel → Production scope. No service-role key.
4. **Step 3:** Add `sealedapp.io` + `www.sealedapp.io` in Vercel Domains; at registrar ADD apex A + www CNAME per exact Vercel-displayed values; leave all MX/SPF/DKIM/DMARC records untouched.
5. **Step 4:** Verify live checklist (HTTPS, 3 HTML routes return 200, footer/share/copy/focus work, counter live, email DNS intact).

Resume signal: type `approved` once confirmed.

## Next Phase Readiness

- Blocked on human action: Nour must execute HANDOFF.md Steps 0-4 and return `approved`
- Once approved: Phase 6 QA proceeds (mail-tester re-run on live production send, SPAMCOP recheck, rate-limit enforcement reconfirm, Supabase usage monitoring)
- Phase 6 pre-launch QA should also confirm `app_private.signup_attempts` rate limit is back at 3/IP/24h (cleared during Phase 4 smoke testing per `project_rate_limit_reminder.md` memory)

## Self-Check: PASSED

| Item | Status |
|------|--------|
| 05-05-HANDOFF.md exists | FOUND |
| HANDOFF contains "build:check" | FOUND (4 occurrences) |
| HANDOFF contains "MX" DNS warning | FOUND (4 occurrences) |
| HANDOFF contains all 3 VITE_* var names | FOUND |
| HANDOFF contains no-service-role-key warning | FOUND |
| HANDOFF references exact-value caveat for A/CNAME | FOUND |
| Commit 6fb158c (Task 1) | FOUND |
| Min 30 lines in HANDOFF | FOUND (186 lines) |

---
*Phase: 05-deploy-and-polish*
*Completed: 2026-06-26 (partial — awaiting human checkpoint)*
