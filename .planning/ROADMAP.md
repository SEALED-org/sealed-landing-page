# Roadmap: SEALED Landing Page

**Mode:** MVP — each phase delivers a working vertical slice that can be demoed and tested end-to-end.
**Granularity:** coarse (6 phases)
**Hard deadline:** Letter delivery on January 1st, 2027 (delivery cron already runs in main app; landing page only needs to insert correctly-shaped rows).

## Overview

The SEALED landing page is a brownfield React 19 + Vite 6 + Tailwind v4 project whose build is currently broken (Firebase import points to a missing file). The journey moves from a non-building codebase to a deployed, hardened, deliverable waitlist page on sealedapp.io. Phase 1 fixes the build by ripping out Firebase and dropping in Supabase. Phase 2 wires the signup form to a working `join-waitlist` Edge Function that creates real auth users behind Turnstile + IP rate limiting. Phase 3 sets up DNS and Resend so both Path A (waitlist-only) and Path B (waitlist + letter) confirmation emails actually arrive. Phase 4 closes the letter loop: writers receive a verification link that flips their letter to `sealed` and inserts the rows the existing delivery cron is already watching. Phase 5 ships it — GitHub repo, Vercel deploy, sealedapp.io domain, social links, copy polish, accessibility. Phase 6 is the pre-launch QA pass that protects the brand on day one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - Firebase out, Supabase in, build green, counter live
- [x] **Phase 1.5: UI Redesign (INSERTED)** - Rebuild landing UI to match `Landing.html` Claude Design prototype (hero, counter, FirstLetter, Research, FAQ, Footer)
- [x] **Phase 2: Signup Flow** - `join-waitlist` Edge Function end-to-end with Turnstile + rate limit + Path A confirmation
- [x] **Phase 3: Email Infrastructure** - DNS verified, Resend connected, Templates 1A and 1B deliverable
- [ ] **Phase 4: Letter + Verify Flow** - Letter writing wired to Supabase, `verify-email` Edge Function seals letters, Path B complete
- [ ] **Phase 5: Deploy & Polish** - GitHub push, Vercel, sealedapp.io, social links, copy, accessibility
- [ ] **Phase 6: Pre-launch QA** - Smoke test, mail-tester, mobile QA, stakeholder sign-off

## Phase Details

### Phase 1: Foundation
**Goal**: The repository builds cleanly with Supabase wired in place of Firebase, and the live waitlist counter reads from the database on every page load.
**Depends on**: Nothing (first phase)
**Requirements**: DB-05, DB-01, DB-02, COUNTER-01, COUNTER-02, COUNTER-03, COUNTER-04
**Success Criteria** (what must be TRUE):
  1. `npm run build` completes with zero errors and no Firebase imports remain anywhere in `src/`.
  2. Visiting the landing page in dev mode renders the hero without runtime errors, and the counter shows a real number (115 on a fresh DB) sourced from the `public.signup_counter` view via the anon client.
  3. `app_private.waitlist_signups` table and `public.signup_counter` view exist in the shared Supabase project, with the view granted to the `anon` role.
  4. The "pulse" indicator next to the counter still animates and the page reads identically to its pre-Firebase appearance.
**Plans**: 4 plans
  - [x] 01-01-PLAN.md — Supabase client + env contract (Wave 1)
  - [x] 01-02-PLAN.md — Counter component (Wave 1)
  - [x] 01-03-PLAN.md — SQL migration in sibling repo + handoff prompt + HALT (Wave 1)
  - [x] 01-04-PLAN.md — App.tsx surgery + end-to-end verification (Wave 2)

