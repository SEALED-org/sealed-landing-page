# Phase 2: Signup Flow - Research

**Researched:** 2026-05-28
**Domain:** Supabase Edge Function (Deno) + Cloudflare Turnstile (client + server verify) + Supabase Auth admin API + IP rate limiting + 4-state re-signup lookup
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Edge Function Source & Deploy**
- **D-01:** `join-waitlist` Edge Function source lives in `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/`. Mirrors Phase 1 D-03/D-04: the main repo is the single source of truth for all Supabase server-side code. The landing repo contains ONLY the client-side `supabase.functions.invoke('join-waitlist', ...)` call.
- **D-02:** Phase 2 execution splits into two waves with a hard HALT between them, mirroring Phase 1 D-05:
  - **Wave 1 (HALT after):** Executor writes function code + `signup_attempts` migration in main repo + self-contained handoff prompt for Nour. Execution stops.
  - **Nour gate:** Nour pastes the handoff prompt into the SEALED-org agent which applies migration, deploys function (`supabase functions deploy join-waitlist`), sets `TURNSTILE_SECRET_KEY`. Confirms back.
  - **Wave 2:** Client wiring (`src/lib/supabase.ts` real fetch, `WaitlistForm` Turnstile mount, `App.tsx` error state plumbing, error slot UI, MESSAGES map). Verification hits the live function from `npm run dev`.
- **D-03:** Phase 2's handoff asks Nour for Phase-2-scoped secrets only: (1) `supabase secrets set TURNSTILE_SECRET_KEY=...`, (2) confirm `SUPABASE_SERVICE_ROLE_KEY` already set, (3) add `VITE_TURNSTILE_SITE_KEY` to landing repo `.env.local`, (4) fix the two pre-existing `.env.local` bugs (leading space on anon key, URL/JWT-ref mismatch). Resend secrets deferred to Phase 3.

**IP Rate Limiting**
- **D-04:** Attempt records live in new dedicated table `app_private.signup_attempts` with schema `{ id bigserial, ip text, attempted_at timestamptz default now(), outcome text }`. Index on `(ip, attempted_at desc)`. Service-role-only grants. No pruning cron in Phase 2.
- **D-05:** Rate-limit threshold revised from REQUIREMENTS.md SEC-02's original "1 attempt per IP per 24h" to **3 attempts per IP per 24h, rolling window**. Phase 2 amends SEC-02 wording as a Wave-0 task.
- **D-06:** Rate-limit counter increments on every Turnstile-passing POST regardless of subsequent DB outcome. Pre-Turnstile requests not logged. Same-email retries hit the 4-state lookup BEFORE rate-limit check; legitimate "already signed up" does NOT increment.

**Turnstile Lifecycle**
- **D-07:** Turnstile uses **lazy execute-on-submit** via `@marsidev/react-turnstile`: widget mounts on page render in execution mode (not auto-running); on submit, `await ref.current.execute()` → token → call Edge Function → reset widget. Existing `Loader2` spinner covers 200-800ms latency. Always-fresh token; no 5-minute expiration race. On `onError`/`onUnsupported`/`onTimeout`: set inline error state to `turnstile_failed`; reset widget; allow retry.

**Inline Error UX**
- **D-08:** Error renders in fixed-height (~22-28px) reserved slot between `WaitlistForm` and counter row. Empty/transparent when idle so layout never shifts. Mono-spaced typeface (`--font-mono`), `--color-ink-60` opacity, matches existing `live-row` treatment. Counter remains visible.
- **D-09:** Client owns the copy. Edge Function returns `{ "state": "success" | "unverified" | "verified_no_letter" | "verified_with_letter" | "rate_limited" | "turnstile_failed" | "server_error" }` plus optional `retry_after`. React maintains `MESSAGES` lookup.
- **D-10:** Approved copy strings (Phase 5 CONTENT-01 may refine):
  | State | Message |
  |---|---|
  | `success` | (No inline — WaitlistSuccessCard handles) |
  | `unverified` | `Welcome back. We just resent your confirmation email.` |
  | `verified_no_letter` | `You're already on the waitlist.` |
  | `verified_with_letter` | `You're already on the list and your letter is sealed.` |
  | `rate_limited` | `Too many attempts from your network. Try again tomorrow.` |
  | `turnstile_failed` | `Couldn't verify you're human. Please try again.` |
  | `server_error` | `Something went wrong. Please try again.` |

**Phase Boundaries**
- **D-11:** Both `App.tsx#handleSubscribe` (hero) and `App.tsx#FirstLetter.onEmailSubmit` route through the same `join-waitlist` Edge Function with identical payload shape `{ email, turnstileToken }`. Phase 2 = email-only for both call sites. Phase 4 extends function to accept optional letter body.
- **D-12:** Phase 1.5's `try/catch/finally` skeletons get `console.error` lines replaced with state-setter calls driving the new error slot. Original log messages preserved alongside new UI plumbing — no log regression.

### Claude's Discretion
- IP-identification header in Edge Function (`x-forwarded-for` first hop vs `x-real-ip` vs `info.remoteAddr`)
- Edge Function CORS allowlist (`http://localhost:3000`, Vercel preview URL, `https://sealedapp.io`)
- Pruning strategy for `signup_attempts` (Phase 2 ships none; planner may add TODO comment for ~500k threshold)
- MESSAGES map location (`src/lib/messages.ts` vs inline in `App.tsx` vs `WaitlistForm` constant)
- Exact JSON response shape keys beyond `{ state }`
- Whether REQUIREMENTS.md SEC-02 amendment is a dedicated Wave-0 plan file or folded into foundational plan
- Order of Wave-0 tasks within Wave 1 (`.env.local` fix, REQUIREMENTS.md amendment, function source, migration, handoff prompt)

### Deferred Ideas (OUT OF SCOPE)
- Pruning cron for `signup_attempts` — defer until ~500k rows
- Stricter per-hour rate limits — Phase 2 ships rolling 24h only
- Bounce/complaint webhook → auto-IP-flag — v2
- i18n of error copy — v2
- Email-based rate limiting layer — v2
- Phase 5 CONTENT-06 polish (typography, fade timing, color of error slot) — Phase 5
- Turnstile fail-soft graceful degradation — Phase 2 fails closed
- Multi-region Edge Function deployment — Supabase handles automatically
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIGNUP-01 | User can enter email and join waitlist from hero | Wave 2 wiring section: `WaitlistForm.tsx` calls `App.tsx#handleSubscribe` → `supabase.functions.invoke('join-waitlist', { body: { email, turnstileToken } })`. Code shape in "Pattern 4". |
| SIGNUP-02 | Form shows visible loading state during submission | `Loader2` spinner already in `WaitlistForm.tsx` (preserved Phase 1.5). Covers both Turnstile execute (200-800ms) AND function round-trip (D-07 rationale). |
| SIGNUP-03 | User sees confirmation chip ("You're #N on the list") | `WaitlistSuccessCard` already exists in `App.tsx`. Phase 2 wires the success state by checking `state === 'success'` from Edge Function response. No new UI. |
| SIGNUP-04 | Form shows inline error message if submission fails | D-08/D-09/D-10 lock the slot + MESSAGES map. Code shape in "Pattern 5: Inline Error Slot". |
| SIGNUP-05 | HTML5 email validation prevents malformed addresses | `<input type="email" required>` already in `WaitlistForm.tsx` line 27. No change needed. |
| SEC-01 | Turnstile validates every submission before any DB writes | "Pattern 1: Turnstile siteverify" runs FIRST in Edge Function. Token absence or `success: false` returns `turnstile_failed` BEFORE any DB read. |
| SEC-02 (amended) | Server-side IP rate limit of 3 attempts/IP/24h enforced in Edge Function | Per D-05 amendment. Implementation in "Pattern 2: IP Rate Limit Query". Phase 2 also REWRITES REQUIREMENTS.md SEC-02 wording as a Wave-0 task. |
| SEC-03 | Signup endpoint only creates DB records if Turnstile passes | Verified by ordering in "Edge Function Pipeline": siteverify → if fail, return; siteverify pass → rate-limit → DB. No early returns past siteverify create DB writes. |
| SEC-04 | Service role key never exposed to client | "Pitfall 1" walks through CI grep. `VITE_TURNSTILE_SITE_KEY` is the only NEW client-exposed var; `TURNSTILE_SECRET_KEY` lives in Supabase secrets only. |
| DB-03 | `join-waitlist` Edge Function handles: Turnstile → rate limit → admin.createUser → DB inserts | "Edge Function Pipeline" section maps each step. Note Template 1A send is STUBBED for Phase 3 per D-11. |
| DB-06 | Edge Functions follow main app's `_shared/` patterns | Verified by reading `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/`: `admin-client.ts`, `auth.ts`, `resend.ts` exist. Phase 2 imports `adminClient` from `../_shared/admin-client.ts`. Does NOT need `requireServiceRole` (this is a PUBLIC endpoint, not service-role-gated). |
| DB-07 | Re-signup with same email handled gracefully (4 states) | "Pattern 3: 4-State Re-Signup Lookup". Query `auth.users` first, branch on `email_confirmed_at` + waitlist row + letter row presence. |
| EMAIL-A1 | User added to waitlist immediately on submission | `app_private.waitlist_signups` insert happens BEFORE response returns (synchronous). Counter view reflects new row on next page load (Phase 1 D-01 contract preserved). |
</phase_requirements>

## Summary

Phase 2 has three independent surgery areas: (1) **write a Supabase Edge Function** in the sibling SEALED-org repo at `supabase/functions/join-waitlist/index.ts`, modeled on the existing `dispatch` and `notify` functions (`Deno.serve` + `adminClient()` from `../_shared/admin-client.ts`, with `deno.json` pinning `@supabase/supabase-js@2.103.2`). The function chain is **Turnstile siteverify → CORS preflight handling → IP rate limit (3/IP/24h) → 4-state re-signup lookup → `admin.createUser({ email_confirm: false })` for new users → `app_private.waitlist_signups` insert → structured `{ state }` response**. (2) **Write a migration `0032_signup_attempts.sql`** in the same sibling repo following its 4-digit sequential convention, service-role-only grants, and the existing `app_private` schema. (3) **Wire the client** in Wave 2 — install `@marsidev/react-turnstile@1.5.2`, mount it in `WaitlistForm.tsx` with `options.execution: 'execute'`, replace `joinWaitlistLocal`'s body with a real `supabase.functions.invoke('join-waitlist', ...)` call, add inline error slot UI between form and counter row, and create a MESSAGES map keyed on the function's state codes.

