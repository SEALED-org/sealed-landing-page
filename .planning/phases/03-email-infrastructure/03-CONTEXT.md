# Phase 3: Email Infrastructure - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Make outbound mail from sealedapp.io **actually arrive, branded, and authenticated**. Three things become true:

1. **DNS + Resend:** sealedapp.io is verified in Resend with valid SPF, DKIM, and DMARC records (`dig` confirms; Resend dashboard reports verified). Secrets `RESEND_API_KEY` and `SEALED_FROM_ADDRESS` are stored via `supabase secrets set` (never in a committed file or `VITE_*` var).
2. **Template 1A (Path A — waitlist confirmation):** Built as a React Email component in the main SEALED-org repo, rendered + sent. Wired into the existing `join-waitlist` Path A success path (and the `unverified` resend path) at the `TODO(Phase 3)` stubs Phase 2 left. No verification link in the body. Arrives within 60s, passing SPF/DKIM/DMARC.
3. **Template 1B (Path B — verify-to-seal):** Built fully + magic-link generation with a 7-day TTL mechanism + **test-delivered** to a real inbox to prove deliverability and mail-tester ≥ 9/10. The production "letter written → 1B" trigger stays Phase 4.

Both templates score ≥ 9/10 on mail-tester.com with no blacklist or auth failures.

In scope:
- DNS records (SPF/DKIM/DMARC) for **root** `sealedapp.io`, added at the existing registrar (NOT Cloudflare) — see D-07
- Resend domain verification for root `sealedapp.io`
- Two React Email templates in the main repo (`notify/emails/` pattern): `WaitlistConfirmationEmail` (1A) and `SealLetterEmail` (1B)
- Wiring the **1A** send into `join-waitlist/index.ts` at the two marked TODO stubs (new-user success + `unverified` resend)
- Magic-link generation + 7-day TTL mechanism for 1B (mechanism chosen by research — see D-09)
- A one-off **test trigger** to prove 1B deliverability (not the production letter→1B wiring)
- Secrets handoff: `RESEND_API_KEY`, `SEALED_FROM_ADDRESS` set via `supabase secrets set` in the main repo
- mail-tester runs on both templates

Out of scope (other phases handle):
- Production "letter written → send 1B" wiring → Phase 4 (the function accepting a letter body + persisting it)
- `verify-email` Edge Function, clicking the link → seal letter → set `sealed_at`/`deliver_at` → success UI → Phase 4 (EMAIL-B2, EMAIL-B3)
- Letter body persistence / sealed state machine → Phase 4
- Marketing/announcement emails and the `news.sealedapp.io` subdomain → deferred until marketing exists (D-08)
- Cloudflare Turnstile privacy addendum in privacy.html → Phase 5 (todo `260529-privacy-turnstile-addendum`)
- Vercel deploy + sealedapp.io custom-domain hookup for the landing page → Phase 5
- Resend bounce/complaint webhook → v2 (deferred)

</domain>

<decisions>
## Implementation Decisions

### Email Visual Design

- **D-01:** Templates 1A and 1B **match the existing delivery email** (`notify/emails/DeliveryLetterEmail.tsx`): cream paper background (`#faf6ef`), Georgia / websafe serif, muted ink text (`#3a342e` body, `#7a716a` secondary), generous whitespace, letter-like composition. Rationale: the user's first email and their 2027 delivery email feel like the same hand — one coherent SEALED letter aesthetic across the whole lifecycle. Also deliverability-proven (websafe serif, no web fonts — inboxes strip Instrument Serif / Plus Jakarta Sans).

- **D-02:** Each confirmation email carries a **light text wordmark header** — "SEALED" set letter-spaced and muted at the top, then the message. Enough to signal the sender at a glance without feeling like a marketing email. NO image-based logo and NO wax-seal emblem image — images frequently load broken/blocked in inboxes (Outlook/Gmail clipping), hurting both first impression and mail-tester score. (The delivery email stays bare by contrast; that one *is* the letter.)

### Email Copy & Voice

- **D-03:** **Voice = warm but minimal. No fluff, no poetry, no em-dashes.** This applies to ALL shipped content/copy, not just emails (user standing preference). Tightest version first; one idea per line; warmth through plainness, not flourish.

