---
phase: 04-letter-verify-flow
plan: "05"
subsystem: client-wiring
tags: [supabase, react, letter, path-b, d-02, client-wiring]

requires:
  - phase: 04-letter-verify-flow
    plan: "03"
    provides: "join-waitlist Edge Function accepts letter param (Path B)"
  - phase: 04-letter-verify-flow
    plan: "04"
    provides: "Verify page deployed"

provides:
  - "src/lib/supabase.ts: joinWaitlist(email, turnstileToken, letter?) — letter threaded to invoke body"
  - "src/App.tsx: onEmailSubmit closure passes letter to joinWaitlist (Path B)"
  - "src/components/FirstLetter.tsx: onEmailSubmit prop signature includes letter: string; maxLength=2000; char count display"

affects: [04-06]

tech-stack:
  added: []
  patterns:
    - "Conditional spread to omit empty letter from invoke body: ...(letter && letter.trim() ? { letter: letter.trim() } : {})"
    - "Prop callback signature extended with letter: string to thread state from leaf to root"
    - "D-02 client cap: maxLength={2000} on textarea + live N/2000 span alongside word count"

key-files:
  created: []
  modified:
    - src/lib/supabase.ts
    - src/App.tsx
    - src/components/FirstLetter.tsx

key-decisions:
  - "Conditional spread used for letter in invoke body so Path A callers (handleSubscribe) can omit the param without sending a null or empty field to the Edge Function"
  - "Char count displayed as a separate span alongside the existing word count (not replacing it) per plan spec — minimal visual change preserving existing UI"
  - "letter param typed as non-optional (letter: string) in FirstLetterProps to match the always-has-content guarantee from handleSealAndSend (letter.trim().length === 0 early-returns before reaching email step)"

metrics:
  duration: 6min
  completed: 2026-06-05
---

# Phase 4 Plan 05: Letter Client Wiring Summary

**Letter state now flows from FirstLetter textarea through App.tsx's onEmailSubmit lambda into joinWaitlist's invoke body — completing Path B client-side wiring; textarea capped at 2000 chars with live count display.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-05T13:04:52Z
- **Completed:** 2026-06-05
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **Task 1:** Added `letter?: string` as third parameter to `joinWaitlist`; invoke body uses conditional spread to include trimmed letter only when non-empty; JSDoc updated with `@param letter` for Path B signups
- **Task 2:** Updated `FirstLetterProps.onEmailSubmit` signature to include `letter: string`; `handleEmailSubmit` now calls `onEmailSubmit(email, token, letter)`; textarea gains `maxLength={2000}`; char count span `{letter.length} / 2000` added beside word count in `fl-pad-foot`; App.tsx lambda accepts and passes `letter` to `joinWaitlist`

## Exact Line Changes

| File | Change | Line (approx) |
|------|--------|---------------|
| `src/lib/supabase.ts` | Added `letter?: string,` parameter | 81 |
| `src/lib/supabase.ts` | Updated invoke body with conditional spread | 85 |
| `src/lib/supabase.ts` | Added `@param letter` JSDoc | 75 |
| `src/App.tsx` | `onEmailSubmit` lambda: added `letter` param + pass to joinWaitlist | 112–114 |
| `src/components/FirstLetter.tsx` | `FirstLetterProps.onEmailSubmit`: added `letter: string` | 14 |
| `src/components/FirstLetter.tsx` | `handleEmailSubmit`: changed call to `onEmailSubmit(email, token, letter)` | 142 |
| `src/components/FirstLetter.tsx` | Textarea: added `maxLength={2000}` | 223 |
| `src/components/FirstLetter.tsx` | Added `<span id="fl-chars">` with char count | 230 |

## Build Status

`npm run build` exits 0. No TypeScript errors. Bundle: 558 kB JS / 47 kB CSS (chunk size warning is pre-existing, not introduced by this plan).

## Character Count Display

The char count was added as a **separate span** (`id="fl-chars"`) with `style={{ marginLeft: 12, opacity: 0.55 }}` placed immediately after the existing `#fl-words` span in `fl-pad-foot`. The word count display is preserved unchanged. The char count shows `N / 2000` at 55% opacity.

## Threat Mitigations Applied

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-04-24: letter bypass of 2000 cap | `maxLength={2000}` on textarea (client UX guard) | Implemented |
| T-04-25: letter body in logs | `supabase.ts` does not log letter body; only WaitlistState returned | Preserved |
| T-04-26: hero form accidentally sending letter | `handleSubscribe` calls `joinWaitlist` without letter arg; optional param → undefined → omitted | Verified |
| T-04-27: client code reaching app_private | No change to auth model; anon key only | Preserved |

## Task Commits

1. **Task 1: Add letter? param to joinWaitlist** — `6fee86f`
2. **Task 2: Thread letter through App.tsx + FirstLetter.tsx** — `aa4d0a3`

## Deviations from Plan

None — plan executed exactly as written. All four changes in Task 2 (prop signature, call site, maxLength, char count span) applied verbatim per the plan's `<action>` block.

## Known Stubs

None — all three files wire real data; no placeholder values introduced.

## Threat Surface Scan

No new network endpoints or trust boundaries introduced. All changes are purely client-side prop threading and a textarea attribute. The invoke body change only adds an already-planned optional field.

## Self-Check

- [x] `grep -c "letter: string)"` in FirstLetter.tsx = 1
- [x] `grep -c "onEmailSubmit(email, token, letter)"` in FirstLetter.tsx = 1
- [x] `grep -c "maxLength={2000}"` in FirstLetter.tsx = 1
- [x] `grep -c "joinWaitlist(newEmail, turnstileToken, letter)"` in App.tsx = 1
- [x] `letter?` present in supabase.ts line 81
- [x] `npm run build` exits 0
- [x] Commits 6fee86f and aa4d0a3 verified in git log

## Self-Check: PASSED
