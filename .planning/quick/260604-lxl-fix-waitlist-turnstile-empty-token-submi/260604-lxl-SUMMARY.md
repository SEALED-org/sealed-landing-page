---
quick_id: 260604-lxl
slug: fix-waitlist-turnstile-empty-token-submi
title: Fix waitlist Turnstile empty-token submit bug
date: 2026-06-04
type: quick
subsystem: frontend
status: complete
commit: ede282f
---

# Quick Task 260604-lxl: Fix waitlist Turnstile empty-token submit bug — Summary

**Both signup forms now wait for the invisible Turnstile token before submitting, so normal users never get an empty-token `server_error` ("Something went wrong"), and a genuine human-check failure shows the friendly `turnstile_failed` message instead.**

## Root cause

Invisible Turnstile delivers its token asynchronously via `onSuccess`. The submit
handlers sent whatever `turnstileToken` existed at click time — empty on fresh
load, fast re-submit, or right after the `finally` block reset the widget. The
backend (`join-waitlist/index.ts:205`) rejects an empty token with `server_error`,
surfaced to users as **"Something went wrong. Please try again."**

## Fix

`@marsidev/react-turnstile`'s `TurnstileInstance.getResponsePromise(timeout, retry)`
"waits until the widget is rendered and solved." Both handlers now:

1. Use the in-state token if already resolved (common case → **zero added latency**).
2. Otherwise `await getResponsePromise(15000)` to obtain it before the backend call.
3. If still no token (timeout/error/blocked) → show `turnstile_failed`, never
   submit an empty token.
4. Drive the existing spinner / `disabled` state while resolving — instant click
   feedback, no double-submit.

## Files modified
- `src/components/WaitlistForm.tsx` — `resolving` + `turnstileFailed` state;
  token-gated `handleSubmit`; button driven by `isSubmitting || resolving`; error
  slot shows `turnstileFailed ? 'turnstile_failed' : error`.
- `src/components/FirstLetter.tsx` — `resolving` state; token-gated
  `handleEmailSubmit`; `turnstile_failed` on blocked/empty; arrow button disabled
  while resolving.

## Verification
- `npm run build` passes (vite v6.4.2, 2127 modules, ✓ built).
- No code path calls `onSubmit`/`onEmailSubmit` with an empty token.
- Genuine Turnstile failure renders `MESSAGES.turnstile_failed`, not `server_error`.

## Task commits
1. **Tasks 1 + 2 (both forms — same bug, same fix)** — `ede282f` (fix)

## Not done (out of scope, tracked separately)
- **Deliverability / junk folder:** first email landed in personal-Gmail junk —
  expected for a brand-new sending domain (reputation, not config; mail-tester is
  10/10). Mitigations to add next: `List-Unsubscribe` header, plain-text part,
  physical-address/unsubscribe footer. Immediate user action: mark "Not spam".
- **Backend empty-token mapping:** leaving `server_error` for empty token at the
  edge function — now unreachable for real users via the frontend gate.
- **Rate-limit 3→5:** discussed but not requested as part of this task.

## Manual check for Nour
On `localhost:3000`: submit with your real email immediately after refresh — it
should now succeed (spinner, then success) instead of "Something went wrong."
