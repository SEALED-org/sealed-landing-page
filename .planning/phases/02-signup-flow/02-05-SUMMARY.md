---
phase: 02-signup-flow
plan: 05
subsystem: signup
tags: [client-wiring, turnstile, supabase, edge-function, schema-access, human-verify, counter]

requires:
  - phase: 02-signup-flow
    provides: "Plan 02-04 deploy state — migration 0032 applied, join-waitlist ACTIVE, Turnstile keys live"
provides:
  - "End-to-end signup pipeline working: Turnstile -> siteverify -> 4-state lookup -> rate limit -> auth user + waitlist row -> {state} response"
  - "Client wiring: src/lib/supabase.ts (joinWaitlist + getSignupCount), src/lib/messages.ts, WaitlistForm.tsx + FirstLetter.tsx Turnstile mounts, App.tsx call sites with success-gated counter"
  - "Counter count-up animation (0 -> real count, eased, 115 fallback)"
  - "Migration 0033 + join-waitlist RPC rewrite in sibling SEALED-org repo (commit 05885f7)"
affects: [phase-03-email]

tech-stack:
  added: []
  patterns:
    - "Pattern: public SECURITY DEFINER wrapper functions to reach auth/app_private from Edge Functions without exposing those schemas to the Data API (mirrors 0021 dispatch_public_wrapper)"
    - "Pattern: client-side count-up via requestAnimationFrame tween, App holds target at 0 until fetch resolves so the sweep lands on the real value"

key-files:
  created:
    - "(sibling) supabase/migrations/0033_join_waitlist_public_wrappers.sql"
  modified:
    - "src/lib/supabase.ts (Tasks 1, prior commits)"
    - "src/lib/messages.ts (Task 2, prior commit)"
    - "src/components/WaitlistForm.tsx (Task 3)"
    - "src/components/FirstLetter.tsx (Task 4)"
    - "src/App.tsx (Task 5 + counter target hold-at-0)"
    - "src/components/Counter.tsx (count-up animation)"
    - "(sibling) supabase/functions/join-waitlist/index.ts (RPC rewrite)"

key-decisions:
  - "Root cause of the Task-7 500 was broader than the RESEARCH A2 hypothesis: BOTH supabase.schema('auth') AND supabase.schema('app_private') are rejected by the hosted Data API ('Invalid schema: <name>'). PostgREST only routes to exposed schemas (public); auth is never exposable. So every DB call in join-waitlist failed, not just the auth lookup."
  - "Fix follows the repo's established architecture (32 migrations, all keeping app_private unexposed and reaching it via public wrappers like 0021_dispatch_public_wrapper and the signup_counter view) rather than exposing app_private to the Data API. Migration 0033 adds four public SECURITY DEFINER wrappers restricted to service_role; the function calls them via .rpc(). auth.admin.createUser (GoTrue API) was already correct and unchanged."
  - "Counter: roll-up from 0 to the real count in a single eased requestAnimationFrame tween (counts through every value), not a per-digit flip. App holds Counter target at 0 (waitlistCount ?? 0) until getSignupCount resolves, so it never animates to the 115 placeholder first. 115 remains the no-connection fallback (fetch catch). 4 digit blocks; bump DIGITS before 9999."

patterns-established:
  - "Diagnose Edge Function 500s from the Logs tab (not Invocations) — the console.error line carries the real exception; Invocations only shows the HTTP status."
  - "When a hosted-Supabase Edge Function must read auth.users or write a private schema, add a public SECURITY DEFINER RPC granted to service_role only — never expose the private schema to PostgREST."

requirements-completed: [SIGNUP-01, SEC-01, SEC-02, COUNTER-01, COUNTER-02, COUNTER-03]

duration: "~2 sessions (client wiring 2026-05-29; 500 diagnosis + fix + counter polish 2026-06-02/03)"
completed: 2026-06-03
---

# Phase 2 Plan 05: Client Wiring + E2E Verify Summary

**Signup pipeline works end-to-end. The Task-7 500 was both `auth` and `app_private` being blocked by the hosted Data API; fixed with public SECURITY DEFINER RPC wrappers (sibling migration 0033) per the repo's existing app_private-stays-sealed pattern. Counter reworked to a single eased count-up. Phase 2 core delivered.**

