---
phase: 02-signup-flow
plan: 02
subsystem: database
tags: [supabase, migration, postgres, rls, rate-limit, cross-repo]

requires:
  - phase: 01-foundation
    provides: "Sibling SEALED-org repo migrations directory + 0031_waitlist_signups.sql as the immediate style analog (same author, same subsystem, same revoke→grant pattern)"
provides:
  - "supabase/migrations/0032_signup_attempts.sql in the sibling SEALED-org repo: the IP rate-limit ledger Plan 03's Edge Function will read/insert with service_role"
  - "Outcome enum lock: ('success', 'duplicate_unverified', 'duplicate_verified_no_letter', 'duplicate_verified_with_letter', 'db_error') — Plan 03's recordAttempt() TS union must mirror these five values verbatim"
affects: [02-03-PLAN, 02-04-PLAN]

tech-stack:
  added: []
  patterns:
    - "Pattern: bigserial PK requires an additional `grant usage, select on sequence ... to service_role` line on top of the standard revoke/grant pair (vs uuid PKs in 0031 which need no sequence grant)"

key-files:
  created:
    - "/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0032_signup_attempts.sql (sibling repo — not under landing repo's git)"
  modified: []

key-decisions:
  - "Race-condition acceptance documented inline as a trailing comment block — no advisory lock, no serializable txn. Rationale: Turnstile is the primary defense (per D-05); a 1-2 row overflow on a 3/24h ceiling is not worth the latency or complexity of serialization."
  - "bigserial-specific sequence grant included (`signup_attempts_id_seq` to service_role) — without it, service_role inserts would fail with permission_denied on the sequence's nextval call. This is the only structural difference from 0031's uuid PK pattern."
  - "Migration sits on disk in the sibling repo; no `supabase db push` invoked from this plan. Apply is Plan 04's handoff territory."

patterns-established:
  - "Cross-repo plans that produce server-side artifacts write directly to the sibling repo path (no git tracking in landing repo); the landing-repo SUMMARY.md is the audit trail"

requirements-completed: [SEC-02, DB-03]

duration: ~3 min
completed: 2026-05-29
---

# Phase 2 Plan 02: signup_attempts Migration Summary

**Cross-repo write: 0032_signup_attempts.sql staged in sibling SEALED-org repo — bigserial ledger with 5-value outcome check, (ip, attempted_at desc) composite index, service_role-only grants including sequence usage, race-condition acceptance documented inline.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-29
- **Completed:** 2026-05-29
- **Tasks:** 1
- **Files modified:** 1 (sibling repo only; 0 landing-repo files touched)

## Accomplishments

- **Sibling-repo migration written** at `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0032_signup_attempts.sql` following 0031's prose/style conventions exactly.
- **Table shape locked**: `id bigserial pk`, `ip text not null`, `attempted_at timestamptz not null default now()`, `outcome text not null check (outcome in (...))` with all five legal values.
- **Index**: `signup_attempts_ip_attempted_at_idx on (ip, attempted_at desc)` — direction aligned with Plan 03's rate-limit count query.
- **Grant matrix** verified: RLS enabled, `revoke all from anon/authenticated/public`, `grant {select,insert,update,delete} to service_role`, `grant usage,select on sequence ..._id_seq to service_role` (bigserial requirement).
- **Audit trail**: header comment block cites 02-CONTEXT.md D-04/D-05/D-06 and the amended SEC-02 wording; trailing comment block documents race-condition acceptance.

## Task Commits

1. **Task 1: Write 0032_signup_attempts.sql in sibling repo** — *(no landing-repo commit — artifact lives in sibling repo; landing-repo SUMMARY commit below covers the audit trail)*

**Plan metadata commit:** (follows this SUMMARY write)

## Files Created/Modified

- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0032_signup_attempts.sql` — IP rate-limit ledger DDL. Created.

## Grant Matrix

| Role | SELECT | INSERT | UPDATE | DELETE | Sequence usage |
|---|---|---|---|---|---|
| anon | ✗ | ✗ | ✗ | ✗ | ✗ |
| authenticated | ✗ | ✗ | ✗ | ✗ | ✗ |
| public | ✗ | ✗ | ✗ | ✗ | ✗ |
| service_role | ✓ | ✓ | ✓ | ✓ | ✓ |

## Outcome enum (check constraint)

- `success`
- `duplicate_unverified`
- `duplicate_verified_no_letter`
- `duplicate_verified_with_letter`
- `db_error`

Plan 03's `recordAttempt(outcome)` TypeScript union must mirror these five values verbatim — both the DB constraint and the TS union must agree.

## Decisions Made

See frontmatter `key-decisions`. Highlights: race-condition acceptance, sequence grant requirement (bigserial), no `supabase db push` invocation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None for this plan. The migration apply happens in Plan 04's handoff to the SEALED-org agent.

## Next Phase Readiness

- Plan 03 (Edge Function) can write `recordAttempt()` against the locked outcome enum.
- Plan 04 (handoff) will instruct the SEALED-org agent to run `supabase migration up` (or equivalent) to apply this migration to the live project.

---
*Phase: 02-signup-flow*
*Completed: 2026-05-29*
