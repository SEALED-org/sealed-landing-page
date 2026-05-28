---
phase: 02-signup-flow
plan: 03
subsystem: api
tags: [supabase, edge-function, deno, turnstile, rate-limit, cross-repo, auth]

requires:
  - phase: 02-signup-flow
    provides: "Plan 02-02's app_private.signup_attempts migration (Edge Function reads/inserts via service_role)"
  - phase: 01-foundation
    provides: "Sibling SEALED-org repo _shared/admin-client.ts + 0031_waitlist_signups.sql"
provides:
  - "supabase/functions/join-waitlist/{deno.json,index.ts} in the sibling SEALED-org repo: the complete Phase 2 server-side surface"
  - "Locked response shape { state: 'success' | 'unverified' | 'verified_no_letter' | 'verified_with_letter' | 'rate_limited' | 'turnstile_failed' | 'server_error', retry_after?: number } — Plan 05's MESSAGES map keys must match these seven exactly"
  - "Phase 3 stub at Resend call site — TODO(Phase 3 — EMAIL-A2 / EMAIL-03 / EMAIL-04) naming generateLink + sendResendEmail from _shared/resend.ts"
affects: [02-04-PLAN, 02-05-PLAN, 03-*]

tech-stack:
  added: []
  patterns:
    - "Pattern: Public Edge Function (browser-callable) — uses adminClient() for service-role DB writes but does NOT import requireServiceRole; CORS preflight is the first executable line"
    - "Pattern: D-06 ordering — 4-state lookup before rate-limit check so duplicate detection wins over throttling for known emails"
    - "Pattern: Best-effort attempt logging — recordAttempt() swallows its own errors so log failures don't break the response path"

key-files:
  created:
    - "/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/deno.json (sibling repo)"
    - "/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/index.ts (sibling repo, 235 lines)"
  modified: []

key-decisions:
  - "Helper inventory: jsonResponse, verifyTurnstile, extractIp, lookupSignupState, checkRateLimit, recordAttempt. Each one is a single responsibility — avoids re-inlining and keeps the Deno.serve handler readable."
  - "lookupSignupState throws on a failed schema('auth').from('users') probe rather than silently degrading — this forces the Plan 04 handoff to surface RESEARCH Open Question 1 (A2: schema('auth') restriction) during deploy verification rather than later."
  - "Best-effort db_error attempt logging inside the outer catch (try/swallow) so even server_error cases leave a ledger row for debugging."
  - "Pipeline file length: 235 lines (within the plan's 100-320 envelope). Helpers extracted; no over-inlining."

patterns-established:
  - "Public Edge Function pattern in this repo family: CORS preflight first, then POST gate, then `try { siteverify -> lookup -> rate -> create -> insert -> respond } catch { log + best-effort attempt log + 500 }`."

requirements-completed: [SIGNUP-01, SEC-01, SEC-02, SEC-03, SEC-04, DB-03, DB-06, DB-07, EMAIL-A1]

duration: ~10 min
completed: 2026-05-29
---

# Phase 2 Plan 03: join-waitlist Edge Function Summary

**Public signup endpoint shipped (235 lines): CORS-aware, Turnstile-gated, 4-state-aware re-signup classifier with secondary IP rate limit, admin.createUser + waitlist_signups insert + signup_attempts ledger, structured { state } response, Phase 3 Resend stub at the success path.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-29
- **Completed:** 2026-05-29
- **Tasks:** 2
- **Files modified:** 2 (sibling repo only; 0 landing-repo source files)

## Accomplishments

