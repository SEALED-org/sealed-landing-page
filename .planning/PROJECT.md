# SEALED Landing Page

## What This Is

A marketing landing page that captures waitlist signups and optional first sealed letters before the SEALED mobile app launches. Users sign up with their email, optionally write a letter to their future self, and receive it on January 1st, 2027. On app launch day, they log in via OTP using the same email — their account and letter are already waiting.

## Core Value

A frictionless one-screen moment: enter your email, write a letter to your future self, and forget about it until 2027.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can enter email and join the waitlist
- [ ] User can optionally write a letter to their future self
- [ ] Letter and signup are stored in Supabase (creating an auth account for OTP login on app launch)
- [ ] Email verification gate: letter stays "pending" until user confirms their email
- [ ] Cloudflare Turnstile (invisible CAPTCHA) + 1 submission/day/IP rate limiting on form submit
- [ ] Signup counter displays social proof, seeded at 115, increments with each verified signup
- [ ] 4 transactional email templates sent via Resend + Supabase Edge Functions
- [ ] Landing page deployed to Vercel/Netlify, connected to sealedapp.io
- [ ] Pushed to a new repo under the SEALED-org GitHub organization
- [ ] Instagram and X (Twitter) social links added to the page
- [ ] Content proofed and final copy locked

### Out of Scope

- Mobile app development — lives in SEALED-org/SEALED-org
- DNS configuration — handled manually outside this repo
- App store submission — separate workstream
- Password-based auth — users only ever use email OTP, no password UI needed
- Admin dashboard for managing signups — out of scope for launch
- Letter editing after submission — letters are sealed, not editable

## Context

**Two-repo system:**
- `SEALED-org/SEALED-org` — Mobile app (React Native/Expo) + Supabase backend. Source of truth for DB schema, Edge Functions, email templates, and delivery logic. Located at `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org`.
- This repo — Landing page only. Inserts into the same Supabase instance the app uses.

**Existing landing page state:**
- React 19 + TypeScript + Vite 6 + Tailwind v4 + Motion v12 + lucide-react
- Currently wired to Firebase (`src/App.tsx:7`) — `src/firebase.ts` is missing from the repo, so the build is currently broken. Firebase is being replaced entirely with Supabase.
- Components in place: `App`, `FirstLetter`, `FAQ`, `ShareButtons`, `Typewriter`
- Dead code: `showSticky` state is computed from scroll position but never rendered (`src/App.tsx:15-22`)
- Static legal pages: `terms.html`, `privacy.html` (standalone HTML, no React)

**Supabase schema status:**
- Main app schema exists but has no tables for landing page signups yet
- Need to design and create: waitlist users table (or use Supabase Auth directly), letters table, possibly a verification tokens table
- Supabase Auth will be used so users can OTP into the mobile app on launch day with the same email

**Email delivery:**
- Transactional emails sent via Resend, triggered by Supabase Edge Functions
- Letter delivery on January 1st, 2027 must be a scheduled job (Supabase scheduled function or cron)

**App launch date:** TBD — letter delivery is the fixed hard deadline (Jan 1, 2027)

## Email Templates

| # | Trigger | Recipients | Subject / Purpose |
|---|---------|------------|-------------------|
| 1 | Signup submitted | All signups | Waitlist confirmation + email verification link ("Confirm your email to seal your spot") |
| 2 | Email verified, letter written | Letter writers only | "Your letter is sealed — delivering January 1st, 2027" |
| 3 | January 1st, 2027 | All verified users with letters | "A letter you wrote on {composedOn}" |
| 4 | App launch day (TBD) | All verified waitlist users | Invitation to download SEALED |

## User Flow

```
1. User enters email → Turnstile check → IP rate limit (1/day/IP)
2. If passes: create Supabase auth user (pending verification), store letter if written
3. Send Template 1 email (verify + waitlist confirmation)
4. User clicks verify link → account activated
   ├── Wrote a letter → send Template 2 ("your letter is sealed")
   └── No letter → confirmed, no further email until delivery/launch
5. Jan 1, 2027 → scheduled job sends Template 3 to all verified letter writers
6. App launch (TBD) → send Template 4 to all verified waitlist users
```

## Security

- **Cloudflare Turnstile** (invisible) on every form submission — stops automated bots
- **IP rate limit**: 1 submission per day per IP, enforced in the Supabase Edge Function
- **Email verification gate**: letters and accounts stay in "pending" state until the user clicks the verification link — unsolicited recipients get one email and nothing further if they ignore it
- **Service role key never exposed to client**: all writes go through a Supabase Edge Function

## Constraints

- **Hard deadline**: January 1st, 2027 — letter delivery must fire reliably on this date
- **Database**: Supabase only — no Firebase remnants in final build
- **Build is currently broken**: `src/firebase.ts` is missing; replacing Firebase with Supabase fixes this
- **Domain**: sealedapp.io — Vercel/Netlify deployment and custom domain hookup required
- **GitHub**: New repo under SEALED-org org, pushed before any other launch steps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace Firebase with Supabase | Main app uses Supabase — one source of truth; letters are already in the right DB when app launches | — Pending |
| Create Supabase Auth accounts at signup | Users OTP into the mobile app on launch day using the same email — account must pre-exist | — Pending |
| Edge Function for all writes | Keeps Supabase service role key off the client; enables server-side rate limiting and Turnstile validation | — Pending |
| Email verification as spam defense | Prevents letter bombing to arbitrary emails; unverified letters are never scheduled for delivery | — Pending |
| Seed counter at 115 | Social proof — not tied to real data; increments with each verified signup after that | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-28 after Phase 1.5 (UI redesign — pixel-faithful Claude Design prototype shipped; 9 plans executed across 3 waves; Phase 1 Supabase data layer preserved verbatim per D-06)*
