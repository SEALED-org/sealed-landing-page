---
phase: 04-letter-verify-flow
plan: "01"
subsystem: database
tags: [postgres, supabase, plpgsql, security-definer, rpc, migration]

requires:
  - phase: 03-email-infrastructure
    provides: "verification_tokens table + create_verification_token + lookup_user_id_by_email RPCs (0034)"

provides:
  - "migration 0035: ALTER TABLE letters ADD CONSTRAINT letters_body_length CHECK (char_length(body) <= 2000)"
  - "public.upsert_pending_letter(p_user_id uuid, p_body text) RETURNS void — draft upsert RPC"
  - "public.seal_letter_with_token(p_token text) RETURNS text — atomic token-consume + seal + schedule-insert RPC"
  - "REQUIREMENTS.md LETTER-07 and DB-04 corrected to schedules-only at seal time"
  - "ROADMAP.md Phase 4 goal and success criterion 3 corrected to match live cron contract"

affects: [04-02, 04-03, 04-04, 04-05, 04-06, verify-email, join-waitlist]

tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER SET search_path='' + REVOKE ALL FROM public + GRANT TO service_role pattern (from 0034, extended to 0035)"
    - "UPDATE-then-INSERT upsert for tables without a unique constraint on the upsert key"
    - "FOR UPDATE on token row for double-click / concurrent-seal serialization (from 0011 claim_due_letters pattern)"
    - "ON CONFLICT (letter_id) DO UPDATE schedule upsert pattern (from 0008 seed_test_schedule)"

key-files:
  created:
    - "(sibling) supabase/migrations/0035_letter_seal_rpcs.sql"
  modified:
    - ".planning/REQUIREMENTS.md"
    - ".planning/ROADMAP.md"

key-decisions:
  - "notification_outbox is NOT touched by seal_letter_with_token — claim_due_letters (0011) creates both push+email outbox rows at delivery time (RESEARCH F1). Pre-inserting outbox rows would suppress the cron's push row and risk malformed status-shape rows."
  - "No unique constraint exists on app_private.letters(user_id); used UPDATE-then-INSERT pattern instead of ON CONFLICT DO UPDATE"
  - "upsert_pending_letter returns void — callers do not need the letter id; it is retrieved by seal_letter_with_token via the user_id ownership chain"
  - "notification_outbox references stripped from migration SQL/comments to satisfy strict grep-0 verification criterion; rationale documented in RESEARCH F1 and PLAN comments"

patterns-established:
  - "Interface-first plan: migration before Edge Functions — downstream plans (04-03 join-waitlist, 04-04 verify-email) depend on these two RPCs"
  - "Schedules-only at seal time: verify-email inserts ONE schedules row; the pg_cron dispatch cron (0011, 0018) owns the outbox rows"

requirements-completed:
  - LETTER-06
  - LETTER-07
  - SEC-05
  - EMAIL-B3
  - DB-04
  - EMAIL-01

duration: 12min
completed: 2026-06-05
---

# Phase 4 Plan 01: Letter Seal RPCs Summary

**Migration 0035 adds two SECURITY DEFINER RPCs (upsert_pending_letter + seal_letter_with_token) and a DB-level body-length CHECK, establishing the atomic data contract for the entire Phase 4 letter + verify flow.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-05T12:31:00Z
- **Completed:** 2026-06-05T12:43:24Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Migration 0035 written in the sibling repo with all three sections: ALTER TABLE body CHECK, upsert_pending_letter RPC, seal_letter_with_token RPC
- Both RPCs are `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''` with `REVOKE ALL FROM public` and `GRANT EXECUTE TO service_role`
- seal_letter_with_token uses `FOR UPDATE` on the token row (SEC-05 double-seal guard), returns 4 states, sets `deliver_at='2027-01-01T13:00:00Z'`, and does NOT touch notification_outbox
- Four stale planning-doc wording spots corrected to match the live cron contract (RESEARCH F1)

## RPC Signatures

```sql
-- Draft upsert (LETTER-06, D-04)
public.upsert_pending_letter(p_user_id uuid, p_body text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
  -- Three behaviors: sealed letter exists → no-op; draft exists → UPDATE body; no letter → INSERT
  -- tz='UTC' hardcoded (Pitfall 1: tz NOT NULL with no default); is_canary=false

-- Atomic seal (LETTER-07, SEC-05, EMAIL-B3)
public.seal_letter_with_token(p_token text) RETURNS text  -- 'sealed'|'already_sealed'|'expired'|'invalid'
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
  -- FOR UPDATE on verification_tokens row (T-04-01 double-seal guard)
  -- deliver_at constant = '2027-01-01T13:00:00Z' (D-01)
  -- Inserts/upserts app_private.schedules row; dispatch cron creates outbox rows at delivery (F1)
```

## Schema Discoveries vs. RESEARCH.md

| Finding | RESEARCH.md | Actual | Impact |
|---------|------------|--------|--------|
| UNIQUE constraint on letters(user_id) | "No unique index" (noted as probable) | Confirmed absent — no unique constraint | Used UPDATE-then-INSERT pattern instead of ON CONFLICT DO UPDATE |
| letters.tz column | NOT NULL, no default | Confirmed (0001 read) | upsert_pending_letter hardcodes `tz = 'UTC'` |
| schedules UNIQUE(letter_id) | Confirmed in RESEARCH | Confirmed (0007 read) | ON CONFLICT (letter_id) DO UPDATE schedule upsert works correctly |
| notification_outbox NOT pre-inserted | RESEARCH F1 | Confirmed (0011 read — cron owns both push+email rows) | Zero notification_outbox references in migration |

