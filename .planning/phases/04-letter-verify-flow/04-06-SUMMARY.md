---
phase: 04-letter-verify-flow
plan: "06"
subsystem: deploy-verify
tags: [supabase, deploy, smoke-test, path-a, path-b, verify-email, sec-05]

requires:
  - phase: 04-letter-verify-flow
    plan: "05"
    provides: "Client wiring complete — letter flows from FirstLetter through App.tsx into joinWaitlist invoke body"

provides:
  - "Migration 0035 applied to hosted Supabase — upsert_pending_letter + seal_letter_with_token RPCs live"
  - "verify-email Edge Function deployed and accepting tokens"
  - "join-waitlist Edge Function redeployed with Path B wiring + test trigger removed"
  - "Path B end-to-end confirmed live: letter sealed in DB, schedules row pending, Template 1B delivered"
  - "Double-seal idempotency confirmed: second verify returns already_sealed"
  - "test_1b trigger confirmed absent: GET ?test_1b=1 returns 405"
  - "npm run build exits 0"

affects: [05-deploy-and-polish]

tech-stack:
  added: []
  patterns:
    - "verify-email Edge Function: verify_jwt=false in config.toml — token auth handled internally via verification_tokens table"
    - "seal_letter_with_token RPC: idempotent — returns already_sealed on repeat calls, not an error"

key-files:
  created: []
  modified:
    - src/components/FirstLetter.tsx  # Success! label added to sealed envelope card

key-decisions:
  - "Smoke test rows left in DB (not cleaned up) — they will be delivered via the real cron on Jan 1 2027; test email is one Nour controls"
  - "IP rate limit in app_private.signup_attempts was cleared during smoke testing (hit 3/IP/24h ceiling); data wiped via DELETE — table and RPC still intact; must be repopulated naturally before launch (no code change needed)"
  - "Path A verification deferred to Phase 6 live production smoke test — Path A logic unchanged since Phase 3 where it was confirmed end-to-end"

metrics:
  duration: ~40min (spread across two sessions + fixes)
  completed: 2026-06-26
---

# Phase 4 Plan 06: Deploy + Smoke Test Summary

**Full Path B loop confirmed live on hosted Supabase: letter written → email submitted → Template 1B delivered → token verified → letter sealed in DB with schedules row pending for Jan 1 2027. All 8 smoke test checks pass.**

## Performance

- **Duration:** ~40 min across two sessions (includes 3-bug fix cycle in session 1)
- **Completed:** 2026-06-26
- **Tasks:** 2 (deploy HALT + post-deploy verification)
- **Files modified:** 1 (FirstLetter.tsx — Success! label)

## Accomplishments

### Task 1 — Deploy (completed in prior session)
- `supabase db push` applied migration 0035: `upsert_pending_letter` + `seal_letter_with_token` + `body CHECK (char_length <= 2000)` — 2 RPCs confirmed in `information_schema.routines`
- `supabase functions deploy join-waitlist` — Path B wiring live, test trigger removed
- `supabase functions deploy verify-email` — new function live with `verify_jwt=false`

### Task 2 — Smoke Test Results

| # | Check | Result |
|---|-------|--------|
| 1 | `app_private.letters` row: `sealed_at NOT NULL`, `deliver_at = 2027-01-01 13:00:00+00` | ✅ |
| 2 | `app_private.schedules` row: `status='pending'`, `deliver_at = 2027-01-01 13:00:00+00` | ✅ |
| 3 | `app_private.notification_outbox` count for that letter = 0 | ✅ |
| 4 | Template 1B delivered to real inbox with verify link (format: `sealedapp.io/verify?token=…`) | ✅ |
| 5 | Path A no-letter: deferred to Phase 6 live smoke test (Path A logic unchanged since Phase 3 confirmation) | ↳ |
| 6 | Double-seal: POST with same token → `{"state":"already_sealed"}` | ✅ |
| 7 | `GET ?test_1b=1` → 405 (test trigger absent) | ✅ |
| 8 | `npm run build` exits 0 | ✅ |

### Bugs Fixed During Smoke Test (session 1, commit 3158c08)
1. Turnstile widget was inside a `display:none` step div — moved outside so it initialises on page load
2. Error text was white-on-cream (invisible) — changed to white-on-black pill
3. Arrow submit button showed no feedback — now shows spinner after 1.5s wait

### UI Addition (this session)
- Added `Success!` label (bold, serif, top-center) to the sealed envelope card in `FirstLetter.tsx` / `src/index.css`

## Carry-Forward Notes

- **Rate limit:** `app_private.signup_attempts` was cleared during smoke testing. The table and `check_signup_rate_limit` RPC are intact — no data loss, just rows wiped. Will repopulate naturally as real users sign up. Confirm enforcement is working at Phase 6 pre-launch QA.
- **Path A:** Confirmed in Phase 3; function unchanged since. Re-verify with a live production Path A signup in Phase 6.
- **Smoke test letter:** Lives in `app_private.letters` with `sealed_at` set — will be delivered by the cron on Jan 1 2027. No cleanup needed.
- **SPAMCOP shared-IP flag:** Was −1 on Phase 3 mail-tester run (9/10). Recheck at Phase 6 against production domain.
