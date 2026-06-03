---
phase: 03-email-infrastructure
plan: 01
subsystem: database
tags: [supabase, postgres, migration, verification-token, security-definer, app_private]

requires:
  - phase: 02-signup-flow
    provides: "0033 public SECURITY DEFINER wrapper pattern + app_private schema-sealed architecture"
provides:
  - "app_private.verification_tokens table (256-bit hex token, 7-day expiry, single-use via used_at)"
  - "public.create_verification_token(uuid) wrapper returning (id, token) — used by 1B sends (Plan 03) and Phase 4"
  - "public.lookup_user_id_by_email(text) wrapper returning uuid|null — used by 1A unverified-resend idempotency key (Plan 03)"
affects: [phase-03-email, phase-04-letter-verify]

tech-stack:
  added: []
  patterns:
    - "Pattern: custom app_private token table to bypass Supabase Auth's 24h OTP cap and meet a 7-day TTL (EMAIL-04)"
    - "Pattern: SECURITY DEFINER public wrapper returning TABLE (id uuid, token text) via INSERT ... RETURNING — extends the 0033 void-wrapper shape for row-returning RPC"

key-files:
  created:
    - "(sibling) supabase/migrations/0034_verification_tokens.sql"
  modified: []

key-decisions:
  - "Token entropy = encode(gen_random_bytes(32),'hex') (256-bit) as the column default — token minted by the DB, never by the Edge Function"
  - "Both partial indexes scoped WHERE used_at IS NULL — only un-consumed tokens are ever queried (Phase 4 lookup + expiry sweeps)"
  - "lookup_user_id_by_email added per plan (not in RESEARCH SQL block) so Plan 03's unverified-resend path can build a timestamp-scoped idempotency key without a second RPC"

patterns-established:
  - "Pattern: app_private stays unexposed; Edge Functions reach it only through public SECURITY DEFINER wrappers granted to service_role (mirrors 0033, 0021)"
  - "Pattern: set search_path = '' on every SECURITY DEFINER function to prevent search-path injection (ASVS V6)"

requirements-completed: [EMAIL-04, EMAIL-B1]

duration: ~6 min
completed: 2026-06-03
---

# Phase 3 Plan 01: Verification Token Migration Summary

**Custom app_private.verification_tokens table with 7-day TTL + create_verification_token and lookup_user_id_by_email SECURITY DEFINER wrappers (service_role only) — the conformant path for EMAIL-04 since Supabase Auth OTP is hard-capped at 24h.**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-06-03
- **Tasks:** 1
- **Files modified:** 1 created (sibling repo)

## Accomplishments
- `app_private.verification_tokens` table: `id`, `user_id` (FK → auth.users, ON DELETE CASCADE), `token` (unique, 256-bit hex default), `expires_at` (default now()+7d), `used_at`, `created_at`
- Two partial indexes (`_token_idx`, `_expires_idx`) scoped `WHERE used_at IS NULL`
- RLS enabled; `revoke all ... from anon, authenticated, public`; `grant select, insert, update ... to service_role`
- `public.create_verification_token(uuid)` → `returns table (id uuid, token text)` via `INSERT ... RETURNING`
- `public.lookup_user_id_by_email(text)` → `returns uuid` (NULL-safe) reading `auth.users`
- Both wrappers: `security definer`, `set search_path = ''`, `revoke all from public`, `grant execute to service_role`

## Task Commits

1. **Task 1: Write migration 0034_verification_tokens.sql** — `c8ae6be` (feat) — committed in sibling SEALED-org repo

## Files Created/Modified
- `(sibling) supabase/migrations/0034_verification_tokens.sql` — token table + 2 wrappers; ready for `supabase db push` at the Plan 04 handoff

## Decisions Made
See frontmatter `key-decisions`. The migration follows the repo's "app_private never exposed; reach via public wrappers" architecture exactly (0033/0021 prior art).

## Deviations from Plan

None - plan executed exactly as written. (`lookup_user_id_by_email` was specified by the plan's Task 1 action, beyond the RESEARCH SQL block — included as required.)

## Issues Encountered
None. All 7 automated grep checks + every acceptance string assertion passed.

## User Setup Required
None for this plan. The migration is applied later via `supabase db push` in the Plan 04 handoff (a human-action checkpoint).

## Next Phase Readiness
- Plan 03 can call `create_verification_token` (1B token mint) and `lookup_user_id_by_email` (1A resend key).
- Migration is staged on disk + committed in the sibling repo; **not yet pushed to the live DB** — that is Plan 04 Task 2.

---
*Phase: 03-email-infrastructure*
*Completed: 2026-06-03*
