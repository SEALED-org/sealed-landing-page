---
phase: 04-letter-verify-flow
plan: "03"
subsystem: edge-function
tags: [supabase, deno, edge-function, email, resend, letter, path-b, d-04]

requires:
  - phase: 04-letter-verify-flow
    plan: "01"
    provides: "public.upsert_pending_letter + public.create_verification_token RPCs"

provides:
  - "join-waitlist/index.ts: Path B branch (upsert_pending_letter + create_verification_token + 1B send for new signups with letter)"
  - "join-waitlist/index.ts: D-04 unverified re-signup always sends 1B (fresh token; body update if new letter)"
  - "join-waitlist/index.ts: ?test_1b=1 trigger block removed (T-04-14)"
  - "join-waitlist/index.ts: letter param accepted (RequestBody), 2000-char server-side cap (D-02)"

affects: [04-04, 04-05, 04-06]

tech-stack:
  added: []
  patterns:
    - "Path B branch: upsert_pending_letter → create_verification_token → best-effort 1B send inside outer try/catch"
    - "D-04 newest-wins: upsert_pending_letter called conditionally in unverified re-signup when new letter present"
    - "Fresh token per re-send (Pitfall 4): create_verification_token called each time unverified user re-submits — new token.id ensures Resend 24h dedupe window is never hit"
    - "Pitfall 7 pattern: DB upsert + token creation are fatal (throw on error); email send is best-effort (try/catch)"
    - "Privacy-safe logging: only token_id + user_id logged; verifyUrl and letter body never appear in logs (T-04-16)"

key-files:
  created: []
  modified:
    - "(sibling) supabase/functions/join-waitlist/index.ts"

key-decisions:
  - "DB errors in upsert_pending_letter and create_verification_token are fatal (throw → server_error): draft and token must both exist before best-effort email send; partial state is worse than a hard failure"
  - "case 'unverified' ALWAYS sends 1B regardless of whether a new letter body was submitted: D-04 states user in unverified state has a pending letter; the verify link is what they need"
  - "Path A 1A send path is structurally unchanged: the letter.length > 0 guard early-returns for Path B, falling through to the existing 1A block untouched"
  - "idempotencyKey '1b-{tokenRow.id}' (new signup) vs '1b-resend-{tokenRow.id}' (D-04 re-send): different prefixes make log correlation easier; fresh token.id means no Resend dedupe concern in either case"

duration: 14min
completed: 2026-06-05
---

# Phase 4 Plan 03: join-waitlist Letter Wiring Summary

**join-waitlist Edge Function now implements full Path B: new signups with a letter body trigger upsert_pending_letter + create_verification_token + 1B send; unverified re-signups always re-send 1B with a fresh token (D-04); the ?test_1b=1 test trigger is deleted.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-06-05
- **Completed:** 2026-06-05
- **Tasks:** 2
- **Files modified:** 1 (sibling repo)

## Accomplishments

- Task 1: Removed the entire ?test_1b=1 trigger block (50 lines); added `letter?: string` to RequestBody; extracted and trimmed `letter` from body with 2000-char server-side guard (D-02); updated `create_waitlist_signup` to pass `p_has_letter: letter.length > 0`
- Task 2: Implemented Path B branch in `case 'new'` (lines ~286-328 of final file); replaced the `case 'unverified'` 1A re-send with a D-04 1B re-send that always mints a fresh token

## Code Block Locations (final file line ranges)

| Block | Location |
|-------|----------|
| letter extraction + 2000-char guard | Lines 182-186 |
| `case 'unverified'` D-04 1B handler | Lines 204-250 |
| `case 'new'` Path B branch | Lines 286-328 |
| `case 'new'` Path A 1A send (unchanged) | Lines 330-350 |

## Test Trigger Removal

- Removed: `const url = new URL(req.url)` + entire `if (url.searchParams.get('test_1b') === '1')` block (lines 167-216 of pre-task file, ~50 lines total)
- `url` variable was used only by the test trigger — removed along with the block
- `SealLetterEmail` import retained (now used by both Path B call sites)
- Verification: `grep -c "test_1b"` returns 0

## Idempotency Key Patterns

| Send site | idempotencyKey | Notes |
|-----------|---------------|-------|
| New signup Path B | `1b-${tokenRow.id}` | Fresh token minted at signup; no Resend dedupe risk |
| D-04 unverified re-send | `1b-resend-${tokenRow.id}` | Fresh token minted per re-submit; different prefix for log correlation |

## D-04 Behavior Confirmation

The `case 'unverified'` handler NEVER sends 1A. Both sub-cases send 1B:

| Sub-case | Action |
|----------|--------|
| Re-submit with new letter | upsert_pending_letter (newest-wins body update) → fresh token → 1B |
| Re-submit without letter | lookup userId → fresh token → 1B (existing pending letter's verify link) |

## Task Commits

1. **Task 1: Remove test trigger + add letter param** — `bdd32ba` in sibling repo
2. **Task 2: Path B + D-04 implementation** — `38a4040` in sibling repo

Both commits stage only `supabase/functions/join-waitlist/index.ts`. The sibling repo's dirty `.planning/STATE.md` and untracked `.cursor/` were not staged.

## Deviations from Plan

None — plan executed exactly as written. Both tasks implemented verbatim per the plan's `<action>` blocks.

## Known Stubs

None — this plan writes Edge Function logic only; no UI stubs.

## Threat Surface Scan

No new network endpoints or trust boundaries. The threats mitigated per the plan's threat model:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-04-13: letter body injection | p_body passed as parameterized RPC arg; 2000-char guard at Edge Fn layer | Implemented |
| T-04-14: ?test_1b=1 attack surface | Trigger block deleted | Implemented |
| T-04-15: 1B email flooding via D-04 | Existing rate limit (check_signup_rate_limit, 0033) still applies before 'new' path; unverified re-sends use existing duplicate_unverified path | Preserved |
| T-04-16: verifyUrl in logs | Only token_id and user_id logged in both 1B send sites | Implemented |
| T-04-17: letter minted for wrong user | upsert_pending_letter called with uid from createUser (new) or lookup_user_id_by_email (unverified) | Implemented |

## Self-Check

- [x] `grep -c "test_1b"` = 0
- [x] `grep -c "upsert_pending_letter"` = 2 (Path B new + unverified conditional)
- [x] `grep -c "create_verification_token"` = 2 (Path B new + unverified handler)
- [x] `grep -c "SealLetterEmail"` = 3 (import + 2 createElement calls)
- [x] `grep -c "1b-resend-"` = 3 (comment + idempotency key + log string)
- [x] `grep "console.log.*verifyUrl"` = 0 (privacy-safe)
- [x] WaitlistConfirmationEmail absent from case 'unverified' block
- [x] Both sibling repo commits verified: bdd32ba, 38a4040
