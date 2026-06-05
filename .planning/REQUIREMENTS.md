# SEALED Landing Page — v1 Requirements

## v1 Requirements

### Signup & Email Capture

- [ ] **SIGNUP-01**: User can enter their email and join the waitlist from the hero section
- [ ] **SIGNUP-02**: Form shows a visible loading state during submission (prevents double-submit)
- [ ] **SIGNUP-03**: User sees a confirmation chip ("You're #N on the list") after successful submission
- [ ] **SIGNUP-04**: Form shows inline error message if submission fails (e.g. rate-limited, server error)
- [ ] **SIGNUP-05**: HTML5 email validation prevents obviously malformed addresses from submitting

### Security & Spam Defense

- [ ] **SEC-01**: Cloudflare Turnstile (invisible CAPTCHA) validates every form submission before any DB writes — users never see or interact with it
- [ ] **SEC-02**: Server-side IP rate limit of 3 signup attempts per rolling 24h per IP enforced in the Edge Function *(Amended Phase 2 per 02-CONTEXT.md D-05 — rationale: NAT/shared-IP false positives; Turnstile remains the primary bot defense.)*
- [ ] **SEC-03**: Signup endpoint only creates DB records if Turnstile verification passes
- [ ] **SEC-04**: Supabase service role key is never exposed to the client (Edge Function only)
- [ ] **SEC-05**: Email verification gate — letters are only scheduled for delivery after the user clicks the verification link (prevents letter-bombing arbitrary emails). Waitlist-only signups do NOT require verification.

### Email Flow

The two paths are distinct — no cross-contamination:

**Path A — Waitlist only (user signs up, skips the letter):**
- [ ] **EMAIL-A1**: User is added to waitlist immediately on submission
- [x] **EMAIL-A2**: Template 1A sent: simple waitlist confirmation ("You're on the SEALED waitlist") — no verification link, no further action required

**Path B — Waitlist + letter (user signs up and writes a letter):**
- [x] **EMAIL-B1**: Template 1B sent: "Your letter is waiting — verify your email to seal it" with verification link
- [ ] **EMAIL-B2**: User clicks verification link → letter is sealed (`sealed_at` + `deliver_at` set) → success shown in the UI. **No further email sent after verification.**
- [ ] **EMAIL-B3**: Email verification is required before the letter is scheduled for delivery (anti-spam gate)

**Shared email requirements:**
- [ ] **EMAIL-01**: Template 3 (letter delivery on Jan 1, 2027) is already built in the main app (`notify/emails/DeliveryLetterEmail.tsx`) — handled by existing dispatch/notify cron; no new code needed
- [ ] **EMAIL-02**: Template 4 — app launch invitation — deferred until launch date is set; schema supports it
- [ ] **EMAIL-03**: All outbound email sent from a verified Resend domain with SPF/DKIM/DMARC on sealedapp.io
- [x] **EMAIL-04**: Magic link TTL set to 7 days (Supabase Auth default of 1 hour is too short for a "seal your letter" gesture)

### Letter Writing

- [ ] **LETTER-01**: User can write a letter to their future self in the inline textarea (available after email submission)
- [ ] **LETTER-02**: User can choose to skip writing a letter entirely
- [ ] **LETTER-03**: Letter shows live word count
- [ ] **LETTER-04**: Letter shows typewriter-cycling placeholder prompts to reduce blank-page paralysis
- [ ] **LETTER-05**: Submitting the letter triggers the 2.5s sealing animation, then shows the sealed confirmation state
- [ ] **LETTER-06**: Letter body stored in `app_private.letters` with `is_canary=false`; draft state (no `sealed_at`/`deliver_at`) until email verified
- [ ] **LETTER-07**: On email verification, letter transitions to sealed (`sealed_at=now()`, `deliver_at='2027-01-01T...'`); row inserted into `app_private.schedules`; the dispatch cron (`claim_due_letters`) creates `notification_outbox` rows at delivery time (RESEARCH F1) — existing delivery cron handles Jan 1 send automatically

### Waitlist Counter

- [ ] **COUNTER-01**: Counter starts at 115 and increments by 1 on every successful signup — 115, 116, 117, and so on. Does not wait for email verification.
- [ ] **COUNTER-02**: Counter is computed as a Postgres view (`select 115 + count(*) from waitlist_signups`) with no status filter
- [ ] **COUNTER-03**: Counter is readable by the anon Supabase client (view granted to `anon` role)
- [ ] **COUNTER-04**: Live "pulse" indicator next to the counter remains

### Supabase Integration