- **D-04:** Working copy locked (refinable at build, but this is the approved direction):

  **Template 1A — waitlist confirmation (no action):**
  ```
  Subject: You're on the list.

    S E A L E D
   ──────────

  You're on the waitlist.

  Nothing to do now. We'll email you
  when SEALED opens in 2027.

  — SEALED
  ```

  **Template 1B — verify-to-seal (magic link):**
  ```
  Subject: Seal your letter.

    S E A L E D
   ──────────

  Your letter is ready. Verify your
  email to seal it.

    [ Verify and seal ]

  This link works for 7 days.

  — SEALED
  ```

  The `unverified` re-signup path in `join-waitlist` reuses **Template 1A** (resend confirmation).

### From-Address & Sending Domain

- **D-05:** Send all transactional mail from **`SEALED <letters@sealedapp.io>`** — the exact address the existing `notify` delivery function already defaults to. One consistent sender across confirmation (now) and letter delivery (2027); zero change to the existing function's from-address. This becomes the `SEALED_FROM_ADDRESS` secret value.

- **D-06:** Verify the **root domain `sealedapp.io`** in Resend (not a sending subdomain) for Phase 3. Rationale: transactional mail is naturally low-complaint, so the root's sender reputation stays clean on its own; root gives the cleanest from-line and matches the existing function. (Considered and rejected for now: a `send.` subdomain — marginal isolation benefit on low-complaint transactional mail, and it would force `letters@send.sealedapp.io` + a change to the delivery function.)

