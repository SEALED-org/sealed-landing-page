# Phase 4: Letter + Verify Flow - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning
**Source:** Inline discussion (/gsd-plan-phase 4 --skip-ui --discuss)

<domain>
## Phase Boundary

A letter writer composes their letter inline in the FirstLetter section, submits
their email, sees the sealing animation, and receives Template 1B. Clicking the
verification link flips their letter to `sealed` in `app_private.letters`
(`sealed_at=now()`, `deliver_at` set) and inserts the matching `schedules` +
`notification_outbox` rows the existing main-app delivery cron already watches for
Jan 1, 2027. Unverified letters never reach `schedules`. Skipping the letter takes
Path A (no verification link). Closes Path B.

Requirement IDs: LETTER-01, LETTER-02, LETTER-03, LETTER-04, LETTER-05, LETTER-06,
LETTER-07, SEC-05, EMAIL-B2, EMAIL-B3, DB-04, EMAIL-01.
</domain>

<decisions>
## Implementation Decisions

### D-01 — Delivery moment (`deliver_at`)
- All sealed letters deliver at a single fixed instant: **`2027-01-01T13:00:00Z`**
  (Jan 1, 2027, 1pm UTC — ~8am New York, 1pm London, 2pm Berlin).
- One fixed UTC moment for everyone — NOT per-writer local time. Chosen for
  reliability on the hard deadline (one cron fire, no timezone capture) and
  daytime reach across most of the world. Matches the ROADMAP success-criterion
  default.

### D-02 — Letter length cap
- Maximum **2,000 characters** per letter.
- Enforced client-side (live word/char count already in FirstLetter) AND
  server-side (the create-letter path must reject/truncate >2,000 so the cap
  cannot be bypassed). A DB-level guard is preferred if the `letters` schema
  supports it.

### D-03 — Writing a letter IS signing up (Path B = waitlist + letter)
- A user does NOT need to use the hero waitlist form first. Scrolling to the
  FirstLetter section, writing a letter, and submitting their email **enrolls them
  in the waitlist AND creates the pending letter in one action**. Already true at
  the code level (FirstLetter calls the same `join-waitlist` function); Phase 4
  must preserve this — a letter writer who never touched the hero form is a full
  waitlist member with a pending letter.

### D-04 — Repeat signup with a pending (unverified) letter
- If a user already has an unverified/pending letter and signs up again with the
  same email: **do NOT create a duplicate user or duplicate letter. Re-send the
  Template 1B verify link.**
- If they wrote a NEW letter on the second visit, the **newest letter wins**
  (replace the pending letter's content with the new submission, then re-send the
  verify link). If they did not write a new letter (Path A re-signup), just
  re-send the existing letter's verify link.
- Token handling: re-sending should mint/refresh a valid 7-day token for that
  letter (consistent with Phase 3's `create_verification_token`).

### Claude's Discretion
- **/verify page states** — handle all of: success (letter sealed), already-used
  token (idempotent success message), expired token (>7 days — offer to resend),
  invalid/unknown token (graceful error). Build on the locked Claude Design
  aesthetic (cream paper, Instrument Serif, ink). Small surface — UI-SPEC skipped
  (`--skip-ui`) since the design language is locked.
- Exact `verify-email` Edge Function shape, token-consumption transaction
  (check `expires_at > now()` AND `used_at IS NULL`, set `used_at`, seal letter,
  insert schedule + outbox — ideally one DB transaction / SECURITY DEFINER RPC),
  and the post-verify in-page success state. No Template 2 is sent on verify
  (success criterion 4).
</decisions>

<specifics>
## Specific Ideas

- The verify link format is already fixed by Phase 3's Template 1B:
  `https://sealedapp.io/verify?token=<token>` → Phase 4 must add a `/verify` route
  to the landing site that reads the token and calls the verify-email function.
- The production 1B send (when a user writes a letter) replaces Phase 3's
  temporary `?test_1b=1` test trigger — Phase 4 wires the real send and the
  03-03 SUMMARY notes the test trigger is removed here.
- Letter writing UI (FirstLetter: write → seal → success state machine, typewriter
  placeholders, live count, 2.5s sealing animation) already exists from Phase 1.5
  — Phase 4 wires it to Supabase, not rebuilds it.
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + requirements
- `.planning/ROADMAP.md` (Phase 4 section) — goal, success criteria, requirement IDs
- `.planning/REQUIREMENTS.md` — LETTER-*, SEC-05, EMAIL-B2/B3, DB-04, EMAIL-01

### Phase 3 contracts this phase consumes (sibling repo `SEALED-org`)
- `supabase/migrations/0034_verification_tokens.sql` — `verification_tokens` table
  + `create_verification_token` / `lookup_user_id_by_email` wrappers
- `supabase/functions/notify/emails/SealLetterEmail.tsx` — Template 1B (verify link)
- `supabase/functions/join-waitlist/index.ts` — 4-state pipeline + `?test_1b=1`
  trigger (to be replaced by production 1B send) + `_shared/resend.ts` wrapper
- `supabase/migrations/0033_join_waitlist_public_wrappers.sql` —
  `lookup_signup_state` reads `app_private.letters` (existing letters table shape)

### This repo (landing page)
- `src/components/FirstLetter.tsx` — letter UI state machine + `onEmailSubmit`
- `src/lib/supabase.ts` / `src/lib/messages.ts` — client call + state→copy mapping
</canonical_refs>

<deferred>
## Deferred Ideas
- HTTPS one-click unsubscribe + auto-unsubscribe webhook (v2, per STATE.md).
- Template 2 (app-launch invitation) — deferred to v2 (EMAIL-02).
- "Add to calendar" .ics on the sealed confirmation — v2.
</deferred>

---

*Phase: 04-letter-verify-flow*
*Context gathered: 2026-06-05 via inline discussion*