- [ ] **DB-01**: `app_private.waitlist_signups` table created (user_id PK, status: active|unsubscribed, has_letter boolean, created_at) — simpler than before since verification state is tracked on `app_private.letters` separately
- [ ] **DB-02**: `public.signup_counter` view created and granted to anon role
- [ ] **DB-03**: `join-waitlist` Edge Function handles: Turnstile verify → IP rate limit → admin.createUser → DB inserts → send appropriate Template 1A or 1B based on whether a letter was written
- [ ] **DB-04**: `verify-email` Edge Function handles: seal letter → insert an `app_private.schedules` row; the dispatch cron creates `notification_outbox` rows at delivery time (RESEARCH F1). No email sent back to user.
- [ ] **DB-05**: Firebase imports completely removed from the codebase; `@supabase/supabase-js@2.103.2` installed
- [ ] **DB-06**: Edge Functions follow main app's `_shared/` patterns (admin-client, resend, auth guard)
- [ ] **DB-07**: Re-signup with the same email handled gracefully: if no letter → confirm already on list; if letter already sealed → confirm already sealed; if pending verification → resend verification link

### Social & Sharing

- [ ] **SOCIAL-01**: Instagram and X (Twitter) links in the footer point to real SEALED handles
- [ ] **SOCIAL-02**: Twitter/X share button pre-populates with a message referencing sealedapp.io
- [ ] **SOCIAL-03**: "Copy link" button copies the landing page URL to clipboard

### Deployment & Infrastructure

- [ ] **DEPLOY-01**: Codebase pushed to a new GitHub repo under the SEALED-org organization
- [ ] **DEPLOY-02**: Landing page deployed to Vercel
- [ ] **DEPLOY-03**: sealedapp.io custom domain connected to Vercel deployment
- [ ] **DEPLOY-04**: SPF/DKIM/DMARC DNS records configured for sealedapp.io in Resend before first production email send
- [ ] **DEPLOY-05**: All `VITE_*` env vars set in Vercel; all secrets set via `supabase secrets set`

### Content & Quality

- [ ] **CONTENT-01**: All page copy proofed and finalized (headlines, taglines, CTA text, FAQ answers, email subject lines)
- [ ] **CONTENT-02**: Dr. Gail Matthews citation verified for accuracy before launch
- [ ] **CONTENT-03**: Paper texture image hosted on sealedapp.io CDN or Vercel (not external `i.postimg.cc`)
- [ ] **CONTENT-04**: Form inputs have proper `<label>` associations (accessibility)
- [ ] **CONTENT-05**: Focus rings visible on all interactive elements
- [ ] **CONTENT-06**: Error states have visible inline messages (not just console.error)

---

## v2 Requirements (Deferred)

- "Add to calendar" .ics button on sealed-confirmation state (Jan 1, 2027)
- Sample letter preview below the letter UI
- Template 4 triggered on app launch day (broadcast to all waitlist users)
- Analytics (GA4/PostHog) + cookie banner
- Error boundary at App root
- Bounce/complaint handling from Resend (webhook → auto-unsubscribe)

---

## Out of Scope

- Mobile app development — lives in SEALED-org/SEALED-org
- DNS configuration — handled manually by the team
- App store submission
- Password-based auth — email OTP only
- Admin dashboard for managing signups
- Letter editing after sealing
- Public letter feed / community wall
- Referral mechanics
- Countdown timer
- Social login (Google/Apple)
- Multi-letter writing per user (v1: one letter per user)

---

## Traceability

Each v1 requirement maps to exactly one phase. Coverage: 51/51 v1 requirements mapped (EMAIL-02 deferred to v2 by design).