- **D-07:** **DMARC `p=reject; sp=reject`** at `_dmarc.sealedapp.io`. Strongest anti-spoofing posture; safe because Resend is the only sender (no risk of blocking legitimate mail). `sp=reject` means the future `news.` marketing subdomain inherits protection automatically. DNS records (SPF/DKIM/DMARC) are added at the **existing registrar** for sealedapp.io — NOT inside Cloudflare (Cloudflare's only role in this project was the one-time Turnstile widget, per Phase 2). **DNS propagation is on the critical path** (can take hours and blocks all real email tests) — initiate the DNS changes as the very first task.

### Email Architecture (two-stream model)

- **D-08:** Long-term mail architecture splits **transactional vs marketing** onto separate domains to protect sender reputation (a spam-flagged marketing blast must never be able to drag down the reputation that the 2027 letter delivery depends on). Subdomains are **free** (Resend bills on volume, not domain count; free tier 3,000/mo, 100/day), so this is a reputation decision, not a cost one.
  - **Now (Phase 3):** transactional only, on root `sealedapp.io` (confirmations + 2027 delivery).
  - **Later (only when marketing exists):** verify `news.sealedapp.io` (free) for announcements/blasts. Not built in Phase 3.

### Path B Scope in Phase 3

- **D-09:** Phase 3 **builds Template 1B fully + the magic-link generation (7-day TTL mechanism) + test-delivers it** via a one-off trigger to prove deliverability and hit mail-tester ≥ 9/10. The production "letter written → 1B" wiring stays Phase 4. This satisfies the roadmap's Phase 3 success criteria (both templates deliverable, mail-tester on both) without pulling Phase 4 work forward.

### Claude's Discretion

- **7-day magic-link TTL mechanism (D-09) — RESEARCH FLAG.** Supabase Auth's built-in email link / OTP expiry defaults to 1 hour and historically caps well below 7 days. Researcher MUST verify whether a 7-day TTL is achievable via Supabase Auth config. **If not, the fallback is a custom verification token** (a small token table + our own 7-day expiry) which Phase 4's `verify-email` function would read anyway. Planner picks the mechanism; this directly affects how `generateLink` vs a custom token is used in both 1B and Phase 4.
- **Template file names / component names** — suggested `WaitlistConfirmationEmail.tsx` (1A) and `SealLetterEmail.tsx` (1B) in `notify/emails/` or a sibling folder; planner's call on exact naming/location to match the main repo's layout.
- **Subject-line and body wording** — D-04 is the approved direction and working copy; minor word-level refinement is allowed at build provided it honors D-03 (minimal, no fluff, no em-dashes).
- **Idempotency-key strategy** for the 1A/1B Resend sends — reuse the existing `sendResendEmail` `idempotencyKey` pattern; planner picks the key derivation (e.g., per user-id + template).
- **Test-trigger form for 1B (D-09)** — a temporary script, a guarded debug endpoint, or a manual `generateLink` + `sendResendEmail` invocation; planner picks the least-intrusive way to prove deliverability.
- **HALT/handoff split** — this phase writes server-side code in the main repo, so it follows the established HALT-after-handoff pattern (Phase 1 D-05 / Phase 2 D-02): executor writes templates + send wiring + migration (if a custom token table is needed), then HALTs for Nour to deploy, set secrets, and add DNS. Planner structures the waves.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Two-repo system, security model, email template inventory, key decisions, counter seed (115)
- `.planning/REQUIREMENTS.md` — Phase 3 owns **EMAIL-A2, EMAIL-B1, EMAIL-03, EMAIL-04, DEPLOY-04**; also relevant: DB-03 (the 1A/1B send is the "send appropriate template" half of this requirement; the letter-body half is Phase 4)
- `.planning/ROADMAP.md` §"Phase 3: Email Infrastructure" — Goal + 5 success criteria (DNS verified, 1A arrives <60s, 1B with 7-day link, mail-tester ≥9/10 both, secrets via `supabase secrets set`)
- `.planning/STATE.md` §"Blockers/Concerns" — **DNS propagation is on the critical path**; service-role bundle-leak risk; open questions (timezone for `deliver_at`, letter length cap) — mostly Phase 4 but note them

### Phase 2 Carry-Forward (DO NOT re-derive)
- `.planning/phases/02-signup-flow/02-CONTEXT.md` — D-01 (main repo is source of truth for server-side code), D-02 (HALT-after-handoff wave structure), D-11 (Phase 4 extends `join-waitlist` to accept a letter body), the 4-state re-signup model
- `.planning/phases/01-foundation/01-CONTEXT.md` — main-repo-owns-migrations (D-03/D-04), HALT pattern (D-05)

### Main SEALED-org repo (source of truth for ALL server-side email code)
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/resend.ts` — `sendResendEmail({ from, to, subject, html, idempotencyKey, apiKey, outboxId?, letterId? })`. API key is **injected**, not read from `Deno.env` inside the wrapper. Privacy-safe logging (status + ids only). REUSE this — do not re-implement.
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/emails/DeliveryLetterEmail.tsx` — **The template pattern to copy.** React Email (`@react-email/components`), cream `#faf6ef` + Georgia, `<Text>` auto-escapes (never `dangerouslySetInnerHTML`). 1A/1B match this aesthetic (D-01).
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/index.ts` — How templates are rendered + sent: `renderAsync(React.createElement(Template, props))` → `sendResendEmail`. Defaults `SEALED_FROM_ADDRESS` to `SEALED <letters@sealedapp.io>` and requires `RESEND_API_KEY`.
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/deno.json` — Import map: `react@18.3.1`, `@react-email/components@0.0.22`, `jsx: react-jsx`. New email folders need the same manifest shape.
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/notify-core.ts` — Env DI shape (`RESEND_API_KEY`, `SEALED_FROM_ADDRESS`), from-address wiring at the send call site
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/join-waitlist/index.ts` — **The 1A wiring sites.** `TODO(Phase 3)` at the new-user success path (~line 199: generateLink magiclink → render 1A → sendResendEmail) and the `unverified` resend path (~line 162). Add the send WITHOUT changing the existing structured `{ state }` responses.
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` — Destination for a verification-token migration **if** the 7-day-TTL research (D-09) requires a custom token table

### External Service Setup (Nour does these in the HALT handoff)
- Resend dashboard — add domain `sealedapp.io`, copy the SPF/DKIM/DMARC records Resend generates
- sealedapp.io registrar DNS panel — add SPF, DKIM, DMARC (`p=reject; sp=reject`) records; this is the critical-path, propagation-takes-hours step
- `https://supabase.com/docs` — Auth email/OTP link expiry config (for the 7-day TTL research, D-09)
- `https://resend.com/docs` — domain verification + DNS record reference

### Codebase Maps
- `.planning/codebase/STACK.md`, `.planning/codebase/CONVENTIONS.md` — naming/import/style rules new files follow
- `.planning/research/SUMMARY.md` — validated the `admin.createUser` + `generateLink` + Resend approach; Resend-DNS pitfall called out explicitly

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`_shared/resend.ts` (`sendResendEmail`)** — the send primitive; reuse as-is. API key injected via arg, privacy-safe logging baked in.
- **`notify/emails/DeliveryLetterEmail.tsx`** — the React Email template to clone for 1A/1B aesthetic + structure (Html/Head/Preview/Body/Container/Section/Text/Link, inline styles).
- **`notify/index.ts` render+send flow** — `renderAsync(React.createElement(...))` → `sendResendEmail(...)`. 1A/1B follow the same render path.
- **`join-waitlist/index.ts` TODO stubs** — exact insertion points for the 1A send already marked by Phase 2 (new-user success + `unverified` resend).
- **`generateLink` (Supabase admin)** — referenced in the Phase 2 stub comments and research SUMMARY as the magic-link source for verification.

### Established Patterns
- **React Email + `renderAsync`** for all HTML email (main repo).
- **Env DI for secrets** — functions read `RESEND_API_KEY` / `SEALED_FROM_ADDRESS` from `Deno.env` at the entry point and inject into helpers; the helper never reads env directly.
- **Privacy-safe email logging** — log only status + outbox/letter ids; never recipient, subject, body, or API key.
- **HALT-after-handoff** — server-side code written in main repo, then Nour deploys + sets secrets + adds DNS (Phase 1 D-05 / Phase 2 D-02).
- **Structured `{ state }` responses unchanged** — adding the 1A send must not alter `join-waitlist`'s existing response contract that the landing client depends on.

### Integration Points
- The 1A send slots into `join-waitlist/index.ts` (main repo) at two TODO stubs — no landing-repo code changes for 1A.
- 1B's production trigger is a Phase 4 integration point (function accepts letter body → sends 1B); Phase 3 only test-triggers it.
- DNS records integrate at the registrar; Resend domain verification gates the first real send.
- If a custom verification-token table is needed (D-09 fallback), it becomes a Phase 3 migration in the main repo that Phase 4's `verify-email` reads.

</code_context>

<specifics>
## Specific Ideas

- **One coherent SEALED hand.** The deliberate choice (D-01/D-05) is that the confirmation email and the 2027 delivery email look and sound like they came from the same sender — same paper, same serif, same `letters@sealedapp.io`. The wordmark header (D-02) is the only visual addition for the confirmation moment.
- **Minimal voice is a hard rule (D-03).** When refining copy at build, default to cutting words. No em-dashes, no metaphor, no "literary" stacking.
- **DNS first.** Because propagation can take hours and blocks every real deliverability test, the DNS/Resend verification task should be the first thing Nour does in the handoff — ideally kicked off before the templates are even finished.
- **Prove it with mail-tester.** Both templates must be sent through a real mail-tester.com inbox and score ≥ 9/10. This is the acceptance proof, not just "it rendered."

</specifics>

<deferred>
## Deferred Ideas

- **`news.sealedapp.io` marketing subdomain** — free, but only stood up when there's actual marketing/announcement mail to send. Keeps the reputation-risky stream off the transactional root (D-08). Likely Phase 5+ or v2.
- **Resend bounce/complaint webhook → auto-unsubscribe / IP-flag** — already a v2 deferred item; would extend `signup_attempts.outcome` with a `bounced` state.
- **Production "letter written → 1B" wiring** — Phase 4 (extends `join-waitlist` to accept a letter body per Phase 2 D-11).
- **Richer email imagery (wax-seal emblem, etc.)** — deferred; image-blocking in inboxes makes it risky for critical confirmation mail (D-02).

### Reviewed Todos (not folded)
- **`260529-privacy-turnstile-addendum`** — Reference Cloudflare's Turnstile Privacy Addendum in privacy.html. Matched on weak keywords but is explicitly tagged `resolves_phase: 5` (`priority: required-before-launch`). Belongs in Phase 5 (Deploy & Polish), bundled with the privacy.html / copy pass. Not folded into Phase 3.

</deferred>

---

*Phase: 03-email-infrastructure*
*Context gathered: 2026-06-03*
