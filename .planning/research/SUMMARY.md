# Research Summary — SEALED Landing Page

## Executive Summary

SEALED is a pre-launch waitlist landing page where users hand over their email and optionally write a letter delivered on January 1st, 2027. The page is already substantially built in React 19 + TS + Vite 6 + Tailwind v4 — the work is replacing Firebase with Supabase, hardening the signup pipeline against abuse, and wiring existing components into the main app's already-operational backend.

**The single most important finding:** the main app repo already runs a complete letter delivery pipeline. The `dispatch` and `notify` cron jobs fire every minute. `app_private.letters`, `schedules`, and `notification_outbox` exist with full status state machines. `notify/emails/DeliveryLetterEmail.tsx` is already the Template 3 implementation. **Jan 1, 2027 delivery requires zero new cron jobs.** The landing page just inserts correctly-shaped rows into existing tables and the running infrastructure handles delivery. The riskiest part of this project is already solved.

The remaining risk surface: email verification gate (prevents letter-bombing), Turnstile + IP rate limiting (prevents bot floods), Resend DNS configuration (deliverability), and not leaking the service role key into the client bundle.

---

## Recommended Stack

| Package | Version | Notes |
|---|---|---|
| `@supabase/supabase-js` | `2.103.2` (pin exactly) | Must match main app |
| `supabase` CLI | `^2.91.2` | Match main app |
| `@marsidev/react-turnstile` | latest | Handles React 19 StrictMode correctly |
| Resend | Direct HTTP fetch | Matches `_shared/resend.ts` in main app; no SDK needed |

**Reuse from main app (do NOT re-implement):**
- `_shared/admin-client.ts` — service-role Supabase client
- `_shared/resend.ts` — `sendResendEmail()` pattern
- `_shared/auth.ts` — `requireServiceRole()` guard
- `notify/emails/DeliveryLetterEmail.tsx` — Template 3 already exists
- `dispatch` + `notify` crons — already running every minute

**Do NOT add:** `@supabase/ssr`, `@supabase/auth-helpers-react`, Firebase (remove entirely), new pg_cron jobs, Resend npm SDK.

**Environment variables:**

| Var | Location |
|---|---|
| `VITE_SUPABASE_URL` | Vercel env (client-readable) |
| `VITE_SUPABASE_ANON_KEY` | Vercel env (client-readable) |
| `VITE_TURNSTILE_SITE_KEY` | Vercel env (client-readable) |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase secrets set` ONLY — **NEVER `VITE_`** |
| `TURNSTILE_SECRET_KEY` | `supabase secrets set` ONLY |
| `RESEND_API_KEY` | `supabase secrets set` ONLY |
| `SEALED_FROM_ADDRESS` | `supabase secrets set` ONLY |

---

## Table Stakes

**Already built (need backend wiring):**
- Email capture hero + value prop
- Inline letter writing UX + typewriter + sealing animation
- Live waitlist counter + post-signup confirmation chip
- Share buttons (Twitter, Instagram, copy)
- "How it Works" + FAQ accordion
- Responsive layout + OG/Twitter cards + static legal pages

**Net-new for v1:**
- Cloudflare Turnstile (invisible) on form
- IP rate limit — 1/day/IP, DB-backed
- `join-waitlist` Edge Function (Turnstile → rate-limit → createUser → letter insert → Template 1)
- `verify-email` Edge Function (seal letter → schedule → notification_outbox → Template 2)
- Templates 1 & 2 via Resend (Template 3 already exists in main app)
- Counter seeded at 115, increments on verified signups only
- DNS: SPF/DKIM/DMARC for sealedapp.io
- Real Instagram + X footer links
- Firebase removal (build is currently broken)
- Vercel deploy + sealedapp.io domain

---

## Key Architecture Decisions

### Use existing `app_private.*` tables (not a new schema)

Insert into `app_private.letters` + `app_private.schedules` + `app_private.notification_outbox`. Zero new delivery infrastructure. Letters land in the right DB on app launch day. The ARCHITECTURE.md greenfield proposal is superseded — use existing tables.

Only new table: `app_private.waitlist_signups` (landing-page sidecar metadata).

### `admin.createUser` + `generateLink` + Resend (not client-side signInWithOtp)

Edge Function: `createUser({ email, email_confirm: false })` → `generateLink({ type: 'magiclink' })` → Resend Template 1 with action_link. Full template control. Real `auth.users` row created — mobile app OTP on launch day just calls `signInWithOtp({ shouldCreateUser: false })`.

### 4-state duplicate-signup handling

Look up `auth.users` by email FIRST. Handle: (a) new → create + Template 1; (b) existing unverified → resend Template 1; (c) existing verified, no letter → "already on list"; (d) existing verified with letter → "letter already sealed." Don't rely on `createUser` 422 error.

### Counter as Postgres view

```sql
create view public.signup_counter as
  select 115 + count(*)::int as count
  from app_private.waitlist_signups
  where status = 'verified';
