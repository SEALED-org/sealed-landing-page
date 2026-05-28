---
phase: 02-signup-flow
plan: 01
subsystem: infra
tags: [env, dependencies, requirements, turnstile, supabase]

requires:
  - phase: 01-foundation
    provides: ".env.local with VITE_SUPABASE_URL/ANON_KEY (Phase 1 wrote these — Phase 2 fixed the two pre-existing bugs in them)"
provides:
  - "Corrected .env.local with canonical Supabase URL host (matches JWT ref claim) plus a new VITE_TURNSTILE_SITE_KEY slot Plan 05 will read at module load"
  - "REQUIREMENTS.md SEC-02 amended from 1/day to 3-per-rolling-24h per CONTEXT.md D-05; downstream Edge Function (Plan 03) codes the same threshold"
  - "@marsidev/react-turnstile@1.5.2 pinned exact in package.json + lockfile so Plan 05 can mount the widget without an intermediate install"
affects: [02-02-PLAN, 02-03-PLAN, 02-04-PLAN, 02-05-PLAN]

tech-stack:
  added:
    - "@marsidev/react-turnstile@1.5.2 (React wrapper for Cloudflare Turnstile, ref-based lazy execute API)"
  patterns:
    - "Pinned exact (--save-exact) dependency policy carried forward from Phase 1 Plan 01-01"

key-files:
  created: []
  modified:
    - ".env.local (URL host reconciled to canonical, VITE_TURNSTILE_SITE_KEY appended with placeholder)"
    - ".planning/REQUIREMENTS.md (SEC-02 threshold + D-05 sibling note)"
    - "package.json (@marsidev/react-turnstile dependency)"
    - "package-lock.json (transitive lock for the new dep)"

key-decisions:
  - "URL host reconciled by trusting the JWT ref claim (decoded from the existing anon key) and cross-checking against the sibling SEALED-org repo's .env — both pointed to tiaeioiylephekgrllnj.supabase.co, so the landing repo's URL was the typo'd side."
  - "TURNSTILE_SITE_KEY uses a recognizable placeholder (REPLACE_ME_TURNSTILE_SITE_KEY_FROM_CLOUDFLARE_DASHBOARD) rather than a blank value so the Plan 05 module-load truthy check passes and the dev server boots — the loud failure mode is then the Turnstile widget itself, which is the desired behavior for an unconfigured env."
  - "Leading-whitespace bug on VITE_SUPABASE_ANON_KEY= was already absent from the file (likely fixed in an earlier hand-edit); the verify gate still ran clean."

patterns-established:
  - "Pre-execution env/dep/docs preconditions land in a dedicated Wave-0 plan, never folded into the first code plan — keeps the cross-repo handoff plans (02, 03) focused purely on artifacts."

requirements-completed: [SEC-04]

duration: ~6 min
completed: 2026-05-29
---

# Phase 2 Plan 01: Preconditions Summary

**Repaired .env.local URL/JWT-ref mismatch, added VITE_TURNSTILE_SITE_KEY slot, amended REQUIREMENTS SEC-02 to 3/24h per D-05, pinned @marsidev/react-turnstile@1.5.2.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-29 (interactive sequential mode)
- **Completed:** 2026-05-29
- **Tasks:** 3
- **Files modified:** 4 (one untracked: .env.local; three tracked: REQUIREMENTS.md, package.json, package-lock.json)

## Accomplishments

- **.env.local sanitized**: URL host moved from typo'd `tiaeiioiyelhekgrllnjn` → canonical `tiaeioiylephekgrllnj` (matches both the JWT `ref` claim and the sibling SEALED-org repo's env). VITE_TURNSTILE_SITE_KEY appended with placeholder. SEC-04 audit clean (no `service_role` substring anywhere in the file).
- **REQUIREMENTS.md SEC-02 amended**: `1 signup attempt per day` → `3 signup attempts per rolling 24h` with the D-05 sibling note. Traceability table row unchanged. Old wording fully removed (verified by grep gate).
- **@marsidev/react-turnstile@1.5.2 installed**: exact pin, lockfile updated, node_modules confirms the version. No other dependency disturbed.

## Task Commits

1. **Task 1: Fix .env.local** — *(no git commit — file is untracked; on-disk edit verified by the plan's grep gate)*
2. **Task 2: Amend REQUIREMENTS SEC-02** — `2f1ebf6` (docs)
3. **Task 3: Install @marsidev/react-turnstile@1.5.2** — `630a5ce` (chore)

## Files Created/Modified

- `.env.local` — Three VITE_ lines: URL (canonical host), ANON_KEY (no leading whitespace), TURNSTILE_SITE_KEY (placeholder). Header comment block preserved verbatim.
- `.planning/REQUIREMENTS.md` — SEC-02 bullet updated; appended italicised D-05 reference.
- `package.json` — Added `"@marsidev/react-turnstile": "1.5.2"` (literal, no caret/tilde).
- `package-lock.json` — Lockfile resolved 1 new package, 0 vulnerabilities, 99 audited total.

## Decisions Made

- Trusted the JWT `ref` claim + sibling-repo cross-check as the source of truth for the canonical Supabase URL host — see frontmatter `key-decisions`.
- Used a recognizable placeholder rather than blanking `VITE_TURNSTILE_SITE_KEY` so the dev server boots and the failure surfaces in the Turnstile widget itself.

## Deviations from Plan

None - plan executed exactly as written.

The leading-whitespace bug the plan expected on `VITE_SUPABASE_ANON_KEY=` was already absent from the file before this plan ran (likely repaired by hand earlier). The verify gate still passed cleanly and no remediation was needed.

## Issues Encountered

- **Repo has no `.gitignore`.** `.env.local`, `node_modules/`, `dist/`, and `.DS_Store` are all untracked but unprotected. Out of scope for Plan 02-01 (which only modifies the three files listed in its frontmatter), but a real security concern given `.env.local` now contains real Supabase keys. Recommendation: add a `.gitignore` as part of a future hygiene plan or Phase 5 deploy prep.

## User Setup Required

None for this plan. Cloudflare Turnstile site key + secret are handled in Plan 04's handoff prompt.

## Next Phase Readiness

- Plans 02-02 (migration), 02-03 (Edge Function), and 02-04 (handoff) are unblocked — all of their prerequisites are now in place.
- Plan 02-05 (client wiring) consumes the new env var (`VITE_TURNSTILE_SITE_KEY`) and the new dependency (`@marsidev/react-turnstile`); both are now available.

---
*Phase: 02-signup-flow*
*Completed: 2026-05-29*
