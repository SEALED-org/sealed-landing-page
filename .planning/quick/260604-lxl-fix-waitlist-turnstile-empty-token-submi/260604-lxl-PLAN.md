---
quick_id: 260604-lxl
slug: fix-waitlist-turnstile-empty-token-submi
title: Fix waitlist Turnstile empty-token submit bug
date: 2026-06-04
type: quick
subsystem: frontend
status: planned
---

# Quick Task 260604-lxl: Fix waitlist Turnstile empty-token submit bug

## Problem

Both signup forms use an **invisible** Cloudflare Turnstile widget. The token
arrives asynchronously via `onSuccess`, but the submit handlers send whatever
`turnstileToken` exists at click time. If the token has not yet resolved (fresh
page load, fast re-submit, or right after the `finally` block resets the widget),
an **empty token** is sent. The backend (`join-waitlist/index.ts:205`) rejects an
empty token with `server_error`, which the UI shows as **"Something went wrong.
Please try again."** — for a completely normal action.

This is reproducible: after any submit, the `finally` block wipes the token and
resets the widget, so the *next* submit also fires empty until the new challenge
completes.

Affected (identical bug in both):
- `src/components/WaitlistForm.tsx` — hero waitlist form
- `src/components/FirstLetter.tsx` — letter-sealing email step

## Root cause

`onSubmit(email, turnstileToken)` / `onEmailSubmit(email, firstLetterTurnstileToken)`
are called without ensuring the invisible challenge has produced a token first.

## Fix

The installed `@marsidev/react-turnstile` exposes
`getResponsePromise(timeout?, retry?)` on `TurnstileInstance` — "waits until the
widget is rendered and solved" and resolves with the token. Use it to gate
submission:

1. On submit, if the in-state token is empty, `await
   ref.current?.getResponsePromise(15000)` to obtain it before calling the
   backend. (Common case: token already resolved → zero added latency.)
2. If the token still cannot be obtained (timeout/error/blocked), show the
   existing friendly `turnstile_failed` message instead of sending an empty token
   → no more raw `server_error` for a normal user.
3. Drive the existing spinner / disable the submit control while resolving so the
   click feels instant and double-submits are blocked. (No new visual element —
   reuses the existing `Loader2` spinner / `disabled` attribute.)

## Tasks

### Task 1 — WaitlistForm.tsx
- **files:** `src/components/WaitlistForm.tsx`
- **action:** Add `resolving` + `turnstileFailed` local state. In `handleSubmit`:
  guard on `email/isSubmitting/resolving`; surface `turnstile_failed` when
  `turnstileBlocked`; `await getResponsePromise(15000)` when the token is empty;
  bail to `turnstile_failed` if still empty; otherwise `onSubmit`. Drive the
  button spinner/disabled from `isSubmitting || resolving`. Render
  `turnstileFailed ? 'turnstile_failed' : error`.
- **verify:** `npm run build` passes; no empty token can reach `onSubmit`.
- **done:** Submitting before the challenge resolves waits for the token instead
  of erroring; a genuine failure shows the friendly message.

### Task 2 — FirstLetter.tsx
- **files:** `src/components/FirstLetter.tsx`
- **action:** Add `resolving` local state. In `handleEmailSubmit`: surface
  `setEmailError('turnstile_failed')` when `turnstileBlocked`; `await
  getResponsePromise(15000)` when the token is empty; bail to `turnstile_failed`
  if still empty; otherwise `onEmailSubmit`. Disable the arrow button while
  `resolving`.
- **verify:** `npm run build` passes.
- **done:** Letter-flow email step never submits an empty token.

## must_haves

- **truths:**
  - No code path calls `onSubmit`/`onEmailSubmit` with an empty Turnstile token.
  - A genuine Turnstile failure renders `MESSAGES.turnstile_failed`, never
    `server_error`.
- **artifacts:**
  - `src/components/WaitlistForm.tsx` (modified)
  - `src/components/FirstLetter.tsx` (modified)
- **key_links:**
  - `node_modules/@marsidev/react-turnstile` `getResponsePromise` API
  - `src/lib/messages.ts` `turnstile_failed` copy

## Out of scope
- Backend change to map empty token → `turnstile_failed` (frontend fix makes it
  unreachable for real users).
- Deliverability / junk-folder headers (tracked separately).
