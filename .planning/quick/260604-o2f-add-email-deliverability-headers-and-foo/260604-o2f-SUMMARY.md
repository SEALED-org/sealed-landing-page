---
quick_id: 260604-o2f
slug: add-email-deliverability-headers-and-foo
title: Improve email deliverability (List-Unsubscribe, plain-text, footers)
date: 2026-06-04
type: quick
subsystem: api
status: complete
cross_repo: SEALED-org
commit: a0b8ce0
---

# Quick Task 260604-o2f: Improve email deliverability — Summary

**Every transactional send now ships a `List-Unsubscribe` header and a plain-text alternative, plus on-brand "why you're receiving this" footers — the controllable inbox-placement signals to pull SEALED mail out of the junk folder. Auth was already 10/10; this targets reputation/placement.**

## What shipped (SEALED-org commit `a0b8ce0`)
- **`_shared/resend.ts`** — `ResendSendArgs` gained optional `text` (plain-text
  part) and `headers` (e.g. List-Unsubscribe); spread into the Resend API body
  only when present. `deno check` passes (exit 0).
- **`join-waitlist/index.ts`** —
  - `renderEmail(element)` → `{ html, text? }`: renders HTML, then a best-effort
    plain-text render wrapped in try/catch so a failure degrades to HTML-only and
    never blocks the send.
  - `LIST_HEADERS` from `SEALED_UNSUBSCRIBE_MAILTO` (default `info@sealedapp.io`).
  - All three send sites (1A new-user, 1A unverified-resend, 1B test trigger) now
    pass `text` + `headers`.
- **Templates** — muted on-brand footer (#a89f96): 1A = why-received + Unsubscribe
  mailto (matches header default); 1B = why-received only (transactional, header
  still ships).

## Verification
- `deno check supabase/functions/_shared/resend.ts` → exit 0 (the type contract).
- Brace/paren/JSX balance verified on all 3 edited code files.
- Full `deno check` on index.ts is blocked locally by missing `npm:` node_modules
  (the documented "typechecks on deploy" limitation, same as Phase 3) — not a code
  defect. Resolves on Supabase deploy.

## Task commits
1. **Tasks 1–3 (wrapper + wiring + footers)** — `a0b8ce0` (feat) in SEALED-org.

## User setup required
- **Deploy:** `supabase functions deploy join-waitlist` to apply (same deploy that
  also activates the pending `verify_jwt=false` config for the 1B test).
- **Optional:** create a dedicated `unsubscribe@sealedapp.io` mailbox and set the
  `SEALED_UNSUBSCRIBE_MAILTO` secret to it; otherwise unsubscribe mail goes to
  `info@sealedapp.io` (manual handling — auto-unsubscribe is v2).
- **Needed from Nour:** a real physical mailing address to add to the footer
  (CAN-SPAM). Omitted for now rather than fabricated.

## Caveats to confirm on the next real send
- Plain-text part: view "Show original" in Gmail and confirm a `text/plain`
  section exists (validates `renderAsync(..., { plainText: true })` on the deployed
  react-email version). Safe-by-design if absent (HTML-only still sends).
- Inbox vs junk: placement improves with these signals + engagement ("Not spam",
  opens) over the first sends; it is not instant.

## Related
- Pairs with the signup fix [[260604-lxl]] — both are pre-launch signup-flow
  reliability/quality fixes found during live testing.