### Phase 1.5: UI Redesign (INSERTED)
**Goal**: The live landing page renders pixel-faithful to the `Landing.html` Claude Design prototype — hero wordmark, italic-emphasis headline, ink-separator, pill form with mono CTA, 5-digit flip-card counter, animated success card, 3-column How-it-Works step cards, peer-reviewed Research section, restyled FirstLetter (multi-step write→seal with typewriter and paper pad), restyled FAQ, restyled footer — without breaking the Phase 1 Supabase data layer.
**Depends on**: Phase 1
**Inserted because**: The React `src/App.tsx` handed over to GSD was an older scaffold byte-identical to the bundle's `project/src/App.tsx`, not the iterated `Landing.html` prototype. The bundle's own README mandates recreating the HTML prototype pixel-perfectly in React. Wiring Phase 2's signup form into the current (old) UI would force a re-wire after the redesign — inserting the redesign here avoids that waste.
**Requirements**:
  - UI-01: Hero matches `Landing.html` — wordmark size/font, italic-emphasis headline, ink separator PNG, pill form, mono CTA, hand-drawn tagline
  - UI-02: Counter rendered as 5-digit flip-card pattern with `Sign ups so far` label; preserves Phase 1's `getSignupCount()` data path and `?? 115` fallback
  - UI-03: Submit success state is the animated white card with checkmark stamp + "Write your first letter now" CTA (replaces the black pill)
  - UI-04: How-it-Works section is 3 step-cards with screenshot PNGs (step-write/seal/open) — 2-column quote layout retired
  - UI-05: New Research section — peer-reviewed rubber-stamp SVG, two studies (+22% / +42%), Schippers + Matthews citations
  - UI-06: FirstLetter component rewritten to multi-step write→seal flow with typewriter placeholder and paper-pad texture
  - UI-07: FAQ restyled to prototype's spec
  - UI-08: Footer restyled to prototype's spec
  - UI-09: Asset pipeline — `assets/separator-ink.png`, `assets/step-write.png`, `assets/step-seal.png`, `assets/step-open.png` (Nour to provide OR placeholder treatment until provided)
  - UI-10: Phase 1's data wiring preserved — `getSignupCount()`, `joinWaitlistLocal()`, `setWaitlistCount` increment, `.catch` fallback to 115 all carry over unchanged
