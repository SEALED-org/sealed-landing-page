# Phase 2: Signup Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 02-signup-flow
**Areas discussed:** Edge Function repo & deploy, IP rate limit semantics & storage, Turnstile lifecycle, Inline error UX + 4-state re-signup

---

## Area Selection

User opted to discuss **all** gray areas presented, with the additional instruction: "recommend options based on your own analysis and assume beginner level technical knowledge, so explaining technical questions." Each subsequent question included a plain-language background, trade-off analysis, and an explicit recommendation marked as the first option.

---

## Area 1 — Edge Function Repo & Deploy

### Q1: Where should the `join-waitlist` Edge Function source code live?

| Option | Description | Selected |
|--------|-------------|----------|
| Main SEALED-org repo (Recommended) | Function code goes into /Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/. Phase 2's executor writes the files there and produces a handoff prompt for Nour. Reuses _shared/ helpers natively. | ✓ |
| Landing repo with own supabase/functions/ | Function code in this repo's new supabase/functions/. Requires copying _shared/ helpers or treating them as divergent copies. | |

**User's choice:** Main SEALED-org repo
**Notes:** Mirrors Phase 1 D-03/D-04 single-source-of-truth principle.

### Q2: Should Phase 2 HALT after writing the Edge Function, or wire client + function together in one execution?

| Option | Description | Selected |
|--------|-------------|----------|
| HALT, then wire client after deploy (Recommended) | Wave 1: write function + handoff prompt, then STOP. Nour applies + deploys + confirms. Wave 2: client wiring. Verification step hits live function. Mirrors Phase 1 D-05. | ✓ |
| No HALT — write both in one pass | Executor writes function + client in one execution. Faster on paper, but landing repo will look 'done' while nothing works end-to-end until you deploy. | |

**User's choice:** HALT, then wire client after deploy
**Notes:** Mirrors Phase 1's validated workflow.

### Q3: What secrets / env setup belongs in Phase 2's handoff prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 2 scope only — Turnstile + .env.local fix (Recommended) | One Cloudflare setup (~5 min, free). TURNSTILE_SECRET_KEY + verify SERVICE_ROLE + VITE_TURNSTILE_SITE_KEY + .env.local bug fixes. RESEND deferred to Phase 3. | ✓ |
| Skip Turnstile for now | No Cloudflare, IP rate limit only. NOT recommended — IP limits trivially bypassed with rotating proxies. | |
| Front-load all email infra secrets | TURNSTILE + RESEND + SEALED_FROM_ADDRESS. Resend secrets sit unused until Phase 3's DNS gate. | |

**User's choice:** Phase 2 scope only — Turnstile + .env.local fix
**Notes:** Selected after a clarifying question about Cloudflare scope. Confirmation that Turnstile is the only Cloudflare touch in the entire project, ~5 min one-time setup, never revisited.

---

## Area 2 — IP Rate Limit Semantics & Storage

### Q1: Where should signup-attempt records (for rate limiting) live?

| Option | Description | Selected |
|--------|-------------|----------|
| New app_private.signup_attempts table (Recommended) | Dedicated (ip, attempted_at, outcome) table. Counts attempts, not just successes. Logs outcome for debugging. Doesn't couple IP to user identity. | ✓ |
| Reuse app_private.waitlist_signups (add ip column) | Add ip column to existing table. No new table but only counts successes; bot rotating emails bypasses. Couples IP and identity. | |

**User's choice:** New app_private.signup_attempts table

### Q2: Which rate limit window?

| Option | Description | Selected |
|--------|-------------|----------|
| Rolling 24 hours (Recommended) | now() - interval '24 hours'. Harder to game. Standard practice. | ✓ |
| Calendar day UTC | date_trunc('day', now() AT TIME ZONE 'UTC'). Bot can squeeze 2 attempts in 2 min by waiting until midnight. | |

**User's choice:** Rolling 24 hours

### Q3: What counts as an 'attempt' against the rate limit?

| Option | Description | Selected |
|--------|-------------|----------|
| Every Turnstile-passing POST (Recommended) | Logs every Turnstile-passing POST regardless of DB outcome. Catches retry-with-different-email. Doesn't bloat with bot traffic Turnstile already deflected. | ✓ |
| Every POST (including Turnstile failures) | Logs even Turnstile-rejected attempts. Bot traffic adds rows. Stricter but wastes storage. | |
| Only successful inserts | Fat-fingered retries don't get blocked but bots cycling through emails are each treated as unique successes. | |

**User's choice:** Every Turnstile-passing POST

### Q4 (follow-up): Revise the IP rate limit threshold?

User raised concern after Area 4 was already underway: "is 1 api call per 24 hours might limit real users from using? should it be more lax or is that sufficient." This triggered a re-examination of the threshold.