- **deno.json manifest** written byte-identical to `dispatch/deno.json`: pins `npm:@supabase/supabase-js@2.103.2`, no other imports.
- **index.ts** implements the full pipeline (235 lines):
  - Module constants: `TURNSTILE_VERIFY_URL`, `RATE_LIMIT_THRESHOLD = 3` (matches Plan 01's amended SEC-02), `RATE_LIMIT_WINDOW_MS`, `corsHeaders`, `JSON_HEADERS`.
  - Type aliases: `State`, `Outcome`, `RequestBody`, `TurnstileVerifyResponse`, `LookupState`, `ResponseBody`.
  - Six helpers covering the pipeline.
  - `Deno.serve` handler with locked ordering per D-06.
- **Static security gates passed** (grep):
  - Siteverify call (line 14) textually precedes `admin.createUser` (line 204) and the `waitlist_signups` insert (line 212).
  - No `console.*` echoes `body.email`, `turnstileToken`, `SUPABASE_SERVICE_ROLE_KEY`, or `TURNSTILE_SECRET_KEY`.
  - No `requireServiceRole` import or call (public endpoint).
  - All seven `state:` strings present in source.

## Task Commits

1. **Task 1: deno.json** — *(sibling repo write, no landing-repo commit)*
2. **Task 2: index.ts** — *(sibling repo write, no landing-repo commit)*

Plan-level audit trail commit (this SUMMARY) follows below.

## Files Created/Modified

- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/deno.json` — Function manifest. Created.
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/index.ts` — Full Edge Function (235 lines). Created.

## Helper Inventory

| Helper | Responsibility |
|---|---|
| `jsonResponse(body, status)` | Wraps `Response` with `JSON_HEADERS` (merges `corsHeaders`) — every response carries CORS. |
| `verifyTurnstile(token, remoteIp)` | POST to `challenges.cloudflare.com/turnstile/v0/siteverify`, throws if `TURNSTILE_SECRET_KEY` missing, returns boolean. |
| `extractIp(req)` | `x-forwarded-for` first segment → `x-real-ip` → `'unknown'`. |
| `lookupSignupState(supabase, email)` | Probes `auth.users` → if found, probes `app_private.letters` → returns one of four `LookupState` values; throws on auth.users error. |
| `checkRateLimit(supabase, ip)` | Count query against `app_private.signup_attempts` over the rolling 24h window. Returns `true` if under threshold (3). |
| `recordAttempt(supabase, ip, outcome)` | Best-effort insert into `signup_attempts`; swallows its own errors. |

## Response State / Status Matrix

| State | HTTP | Branch |
|---|---|---|
| `success` | 200 | New email, under rate limit, createUser + waitlist insert succeeded |
| `unverified` | 200 | Existing auth.users row with `email_confirmed_at = NULL` |
| `verified_no_letter` | 200 | Verified user, no row in `app_private.letters` |
| `verified_with_letter` | 200 | Verified user with letter row |
| `rate_limited` | 429 | 3+ attempts from this IP in last 24h; `retry_after: 86400` |
| `turnstile_failed` | 200 | Siteverify returned `success: false` (200 per D-09 — client treats as known state) |
| `server_error` | 400/405/500 | Bad JSON / wrong method / uncaught throw |

## Security Ordering Claim

- Siteverify URL: line **14** (constant) — pipeline call: line **170** (inside `verifyTurnstile()`).
- `admin.createUser`: line **204** — strictly after `await verifyTurnstile(...)` resolves true.
- `waitlist_signups` insert: line **212** — strictly after siteverify and createUser.
- `lookupSignupState` (the only pre-rate-limit DB read) runs only after `verifyTurnstile` resolves true.

## Decisions Made

See frontmatter `key-decisions`. Highlights: best-effort attempt logging in catch path, throw-on-auth-restriction for fail-fast deploy verification, no in-line auth-listUsers fallback (RESEARCH Open Question 1 deferred for Wave 1 probe).

## Deviations from Plan

None - plan executed exactly as written.

(Two minor reformatting passes to satisfy the strict grep gate which expects `schema('X').from('Y')` on a single line and rejects the literal string `requireServiceRole` in comments — both edits are cosmetic, no behavioral change.)

## Issues Encountered

- Plan verify gate uses literal substring grep, so `.schema(...).from(...)` had to live on a single line (canary/dispatch sibling code uses both styles). Reformatted to comply.
- The same literal-substring gate flagged a `requireServiceRole` mention in the header comment. Rephrased to "the service-role guard from _shared/auth.ts is intentionally NOT imported".

## User Setup Required

None at this plan level. Cloudflare Turnstile site key + secret + the function deploy itself are handled in Plan 04's handoff prompt.

## Next Phase Readiness

- Plan 04 (handoff) will assemble the deploy prompt referencing both 0032_signup_attempts.sql AND supabase/functions/join-waitlist/ as the two artifacts the SEALED-org agent must apply/deploy.
- Plan 05 (client wiring) consumes the locked seven-state response shape via the MESSAGES map and inline error slot.

---
*Phase: 02-signup-flow*
*Completed: 2026-05-29*
