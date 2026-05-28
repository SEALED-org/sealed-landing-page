# Phase 2: Signup Flow - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the hero waitlist form (`WaitlistForm`) and `FirstLetter`'s email-step end-to-end to a real `join-waitlist` Supabase Edge Function. The function handles, in order: Turnstile token verification → IP rate-limit check → 4-state re-signup lookup → `admin.createUser({ email_confirm: false })` for new users → `app_private.waitlist_signups` insert → structured state response. Path A (no letter) is fully closed; Path B's email-send body is Phase 3's job — Phase 2 leaves a clearly-commented stub at the Resend call site.

In scope:
- New Supabase Edge Function `join-waitlist/` in the main SEALED-org repo
- New `app_private.signup_attempts` table (migration in main repo, alongside the function)
- Client-side Turnstile integration via `@marsidev/react-turnstile` (lazy execute-on-submit)
- Replace `joinWaitlistLocal()` stub in `src/lib/supabase.ts` with real `supabase.functions.invoke('join-waitlist', ...)` call
- Wire both call sites — `App.tsx#handleSubscribe` (hero form) and `App.tsx#FirstLetter.onEmailSubmit` (FirstLetter's email step) — to the same Edge Function in Path A mode (no letter body sent)
- Inline error UX: fixed-height reserved slot below `WaitlistForm`, above counter; client-side `MESSAGES` map keyed on the function's structured state codes
- `.env.local` cleanup (Wave-0 precondition): fix leading space in `VITE_SUPABASE_ANON_KEY`, resolve URL/JWT-ref mismatch, add new `VITE_TURNSTILE_SITE_KEY`
- REQUIREMENTS.md amendment: SEC-02 threshold revised from "1 attempt per IP per 24h" to "3 attempts per IP per 24h" (see D-05 rationale)
- Handoff prompt for the SEALED-org agent covering: function deploy (`supabase functions deploy join-waitlist`), migration apply (`signup_attempts` table), secrets (`TURNSTILE_SECRET_KEY` only — verify `SUPABASE_SERVICE_ROLE_KEY` already set)

Out of scope (other phases handle):
- Template 1A body, Resend integration, actual email send → Phase 3 (EMAIL-A2, EMAIL-03, EMAIL-04, DEPLOY-04)
- Resend secrets (`RESEND_API_KEY`, `SEALED_FROM_ADDRESS`) → Phase 3 handoff
- SPF/DKIM/DMARC DNS records for sealedapp.io → Phase 3 (DEPLOY-04)
- Letter body persistence, sealed state machine, `verify-email` Edge Function → Phase 4
- Vercel deployment, sealedapp.io domain hookup → Phase 5
- Polish/animation refinement of the inline error treatment (CONTENT-06) — Phase 2 ships a functional layout-stable slot; Phase 5 may refine typography/timing

</domain>

<decisions>
## Implementation Decisions

### Edge Function Source & Deploy

- **D-01:** `join-waitlist` Edge Function source lives in `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/`. This mirrors Phase 1's D-03/D-04 principle: the main repo is the single source of truth for all Supabase server-side code (functions, migrations, `_shared/` helpers). The landing repo contains ONLY the client-side `supabase.functions.invoke('join-waitlist', ...)` call.

- **D-02:** Phase 2 execution splits into two waves with a hard HALT between them, mirroring Phase 1 D-05:
  - **Wave 1 (HALT after this):** Executor writes function code + `signup_attempts` migration in main repo + a self-contained handoff prompt for Nour. Execution stops.
  - **Nour gate:** Nour pastes the handoff prompt into the SEALED-org agent, which applies the migration, deploys the function (`supabase functions deploy join-waitlist`), and sets `TURNSTILE_SECRET_KEY`. Confirms back to this repo's agent.
  - **Wave 2:** Client wiring (`src/lib/supabase.ts` real fetch, `WaitlistForm` Turnstile mount, `App.tsx` error state plumbing, error slot UI, MESSAGES map). Verification step hits the live function from `npm run dev`.

- **D-03:** Phase 2's handoff prompt asks Nour for **Phase-2-scoped secrets only**:
  1. `supabase secrets set TURNSTILE_SECRET_KEY=<value from Cloudflare Turnstile dashboard>`
  2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is already set in the project (it should be — the main app's `dispatch`/`notify` functions use it). If absent, set it.
  3. Add `VITE_TURNSTILE_SITE_KEY=<public site key from Cloudflare>` to **this** repo's `.env.local`
  4. Fix the two pre-existing `.env.local` bugs from `STATE.md` Blockers:
     - Strip the leading space from `VITE_SUPABASE_ANON_KEY=`
     - Resolve the URL/JWT-ref mismatch (`tiaeiioiyelhekgrllnjn` vs JWT claim `tiaeioiylephekgrllnj`) — cross-check against the main app's `.env.local`, use whichever is canonical
  - **Deferred to Phase 3 handoff:** `RESEND_API_KEY`, `SEALED_FROM_ADDRESS`. These are useless without verified DNS (Phase 3's DEPLOY-04 gate).

### IP Rate Limiting

- **D-04:** Attempt records live in a new dedicated table `app_private.signup_attempts` (NOT a column on `waitlist_signups`). Schema:
  ```sql
  create table app_private.signup_attempts (
    id           bigserial primary key,
    ip           text       not null,
    attempted_at timestamptz not null default now(),
    outcome      text       not null  -- 'success' | 'duplicate_unverified' | 'duplicate_verified_no_letter' | 'duplicate_verified_with_letter' | 'db_error'
  );
  create index on app_private.signup_attempts (ip, attempted_at desc);
  ```
  - Migration goes in the same main-repo migration file (or sibling, planner's call) that introduces the function. Granted to `service_role` only — the anon client never touches this table.
  - Pruning policy: no scheduled prune in Phase 2. Defer until rows > ~500k (research note in `<deferred>`).
  - Counts *attempts* (not just successes), so a bot rotating emails from one IP still trips the limit on the Nth retry.
  - `outcome` is logged for debugging — does not affect the count.

- **D-05:** Rate-limit threshold revised from REQUIREMENTS.md SEC-02's original "1 attempt per IP per 24h" to **3 attempts per IP per 24h, rolling window**.
  - Rationale: Modern IPs are shared (households, coffee shops, dorms, mobile carrier NAT). 1/IP/24h blocks legitimate density — a 2-person household has one person locked out for a day. 3 attempts allows couples/small families to sign up without friction while still catching abuse (3 distinct emails from one IP in 24h remains a strong bot tell).
  - Turnstile is the *primary* bot defense; IP rate limiting is *secondary*. A sophisticated bot using rotating proxies gets 1 signup per IP regardless of the limit value, so going from 1 to 3 doesn't materially change the worst-case threat model.
  - **Phase 2 amends REQUIREMENTS.md SEC-02** — wording changes to "Server-side IP rate limit of 3 signup attempts per rolling 24h per IP enforced in the Edge Function." This amendment is a Wave-0 task in Phase 2's plan.

- **D-06:** Rate-limit counter increments on **every Turnstile-passing POST**, regardless of subsequent DB outcome (`success`, `duplicate_*`, `db_error` all count). Pre-Turnstile requests are not logged — Turnstile already filters bot noise; logging them would bloat the table without protective value. Same-email retries from the same IP within 24h hit the 4-state re-signup lookup BEFORE the rate-limit check; legitimate "I already signed up" returns its state response and does NOT increment the attempt counter (we credit duplicate-detection over rate-limiting for known emails).

### Turnstile Lifecycle

- **D-07:** Turnstile uses **lazy execute-on-submit** via `@marsidev/react-turnstile`:
  - Widget is mounted on page render but in "execution mode" (not auto-running)
  - On submit handler: `await turnstileRef.current.execute()` → token in hand → call Edge Function → reset widget for the next attempt
  - The existing `Loader2` submit spinner in `WaitlistForm.tsx` covers the 200–800ms challenge latency
  - Always-fresh token — no 5-minute expiration race condition
  - No Cloudflare challenge runs for visitors who never submit (lighter page load, more privacy)
  - On Turnstile failure (`onError` / `onUnsupported` / `onTimeout`): set inline error state to `turnstile_failed`; reset widget; allow retry on next submit click

### Inline Error UX

- **D-08:** Error renders in a **fixed-height (~22-28px) reserved slot** between `WaitlistForm` and the `live-row` (counter). Empty / transparent when idle so layout never shifts. Error text fades in/out on state change. Mono-spaced typeface (`--font-mono` token), `--color-ink-60` opacity, matches the existing `live-row` typographic treatment. Counter remains visible.
  - Phase 5's CONTENT-06 polish pass may refine the exact visual treatment (typography ladder, transition timing, color). Phase 2 ships a working layout-stable slot.

- **D-09:** **Client owns the copy.** Edge Function returns a structured JSON response of shape:
  ```json
  { "state": "success" | "unverified" | "verified_no_letter" | "verified_with_letter" | "rate_limited" | "turnstile_failed" | "server_error" }
  ```
  Plus optional `retry_after` (seconds) for `rate_limited`. React client maintains a `MESSAGES` lookup map. Copy changes go in the landing repo only — no cross-repo redeploy needed when Phase 5's CONTENT-01 polish updates wording.

- **D-10:** Approved copy strings (Phase 5's CONTENT-01 polish may refine):
  | State | Message |
  |---|---|
  | `success` (NEW signup) | (No inline error — existing `WaitlistSuccessCard` handles success state) |
  | `unverified` | `Welcome back. We just resent your confirmation email.` |
  | `verified_no_letter` | `You're already on the waitlist.` |
  | `verified_with_letter` | `You're already on the list and your letter is sealed.` |
  | `rate_limited` (429) | `Too many attempts from your network. Try again tomorrow.` |
  | `turnstile_failed` | `Couldn't verify you're human. Please try again.` |
  | `server_error` (500) | `Something went wrong. Please try again.` |

### Phase Boundaries

- **D-11:** Both `App.tsx#handleSubscribe` (hero form) and `App.tsx#FirstLetter.onEmailSubmit` callback route through the **same** `join-waitlist` Edge Function with **identical payload shape** in Phase 2 (`{ email, turnstileToken }`). Phase 2 = email-only signups for both call sites. Phase 4 extends the function (or adds a sibling endpoint) to accept an optional letter body and persist to `app_private.letters` in draft state.

- **D-12:** Phase 1.5's `try/catch/finally` skeletons in `App.tsx#handleSubscribe` and `App.tsx#FirstLetter.onEmailSubmit` (preserved verbatim per Phase 1.5 D-06) get their `console.error` lines replaced with state-setter calls that drive the new error slot. Original log messages (`'Subscription failed:', error`, `'Waitlist join failed:', error`) remain as `console.error` calls alongside the new UI plumbing — no log regression, real error UI added on top.

### Claude's Discretion

- **IP-identification header** in the Edge Function. Supabase Deno runtime exposes the visitor IP via `x-forwarded-for` (first hop), `x-real-ip`, or `Deno.serve` `info.remoteAddr`. Planner picks the most reliable one for Supabase's stack (likely `x-forwarded-for` first-element with `x-real-ip` fallback). Validate during Wave 1 against Supabase's current docs.

- **Edge Function CORS allowlist** — Must allow `http://localhost:3000` (dev), the eventual Vercel preview URL (`https://*.vercel.app` or specific subdomain), and `https://sealedapp.io` (prod). Planner specifies the exact list; can be wildcarded for `*.vercel.app` if needed for previews.

- **Pruning strategy for `signup_attempts`** — Phase 2 ships no prune cron. Planner may add a TODO comment in the migration noting the row-count threshold (~500k) at which a prune job becomes worthwhile.

- **MESSAGES map file location** — A new `src/lib/messages.ts`, inline in `App.tsx`, or a `WaitlistForm` constant. Planner picks based on shared-vs-local heuristic (FirstLetter also needs the same map for its error path).

- **Exact JSON response shape keys** — `{ state }` is locked (D-09); other keys (`retry_after`, error details for `server_error`) — planner's call based on Edge Function ergonomics.

- **REQUIREMENTS.md SEC-02 amendment task** — Whether to make this a dedicated Wave-0 plan file or fold into the foundational migration plan. Planner picks.

- **Order of Wave-0 tasks** — `.env.local` fix, REQUIREMENTS.md amendment, function source write, migration write, handoff prompt write can run in any order within Wave 1; the HALT only blocks Wave 2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Two-repo system, security model (Turnstile + IP rate limit + email verification gate), counter seed value (115), email template inventory, key decisions table
- `.planning/REQUIREMENTS.md` — Full v1 requirements; Phase 2 owns SIGNUP-01 through SIGNUP-05, SEC-01 through SEC-04, DB-03, DB-06, DB-07, EMAIL-A1. **NOTE:** SEC-02 wording will be amended in Phase 2 per D-05 (1→3 attempts/IP/24h).
- `.planning/ROADMAP.md` §"Phase 2: Signup Flow" — Goal statement and 5 success criteria
- `.planning/STATE.md` §"Blockers/Concerns" — `.env.local` bugs and service-role bundle-leak risk

### Phase 1 / 1.5 Carry-Forward (DO NOT re-derive)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 implementation decisions (Supabase client shape D-06; env var contract D-08; counter view as `115 + count(*)` no status filter; main repo owns migrations D-03/D-04; HALT-after-handoff pattern D-05)
- `.planning/phases/01.5-ui-redesign-inserted/01.5-CONTEXT.md` — Phase 1.5 decisions; specifically D-06 (try/catch/finally + `console.error` preservation) which Phase 2 builds on top of
- `.planning/phases/01.5-ui-redesign-inserted/01.5-UI-SPEC.md` — Locked visual contract; new error slot must respect the hero composition (no layout shift)
- `src/lib/supabase.ts` — Phase 1's client + `getSignupCount` + `joinWaitlistLocal` stub. Phase 2 replaces the body of `joinWaitlistLocal` (and likely renames it / adds a sibling) with the real `supabase.functions.invoke('join-waitlist', ...)` call.
- `src/App.tsx` — Phase 1.5's composition root. `handleSubscribe` and `FirstLetter.onEmailSubmit` are the two Phase 2 wiring sites.

### Codebase Maps
- `.planning/codebase/STACK.md` — React 19 + Vite 6 + Tailwind v4 + Motion v12. Confirms `@marsidev/react-turnstile` is a new dependency (research SUMMARY).
- `.planning/codebase/ARCHITECTURE.md` — Component graph and data flow (NOTE: pre-dates Phase 1.5; updated component list now includes Counter, WaitlistForm, WaitlistSuccessCard, Nav, Footer, HowItWorks, ResearchSection)
- `.planning/codebase/INTEGRATIONS.md` — Pre-Phase-1 Firebase state; superseded by Phase 1. Useful only for the historical context of what was removed.
- `.planning/codebase/CONVENTIONS.md` — Naming, import, and code-style rules new files must follow

### Research Outputs
- `.planning/research/SUMMARY.md` — Top-level research synthesis. Validates `@supabase/supabase-js@2.103.2`, `@marsidev/react-turnstile`, the 4-state re-signup pattern, `admin.createUser` + `generateLink` + Resend approach. Top 5 pitfalls (service role in bundle, letter bombing, Resend DNS, duplicate-signup 422, Turnstile StrictMode double-render) all apply directly.
- `.planning/research/PITFALLS.md` — Detailed pitfall walkthroughs
- `.planning/research/ARCHITECTURE.md` — Greenfield architecture (superseded by "use existing `app_private.*` tables" decision in SUMMARY)
- `.planning/research/FEATURES.md` — Feature inventory and table-stakes mapping
- `.planning/research/STACK.md` — Stack research notes

### Cross-Repo Hand-off (this is where Phase 2's Wave 1 outputs land)
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/` — Main app repo; source of truth for all Supabase server-side code
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/` — Destination directory for the new `join-waitlist/` function (read sibling functions like `dispatch`, `notify`, and `verify-email` if present, to match folder layout, deno.json shape, and import patterns)
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/` — `admin-client.ts`, `resend.ts`, `auth.ts` helpers that Phase 2's function imports per DB-06
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` — Destination directory for the new `signup_attempts` migration

### External Service Setup
- `https://dash.cloudflare.com/?to=/:account/turnstile` — Cloudflare Turnstile dashboard. Nour creates a widget for `sealedapp.io` + `localhost`, "Managed" challenge mode, then copies Site Key (public, becomes `VITE_TURNSTILE_SITE_KEY`) and Secret Key (private, becomes `TURNSTILE_SECRET_KEY` in Supabase secrets).
- `https://developers.cloudflare.com/turnstile/get-started/server-side-validation/` — Server-side token verification endpoint (`https://challenges.cloudflare.com/turnstile/v0/siteverify`) and expected POST shape. Edge Function reads this docs page to wire verification correctly.
- `https://github.com/marsidev/react-turnstile` — `@marsidev/react-turnstile` library docs. Lazy execution mode + `ref.execute()` + `ref.reset()` API.

### Files Being Created / Modified

**In main SEALED-org repo (Wave 1, via handoff):**
- NEW `supabase/functions/join-waitlist/index.ts` — Function entry point
- NEW `supabase/functions/join-waitlist/deno.json` (or equivalent) — Function manifest if pattern requires
- NEW `supabase/migrations/<timestamp>_signup_attempts.sql` — Rate-limit table migration

**In landing repo (Wave 2, after Nour confirms):**
- `src/lib/supabase.ts` — Replace `joinWaitlistLocal()` body with real `supabase.functions.invoke('join-waitlist', { body: { email, turnstileToken } })`; add `WaitlistState` type matching D-09 response shape; export error state codes as enum/union.
- NEW `src/lib/messages.ts` (or inline in App.tsx — planner discretion) — `MESSAGES` map for D-09 state codes → D-10 strings.
- `src/components/WaitlistForm.tsx` — Add `@marsidev/react-turnstile` widget in lazy execute mode; wire token retrieval into submit handler; surface `error` prop for inline display.
- `src/App.tsx` — Add error state (`waitlistError: WaitlistState | null`); update `handleSubscribe` and `FirstLetter.onEmailSubmit` to set error state on each return path; pass error to `WaitlistForm` for slot rendering.
- `.env.local` — Add `VITE_TURNSTILE_SITE_KEY=...`; fix leading space on `VITE_SUPABASE_ANON_KEY`; resolve URL/JWT-ref typo (verify against main app's `.env.local`).
- `package.json` — Add `@marsidev/react-turnstile` (pin a specific recent version)
- `.planning/REQUIREMENTS.md` — Amend SEC-02 wording (1 → 3 attempts/IP/24h per D-05)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/supabase.ts`** — Phase 1's client + helpers. Already imports `@supabase/supabase-js@2.103.2` and exports `supabase` + `getSignupCount` + `joinWaitlistLocal`. Phase 2 replaces the body of `joinWaitlistLocal` (currently a no-op stub) with the real `supabase.functions.invoke` call. The "fail loud at module load" pattern stays — both Turnstile site key and Supabase keys are env-var-required.
- **`src/components/WaitlistForm.tsx`** — Phase 1.5 already added a `Loader2` spinner in the submit button, propped via `isSubmitting`. Phase 2 reuses this for Turnstile-execution latency without UI changes. The form's `onSubmit(email)` callback signature stays; payload sourcing (token) happens inside `WaitlistForm` itself before invoking the parent callback.
- **`App.tsx#handleSubscribe` and `App.tsx#FirstLetter.onEmailSubmit`** — Both already have `try/catch/finally` skeletons with `setIsSubmitting(true/false)` and `console.error(...)` logging (Phase 1.5 D-06). Phase 2 augments — does NOT replace — these patterns.
- **`_shared/admin-client.ts`, `_shared/resend.ts`, `_shared/auth.ts`** (main repo, per DB-06) — Reused via relative import in the new function's `index.ts`. No copy-paste, no re-implementation.

### Established Patterns
- **Default exports + named helpers for client modules** — Phase 1 established this in `src/lib/supabase.ts`. New `src/lib/messages.ts` (if created) follows the same shape.
- **Relative imports, no `@` alias** — Per CONVENTIONS.md and Phase 1.5. Edge Function imports use Deno's URL/relative pattern, matching main app's existing functions.
- **Inline `try/catch/finally` with `console.error`** — Phase 1.5 D-06 preserved this verbatim. Phase 2 adds state-setter calls inside the catch blocks; keeps `console.error` lines.
- **Module-load env-var validation** — `src/lib/supabase.ts` throws at module load if Supabase env vars are missing. Phase 2 adds `VITE_TURNSTILE_SITE_KEY` to the same validation path.
- **HALT-after-handoff pattern** — Phase 1 D-05 established this; Phase 2 D-02 mirrors it for the Edge Function + migration.
- **Single Edge Function endpoint, structured state response** — Aligns with research SUMMARY's pattern (4-state response, not 4 separate endpoints).

### Integration Points
- `src/App.tsx` remains the composition root; `handleSubscribe` and `FirstLetter.onEmailSubmit` are the only places that change.
- `src/lib/supabase.ts` is the single client API surface — Phase 2 adds a new `joinWaitlist(email, turnstileToken)` function alongside (or replacing) `joinWaitlistLocal`. Public shape: returns the `WaitlistState` code on success or throws on network/server error.
- `WaitlistForm.tsx` becomes the Turnstile mount point. It handles its own widget lifecycle (mount, execute on submit, reset on completion/error) and surfaces only the resulting token to its `onSubmit` prop.
- The new `signup_attempts` table is internal to the Edge Function — never read by the client.
- `public.signup_counter` view is unchanged (Phase 1 contract). It still reads `115 + count(*)` from `app_private.waitlist_signups` with no filter — counter increments on every insert, no verification gate (per COUNTER-01).

</code_context>

<specifics>
## Specific Ideas

- **Cloudflare Turnstile setup is the one Cloudflare touch in this entire project.** Nour signs up for a free Cloudflare account, creates a Turnstile widget (Managed challenge mode) for `sealedapp.io` + `localhost`, copies Site Key + Secret Key. ~5 minutes one-time. Never revisited. DNS for `sealedapp.io` stays at the existing registrar — Phase 3's SPF/DKIM/DMARC records go there, NOT inside Cloudflare.

- **Handoff prompt format** — Must mirror Phase 1's quality (self-contained, paste-verbatim). Nour pastes it into the SEALED-org agent; that agent runs `/gsd-quick` (or equivalent), applies the migration, deploys the function, sets `TURNSTILE_SECRET_KEY`, and documents in the main repo's `.planning/` that the change exists because of the landing page. Audit trail preserved in both repos.

- **REQUIREMENTS.md SEC-02 amendment is part of Phase 2's work** — Not a precondition Nour does manually. The executor edits the wording during Wave 1 (or Wave-0 of Wave 1), committed atomically with the rationale linked back to D-05 in this CONTEXT.md.

- **Side-by-side verification approach** — Wave 2's verification step runs `npm run dev`, opens the page, attempts a real signup with a test email, observes: (a) counter increments by 1 immediately (optimistic, per Phase 1 D-06 carry-forward), (b) a row appears in `app_private.waitlist_signups` (Nour confirms via Supabase dashboard), (c) a row appears in `app_private.signup_attempts` with `outcome='success'`. Then retries from the same email — observes the `verified_no_letter` state message in the error slot. Then retries 3 more times — observes the `rate_limited` message.

- **Plain-language documentation in PLAN.md** — Per Phase 1 D-06 specifics, plan step descriptions should be readable for a non-engineer. Nour is the founder, not the implementer; terseness is fine for code but clarity for him is the priority.

</specifics>

<deferred>
## Deferred Ideas

- **Pruning cron for `signup_attempts`** — No scheduled prune in Phase 2. Defer until the table grows past ~500k rows or starts affecting query latency. At that point, add a `pg_cron` job (in the main repo) that deletes rows where `attempted_at < now() - interval '7 days'`. The rate-limit query only needs the last 24h, so a 7-day retention preserves debugging history for a week without indefinite growth.

- **Stricter time windows (per-hour limits)** — Phase 2 ships rolling 24h. If post-launch metrics show abuse patterns, a tighter per-hour band (e.g., 2 attempts per IP per hour AND 3 per IP per 24h) can be layered. Not worth the complexity at launch.

- **Bounce/complaint webhook → auto-IP-flag** — Already in v2 deferred items. Could extend `signup_attempts.outcome` with a `bounced` state populated by a Resend webhook, then use it to permanently flag abusive IPs. v2 scope.

- **Localization (i18n) of error copy** — D-09's client-owned copy decision was made specifically to enable this later. v2 work.

- **Email-based rate limiting layer** — Beyond IP+Turnstile, could limit by email domain (e.g., "10 signups from `*@tempmail.io` in 24h" → soft reject). Not in v1 threat model. Deferred to post-launch tuning.

- **Phase 5's CONTENT-06 polish of the error slot** — Typography ladder, fade-in/out timing, color treatment of the inline error message. Phase 2 ships functional; Phase 5 polishes.

- **Turnstile fail-soft graceful degradation** — Phase 2 fails closed on `onUnsupported` (privacy-conscious browsers, old browsers, Tor). If post-launch UX data shows this is a real-user pain point, consider a fall-back to a stricter server-side rate-limit-only path for those browsers. Risky — easy to fake the `unsupported` signal. Defer.

- **Multi-region Edge Function deployment** — Supabase Edge Functions auto-deploy globally. No tuning needed in Phase 2.

</deferred>

---

*Phase: 02-signup-flow*
*Context gathered: 2026-05-28*