| Option | Description | Selected |
|--------|-------------|----------|
| 3 attempts / IP / 24h (Recommended) | Sweet spot: couples and small families sign up freely. 3 distinct signups from one IP in 24h is still suspicious. Requires SEC-02 amendment. | ✓ |
| 5 attempts / IP / 24h | More generous: works for small offices and dorm floors. | |
| 10 attempts / IP / 24h | Generous: covers carrier NAT. IP limit becomes mostly symbolic; Turnstile carries the actual defense. | |
| Keep at 1 / IP / 24h | Strictest. Blocks all multi-person network shares. Highest false-positive rate. | |

**User's choice:** 3 attempts / IP / 24h
**Notes:** REQUIREMENTS.md SEC-02 will be amended in Phase 2 from "1 attempt per IP per 24h" to "3 attempts per IP per rolling 24h." Rationale captured in CONTEXT.md D-05.

---

## Area 3 — Turnstile Lifecycle

### Q1: When should the browser fetch the Turnstile token?

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy — execute on submit click (Recommended) | Widget loaded but idle. On submit: turnstile.execute() → fresh token (~200-800ms) → Edge Function. Submit spinner hides the wait. No expiration race. Cloudflare challenge only runs for submitters. | ✓ |
| Eager — prefetch token on page load | Widget runs Cloudflare challenge on page load. Zero submit latency. Must handle 5-min expiration. Cloudflare challenge runs for every visitor. | |

**User's choice:** Lazy — execute on submit click
**Notes:** The Loader2 spinner already in WaitlistForm.tsx (Phase 1.5) hides the latency.

---

## Area 4 — Inline Error UX + 4-State Re-Signup

### Q1: Where should the inline error message render in the hero?

| Option | Description | Selected |
|--------|-------------|----------|
| Reserved slot below form, above counter (Recommended) | Fixed-height (~22-28px) slot between WaitlistForm and counter live-row. Empty when idle (no layout shift). Mono-spaced, ink-60. Counter stays visible. | ✓ |
| Replace counter row temporarily with error | Hides counter when error fires. Saves vertical space but masks social proof. | |
| Small banner above the form | Above the pill form. Strong visibility but pushes form down and breaks the prototype's hero composition. | |

**User's choice:** Reserved slot below form, above counter

### Q2: Who owns the inline error / re-signup copy strings?

| Option | Description | Selected |
|--------|-------------|----------|
| Client owns copy — server returns state codes (Recommended) | Edge Function returns { state: ... }. React client has MESSAGES map. Copy changes → redeploy landing only. Function stays a pure backend service. Easier i18n later. | ✓ |
| Server owns copy — message in the response body | Function returns { state, message }. Client renders data.message. Copy changes require Edge Function redeploys (cross-repo). CONTENT-01 polish will require multiple cross-repo deploys. | |

**User's choice:** Client owns copy
**Notes:** Approved proposed copy strings for all 7 states (success, unverified, verified_no_letter, verified_with_letter, rate_limited, turnstile_failed, server_error). Phase 5's CONTENT-01 polish may refine wording.

---

## Claude's Discretion

The following implementation details were explicitly handed to the planner / executor agent:

- IP-identification header inside the Edge Function (`x-forwarded-for` first-element with `x-real-ip` fallback, validated against Supabase Deno runtime docs at planning time)
- Edge Function CORS allowlist (must include `http://localhost:3000`, the Vercel preview URL pattern, `https://sealedapp.io`)
- Pruning strategy for `signup_attempts` (no prune cron in Phase 2; TODO comment in migration noting ~500k threshold)
- MESSAGES map file location (new `src/lib/messages.ts` vs. inline vs. WaitlistForm constant — planner decides based on shared-vs-local heuristic; FirstLetter also needs the same map)
- Exact JSON response shape keys beyond `{ state }` (`retry_after`, error details for `server_error`)
- Whether REQUIREMENTS.md SEC-02 amendment is a dedicated Wave-0 plan file or folded into the foundational migration plan
- Order of Wave-0 tasks (`.env.local` fix, REQUIREMENTS.md amendment, function source write, migration write, handoff prompt write — all sequencable within Wave 1)

---

## Deferred Ideas

- Pruning cron for `signup_attempts` table (until rows > ~500k)
- Stricter time windows (per-hour limits layered on top of per-day) — only if post-launch metrics show abuse
- Bounce/complaint webhook → auto-IP-flag (v2 with auto-unsubscribe)
- Localization (i18n) of error copy (v2; D-09's client-owned copy decision enables this)
- Email-based rate limiting layer (e.g., `*@tempmail.io` soft reject) — post-launch tuning
- Phase 5 CONTENT-06 polish of the error slot (typography, fade timing, color)
- Turnstile fail-soft graceful degradation for `onUnsupported` browsers (risky — easy to fake the signal)
- Multi-region Edge Function deployment (Supabase Edge auto-deploys globally; no tuning needed)