**Success Criteria** (what must be TRUE):
  1. The dev server renders the landing page with side-by-side parity against `Landing.html` opened in a browser — wordmark, headline, separator, form, counter, success state, How-it-Works, Research, FirstLetter, FAQ, Footer all match the prototype's visual treatment.
  2. The counter still fetches from `public.signup_counter` on mount, animates from `000` to the real number, falls back to `115` on fetch failure, and increments locally by +1 on successful submit (Phase 1's data path is intact).
  3. `npm run build` exits 0 with no new console errors or runtime warnings introduced.
  4. Email form submit still calls `joinWaitlistLocal()` (await shape preserved) so Phase 2 can drop in the real Edge Function call without UI rework.
  5. All four required PNG assets are present in the bundle (or replaced with documented placeholder treatments tracked as TODOs for Phase 5).
**Plans**: 9 plans
  - [x] 01.5-01-PLAN.md — Asset pipeline + reference snapshot + index.html title (Wave 1)
  - [x] 01.5-02-PLAN.md — Tailwind v4 @theme tokens + 10 @keyframes + global CSS rules in src/index.css (Wave 1)
  - [x] 01.5-03-PLAN.md — Nav.tsx + Footer.tsx (Wave 2)
  - [x] 01.5-04-PLAN.md — WaitlistForm.tsx + WaitlistSuccessCard.tsx (Wave 2)
  - [x] 01.5-05-PLAN.md — Counter.tsx rewrite as 5-digit flip-card (Wave 2)
  - [x] 01.5-06-PLAN.md — HowItWorks.tsx + ResearchSection.tsx (Wave 2)
  - [x] 01.5-07-PLAN.md — Typewriter.tsx trim + FirstLetter.tsx 3-step state machine (Wave 2)
  - [x] 01.5-08-PLAN.md — FAQ.tsx restyle + 8 verbatim Q&A (Wave 2)
  - [x] 01.5-09-PLAN.md — App.tsx JSX rewrite + ShareButtons.tsx delete + npm run build + side-by-side parity check (Wave 3, autonomous: false)
**UI hint**: yes

### Phase 2: Signup Flow
**Goal**: A real visitor can enter their email, pass an invisible Turnstile check, hit the IP rate limit if they retry, and see the counter increment immediately — with Path A (no letter) emitting the simple Template 1A confirmation handoff to Phase 3.
**Depends on**: Phase 1
**Requirements**: SIGNUP-01, SIGNUP-02, SIGNUP-03, SIGNUP-04, SIGNUP-05, SEC-01, SEC-02, SEC-03, SEC-04, DB-03, DB-06, DB-07, EMAIL-A1
**Success Criteria** (what must be TRUE):
  1. Submitting a real email from the hero form creates a row in `app_private.waitlist_signups` and a corresponding `auth.users` record (email_confirm=false), and the counter on the page increments by 1.
  2. A second submission from the same IP within 24 hours returns a 429 with an inline error message visible in the UI; no DB rows are written.
  3. Submitting with Turnstile disabled or tampered fails server-side and writes no DB rows; the `VITE_*` env contains only the anon key and Turnstile site key — no service role key in the client bundle.
  4. Re-signing up with the same email gracefully returns one of the four states (new / unverified / verified-no-letter / verified-with-letter) and shows the correct inline message.
  5. The form shows a visible loading state during submit and an inline error message on failure (no silent console errors).
**Plans**: 5 plans
  - [x] 02-01-PLAN.md — .env.local fix + REQUIREMENTS.md SEC-02 amendment + @marsidev/react-turnstile@1.5.2 install (Wave 1)
  - [x] 02-02-PLAN.md — Migration 0032_signup_attempts.sql in sibling repo (Wave 1)
  - [x] 02-03-PLAN.md — join-waitlist Edge Function (deno.json + index.ts) in sibling repo (Wave 1)
  - [x] 02-04-PLAN.md — HANDOFF-PROMPT.md + HALT until Nour deploys migration + function + Turnstile secret (Wave 1, autonomous: false)
  - [ ] 02-05-PLAN.md — Client wiring (supabase.ts + messages.ts + WaitlistForm + FirstLetter + App.tsx) + end-to-end verification (Wave 2, autonomous: false)
**UI hint**: yes

### Phase 3: Email Infrastructure
**Goal**: Outbound mail from sealedapp.io passes SPF/DKIM/DMARC and both Path A (Template 1A — waitlist confirmation, no verification) and Path B (Template 1B — verify-to-seal) actually arrive in real inboxes, branded and readable.
**Depends on**: Phase 2
**Requirements**: EMAIL-03, EMAIL-A2, EMAIL-B1, EMAIL-04, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. `dig` against sealedapp.io shows valid SPF, DKIM, and DMARC records, and Resend's dashboard reports the domain as verified.
  2. A Path A signup (no letter written) receives Template 1A in their inbox within 60 seconds, with a passing SPF/DKIM/DMARC header trio and no verification link in the body.
  3. A Path B signup (letter written) receives Template 1B with a working magic verification link whose TTL is set to 7 days.
  4. A mail-tester.com run on both templates scores 9/10 or higher with no blacklist or auth failures.
  5. `RESEND_API_KEY` and `SEALED_FROM_ADDRESS` are stored via `supabase secrets set` and not present in any committed file or `VITE_*` variable.
**Plans**: 5 plans
  - [x] 03-01-PLAN.md — Migration 0034: app_private.verification_tokens + SECURITY DEFINER wrappers (Wave 1)
  - [x] 03-02-PLAN.md — WaitlistConfirmationEmail.tsx + SealLetterEmail.tsx + join-waitlist/deno.json extension (Wave 1)
  - [x] 03-03-PLAN.md — join-waitlist/index.ts: 1A wiring at both TODO stubs + guarded 1B test trigger (Wave 2)
  - [x] 03-04-PLAN.md — HALT handoff: DNS records, supabase db push, secrets set, function deploy (Wave 3, autonomous: false)
  - [x] 03-05-PLAN.md — Post-deploy verification: dig, real inbox, 1A mail-tester 9/10 (1B mail-tester deferred to Phase 6) (Wave 4, autonomous: false)

### Phase 4: Letter + Verify Flow
**Goal**: A letter writer composes their letter inline, submits, sees the 2.5s sealing animation, receives Template 1B, clicks the verification link, and watches their letter transition to `sealed` in Supabase — landing in the `schedules` row the existing delivery cron is already watching — the cron creates `notification_outbox` rows itself at delivery time (RESEARCH F1) for Jan 1, 2027.
**Depends on**: Phase 3
**Requirements**: LETTER-01, LETTER-02, LETTER-03, LETTER-04, LETTER-05, LETTER-06, LETTER-07, SEC-05, EMAIL-B2, EMAIL-B3, DB-04, EMAIL-01
**Success Criteria** (what must be TRUE):
  1. Writing and submitting a letter inserts a row in `app_private.letters` with `is_canary=false` and no `sealed_at`/`deliver_at` set (draft state).
  2. The letter UI shows a live word count while typing and cycles typewriter placeholder prompts when empty.
  3. A letter writer who clicks the Template 1B verification link sees their letter's status flip to `sealed` in `app_private.letters` (`sealed_at=now()`, `deliver_at='2027-01-01T13:00:00Z'` or the agreed timezone), with a matching row inserted into `app_private.schedules` (the dispatch cron creates `notification_outbox` rows at delivery time — RESEARCH F1).
  4. After verification, the user sees an in-page success state — no Template 2 is sent — and the existing dispatch/notify cron picks up the outbox row on its next run.
  5. Unverified letters never appear in `app_private.schedules` (confirmed by query); skipping the letter entirely takes Path A with no verification link in the confirmation email.
**Plans**: 6 plans
Plans:
- [x] 04-01-PLAN.md — Migration 0035: body CHECK + upsert_pending_letter + seal_letter_with_token RPCs (Wave 1)
- [ ] 04-02-PLAN.md — verify.html standalone page + Vite multi-page input (Wave 1)
- [ ] 04-03-PLAN.md — join-waitlist: letter param + Path B branch + remove test trigger (Wave 2)
- [ ] 04-04-PLAN.md — verify-email Edge Function + config.toml registration (Wave 2)
- [ ] 04-05-PLAN.md — Client wiring: supabase.ts + App.tsx + FirstLetter.tsx letter threading (Wave 3)
- [ ] 04-06-PLAN.md — HALT: supabase db push + functions deploy + smoke tests (Wave 4, autonomous: false)
**UI hint**: yes

### Phase 5: Deploy & Polish
**Goal**: sealedapp.io serves the production landing page from Vercel with all env vars set, social links pointing to real handles, copy proofed, paper texture self-hosted, and accessibility basics in place.
**Depends on**: Phase 4
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-05, SOCIAL-01, SOCIAL-02, SOCIAL-03, CONTENT-01, CONTENT-02, CONTENT-03, CONTENT-04, CONTENT-05, CONTENT-06
**Success Criteria** (what must be TRUE):
  1. `https://sealedapp.io` loads the landing page over HTTPS from Vercel, served from a repo under the SEALED-org GitHub organization.
  2. Instagram and X (Twitter) footer links open the real SEALED handles, the Twitter share button pre-populates with a sealedapp.io-referencing message, and "Copy link" writes the landing page URL to the clipboard.
  3. All copy on the page (headline, tagline, CTA, FAQ, email subjects) matches the final proofed version with the Dr. Gail Matthews citation verified.
  4. The paper texture loads from a sealedapp.io / Vercel-hosted asset (no `i.postimg.cc` references).
  5. Every form input has an associated `<label>`, focus rings are visible on all interactive elements via keyboard tab, and error states display inline messages (not just `console.error`).
**Plans**: TBD
**UI hint**: yes

### Phase 6: Pre-launch QA
**Goal**: Independent end-to-end verification on production — a real signup creates real rows, real emails arrive, the verification link seals a real letter, and the page looks right on a real phone — signed off by the stakeholder before announcement.
**Depends on**: Phase 5
**Requirements**: CONTENT-01, CONTENT-02, CONTENT-04, CONTENT-05, CONTENT-06
**Success Criteria** (what must be TRUE):
  1. A Path A smoke-test signup on sealedapp.io (no letter) produces: a new `auth.users` row, a new `app_private.waitlist_signups` row, a delivered Template 1A in a real inbox, and an incremented on-page counter — all observed within 60 seconds.
  2. A Path B smoke-test signup with a letter produces all of the above plus Template 1B, and clicking the verification link flips the letter to `sealed` with matching `schedules` + `notification_outbox` rows.
  3. Mail-tester.com (or equivalent) returns 9/10 or higher on the live production send, and the verification link still works after 24+ hours (TTL respected).
  4. The landing page renders correctly on iOS Safari and Android Chrome on a real device (no layout breaks, animations smooth, form usable with on-screen keyboard).
  5. Stakeholder has signed off in writing that copy, design, and end-to-end flow are launch-ready.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.5 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | ✅ Complete | 2026-05-28 |
| 1.5. UI Redesign (INSERTED) | 9/9 | ✅ Complete | 2026-05-28 |
| 2. Signup Flow | 5/5 | ✅ Complete | 2026-06-03 |
| 3. Email Infrastructure | 5/5 | ✅ Complete | 2026-06-05 |
| 4. Letter + Verify Flow | 0/6 | Planned (ready to execute) | - |
| 5. Deploy & Polish | 0/TBD | Not started | - |
| 6. Pre-launch QA | 0/TBD | Not started | - |