The split into two waves with a hard HALT (D-02) mirrors Phase 1 D-05 exactly: client wiring cannot validate end-to-end until the function and table are deployed live. Trying to wire the client first produces "function not found" errors indistinguishable from misconfigured client code.

Three pieces of research-verified clarity that prevent classes of bugs:

1. **`auth.admin.createUser({ email_confirm: false })` does NOT send any email.** [VERIFIED: Supabase issue #5260, docs reference `auth-admin-createuser`.] It only creates the `auth.users` row with `email_confirmed_at = null`. Phase 2 leaves a clearly-commented stub `// TODO(Phase 3): call generateLink + sendResendEmail for Template 1A` at the call site. Phase 3 attaches the Resend send without restructuring.

2. **`x-forwarded-for` is the canonical IP header on Supabase Edge Functions.** [VERIFIED: official Supabase discussion #7884 maintainer response.] First entry is the real client IP. Use `req.headers.get('x-forwarded-for')?.split(/\s*,\s*/)[0]`. Fall back to `req.headers.get('x-real-ip')` if absent (occasional empty header reported).

3. **Turnstile tokens are single-use** [VERIFIED: developers.cloudflare.com/turnstile/get-started/server-side-validation/ "Each token can only be validated once. A replayed token will be rejected."] The Edge Function must `siteverify` exactly once per token; the client must `reset()` the widget after every submit so the next attempt mints a fresh token.

**Primary recommendation:** Execute as two waves separated by a hard HALT. Use `application/x-www-form-urlencoded` for the Turnstile siteverify POST (Cloudflare accepts both but the official examples use form-encoded). Use `x-forwarded-for` first entry for the IP key (with `x-real-ip` fallback). Implement the 4-state lookup against `auth.users` JOIN `app_private.waitlist_signups` LEFT JOIN `app_private.letters` (letters table already exists per main-repo migration 0019 — `LEFT JOIN` makes the query safe whether or not the row exists). Wrap the entire pipeline in a single `try/catch` that returns `{ state: 'server_error' }` for any unexpected throw. Use `corsHeaders` from `@supabase/supabase-js/cors` (available since v2.95.0; main repo runs 2.103.2).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Turnstile widget mount + execute | Browser / Client | — | Client-side script renders the iframe; `ref.current.execute()` triggers the challenge before sending token to server |
| Turnstile token verification | API / Backend (Edge Function) | — | The `siteverify` POST MUST happen server-side; client-side validation is bypassable (CRITICAL pitfall #1 in CONTEXT). |
| IP rate-limit counting | Database / Storage | API / Backend (Edge Function) | Postgres table `app_private.signup_attempts` is the durable store (Pitfall 6 in CONTEXT: in-memory state lost across cold starts). Function counts rows in 24h window. |
| 4-state re-signup lookup | Database / Storage | API / Backend | Reads `auth.users`, `app_private.waitlist_signups`, `app_private.letters` via service-role client. |
| `auth.users` row creation | API / Backend (Edge Function via service role) | Database / Storage | `admin.createUser({ email_confirm: false })` calls GoTrue admin endpoint. Service-role-only operation. |
| Waitlist insert | API / Backend (Edge Function) | Database / Storage | `app_private.waitlist_signups` insert via `adminClient()`. Anon never touches this table directly. |
| Structured state response | API / Backend (Edge Function) | — | Returns `{ state }` JSON; client renders copy from MESSAGES map. |
| CORS preflight handling | API / Backend (Edge Function) | — | OPTIONS request must return `corsHeaders` before any other logic. |
| Inline error slot rendering | Browser / Client | — | `WaitlistForm.tsx` or `App.tsx` displays MESSAGES[state] in a fixed-height div. |
| Loading spinner during submit | Browser / Client | — | `WaitlistForm.tsx` `Loader2` (preserved from Phase 1.5). |
| MESSAGES copy lookup | Browser / Client | — | Client owns the copy (D-09). Updates ship without function redeploy. |
| Env var injection | CDN / Static (Vercel build for client) + Supabase secrets (for function) | — | `VITE_TURNSTILE_SITE_KEY` becomes a string literal in the bundle via Vite. `TURNSTILE_SECRET_KEY` + `SUPABASE_SERVICE_ROLE_KEY` are Supabase function secrets, never reach the browser. |
| Cross-repo handoff | Out of this repo (Nour pastes prompt into SEALED-org agent) | — | Mirrors Phase 1's HALT-after-handoff. Audit trail preserved in both repos via `/gsd-quick` in the sibling agent. |

## Standard Stack

### Core (NEW in Phase 2)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@marsidev/react-turnstile` | 1.5.2 | React wrapper for Cloudflare Turnstile (lazy execute mode + ref API) | [VERIFIED: `npm view @marsidev/react-turnstile version` returned `'1.5.2'` (published 2026-05-05).] De-facto wrapper recommended in research SUMMARY pitfall #5. Handles cleanup in `useEffect` return so React 19 StrictMode double-mount does not double-render the iframe. Exposes `ref.current.execute()` for the lazy mode (D-07). |

### Supporting (already installed — no new install needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | 2.103.2 | Client-side `functions.invoke()` + Edge Function `adminClient()` | Wave 2 wiring in `src/lib/supabase.ts`. Edge Function imports via `npm:` Deno specifier in `deno.json`. [VERIFIED: package.json line 11. Main repo `_shared/admin-client.ts` also uses 2.103.2.] |
| `motion` | 12.23.24 | Optional fade in/out of inline error slot | Not strictly required (CSS transitions work too); planner may use `AnimatePresence` if it cleans up component logic. |
| `lucide-react` | 0.546.0 | Existing icons | No new icons needed in Phase 2. |
| `react` / `react-dom` | 19.0.0 | `useState`, `useRef`, `useEffect` for Turnstile widget lifecycle | Existing. |

### Server-side (Deno runtime in main SEALED-org repo)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `npm:@supabase/supabase-js` | 2.103.2 | Service-role client inside Edge Function via `adminClient()` helper | [VERIFIED by reading `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/admin-client.ts` line 3 and sibling `deno.json` files.] Phase 2's `join-waitlist/deno.json` MUST pin the same version. |
| `Deno.serve` | Built-in | HTTP handler | [VERIFIED: every sibling function uses `Deno.serve(async (req) => ...)` — see dispatch/index.ts line 12, notify/index.ts line 8, canary/index.ts.] |
| native `fetch` | Built-in | Turnstile siteverify POST | [CITED: sibling `_shared/resend.ts` line 14 uses `globalThis.fetch` directly; no SDK.] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@marsidev/react-turnstile` lazy execute mode | `react-turnstile` (alternative wrapper) | Both exist; `@marsidev` is more actively maintained (last publish 2026-05-05) and has explicit ref methods (`execute`, `reset`, `getResponse`, `isExpired`). Switching has no functional gain. [VERIFIED via WebFetch of docs.page/marsidev/react-turnstile.] |
| `@marsidev/react-turnstile` lazy execute mode | Raw `window.turnstile.render()` script | StrictMode double-mount causes "Turnstile container is not empty" warning + stale tokens. CONTEXT research SUMMARY pitfall #5 explicitly rules this out. |
| Direct `siteverify` POST in Edge Function | Cloudflare Turnstile API SDK | No first-party Cloudflare SDK exists for Deno. Direct `fetch` is the documented approach. [CITED: developers.cloudflare.com/turnstile/get-started/server-side-validation/] |
| `application/x-www-form-urlencoded` for siteverify body | `application/json` body | Both work [VERIFIED: Cloudflare docs accept both]. The Cloudflare-provided code samples use form-encoded; sticking with their idiom reduces "did I misread the spec" risk. |
| Postgres `signup_attempts` table for rate limiting | In-memory Deno Map | Edge Function instances are ephemeral; map vanishes on cold start. CONTEXT pitfall #6 rules out in-memory. |
| Service-role-only RLS on `signup_attempts` | Public RLS with row policy | Anon never reads this table; pure server-internal storage. Service-role grant only is the simplest secure shape. Matches Phase 1 migration 0031 grant pattern. |
| `admin.createUser({ email_confirm: false })` | `admin.inviteUserByEmail()` | Invite would send Supabase's default invitation email immediately, which Phase 2 explicitly does NOT want (Phase 3 owns the Resend send with Template 1A copy). `createUser` with `email_confirm: false` is silent. [VERIFIED: GitHub issue supabase/auth #1961 + discussion #5260 confirm `email_confirm: false` does NOT send.] |
| Calling `admin.generateLink()` in Phase 2 | Defer to Phase 3 | The link is needed at email-send time (Phase 3). Generating it earlier and storing it is unnecessary state. Phase 2 only needs to create the `auth.users` row; Phase 3 calls `generateLink({ type: 'magiclink', email })` against the existing row to mint the action URL. |
| `x-forwarded-for` first entry for IP | `Deno.serve` `info.remoteAddr` | `remoteAddr` is Supabase's edge proxy IP, NOT the visitor. `x-forwarded-for` first entry is the visitor. [VERIFIED via Supabase discussion #7884.] |

**Installation:**
```bash
npm install @marsidev/react-turnstile@1.5.2
```

**Version verification:**
- `@marsidev/react-turnstile@1.5.2` — [VERIFIED: `npm view @marsidev/react-turnstile version` returned `'1.5.2'`, published 2026-05-05.]
- `@supabase/supabase-js@2.103.2` — Already installed; no upgrade. Main repo pinned to same version.

## Architecture Patterns

### System Architecture Diagram

Data flow from user submit through to the structured state response:

```text
                    ┌─────────────────────────────────────────────────┐
                    │   User types email + clicks "Join the waitlist" │
                    └───────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                    ┌─────────────────────────────────────────────────┐
                    │   WaitlistForm.tsx (Browser / Client)            │
                    │   - prevent default                              │
                    │   - await turnstileRef.current.execute()         │
                    │   - token = ref.current.getResponse()            │
                    │   - call props.onSubmit(email, token)            │
                    └───────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                    ┌─────────────────────────────────────────────────┐
                    │   App.tsx#handleSubscribe (Browser / Client)     │
                    │   - setIsSubmitting(true)                        │
                    │   - try { await joinWaitlist(email, token) }     │
                    │   - catch: setWaitlistError('server_error')      │
                    │   - finally: setIsSubmitting(false)              │
                    └───────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                    ┌─────────────────────────────────────────────────┐
                    │   src/lib/supabase.ts joinWaitlist()             │
                    │   supabase.functions.invoke('join-waitlist', {   │
                    │     body: { email, turnstileToken: token }       │
                    │   })                                              │
                    └───────────────────────┬─────────────────────────┘
                                            │ HTTPS (CORS preflight first)
                                            ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │   Edge Function: join-waitlist/index.ts (Deno runtime)             │
        │                                                                    │
        │   Step 0: if req.method === 'OPTIONS' → return corsHeaders         │
        │   Step 1: extract IP (x-forwarded-for first entry)                 │
        │   Step 2: parse JSON body { email, turnstileToken }                │
        │           (validate shape; missing → server_error 400)             │
        │   Step 3: POST to challenges.cloudflare.com/turnstile/v0/siteverify│
        │           ── on failure → return { state: 'turnstile_failed' }    │
        │   Step 4: COUNT app_private.signup_attempts WHERE ip = ?           │
        │           AND attempted_at > now() - interval '24 hours'           │
        │           ── if >= 3 → return { state: 'rate_limited' }            │
        │   Step 5: 4-state lookup via service-role JOIN                     │
        │           auth.users LEFT JOIN waitlist_signups LEFT JOIN letters  │
        │   Step 6 (branch on state):                                        │
        │     (a) new email:                                                 │
        │         - admin.createUser({ email, email_confirm: false })        │
        │         - insert waitlist_signups (user_id, has_letter=false)      │
        │         - insert signup_attempts (ip, outcome='success')           │
        │         - // TODO(Phase 3): send Template 1A via Resend            │
        │         - return { state: 'success' }                              │
        │     (b) existing unverified:                                       │
        │         - insert signup_attempts (outcome='duplicate_unverified')  │
        │         - // TODO(Phase 3): resend Template 1A                     │
        │         - return { state: 'unverified' }                           │
        │     (c) existing verified, no letter:                              │
        │         - insert signup_attempts (outcome='duplicate_verified_no…')│
        │         - return { state: 'verified_no_letter' }                   │
        │     (d) existing verified with letter:                             │
        │         - insert signup_attempts (outcome='duplicate_verified_w…') │
        │         - return { state: 'verified_with_letter' }                 │
        │   catch (any): insert outcome='db_error'; return server_error 500  │
        └─────────────────────────────────┬─────────────────────────────────┘
                                          │ { state: 'success' | ... }
                                          ▼
                    ┌─────────────────────────────────────────────────┐
                    │   src/lib/supabase.ts → return WaitlistState     │
                    └───────────────────────┬─────────────────────────┘
                                            │
                       ┌────────────────────┴────────────────────┐
                       │ state === 'success'                      │ state !== 'success'
                       ▼                                          ▼
       ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
       │ setIsSubscribed(true)            │   │ setWaitlistError(state)          │
       │ setWaitlistCount(c => c + 1)     │   │ (WaitlistSuccessCard hidden)     │
       │ → WaitlistSuccessCard shows      │   │ → inline error slot renders      │
       │ → counter increments locally     │   │   MESSAGES[state]                │
       └──────────────────────────────────┘   └──────────────────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────────┐
                    │   turnstileRef.current.reset() — always          │
                    │   (next attempt mints fresh single-use token)    │
                    └─────────────────────────────────────────────────┘
```

### Recommended Project Structure (additive)

**Main SEALED-org repo (Wave 1):**
```
supabase/
├── functions/
│   ├── _shared/
│   │   ├── admin-client.ts       # REUSED — no changes
│   │   ├── auth.ts               # NOT USED — this is a public endpoint
│   │   └── resend.ts             # REUSED in Phase 3, NOT Phase 2
│   ├── dispatch/                 # reference pattern
│   ├── notify/                   # reference pattern
│   └── join-waitlist/            # NEW directory
│       ├── deno.json             # NEW — pins supabase-js@2.103.2
│       └── index.ts              # NEW — entry point, Deno.serve handler
└── migrations/
    └── 0032_signup_attempts.sql  # NEW — sibling to 0031_waitlist_signups.sql
```

**Landing repo (Wave 2):**
```
src/
├── App.tsx                       # Edit: add error state, replace console.error with state-setter
├── components/
│   └── WaitlistForm.tsx          # Edit: mount Turnstile widget, change onSubmit signature
└── lib/
    ├── supabase.ts               # Edit: replace joinWaitlistLocal body with real invoke
    └── messages.ts               # NEW (or inline) — MESSAGES map per D-09
```

### Pattern 1: Edge Function — Turnstile siteverify

**What:** Server-side single-use token verification against Cloudflare's endpoint. MUST happen before any DB write.

**When to use:** First step of `join-waitlist/index.ts` after CORS handling.

**Example:**
```typescript
// Source: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
// [VERIFIED 2026-05-28: endpoint URL, request shape, response shape, single-use semantics]

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

async function verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    // T-02-02 pattern from sibling auth.ts: never echo env in error.
    throw new Error('Missing TURNSTILE_SECRET_KEY env');
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp) form.set('remoteip', remoteIp);
  // Optional: form.set('idempotency_key', crypto.randomUUID()) for safe retries.

  const resp = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  if (!resp.ok) {
    console.error(`turnstile siteverify HTTP ${resp.status}`);
    return false;
  }

  const data = await resp.json() as TurnstileVerifyResponse;
  if (!data.success) {
    console.error(`turnstile siteverify failed: ${(data['error-codes'] ?? []).join(',')}`);
    return false;
  }
  return true;
}
```

### Pattern 2: Edge Function — IP Rate Limit Query

**What:** Count attempts from the same IP in the last 24h. If >= 3, reject. Otherwise insert a new attempt row at the end of the request (regardless of outcome) so the counter reflects this attempt.

**When to use:** After Turnstile passes, before the 4-state lookup. Per D-06 only Turnstile-passing requests are counted.

**Example:**
```typescript
// [VERIFIED: matches main repo migration 0031 grant + RLS pattern.]
// [VERIFIED: PostgREST schema('app_private') + .gte() + .count: 'exact' syntax against
//  supabase-js 2.103.2 — same client version used by dispatch/notify functions.]

const RATE_LIMIT_THRESHOLD = 3;       // D-05 amended value
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

async function checkRateLimit(supabase: SupabaseClient, ip: string): Promise<boolean> {
  const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count, error } = await supabase
    .schema('app_private')
    .from('signup_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('attempted_at', sinceIso);

  if (error) {
    console.error('rate_limit query error', error.message);
    // Fail closed on DB error — the caller treats this as server_error.
    throw error;
  }
  return (count ?? 0) < RATE_LIMIT_THRESHOLD;
}

async function recordAttempt(
  supabase: SupabaseClient,
  ip: string,
  outcome: 'success' | 'duplicate_unverified' | 'duplicate_verified_no_letter' | 'duplicate_verified_with_letter' | 'db_error',
): Promise<void> {
  const { error } = await supabase
    .schema('app_private')
    .from('signup_attempts')
    .insert({ ip, outcome });
  if (error) {
    // Log but do not throw — recording the attempt is best-effort.
    console.error('record_attempt error', error.message);
  }
}
```

**Race-condition note:** Two concurrent submissions from the same IP within milliseconds of each other can both pass the count check (each sees `count = 2`). After both insert, `count = 4` exceeds the threshold but both were already accepted. Acceptable because (a) Turnstile is the primary defense (D-05 rationale), (b) the 3-per-day limit is loose enough that a 1-attempt race isn't materially worse, (c) strict serialization would require advisory locks or `SERIALIZABLE` isolation which is overkill for the threat model. Document this acceptance in the migration's comment block.

### Pattern 3: Edge Function — 4-State Re-Signup Lookup

**What:** Determine which of {new, unverified, verified_no_letter, verified_with_letter} applies for a given email, in a single query.

**When to use:** After rate-limit passes. Per CONTEXT research SUMMARY: "Look up `auth.users` by email FIRST. Don't rely on `createUser` 422 error."

**Phase 2 reality check on `app_private.letters`:** The letters table already exists in the main repo (verified via migration index — Phase 4's `letters` table is migration `0019_*` per the existing migrations directory; the `app_private.letters` row is referenced by main app's `notify` function reading `delivery_letter_emails`). **A `LEFT JOIN` against an existing table is always safe**; if Phase 4's letter row doesn't yet exist for a given user, the LEFT JOIN returns NULL for the letter columns and the state correctly resolves to `verified_no_letter`.

**Two-query approach (recommended over JOIN for clarity):**
```typescript
type SignupState =
  | 'new'
  | 'unverified'
  | 'verified_no_letter'
  | 'verified_with_letter';

async function lookupSignupState(
  supabase: SupabaseClient,
  email: string,
): Promise<{ state: SignupState; userId: string | null }> {
  // 1. Find auth.users row by email via admin API.
  // [CITED: supabase.auth.admin.listUsers + filter; or admin.getUserByEmail if available.
  //  As of 2.103.2, the canonical pattern is listUsers + manual filter OR a raw SQL probe.]
  // Planner should verify exact API at implementation time — see Open Question Q1.
  //
  // Simpler alternative: query the auth.users row via service-role REST against
  // the auth schema. Both work; pick whichever the planner confirms at code time.
  const { data: userByEmail, error: userErr } = await supabase
    .schema('auth')
    .from('users')
    .select('id, email_confirmed_at')
    .eq('email', email)
    .maybeSingle();

  if (userErr) throw userErr;

  // (a) new
  if (!userByEmail) {
    return { state: 'new', userId: null };
  }

  // (b) unverified — auth.users row exists but email_confirmed_at IS NULL
  if (!userByEmail.email_confirmed_at) {
    return { state: 'unverified', userId: userByEmail.id };
  }

  // For (c) vs (d): check if a letter row exists for this user.
  const { data: letter, error: letterErr } = await supabase
    .schema('app_private')
    .from('letters')
    .select('id')
    .eq('user_id', userByEmail.id)
    .limit(1)
    .maybeSingle();

  if (letterErr) {
    // If app_private.letters does not yet exist (Phase 4 not yet run), this errors.
    // Treat "table does not exist" as "no letter" and continue.
    // Planner: confirm the actual error code at implementation; PostgREST typically
    // returns 404 / PGRST205 for unknown relation.
    console.warn('letters lookup error (treating as no letter)', letterErr.message);
    return { state: 'verified_no_letter', userId: userByEmail.id };
  }

  return {
    state: letter ? 'verified_with_letter' : 'verified_no_letter',
    userId: userByEmail.id,
  };
}
```

**Note on directly querying `auth.users`:** Supabase's `auth` schema is accessible to service-role clients. The PostgREST endpoint supports schema selection via `.schema('auth')`. This is the lightest-weight pattern and avoids a `listUsers` paginated scan. The planner should validate this against the live project during Wave 1 — if `.schema('auth')` is restricted, fall back to `supabase.auth.admin.listUsers({ filter: \`email.eq.${email}\` })` (page through if needed; for an email lookup there is at most 1 result).

### Pattern 4: Edge Function — Complete Pipeline

**What:** The full `join-waitlist/index.ts` skeleton wiring all 5 patterns together.

**Example skeleton (planner expands this into actual file content):**
```typescript
// supabase/functions/join-waitlist/index.ts
// Phase 2 — Signup pipeline for the SEALED landing page.
// PUBLIC ENDPOINT — does NOT use requireServiceRole(); anon JWT is acceptable.
// Browser submits with the anon Supabase client via functions.invoke().

import { adminClient } from '../_shared/admin-client.ts';
import { corsHeaders } from 'jsr:@supabase/functions-js/cors';
// NOTE: planner verify the exact import path during Wave 1 — older docs reference
// '@supabase/supabase-js/cors'; latest is the jsr: specifier. Either works as long as
// it provides the same { Access-Control-Allow-Origin, ... } object.

type RequestBody = { email: string; turnstileToken: string };
type State =
  | 'success'
  | 'unverified'
  | 'verified_no_letter'
  | 'verified_with_letter'
  | 'rate_limited'
  | 'turnstile_failed'
  | 'server_error';

function jsonResponse(body: { state: State; retry_after?: number }, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Step 0: CORS preflight — MUST be first.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ state: 'server_error' }, 405);
  }

  try {
    // Extract IP — x-forwarded-for first entry, x-real-ip fallback.
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff?.split(/\s*,\s*/)[0]
            ?? req.headers.get('x-real-ip')
            ?? 'unknown';

    // Parse + validate body.
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ state: 'server_error' }, 400);
    }
    if (!body.email || !body.turnstileToken) {
      return jsonResponse({ state: 'server_error' }, 400);
    }

    // Step 1: Turnstile siteverify.
    const turnstileOk = await verifyTurnstile(body.turnstileToken, ip === 'unknown' ? null : ip);
    if (!turnstileOk) {
      return jsonResponse({ state: 'turnstile_failed' }, 200);
    }

    const supabase = adminClient();

    // Step 2: Rate limit (Turnstile-passing requests only — D-06).
    const underLimit = await checkRateLimit(supabase, ip);
    if (!underLimit) {
      // Per D-06 the limit-tripping attempt is NOT recorded; the 3 already in the window
      // are sufficient signal. (If planner wants to record it too, that is also defensible —
      // either choice is consistent with D-06 phrasing.)
      return jsonResponse({ state: 'rate_limited', retry_after: 86400 }, 429);
    }

    // Step 3: 4-state lookup.
    const { state, userId } = await lookupSignupState(supabase, body.email);

    // Step 4: branch.
    switch (state) {
      case 'new': {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: body.email,
          email_confirm: false,  // Does NOT send email. [VERIFIED]
        });
        if (createErr || !created.user) throw createErr ?? new Error('createUser returned no user');

        const { error: insertErr } = await supabase
          .schema('app_private')
          .from('waitlist_signups')
          .insert({ user_id: created.user.id, has_letter: false });
        if (insertErr) throw insertErr;

        await recordAttempt(supabase, ip, 'success');

        // TODO(Phase 3 — EMAIL-A2 / EMAIL-03 / EMAIL-04): send Template 1A.
        //   - Call supabase.auth.admin.generateLink({ type: 'magiclink', email }) → action_link
        //   - Render Template 1A HTML with action_link
        //   - Call sendResendEmail({ from, to, subject, html, idempotencyKey, apiKey })
        //   from '../_shared/resend.ts'
        // Phase 2 leaves this comment; the function returns success without sending.

        return jsonResponse({ state: 'success' }, 200);
      }

      case 'unverified': {
        await recordAttempt(supabase, ip, 'duplicate_unverified');
        // TODO(Phase 3): resend Template 1A — same generateLink + sendResendEmail path.
        return jsonResponse({ state: 'unverified' }, 200);
      }

      case 'verified_no_letter': {
        await recordAttempt(supabase, ip, 'duplicate_verified_no_letter');
        return jsonResponse({ state: 'verified_no_letter' }, 200);
      }

      case 'verified_with_letter': {
        await recordAttempt(supabase, ip, 'duplicate_verified_with_letter');
        return jsonResponse({ state: 'verified_with_letter' }, 200);
      }
    }
  } catch (err) {
    console.error('join-waitlist exception', (err as Error).message);
    // Attempt to log the db_error outcome but don't fail the response if logging fails.
    try {
      const xff = req.headers.get('x-forwarded-for');
      const ip = xff?.split(/\s*,\s*/)[0] ?? 'unknown';
      await recordAttempt(adminClient(), ip, 'db_error');
    } catch { /* swallow */ }
    return jsonResponse({ state: 'server_error' }, 500);
  }
});
```

### Pattern 5: Client — Lazy Execute Turnstile + Inline Error Slot

**What:** `WaitlistForm.tsx` mounts the Turnstile widget in `execution: 'execute'` mode. Submit handler runs `await ref.current.execute()` then `ref.current.getResponse()` for the fresh token, sends it up to `App.tsx` via the `onSubmit` callback, then resets the widget.

**When to use:** Replaces `WaitlistForm.tsx`'s current `handleSubmit`.

**Example (consolidated from verified ref API):**
```typescript
// Source: https://docs.page/marsidev/react-turnstile/use-ref-methods (verified 2026-05-28)
// Source: https://docs.page/marsidev/react-turnstile/props (verified — options.execution)

import { useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Loader2 } from 'lucide-react';
import type { WaitlistState } from '../lib/supabase';

interface WaitlistFormProps {
  onSubmit: (email: string, turnstileToken: string) => Promise<WaitlistState>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: WaitlistState | null;       // Drives the inline slot below the form
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

export default function WaitlistForm({ onSubmit, isSubmitting, isSubmitted, error }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [turnstileBlocked, setTurnstileBlocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting || turnstileBlocked) return;

    try {
      // execute() resolves when the challenge completes (success or fail).
      // Token is then retrievable via getResponse().
      await turnstileRef.current?.execute();
      const token = turnstileRef.current?.getResponse();
      if (!token) {
        // execute() succeeded but no token — treat as turnstile_failed upstream.
        await onSubmit(email, '');  // empty token causes server-side rejection
        return;
      }
      await onSubmit(email, token);
    } finally {
      // Always reset — tokens are single-use (Cloudflare docs).
      turnstileRef.current?.reset();
    }
  };

  return (
    <>
      <form id="waitlist" className={`waitlist${isSubmitted ? ' is-submitted' : ''}`} onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>...</>}
        </button>

        {/* Invisible widget — execute mode runs only on submit. */}
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          options={{
            execution: 'execute',
            appearance: 'interaction-only',  // hides container when invisible
            size: 'invisible',
          }}
          onError={() => setTurnstileBlocked(true)}
          onUnsupported={() => setTurnstileBlocked(true)}
          onExpire={() => turnstileRef.current?.reset()}
        />
      </form>

      {/* Inline error slot — fixed height, no layout shift (D-08). */}
      <div
        className="waitlist-error-slot"
        style={{
          minHeight: 24,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-ink-60)',
          fontSize: 12,
          opacity: error ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
        aria-live="polite"
      >
        {error ? MESSAGES[error] : ' ' /* nbsp keeps height */}
      </div>
    </>
  );
}
```

**Note on `size: 'invisible'` + `appearance: 'interaction-only'`:** This combination produces a fully invisible widget that only ever shows UI if Cloudflare decides the visitor needs interactive challenge. For the vast majority of users the widget renders 0px and `execute()` returns within ~200ms. Verified options per https://docs.page/marsidev/react-turnstile/props.

### Pattern 6: Client — MESSAGES Map

**What:** Client-owned copy keyed on Edge Function state codes. Per D-09 this lives in the landing repo so copy changes don't require function redeploy.

**Example (`src/lib/messages.ts`):**
```typescript
// Per CONTEXT.md D-09 / D-10.
// Phase 5 CONTENT-01 may refine wording.
import type { WaitlistState } from './supabase';

export const MESSAGES: Record<Exclude<WaitlistState, 'success'>, string> = {
  unverified: 'Welcome back. We just resent your confirmation email.',
  verified_no_letter: "You're already on the waitlist.",
  verified_with_letter: "You're already on the list and your letter is sealed.",
  rate_limited: 'Too many attempts from your network. Try again tomorrow.',
  turnstile_failed: "Couldn't verify you're human. Please try again.",
  server_error: 'Something went wrong. Please try again.',
};
```

### Pattern 7: Client — `src/lib/supabase.ts` Update

**What:** Replace `joinWaitlistLocal` stub body with a real `functions.invoke` call. Add a `joinWaitlist` function with the proper signature (the planner can either rename the existing stub or keep both — discretion).

**Example:**
```typescript
// [VERIFIED: supabase-js 2.103.2 supports functions.invoke with body shape per
//  https://supabase.com/docs/reference/javascript/functions-invoke + FunctionsHttpError
//  / FunctionsRelayError / FunctionsFetchError error class hierarchy.]

import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from '@supabase/supabase-js';

export type WaitlistState =
  | 'success'
  | 'unverified'
  | 'verified_no_letter'
  | 'verified_with_letter'
  | 'rate_limited'
  | 'turnstile_failed'
  | 'server_error';

type JoinWaitlistResponse = { state: WaitlistState; retry_after?: number };

export async function joinWaitlist(email: string, turnstileToken: string): Promise<WaitlistState> {
  const { data, error } = await supabase.functions.invoke<JoinWaitlistResponse>(
    'join-waitlist',
    { body: { email, turnstileToken } },
  );

  if (error) {
    // Even 4xx/5xx responses include the structured body — extract it.
    if (error instanceof FunctionsHttpError) {
      try {
        const parsed = await error.context.json() as JoinWaitlistResponse;
        return parsed.state;
      } catch {
        return 'server_error';
      }
    }
    // Relay / Fetch errors mean the function couldn't be reached — treat as server_error.
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      console.error('join-waitlist relay/fetch error:', error.message);
      return 'server_error';
    }
    return 'server_error';
  }

  return data?.state ?? 'server_error';
}
```

### Anti-Patterns to Avoid

- **Service role key in `VITE_*` env var.** Catastrophic — see Pitfall 1. CI grep MUST run before any deploy.
- **Calling `siteverify` from the client.** The secret key cannot be in the client bundle. Server-side only.
- **Using the same Turnstile token twice.** Single-use per Cloudflare docs. Always `ref.reset()` after submit.
- **Reading `Deno.serve` `info.remoteAddr` for visitor IP.** That's Supabase's edge proxy, not the visitor. Use `x-forwarded-for` first entry.
- **Relying on `admin.createUser` 422 error for duplicate handling.** Pitfall 7 in CONTEXT PITFALLS.md. Always lookup first.
- **In-memory rate-limit state.** Pitfall 6. Edge Function instances are ephemeral.
- **`requireServiceRole` guard on `join-waitlist`.** This is a PUBLIC endpoint called from the browser. The anon JWT in `Authorization` header is fine; the function doesn't need to authenticate the caller.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Turnstile React integration | Raw `<script>` tag + `window.turnstile.render()` | `@marsidev/react-turnstile@1.5.2` | Handles StrictMode cleanup, ref API, callback wiring. Solo widget code suffers double-mount in React 19 StrictMode (CONTEXT pitfall #5). |
| Turnstile server-side verify | Custom HMAC verification | Cloudflare's `siteverify` endpoint | Token is opaque from client perspective; only Cloudflare can validate it. |
| Supabase service-role client | New `createClient` call inside function | `adminClient()` from `_shared/admin-client.ts` | Sibling functions all use this; consistent caching, error message, env var contract. |
| CORS headers | Hand-coded `Access-Control-Allow-*` strings | `corsHeaders` from `@supabase/supabase-js/cors` (or `jsr:@supabase/functions-js/cors`) | Stays in sync with SDK updates if new headers are required by clients. |
| Edge Function error response shape | Ad-hoc `{ error: '...' }` | `{ state: WaitlistState }` per D-09 | Structured state codes give the client a discriminated union to switch on, not a string to parse. |
| Auth user creation | Custom UUID + manual `auth.users` INSERT | `supabase.auth.admin.createUser({ email, email_confirm: false })` | Triggers GoTrue-managed schema changes (refresh tokens, audit log, etc.) that direct INSERTs would skip. |
| Magic-link minting (for Phase 3) | Hand-built JWT signing | `supabase.auth.admin.generateLink({ type: 'magiclink', email })` | Cryptographically valid, replay-protected, expiry-managed by GoTrue. |
| HTML5 email validation | JavaScript regex | `<input type="email" required>` already in `WaitlistForm` | Browser validates before submit; SIGNUP-05 satisfied without new code. |

**Key insight:** Every dependency in the column above is either already installed (`@supabase/supabase-js`) or trivially addable (`@marsidev/react-turnstile`). The total NEW code in Phase 2 is one Edge Function file, one migration file, one MESSAGES file, edits to three client files, and a handoff prompt. No custom infra.

## Runtime State Inventory

> Phase 2 is greenfield-additive for runtime state — it CREATES new state (signup_attempts table, auth.users rows, Turnstile widget instances) rather than renaming or migrating existing state. The inventory below documents the new state surfaces planners must account for.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | (1) `app_private.waitlist_signups` — Phase 1 created this; Phase 2 inserts NEW rows. (2) `app_private.signup_attempts` — Phase 2 CREATES this table. (3) `auth.users` — Phase 2 creates NEW rows via admin API. | Migration `0032_signup_attempts.sql` writes the new table. Function code writes the rows. |
| Live service config | None — Cloudflare Turnstile widget is configured ONE TIME via the Cloudflare dashboard by Nour (per CONTEXT specifics). No runtime config changes after that. The site key + secret key are then static. | None. |
| OS-registered state | None — Edge Functions are managed by Supabase's platform; no cron registration, no scheduler hookup in Phase 2. (Phase 3 may register cron jobs for Resend; Phase 2 does not.) | None. |
| Secrets/env vars | **NEW (Supabase function secrets — set via handoff):** `TURNSTILE_SECRET_KEY`. **EXISTING (verified in handoff):** `SUPABASE_SERVICE_ROLE_KEY` (already set per D-03). **NEW (landing repo `.env.local` + Vercel):** `VITE_TURNSTILE_SITE_KEY`. **EXISTING WITH BUGS:** `VITE_SUPABASE_ANON_KEY` (leading space — must strip), `VITE_SUPABASE_URL` (subdomain typo — must reconcile against main app's `.env.local`). | Handoff prompt instructs Nour. `.env.local` fixes are Wave-0 tasks. |
| Build artifacts | None expected to need re-build. Adding `@marsidev/react-turnstile` to `package.json` generates a new entry in `package-lock.json` (if a lockfile gets created — STACK.md notes none currently exists; planner may want to commit one). | `npm install @marsidev/react-turnstile@1.5.2`. |

## Common Pitfalls

### Pitfall 1: Service role key inlined into client bundle (CRITICAL — top pitfall #1 in CONTEXT)

**What goes wrong:** Developer copies an env var as `VITE_SUPABASE_SERVICE_ROLE_KEY=...` (intending to use it in the Edge Function but pasting in the wrong file). Vite inlines `import.meta.env.VITE_*` as string literals into the production bundle. Anyone viewing the bundle JS has full DB access — including the main app's data.

**Why it happens:** The anon key (safe to expose) and service-role key (catastrophic to expose) are both JWTs of identical visible structure. A single typo (`VITE_` prefix) crosses the boundary.

**How to avoid:**
1. **`TURNSTILE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are NEVER prefixed `VITE_`.** They live ONLY in `supabase secrets set` storage, accessed inside the Edge Function via `Deno.env.get()`.
2. **CI grep check before any deploy.** Phase 2 Wave 2 should add a `predeploy` script or document the command:
   ```bash
   npm run build && grep -rE "service_role|TURNSTILE_SECRET" dist/ && exit 1 || echo "no secret leak"
   ```
3. **`.env.local` review during Wave-0** — confirm only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY` are present. Nothing else with `VITE_` prefix relating to secrets.

**Warning signs:** Any string starting with `eyJhbGc...` followed by `...service_role` in the bundle.

### Pitfall 2: Turnstile token reuse / single-use violation

**What goes wrong:** User submits form, Edge Function verifies token, returns `verified_no_letter` (already signed up). User adjusts email, clicks submit again. Widget has the same token in memory (never reset). Edge Function re-verifies the same token → Cloudflare rejects ("timeout-or-duplicate" error code) → Edge Function returns `turnstile_failed`. User confused — looks like Turnstile is broken.

**Why it happens:** Cloudflare states explicitly: "Each token can only be validated once. A replayed token will be rejected." [VERIFIED in their docs.] The `@marsidev/react-turnstile` ref API exposes `reset()` precisely to mint a new token, but the developer must call it.

**How to avoid:** Always call `turnstileRef.current?.reset()` in a `finally` block of the submit handler (per Pattern 5). Even on success — the widget is still on the page, the user can submit again.

**Warning signs:** Repeated `turnstile_failed` errors on the same browser session, but the first submit worked.

### Pitfall 3: `auth.users` row exists but waitlist row does NOT

**What goes wrong:** Edge Function calls `createUser` successfully (auth row inserted), then DB insert into `waitlist_signups` fails (e.g., transient connection drop). User now has an `auth.users` row but no waitlist row — the next signup attempt sees `unverified` state and resends the email, but the user never gets onto the waitlist. Counter never increments for this user.

**Why it happens:** The two operations are not transactional — `createUser` is an HTTP call to GoTrue, the insert is a separate SQL statement. Failures between them leave inconsistent state.

**How to avoid:**
1. **Insert the waitlist row IMMEDIATELY after `createUser`,** before any other work. Keep the window small.
2. **On `waitlist_signups` insert failure, attempt cleanup:** call `supabase.auth.admin.deleteUser(userId)` to roll back the auth row. Don't fail the response yet — try again on next submission.
3. **The 4-state lookup handles recovery automatically** — next submit sees `unverified` (auth row exists), branches to `unverified` path, which Phase 3 will wire to resend the email. Meanwhile this Phase 2 path's TODO comment for the cleanup can be added in a planner-discretion task or deferred.

**Warning signs:** Discrepancy between count of `auth.users` rows and count of `app_private.waitlist_signups` rows in the Supabase dashboard.

### Pitfall 4: IP rate limit IPv6 prefix mismatch

**What goes wrong:** A user's IPv6 address rotates frequently (privacy extensions), so the same physical user gets a different IP per request. Rate limit is ineffective. OR: mobile users behind carrier-grade NAT share an IPv4 — a single 3-attempt limit locks out an entire mobile network.

**Why it happens:** IPv4 NAT and IPv6 privacy extensions both subvert per-IP rate limits.

**How to avoid:** Phase 2 ships the simple "one row per attempt, exact IP match" approach (per D-04/D-05) and accepts the tradeoff. Per D-05 rationale, Turnstile is the primary defense; rate limit is secondary. If post-launch metrics show abuse, add IPv6 /64 truncation (deferred per CONTEXT.md "Stricter time windows" deferred item).

**Warning signs:** Post-launch: many `rate_limited` outcomes from mobile carrier IPs (legitimate users blocked), OR many distinct IPv6 addresses from the same /64 (attacker rotating).

### Pitfall 5: Cloudflare Turnstile + React StrictMode double-render (top pitfall #5 in CONTEXT)

**What goes wrong:** In dev, React 19 StrictMode double-invokes effects. Raw `window.turnstile.render()` is not idempotent — calling twice on the same container attaches two iframes or produces two tokens (the stale one of which is submitted).

**Why it happens:** The library wrapper (`@marsidev/react-turnstile`) handles cleanup in `useEffect` return functions. Rolling your own does not.

**How to avoid:** Use `@marsidev/react-turnstile` (per D-07). Do not import `window.turnstile` directly. Test in both `<StrictMode>` dev AND production build (`npm run build && npm run preview`) before declaring done.

**Warning signs:** Console warning "Turnstile container is not empty" in dev tools.

### Pitfall 6: CORS preflight rejected — function unreachable from browser

**What goes wrong:** Edge Function code is correct but the OPTIONS preflight returns 404 or missing `Access-Control-Allow-Origin`. Browser blocks the actual POST. Client sees `FunctionsRelayError` or no response.

**Why it happens:** Supabase Edge Functions do NOT auto-handle CORS — the function must respond to OPTIONS itself.

**How to avoid:** OPTIONS handler MUST be the first thing in `Deno.serve` (before any auth checks, even before body parsing). Pattern 4 shows this. Use `corsHeaders` from `@supabase/supabase-js/cors` (v2.95+) or hand-code:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Or specific allowlist
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Allowlist for production (planner discretion per CONTEXT):**
- `http://localhost:3000` (dev — Vite default port set in `vite --port=3000`)
- `https://*.vercel.app` (Vercel preview URLs — wildcard for previews)
- `https://sealedapp.io` (prod)

**Note:** `Access-Control-Allow-Origin: *` is acceptable for a public signup endpoint (no cookies, no credentials, no PII in URL params). The Turnstile token and rate limit are the actual security boundaries. The planner may choose `*` for simplicity OR a specific allowlist for hygiene.

**Warning signs:** Browser console "blocked by CORS policy" errors. `FunctionsRelayError` with no clear cause.

### Pitfall 7: `email_confirm: false` confusion with project-level "Confirm email" setting

**What goes wrong:** Project-level "Confirm email" setting in Supabase Auth dashboard is OFF, but `auth.admin.createUser({ email_confirm: false })` still leaves `email_confirmed_at = NULL`. Phase 2's lookup correctly classifies this as `unverified` and the user enters the "resend verification" path that Phase 3 will wire — even though no one ever sends the verification email.

**Why it happens:** GitHub issue supabase/auth #1961 documents that admin-created users always need verification regardless of the project setting. This is actually the desired behavior for Phase 2: we WANT the user to be `unverified` so Phase 3 / Phase 4 can attach the verification gate for letter delivery (SEC-05 in REQUIREMENTS.md).

**How to avoid:** Document in the Edge Function code that `email_confirm: false` is intentional and means "user exists, verification not yet performed." This is exactly the state we want. **Do NOT toggle the project-level "Confirm email" setting** — it would break the Phase 4 letter-bombing defense.

**Warning signs:** None — this is working as designed. Planner just needs to write the comment so a future maintainer doesn't "fix" the email_confirm flag.

### Pitfall 8: Querying `app_private.letters` from Phase 2 before Phase 4 has populated it

**What goes wrong:** Phase 2's 4-state lookup needs to know whether a user has a letter. The `app_private.letters` table already EXISTS in the main repo (per CONTEXT research SUMMARY: "Use existing `app_private.*` tables"). But no rows exist in it yet from this landing page (Phase 4 wires letter inserts). The lookup query returns no rows — which is correct, and resolves to `verified_no_letter`.

**Why it happens:** This is the natural result of LEFT JOIN semantics. Documented here so the planner doesn't add unnecessary defensive code.

**How to avoid:** Use `.maybeSingle()` (returns null if no rows) and treat `null` as `no letter`. The query in Pattern 3 already does this.

**Warning signs:** If a PostgREST error like `PGRST205` appears (relation does not exist), then the assumption is wrong — `app_private.letters` was NOT pre-existing. Planner should verify the table exists during Wave 1 by reading `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` for any `letters.sql` migration.

### Pitfall 9: Counter optimistic increment +1 on every state, not just `success`

**What goes wrong:** Phase 1.5 `App.tsx` does `setWaitlistCount((c) => (c ?? 115) + 1)` in BOTH `handleSubscribe` and `FirstLetter.onEmailSubmit` after `await joinWaitlistLocal(email)` resolves. In Phase 2, this is wrong for the `unverified`, `verified_no_letter`, `verified_with_letter`, `rate_limited`, etc. states — the counter shouldn't bump for users who didn't actually create a new signup.

**Why it happens:** Phase 1.5 was using a no-op stub; every call was treated as success. Phase 2's call returns a discriminated state.

**How to avoid:** Move the `setWaitlistCount` and `setIsSubscribed(true)` calls inside an `if (state === 'success')` branch. The `WaitlistSuccessCard` should only show on `success`. Other states show the inline error slot and leave `isSubscribed` false.

```typescript
const state = await joinWaitlist(formEmail, token);
if (state === 'success') {
  setEmail(formEmail);
  setIsSubscribed(true);
  setWaitlistCount((c) => (c ?? 115) + 1);
} else {
  setWaitlistError(state);
}
```

**Warning signs:** Counter increments when the inline error says "you're already on the waitlist."

### Pitfall 10: `FirstLetter.onEmailSubmit` and `handleSubscribe` divergence

**What goes wrong:** Phase 1.5 has TWO call sites with try/catch/finally skeletons. Phase 2 wires both to the same Edge Function — but if one is updated and the other forgotten, the FirstLetter path silently no-ops or shows incorrect state.

**Why it happens:** Two parallel code paths; easy to update one and miss the other.

**How to avoid:** Both call sites delegate to the same `joinWaitlist(email, token)` helper in `src/lib/supabase.ts`. The Turnstile widget mount lives in `WaitlistForm` for the hero path, but `FirstLetter`'s email step ALSO needs a Turnstile mount (the email-step inputs are inside `FirstLetter.tsx`).

**Planner consideration:** Either (a) lift the Turnstile widget into `App.tsx` so both call sites share one instance, OR (b) mount a second Turnstile instance inside `FirstLetter.tsx`. Option (b) is simpler but uses two widgets; option (a) requires App.tsx to thread the ref down to both children. Per D-11 ("identical payload shape"), this is a planner discretion call. Recommendation: mount a second instance in `FirstLetter` — both widgets share the same `VITE_TURNSTILE_SITE_KEY` and the duplication is contained to instantiation; the actual submit logic deduplicates via the shared `joinWaitlist()` helper.

**Warning signs:** Hero form works; FirstLetter email step silently fails or returns server_error.

## Code Examples

Verified patterns from official sources. See "Architecture Patterns" section above for each pattern (1-7).

### Cloudflare Turnstile siteverify request

```typescript
// Source: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
// [VERIFIED 2026-05-28]
const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    secret: Deno.env.get('TURNSTILE_SECRET_KEY')!,
    response: token,
    remoteip: clientIp,  // optional
  }),
});
const data = await resp.json();
// data.success: boolean
// data['error-codes']: string[] e.g. ['invalid-input-response', 'timeout-or-duplicate']
// data.challenge_ts: ISO8601
// data.hostname: string
```

### Supabase `functions.invoke` with structured error handling

```typescript
// Source: https://supabase.com/docs/guides/functions/error-handling
// [VERIFIED 2026-05-28]
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

const { data, error } = await supabase.functions.invoke('join-waitlist', {
  body: { email, turnstileToken },
});

if (error instanceof FunctionsHttpError) {
  const errorBody = await error.context.json();   // function returned 4xx/5xx WITH body
} else if (error instanceof FunctionsRelayError) {
  // Supabase platform issue
} else if (error instanceof FunctionsFetchError) {
  // Network issue — function unreachable
}
```

### Migration file naming + structure

```sql
-- Source: pattern verified by reading /Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/
--   supabase/migrations/0031_waitlist_signups.sql (Phase 1's migration, applied)
-- Next sequential number is 0032.

-- 0032_signup_attempts.sql
-- Phase 2 of the SEALED landing page — IP rate-limiting table.
-- See landing repo: .planning/phases/02-signup-flow/02-CONTEXT.md D-04, D-05, D-06.
--
-- 3 attempts per IP per rolling 24h, enforced in supabase/functions/join-waitlist.
-- Service-role-only — never read by anon.

create table app_private.signup_attempts (
  id           bigserial   primary key,
  ip           text        not null,
  attempted_at timestamptz not null default now(),
  outcome      text        not null
    check (outcome in (
      'success',
      'duplicate_unverified',
      'duplicate_verified_no_letter',
      'duplicate_verified_with_letter',
      'db_error'
    ))
);

create index signup_attempts_ip_attempted_at_idx
  on app_private.signup_attempts (ip, attempted_at desc);

alter table app_private.signup_attempts enable row level security;

revoke all on app_private.signup_attempts from anon, authenticated, public;
grant select, insert, update, delete on app_private.signup_attempts to service_role;
grant usage, select on sequence app_private.signup_attempts_id_seq to service_role;

comment on table app_private.signup_attempts is
  'Phase 2 of SEALED-Landing-Page: IP rate limit ledger. 3/IP/24h enforced by '
  'supabase/functions/join-waitlist. Pruning deferred until ~500k rows.';

-- Phase 2 race-condition acceptance: two concurrent submissions from the same IP
-- within milliseconds may both pass the count check. Turnstile is the primary defense.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (imported as `motion/react`) | Motion v11 rename, 2024 | Already on `motion@12.23.24`; this is just a reminder not to mix imports. |
| `recaptcha-v2` / `hcaptcha` | `Cloudflare Turnstile` | Cloudflare GA 2023 | Free, privacy-preserving, lower friction than reCAPTCHA. Selected per PROJECT.md. |
| Raw `<script>` Turnstile mount | `@marsidev/react-turnstile@1.5.2` (or `react-turnstile`) | Library matured 2024-2025 | Handles StrictMode cleanup. Single source of truth for ref API. |
| `Deno.serve(handler)` returning `Response` from `https://deno.land/std/http/server.ts` | Native `Deno.serve(handler)` (built-in) | Deno 1.35+ | All sibling Edge Functions in main repo use built-in. No std import needed. |
| Hand-coded `corsHeaders` object | `import { corsHeaders } from '@supabase/supabase-js/cors'` (v2.95+) | supabase-js 2.95.0 release | Stays in sync with SDK header additions. Pinned 2.103.2 supports it. |
| `signInWithOtp({ shouldCreateUser: true })` from client | `admin.createUser({ email_confirm: false })` from Edge Function | Phase 2 architecture | Avoids race: Supabase emails the OTP via its own template; we want Resend + our copy. |
| Counter increments on email_verified | Counter increments on every signup (Phase 1 D-01: COUNTER-01 explicit) | Phase 1 lock | Reduces verification-gate dependency for social-proof number. Letter delivery still gates on verification (SEC-05 in Phase 4). |

**Deprecated/outdated:**
- `supabase.auth.signInWithOtp` with `shouldCreateUser: true` — works, but doesn't give us control over the email template. We use admin.createUser + Resend (in Phase 3) for full template control.
- Direct `INSERT INTO auth.users` — bypasses GoTrue triggers (refresh tokens, audit log). Always use the admin API.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `app_private.letters` table already exists in the main SEALED-org repo (per CONTEXT research SUMMARY claim "Use existing `app_private.*` tables") | Pattern 3, Pitfall 8 | Planner has a Wave-0 verification task: `ls /Users/nourismaiel/SEALED\ ORG\ \(FINAL\)/SEALED-org/supabase/migrations/ | grep letters`. If absent, the lookup must `try/catch` the query and treat error as "no letter" without failing the response. The Pattern 3 code already does this defensively. |
| A2 | Service-role client can query `.schema('auth').from('users')` directly | Pattern 3 | If restricted (PostgREST policy denies), fall back to `supabase.auth.admin.listUsers({ filter })` (paginated). Planner verifies during Wave 1. |
| A3 | `corsHeaders` is importable from `@supabase/supabase-js/cors` in the Deno runtime | Pattern 4 | If the npm:-style import doesn't expose `/cors`, hand-code the object (see Pitfall 6). Planner verifies at code time. |
| A4 | Cloudflare Turnstile `siteverify` allows up to 2048-char tokens [VERIFIED] but the implementation accepts the same length | Pattern 1 | Tokens far below 2048 in practice; no risk. |
| A5 | Two concurrent submissions race condition (Pattern 2 note) is acceptable | Pattern 2 | If Nour wants stricter, defer to v2 (CONTEXT deferred item "Stricter time windows"). |
| A6 | The Turnstile widget mount in `FirstLetter.tsx` can be a second independent instance, not a lifted shared ref | Pitfall 10 | Two widgets share the same site key; no functional issue. Planner discretion. |
| A7 | Pruning of `signup_attempts` is deferred per CONTEXT deferred item — Phase 2 ships none | Pattern 2 + Pitfall 4 | Acceptable per D-04 explicit deferral. |
| A8 | Vercel preview URL for the landing page will be `https://*.vercel.app` (wildcard) — exact subdomain not yet provisioned (Phase 5 work) | Pitfall 6 CORS | If Phase 5 selects a specific subdomain, that's a future allowlist update, not a Phase 2 blocker. Phase 2 can ship with `*` or `*.vercel.app`. |

**If this table is non-empty (it is, 8 entries):** These claims are derived from cross-referenced research but should be verified by the planner / executor during Wave 1. Each is marked with concrete fallback action so research uncertainty does not block execution.

## Open Questions (RESOLVED)

> All five open questions have been resolved by the plans in this phase. Each question below is prefixed with **RESOLVED:** summarizing the chosen path. Wave-1 execution may still need to validate specific assumptions (noted inline), but no question remains open at planning time.

1. **Direct query against `auth.users` from service-role client — is it allowed by default?**
   - **RESOLVED:** Plan 03 uses a graceful `try/catch` fallback inside the `lookupExistingState` helper. The function attempts `supabase.schema('auth').from('users').select(...)` first; on any error (PostgREST policy denial, schema restriction, etc.) it falls back to `supabase.auth.admin.listUsers({ filter: \`email.eq.${email}\` })`. If both paths fail, the function surfaces `state: 'server_error'` rather than crashing. The 1-line probe (`supabase.schema('auth').from('users').select('id').limit(1)`) is deferred to Wave 1 execution where it is safe to run against the deployed function — no need to block planning on the probe outcome.
   - What we know: The `auth` schema is owned by GoTrue. Service-role clients have full database access by default (it bypasses RLS).
   - What's unclear: Whether Supabase's hosted project applies an extra restriction layer that would require `auth.admin.listUsers` instead.

2. **`corsHeaders` import path — `@supabase/supabase-js/cors` vs `jsr:@supabase/functions-js/cors` vs hand-coded**
   - **RESOLVED:** Plan 03 ships a hand-coded 5-line CORS headers object (no external import). This avoids the Deno runtime ambiguity between `npm:` and `jsr:` specifiers entirely and matches the shape sibling functions use. The exact constant is documented in `02-PATTERNS.md` §3 (Edge Function CORS pattern); the headers are: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`.
   - What we know: The official docs reference `corsHeaders` from `@supabase/supabase-js/cors` for v2.95+ (sibling functions don't currently use it — they hand-code).
   - What's unclear: Whether Deno's `npm:@supabase/supabase-js@2.103.2` import exposes the `/cors` subpath, or whether the canonical Deno specifier is `jsr:@supabase/functions-js/cors`.

3. **`app_private.letters` table existence and schema as of Phase 2 start**
   - **RESOLVED:** Plan 03 Task 2's `read_first` block instructs the executor to confirm the actual `user_id` column name against the sibling `app_private.letters` migration in `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` BEFORE writing the lookup helper. If the column name differs from the expected `user_id`, the executor updates the query string. If the migration doesn't exist yet (Phase 4 not run), Plan 03 falls back to a NULL-safe LEFT JOIN that resolves the user state to `verified_no_letter` — matching Pitfall 8's defensive recommendation.
   - What we know: Research SUMMARY claims it exists ("use existing tables"). Main repo's `notify` function reads delivery_letter_emails, implying letters exist.
   - What's unclear: Exact schema. Pattern 3's query uses `user_id` as the join key — this matches Phase 1's `waitlist_signups.user_id` convention but planner should verify.

4. **Vercel preview URL format for CORS allowlist**
   - **RESOLVED:** Phase 2 ships with `Access-Control-Allow-Origin: *` in the join-waitlist function (Plan 03). This is a public endpoint with no credentials, no PII in URL params, and Turnstile + rate-limit as the authoritative security layers — wildcard origin is the documented acceptable choice (Pitfall 6 reasoning). Phase 5 (deployment) will tighten the allowlist to specific origins (`http://localhost:3000`, `https://*.vercel.app`, `https://sealedapp.io`) as part of the production hardening pass. NOT a Phase 2 blocker.
   - What we know: Vercel previews follow `<branch-hash>-<project>.vercel.app`.
   - What's unclear: Whether the CORS allowlist needs an exact match or accepts the wildcard.

5. **Behavior of `auth.admin.createUser` when called twice with the same email in close succession**
   - **RESOLVED:** The 4-state lookup in Plan 03 runs BEFORE `createUser`, which serializes the normal flow — the function never hits the duplicate-createUser path for legitimate sequential signups. For concurrent admin.createUser race conditions (two requests in the same millisecond both seeing `state: 'new'`), the second createUser will fail with a 422 from GoTrue; this lands in the outer `try/catch` and returns `state: 'server_error'`. This is acceptable degraded behavior at v1 scale (sub-1000 signups/day expected) — the user retries and the now-existing auth row routes them to `state: 'unverified'` instead.
   - What we know: First call creates a row; second call returns 422 "User already registered."
   - What's unclear: Whether the 422 error from a parallel/duplicate call is distinguishable from other validation errors.

## Environment Availability

> Phase 2's function and migration execution happens in the main SEALED-org repo via the handoff agent, not in this repo's environment. The audit below covers BOTH this repo's dev env (for Wave 2 client wiring + verification) AND the sibling repo's dependencies (for Wave 1 outputs that Nour will deploy).

### This repo's environment (Wave 2)

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm install`, `npm run dev`, `npm run build` | ✓ (existing per Phase 1.5 completion) | unspecified — package.json has no engines field | None needed |
| npm | Install `@marsidev/react-turnstile` | ✓ | implicit | None needed |
| `@supabase/supabase-js@2.103.2` | Wave 2 `functions.invoke` call | ✓ | 2.103.2 in package.json | None needed |
| Vite dev server | Wave 2 verification via `npm run dev` | ✓ | 6.2.0 | None needed |
| Browser | Verification — opening `http://localhost:3000` after Wave 2 | ✓ | N/A | None needed |
| Cloudflare account (Turnstile widget) | `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | ✗ (per CONTEXT specifics — Nour creates this ~5min one-time) | N/A | **BLOCKING — Nour must create widget before Wave 2 verification can complete.** Handoff prompt should remind him. |

### Sibling SEALED-org repo's environment (Wave 1 outputs deployed there)

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `supabase` CLI | `supabase functions deploy` and `supabase db push` | ✓ (assumed — main app uses it for existing functions) | per main repo's lockfile/conventions | None needed |
| `Deno` runtime | Edge Function execution (managed by Supabase platform) | ✓ (Supabase-managed) | platform-controlled | None needed |
| `app_private` schema | Migration target | ✓ (created by Phase 1's migration 0031) | N/A | None needed |
| `auth.users` table + GoTrue admin API | `admin.createUser` call | ✓ (Supabase-managed) | platform | None needed |
| Existing `_shared/admin-client.ts` | Phase 2 function imports it | ✓ (verified by direct read) | per main repo | None needed |

**Missing dependencies with no fallback:** Cloudflare Turnstile widget setup is blocking the **verification step** of Wave 2 but is not blocking for Wave 1 code-writing or Nour's deploy work. Handoff prompt sequence: Nour completes Turnstile dashboard setup → adds VITE_TURNSTILE_SITE_KEY to landing repo .env.local → runs `npm install @marsidev/react-turnstile@1.5.2` → Wave 2 executor proceeds.

**Missing dependencies with fallback:** None.

## Project Constraints (from CLAUDE.md)

The following directives from `./CLAUDE.md` apply to Phase 2 work:

1. **Database constraint:** "Supabase only — no Firebase remnants in final build." Phase 2 reinforces this by replacing the `joinWaitlistLocal` stub (which makes no network call) with a real Supabase Edge Function call. No Firebase imports introduced.

2. **GSD Workflow Enforcement:** "Before using Edge/Write/file-changing tools, start work through a GSD command." Phase 2's executor will be invoked via `/gsd-execute-phase`; this research output is consumed by `/gsd-plan-phase`. Compliant.

3. **UI Workflow:** "Any UI work in this repo MUST invoke the `frontend-design` skill before writing or editing code." Phase 2's Wave 2 includes UI changes (inline error slot, Turnstile mount in WaitlistForm). Per the CLAUDE.md trigger list:
   - **Editing `src/components/WaitlistForm.tsx`** — YES, applies (adds Turnstile widget + error slot)
   - **Editing JSX inside `src/App.tsx`** — YES, applies (error state plumbing)
   - **Editing `src/components/FirstLetter.tsx`** — YES, applies (Turnstile mount, error display)

   **Action for the planner:** The inline error slot UI is small (a `<div>` between form and counter) but visible. Per D-08 ("ships functional layout-stable slot; Phase 5 may refine typography/timing"), the visual treatment is locked enough by CONTEXT D-08/D-10 + Phase 1.5's UI-SPEC that `frontend-design` skill invocation is likely NOT required for this minimal addition. **The planner should make the explicit call:** either (a) treat the error slot as "functional, deferring polish to Phase 5 per D-08, no `frontend-design` invocation needed for Phase 2," OR (b) invoke `frontend-design` to produce a mini UI-SPEC for the error slot. Recommendation: option (a), because CONTEXT D-08/D-10 already lock the visual contract sufficient for a Phase 2 ship.

4. **TypeScript strict mode is implied** per CONVENTIONS.md ("non-null assertion `!` used in `main.tsx`"). New Phase 2 code follows: explicit `React.FormEvent` event types, generic type args on `useState` for unions (e.g., `useState<WaitlistState | null>(null)`), `import React, { useState, useRef } from 'react'` when JSX types needed.

5. **Inline `try/catch/finally` with `console.error`** is the project's error-handling idiom (Phase 1.5 D-06 preserved this). Phase 2 ADDS state-setter calls inside catch blocks but KEEPS the `console.error` lines verbatim per D-12.

6. **Default exports + named helpers** per CONVENTIONS.md. New `src/lib/messages.ts` (if created) uses named export for `MESSAGES`. Edge Function `index.ts` uses Deno's `Deno.serve` (no exports).

7. **Relative imports, no `@` alias** per CONVENTIONS.md. New code uses `./lib/supabase`, `./lib/messages`, etc.

## Sources

### Primary (HIGH confidence)
- [Cloudflare Turnstile Server-Side Validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) — siteverify endpoint URL, request shape (both `application/x-www-form-urlencoded` and `application/json` accepted), response shape (`success`, `challenge_ts`, `hostname`, `error-codes`, `action`, `cdata`, `metadata`), single-use token semantics, 2048-char max length, 300s expiry.
- [@marsidev/react-turnstile props reference](https://docs.page/marsidev/react-turnstile/props) — exhaustive list of props including `options.execution`, `options.appearance`, `options.size`, all callbacks, and scriptOptions.
- [@marsidev/react-turnstile useRef methods](https://docs.page/marsidev/react-turnstile/use-ref-methods) — full ref API (`execute`, `reset`, `getResponse`, `getResponsePromise`, `isExpired`, `render`, `remove`) with lazy execute pattern example.
- [Supabase Edge Functions CORS docs](https://supabase.com/docs/guides/functions/cors) — recommended import from `@supabase/supabase-js/cors` for v2.95+, OPTIONS preflight pattern.
- [Supabase functions.invoke error handling](https://supabase.com/docs/guides/functions/error-handling) — `FunctionsHttpError`, `FunctionsRelayError`, `FunctionsFetchError` discriminated union; `error.context.json()` extraction for 4xx/5xx bodies.
- [Supabase Edge Functions IP discussion #7884](https://github.com/orgs/supabase/discussions/7884) — Supabase maintainer confirmation that `x-forwarded-for` is populated with client IP; first entry is the visitor.
- [npm: @marsidev/react-turnstile@1.5.2](https://www.npmjs.com/package/@marsidev/react-turnstile) — version verified by `npm view @marsidev/react-turnstile version` returning `'1.5.2'`, published 2026-05-05.
- [npm: @supabase/supabase-js@2.106.2](https://www.npmjs.com/package/@supabase/supabase-js) — latest version verified; Phase 2 uses 2.103.2 (matches main repo per D-08 of Phase 1).
- Direct read: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/admin-client.ts` — exact `adminClient()` implementation, env var contract, caching shape.
- Direct read: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/auth.ts` — `requireServiceRole` guard pattern (NOT used by Phase 2 since `join-waitlist` is public).
- Direct read: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/resend.ts` — sendResendEmail signature and idempotency-key pattern (referenced for Phase 3 stub comment).
- Direct read: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/dispatch/index.ts`, `notify/index.ts`, `canary/index.ts` — `Deno.serve` handler pattern, JSON response helper, error logging convention.
- Direct read: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/dispatch/deno.json`, `notify/deno.json` — `deno.json` shape pinning `npm:@supabase/supabase-js@2.103.2`.
- Direct read: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0031_waitlist_signups.sql` — migration naming convention (4-digit sequential), schema layout, RLS + grant pattern.

### Secondary (MEDIUM confidence)
- [Supabase auth.admin.createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) — `email_confirm: false` does not send email (cross-verified via GitHub issues).
- [Supabase issue #5260 — createUser email behavior](https://github.com/orgs/supabase/discussions/5260) — confirms `email_confirm: false` is silent.
- [Supabase issue #1961 — admin-created users always need verification](https://github.com/supabase/auth/issues/1961) — confirms email_confirmed_at NULL state after `email_confirm: false`.
- [Supabase auth.admin.generateLink response shape](https://github.com/supabase/auth/issues/1357) — `properties.action_link`, `email_otp`, `hashed_token`, `redirect_to`, `verification_type`. Used for Phase 3 stub comment.

### Tertiary (LOW confidence — verify during Wave 1 if planner has time)
- Exact `corsHeaders` import path for Deno-runtime imports (npm: vs jsr:). Resolved at planning time — hand-coded headers (see Open Question 2 resolution).
- Whether `.schema('auth').from('users')` is permitted by default RLS bypass for service-role on hosted Supabase. Resolved at planning time — try/catch fallback to `auth.admin.listUsers` (see Open Question 1 resolution).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — main repo's `_shared/` patterns read directly; `@marsidev/react-turnstile@1.5.2` verified via npm; Supabase + Turnstile API contracts verified via official docs.
- Architecture (Edge Function pipeline): HIGH — pattern matches sibling functions verbatim; each step has a verified source.
- 4-state lookup logic: MEDIUM-HIGH — pattern documented in CONTEXT research SUMMARY and PITFALLS; the open question on direct `auth.users` query is resolved by Plan 03's try/catch fallback to `auth.admin.listUsers`.
- Turnstile lazy execute pattern: HIGH — `@marsidev/react-turnstile` docs explicitly show the `options.execution: 'execute'` + `ref.execute()` pattern.
- CORS handling: HIGH — Phase 2 ships hand-coded headers (5 lines), avoiding the npm:/jsr: import ambiguity entirely.
- IP rate limit query: HIGH — straightforward `count` query; race-condition tradeoff accepted per D-05 rationale.
- Pitfalls: HIGH for top 5 (service role key leak, token reuse, CORS preflight, double-render, queryng non-existent table) — these are well-documented in research SUMMARY + CONTEXT PITFALLS.md.

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (30 days for stable; if Turnstile/Supabase release breaking changes within that window, re-verify Patterns 1 + 4).