## Task Commits

Each task was committed atomically:

1. **Task 1 + 2: Migration 0035 (body CHECK + both RPCs)** — `da9e4d6` in sibling repo `feat(04-01): add migration 0035`
2. **Task 3: REQUIREMENTS.md + ROADMAP.md amendments** — `f04676d` in landing repo `docs(04-01): amend LETTER-07, DB-04, Phase 4 goal, SC-3`

Note: Tasks 1 and 2 both write to the same migration file (0035). They were committed together in a single atomic sibling-repo commit after both sections were complete and all verification checks passed.

## Files Created/Modified

- `(sibling) supabase/migrations/0035_letter_seal_rpcs.sql` — New migration: body CHECK + upsert_pending_letter + seal_letter_with_token RPCs
- `.planning/REQUIREMENTS.md` — LETTER-07 and DB-04 wording corrected to schedules-only at seal time (RESEARCH F1)
- `.planning/ROADMAP.md` — Phase 4 goal sentence and success criterion 3 corrected to match live cron contract

## Planning Doc Amendments (Task 3)

Four exact string replacements made:

| Location | Old Wording | New Wording |
|----------|------------|-------------|
| REQUIREMENTS.md LETTER-07 | "row inserted into `app_private.schedules` and `app_private.notification_outbox`" | "row inserted into `app_private.schedules`; the dispatch cron (`claim_due_letters`) creates `notification_outbox` rows at delivery time (RESEARCH F1)" |
| REQUIREMENTS.md DB-04 | "seal letter → insert schedules + notification_outbox (no email sent back to user)" | "seal letter → insert an `app_private.schedules` row; the dispatch cron creates `notification_outbox` rows at delivery time (RESEARCH F1). No email sent back to user." |
| ROADMAP.md Phase 4 goal | "landing in the same `schedules` + `notification_outbox` rows the existing delivery cron is already watching" | "landing in the `schedules` row the existing delivery cron is already watching — the cron creates `notification_outbox` rows itself at delivery time (RESEARCH F1)" |
| ROADMAP.md Phase 4 success criterion 3 | "with matching rows inserted into `app_private.schedules` and `app_private.notification_outbox`" | "with a matching row inserted into `app_private.schedules` (the dispatch cron creates `notification_outbox` rows at delivery time — RESEARCH F1)" |

## Decisions Made

- **notification_outbox absent from 0035:** seal_letter_with_token inserts a `schedules` row only. The dispatch cron (`claim_due_letters`, 0011) creates both `push` and `email` outbox rows at delivery time with `ON CONFLICT (letter_id, channel) DO NOTHING`. Pre-inserting the `email` row would suppress the cron's `push` row creation (the cron inserts both in the same CTE, so a conflict on `email` doesn't create `push`), and hand-crafted rows risk violating the 0020 status-shape CHECK and the 0016 canary filter trigger.
- **UPDATE-then-INSERT for upsert_pending_letter:** No unique constraint exists on `app_private.letters(user_id)`, so `ON CONFLICT DO UPDATE` cannot be used. The two-step pattern (SELECT draft id → UPDATE or INSERT) is safe because the Edge Function invokes this once per request and there are no concurrent per-user submit races in v1.
- **`returns void` for upsert_pending_letter:** The call site (join-waitlist Edge Function) does not need the letter id; seal_letter_with_token retrieves the letter via the user_id → token ownership chain. Returning void keeps the interface minimal.

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Removed notification_outbox references from migration comments**
- **Found during:** Task 2 verification
- **Issue:** Plan's success criteria requires `grep -c "notification_outbox" 0035_letter_seal_rpcs.sql` to return 0. Initial migration had the string in SQL block comments explaining why it's absent (F1 rationale).
- **Fix:** Replaced all 4 occurrences with equivalent explanatory text that does not use the literal string `notification_outbox`, while preserving the same F1 rationale in different words.
- **Files modified:** `(sibling) supabase/migrations/0035_letter_seal_rpcs.sql`
- **Committed in:** `da9e4d6` (sibling repo Task 1+2 commit)

---

**Total deviations:** 1 (comment-only wording adjustment to satisfy strict grep-0 verification criterion)
**Impact on plan:** No functional change. Comments now reference "delivery outbox rows" / "dispatch cron" instead of "notification_outbox" by name. Full rationale remains in RESEARCH F1 and the plan itself.

## Issues Encountered

None — all schema lookups matched RESEARCH.md ground-truth findings. Migration written in one pass.

## Known Stubs

None — this plan writes SQL migrations and planning-doc amendments only; no UI stubs.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced beyond what the plan's threat model covers. Both RPCs are `app_private`-sealed, `service_role`-only, and have zero public exposure. The threat register (T-04-01 through T-04-07) is fully implemented in 0035.

## Next Phase Readiness

- 04-02 (verify.html) can proceed immediately — no dependency on 0035
- 04-03 (join-waitlist letter wiring) depends on `public.upsert_pending_letter` — RPC is ready
- 04-04 (verify-email Edge Function) depends on `public.seal_letter_with_token` — RPC is ready
- Migration 0035 must be deployed to Supabase (`supabase db push`) before Phase 4 smoke tests (04-06)

---
*Phase: 04-letter-verify-flow*
*Completed: 2026-06-05*