```

Always accurate. No increment races. Seed encoded in view.

### Client uses ONLY anon key

All writes via Edge Functions through `supabase.functions.invoke()`. Client reads `signup_counter` directly (anon key, view). Verify-link page: `supabase.auth.verifyOtp(token)` → POST to `verify-email` with JWT.

---

## Watch Out For (Top 5)

### 1. Service role key in client bundle (CRITICAL)

One typo: `VITE_SUPABASE_SERVICE_ROLE_KEY` inlines the key into the JS bundle. Full DB compromise including main app data. Add CI grep on `dist/` for the service role prefix.

### 2. Letter bombing (CRITICAL)

Without verification, attacker types `victim@example.com` + harassment text. Domain reputation destroyed in one viral incident. Verification gate must be enforced before any `schedules`/`notification_outbox` insert.

### 3. Resend DNS not verified → silent spam delivery (CRITICAL)

Resend returns 200, users never see emails, counter never moves. SPF/DKIM/DMARC on sealedapp.io **before** first production send. DNS propagation takes hours — do this first.

### 4. Duplicate-signup 422 not handled (HIGH)

`admin.createUser` on existing email: if not handled explicitly, every retry errors out with a generic 500. Handle 4 distinct cases — see above.

### 5. Turnstile + React StrictMode double-render (MODERATE)

StrictMode double-fires effects. `window.turnstile.render()` is not idempotent. Use `@marsidev/react-turnstile`. Reset widget after every submit.

---

## Build Order

| Phase | Work | Critical Path |
|---|---|---|
| 1 | Foundation cleanup: Firebase removal, tsconfig, lockfile, dead code | Unblocks everything |
| 2 | Schema + Supabase anon wiring: `waitlist_signups` migration, counter view, replace Firebase subscriptions | Blocks Edge Functions |
| 3 | `join-waitlist` Edge Function (no email yet): Turnstile + rate-limit + createUser + DB inserts | Blocks email phase |
| 4 | DNS + Templates 1 & 2: SPF/DKIM/DMARC first (hours to propagate), then Resend integration | DNS is hard dependency |
| 5 | `verify-email` Flow: verifyOtp page + Edge Function, flip letter to sealed, insert schedules + outbox, Template 2 | Blocks letter delivery |
| 6 | Deploy: GitHub push, Vercel, sealedapp.io domain, polish + a11y | Ships |

**Hard dependencies:** DNS (Phase 4) must overlap with Phase 2-3 work. Verify (Phase 5) requires sealed letters to flow into existing dispatch/notify pipeline.

---

## Open Questions (Answer Before Planning)

1. Will landing page share the same Supabase project as the main app, or a separate project? *(Shared is strongly recommended — letters must be in the same DB the app reads from)*
2. Exact timezone for `deliver_at` on Jan 1, 2027 — 13:00 UTC (8am EST) or other?
3. Resignup with a pending letter: replace letter body, reject, or allow?
4. Magic link TTL — recommend 7 days (default is 1 hour, which is too short for a "seal your spot" gesture)
5. Letter length cap — 10,000 chars? Confirm with product.
6. Who owns sealedapp.io DNS and when can SPF/DKIM/DMARC be added?
7. `admin.generateLink` current return shape — verify against live Supabase docs before implementing

---

## Confidence

| Area | Confidence |
|---|---|
| Stack (versions, shared patterns) | HIGH — main app repo read directly |
| Architecture (integration path) | HIGH — existing delivery infra confirmed |
| Pitfall severity | HIGH for top 3; MEDIUM for others |
| Features / conversion patterns | MEDIUM — web research unavailable this session |
| Edge Function API shapes | MEDIUM — verify `admin.generateLink` before implementing |