| Requirement | Phase | Status |
|---|---|---|
| SIGNUP-01 | Phase 2 — Signup Flow | Pending |
| SIGNUP-02 | Phase 2 — Signup Flow | Pending |
| SIGNUP-03 | Phase 2 — Signup Flow | Pending |
| SIGNUP-04 | Phase 2 — Signup Flow | Pending |
| SIGNUP-05 | Phase 2 — Signup Flow | Pending |
| SEC-01 | Phase 2 — Signup Flow | Pending |
| SEC-02 | Phase 2 — Signup Flow | Pending |
| SEC-03 | Phase 2 — Signup Flow | Pending |
| SEC-04 | Phase 2 — Signup Flow | Pending |
| SEC-05 | Phase 4 — Letter + Verify Flow | Pending |
| EMAIL-A1 | Phase 2 — Signup Flow | Pending |
| EMAIL-A2 | Phase 3 — Email Infrastructure | Complete |
| EMAIL-B1 | Phase 3 — Email Infrastructure | Complete |
| EMAIL-B2 | Phase 4 — Letter + Verify Flow | Pending |
| EMAIL-B3 | Phase 4 — Letter + Verify Flow | Pending |
| EMAIL-01 | Phase 4 — Letter + Verify Flow | Already built in main app (no new work) |
| EMAIL-02 | Deferred (v2) | Deferred |
| EMAIL-03 | Phase 3 — Email Infrastructure | Pending |
| EMAIL-04 | Phase 3 — Email Infrastructure | Complete |
| LETTER-01 | Phase 4 — Letter + Verify Flow | Pending |
| LETTER-02 | Phase 4 — Letter + Verify Flow | Pending |
| LETTER-03 | Phase 4 — Letter + Verify Flow | Pending |
| LETTER-04 | Phase 4 — Letter + Verify Flow | Pending |
| LETTER-05 | Phase 4 — Letter + Verify Flow | Pending |
| LETTER-06 | Phase 4 — Letter + Verify Flow | Pending |
| LETTER-07 | Phase 4 — Letter + Verify Flow | Pending |
| COUNTER-01 | Phase 1 — Foundation | Pending |
| COUNTER-02 | Phase 1 — Foundation | Pending |
| COUNTER-03 | Phase 1 — Foundation | Pending |
| COUNTER-04 | Phase 1 — Foundation | Pending |
| DB-01 | Phase 1 — Foundation | Pending |
| DB-02 | Phase 1 — Foundation | Pending |
| DB-03 | Phase 2 — Signup Flow | Pending |
| DB-04 | Phase 4 — Letter + Verify Flow | Pending |
| DB-05 | Phase 1 — Foundation | Pending |
| DB-06 | Phase 2 — Signup Flow | Pending |
| DB-07 | Phase 2 — Signup Flow | Pending |
| SOCIAL-01 | Phase 5 — Deploy & Polish | Pending |
| SOCIAL-02 | Phase 5 — Deploy & Polish | Pending |
| SOCIAL-03 | Phase 5 — Deploy & Polish | Pending |
| DEPLOY-01 | Phase 5 — Deploy & Polish | Pending |
| DEPLOY-02 | Phase 5 — Deploy & Polish | Pending |
| DEPLOY-03 | Phase 5 — Deploy & Polish | Pending |
| DEPLOY-04 | Phase 3 — Email Infrastructure | Pending |
| DEPLOY-05 | Phase 5 — Deploy & Polish | Pending |
| CONTENT-01 | Phase 5 — Deploy & Polish (verified again in Phase 6) | Pending |
| CONTENT-02 | Phase 5 — Deploy & Polish (verified again in Phase 6) | Pending |
| CONTENT-03 | Phase 5 — Deploy & Polish | Pending |
| CONTENT-04 | Phase 5 — Deploy & Polish (verified again in Phase 6) | Pending |
| CONTENT-05 | Phase 5 — Deploy & Polish (verified again in Phase 6) | Pending |
| CONTENT-06 | Phase 5 — Deploy & Polish (verified again in Phase 6) | Pending |

### Phase Coverage Summary

| Phase | Requirement Groups | Count |
|---|---|---|
| Phase 1 — Foundation | DB-05, DB-01, DB-02, COUNTER-01–04 | 7 |
| Phase 2 — Signup Flow | SIGNUP-01–05, SEC-01–04, DB-03, DB-06, DB-07, EMAIL-A1 | 13 |
| Phase 3 — Email Infrastructure | EMAIL-03, EMAIL-A2, EMAIL-B1, EMAIL-04, DEPLOY-04 | 5 |
| Phase 4 — Letter + Verify Flow | LETTER-01–07, SEC-05, EMAIL-B2, EMAIL-B3, EMAIL-01, DB-04 | 12 |
| Phase 5 — Deploy & Polish | SOCIAL-01–03, DEPLOY-01–03, DEPLOY-05, CONTENT-01–06 | 13 |
| Phase 6 — Pre-launch QA | (revalidates CONTENT-01, 02, 04, 05, 06 — no net-new requirements) | 0 net-new |
| Deferred (v2) | EMAIL-02 | 1 |

**Coverage:** 50 v1 requirements assigned to one phase each + 1 deferred = 51 total. Phase 6 is an integration/QA pass that revalidates Phase 5 acceptance work end-to-end on production — no new requirements assigned, by design for MVP mode (each prior phase already includes its own success criteria).