## Accomplishments

- **Client wiring (Tasks 1–5)** completed and committed in the prior session: `joinWaitlist` + `getSignupCount` in `src/lib/supabase.ts`, `MESSAGES` map in `src/lib/messages.ts`, Turnstile mounts + error slots in `WaitlistForm.tsx` and `FirstLetter.tsx`, both call sites wired in `App.tsx` with the counter gated on `state === 'success'`.
- **Task 6 (CSS extraction)** skipped — inline styles satisfy D-08 (optional per plan).
- **Task 7 (HUMAN VERIFY) resolved.** The function returned 500 on every real (Turnstile-passing) submit. Edge Function Logs revealed two errors: `join-waitlist exception Invalid schema: auth` then `record_attempt error Invalid schema: app_private`. Confirmed the Data API blocks both schemas, not just `auth`.
- **Fix (sibling repo, commit 05885f7):** migration `0033_join_waitlist_public_wrappers.sql` adds four `public` SECURITY DEFINER wrappers — `lookup_signup_state`, `check_signup_rate_limit`, `record_signup_attempt`, `create_waitlist_signup` — each `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO service_role`, `SET search_path = ''`. The function now calls them via `.rpc()`. Applied to prod (`supabase db push`) and redeployed (`supabase functions deploy join-waitlist`, now v4).
- **Verified green:** real signup → `{state: success}`, success card renders, row in `app_private.waitlist_signups`, `public.signup_counter` returns `116` (115 seed + 1).
- **Counter polish:** replaced the flip-per-digit jump with a `requestAnimationFrame` count-up (0 → real count, ease-out), target held at 0 until fetch resolves, 4 digit blocks, 115 fallback retained.

## Task Commits

- Tasks 1–5: `d7ce87f`, `5c51f03`, `084f7b4` (+`effe886`), `b833502` (+`effe886`), `aebe6d2` (prior session)
- Task 7 fix (sibling SEALED-org repo): `05885f7`
- Counter animation (this repo): `ccf46dd`

## Decisions Made

See frontmatter `key-decisions`. Highlights:
- The 500 root cause was broader than RESEARCH Open Question A2 predicted — `app_private` is blocked too, so the `auth.admin.listUsers` swap alone would not have fixed it.
- Fix honors the repo's consistent "app_private never exposed; reach it via public wrappers" architecture instead of toggling schema exposure.
- Counter holds target at 0 until the real count loads, so the eased count-up lands directly on the true value (no detour through the 115 placeholder).

## Deviations from Plan

- **D-07 (CONTEXT) deviation, prior session:** Turnstile switched from lazy `execute()` to the `onSuccess` auto-mint pattern (invisible-mode race). Recorded in HANDOFF.
- **Server-side fix scope:** Task 7 was planned as a client human-verify; it surfaced a server-side schema-access bug requiring a new sibling-repo migration + function rewrite. Handled as the documented cross-repo fix.
- **Counter rework:** not in the original plan task list; the `00000` symptom was a tracked secondary blocker in the handoff. Reworked into a count-up per user direction during verification.

## Issues Encountered

- **AdBlock Plus** can intermittently block the Turnstile script — test in incognito (carried from session 1, not blocking).
- **Local Deno typecheck** can't resolve the `npm:@supabase/supabase-js` specifier without `node_modules`; Supabase typechecks on deploy (deploy succeeded).

## User Setup Required

None remaining for Phase 2. Production: migration 0033 applied, join-waitlist v4 live.

## Next Phase Readiness

- **Phase 3 (Email Infrastructure)** is unblocked. The function has marked `TODO(Phase 3)` hooks for Resend Template 1A (`generateLink` + `sendResendEmail`) on both the new-user and unverified-resend paths.
- Carried concern: **DNS/SPF/DKIM/DMARC for sealedapp.io** should be initiated early (propagation is on Phase 3's critical path).
- Optional before Phase 3: `gsd-code-review` on the Phase 2 source, `gsd-secure-phase` for threat-mitigation verification.

---
*Phase: 02-signup-flow*
*Completed: 2026-06-03*
