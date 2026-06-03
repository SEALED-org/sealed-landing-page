# Phase 3: Email Infrastructure — Research

**Researched:** 2026-06-03
**Domain:** Transactional email delivery — Resend DNS, React Email in Deno, Supabase Auth link TTL, mail-tester deliverability
**Confidence:** HIGH on the D-09 verdict (7-day TTL not achievable — VERIFIED); HIGH on Resend DNS shape; MEDIUM on mail-tester scoring ceiling; HIGH on existing code patterns (read directly from repo).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Templates 1A and 1B match the existing delivery email aesthetic: cream `#faf6ef` background, Georgia/websafe-serif, muted ink text (`#3a342e` body, `#7a716a` secondary), generous whitespace, letter-like composition.
- **D-02:** Light text wordmark header "SEALED" letter-spaced and muted at the top. No image-based logo, no wax-seal emblem image.
- **D-03:** Voice = warm but minimal. No fluff, no poetry, no em-dashes. Tightest version first; warmth through plainness, not flourish.
- **D-04:** Working copy locked for both templates (1A and 1B) — see 03-CONTEXT.md for exact body text and subjects. Minor word-level refinement allowed at build if it honors D-03.
- **D-05:** From-address: `SEALED <letters@sealedapp.io>` — matches existing `notify` delivery function; value of `SEALED_FROM_ADDRESS` secret.
- **D-06:** Verify root domain `sealedapp.io` in Resend (not a subdomain) for Phase 3.
- **D-07:** DMARC `p=reject; sp=reject` at `_dmarc.sealedapp.io`. DNS records go at the existing registrar for sealedapp.io — NOT inside Cloudflare.
- **D-08:** Long-term architecture: transactional on root, marketing on `news.sealedapp.io` later. `news.sealedapp.io` is out of scope for Phase 3.
- **D-09:** Phase 3 builds Template 1B fully + magic-link/token generation + test-delivers it. Production "letter written → 1B" wiring is Phase 4.

### Claude's Discretion

- 7-day magic-link TTL mechanism — research-driven (see D-09 research verdict below — the fallback custom token table is REQUIRED).
- Template file names / component names (suggested: `WaitlistConfirmationEmail.tsx` for 1A, `SealLetterEmail.tsx` for 1B in `notify/emails/`).
- Subject-line and body wording — D-04 direction is approved; minor refinement at build.
- Idempotency-key strategy for 1A/1B Resend sends.
- Test-trigger form for 1B.
- HALT/handoff split wave structure.

### Deferred Ideas (OUT OF SCOPE)

- `news.sealedapp.io` marketing subdomain.
- Resend bounce/complaint webhook.
- Production "letter written → 1B" wiring (Phase 4).
- Richer email imagery (wax-seal emblem).
- Cloudflare Turnstile privacy addendum in privacy.html (Phase 5).
- Vercel deploy + sealedapp.io custom-domain hookup (Phase 5).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-03 | All outbound email sent from a verified Resend domain with SPF/DKIM/DMARC on sealedapp.io | DNS record shapes verified; Resend dashboard is the source of exact values; propagation timing documented |
| EMAIL-A2 | Template 1A sent: simple waitlist confirmation, no verification link | Template pattern confirmed from `DeliveryLetterEmail.tsx`; 1A wiring sites identified in `join-waitlist/index.ts` lines 162 and 199 |
| EMAIL-B1 | Template 1B sent: verify-your-email with verification link | Custom token table required (D-09 verdict); `SealLetterEmail.tsx` pattern documented |
| EMAIL-04 | Magic link TTL set to 7 days | 7-day TTL NOT achievable via Supabase Auth (cap = 86,400 s / 24 h). Custom verification-token table is the required mechanism. Migration required. |
| DEPLOY-04 | SPF/DKIM/DMARC DNS records configured for sealedapp.io in Resend before first production email send | DNS is on the critical path; Nour initiates at handoff; propagation can take hours. |
</phase_requirements>

---

## Summary

Phase 3 wires real outbound email from `letters@sealedapp.io` for both Path A (waitlist confirmation, no link) and Path B (verify-to-seal, with a 7-day-TTL link). The main SEALED-org repo already has a complete React Email + Resend pipeline (`notify/emails/DeliveryLetterEmail.tsx`, `_shared/resend.ts`, `notify/index.ts`) — the two new templates are clones of this pattern. The `join-waitlist` function already has `TODO(Phase 3)` stubs at both 1A insertion points (line 162: `unverified` resend path; line 199: new-user success path).

**The single most consequential finding is the D-09 verdict:** Supabase Auth's OTP/magic-link expiry is hard-capped at 86,400 seconds (24 hours) on hosted projects — 7 days is not achievable via `mailer_otp_exp` or any dashboard config. This means the 7-day TTL requirement (EMAIL-04) mandates a custom verification-token table (a small migration in the main repo) rather than relying on Supabase Auth's `generateLink`. The Phase 3 1B send generates a random UUID token, stores it in this table with a 7-day expiry, and embeds the verify URL in the email. Phase 4's `verify-email` function reads that table to seal the letter.

Resend requires a `send.sealedapp.io` subdomain for its Return-Path (SPF/MX) records in addition to the DKIM CNAME on the root, even when the from-address is the root domain. DMARC `p=reject` with strict DKIM alignment is achievable because Resend's DKIM signing domain matches the sender domain exactly. DNS propagation is the critical path — Nour must initiate DNS changes as the first handoff step.

**Primary recommendation:** Custom token table for 7-day TTL (one migration, one simple table); `generateLink` is NOT used for Path B in Phase 3. Clone `DeliveryLetterEmail.tsx` aesthetic for both templates. Deploy DNS first, then templates, then mail-tester proof.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 1A send (waitlist confirmation) | API / Backend (Edge Function `join-waitlist`) | — | Server-side send; no client involvement; slots into existing TODO stubs |
| 1B send (verify-to-seal) | API / Backend (new or extended Edge Function) | — | Server-side send; test-triggered in Phase 3; production trigger is Phase 4 |
| Verification token storage | Database / Storage (`app_private.verification_tokens`) | — | Custom table with 7-day TTL; read by Phase 4's `verify-email` |
| Email template rendering | API / Backend (Deno `renderAsync`) | — | JSX rendered server-side; matching `notify/index.ts` pattern |
| DNS (SPF/DKIM/DMARC) | CDN / Static (registrar DNS panel) | — | Registrar records; no code; Nour configures at handoff |
| Resend domain verification | CDN / Static (Resend dashboard) | — | One-time setup; gates all real sends |
| Secrets (`RESEND_API_KEY`, `SEALED_FROM_ADDRESS`) | API / Backend (`supabase secrets set`) | — | Server-side only; never in client bundle or `VITE_*` vars |

---

## D-09 Verdict: 7-Day TTL — Custom Token Table REQUIRED

### Finding

**Supabase Auth OTP/magic-link expiry is hard-capped at 86,400 seconds (24 hours) on hosted projects.**

Source: [Supabase passwordless email docs](https://supabase.com/docs/guides/auth/auth-email-passwordless): *"An expiry duration of more than 86400 seconds (one day) is disallowed to guard against brute force attacks."* [VERIFIED: Supabase official docs]

This applies to both `mailer_otp_exp` config and links generated by `auth.admin.generateLink({ type: 'magiclink' })`. The maximum achievable TTL via Supabase Auth on a hosted project is 24 hours. `generateLink` does not accept a per-link expiry parameter — it inherits the project-level OTP expiry setting.

### Verdict

`generateLink` cannot satisfy EMAIL-04's 7-day TTL requirement. **Custom verification-token table is required.**

### Fallback: Custom Verification-Token Table

**Migration:** One new table in `app_private` (next migration after 0033):

```sql
-- supabase/migrations/0034_verification_tokens.sql
create table app_private.verification_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index on app_private.verification_tokens (token) where used_at is null;
create index on app_private.verification_tokens (expires_at) where used_at is null;

alter table app_private.verification_tokens enable row level security;
revoke all on app_private.verification_tokens from anon, authenticated, public;
grant select, insert, update on app_private.verification_tokens to service_role;
```

**Token generation flow for 1B:**
1. Insert row → returns `id` (the token UUID, used as the URL-safe token).
2. Embed in verify URL: `https://sealedapp.io/verify?token=<uuid>`
3. Phase 4's `verify-email` Edge Function receives the token, looks it up, checks `expires_at > now()` and `used_at is null`, then sets `used_at = now()` and seals the letter.

**Note:** A SECURITY DEFINER wrapper function is needed for the Edge Function to interact with `app_private.verification_tokens` via PostgREST (same pattern as `0033_join_waitlist_public_wrappers.sql`).

**Wave structure implication:** The migration is a Wave 1 output that must be deployed before any 1B sends. It is part of the HALT handoff.

---

## Standard Stack

### Core (all already present in main repo — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-email/components` | `0.0.22` | JSX email template components (`Html`, `Body`, `Container`, `Section`, `Text`, `Link`, `Head`, `Preview`) | Already pinned in `notify/deno.json`; `renderAsync` works at this version [VERIFIED: read from repo] |
| `react` | `18.3.1` | React for JSX email rendering | Already pinned in `notify/deno.json` and `join-waitlist/deno.json` [VERIFIED: read from repo] |
| `_shared/resend.ts` (`sendResendEmail`) | n/a | HTTP send to Resend API with idempotency, privacy-safe logging | Already exists; reuse without modification [VERIFIED: read from repo] |
| `_shared/admin-client.ts` (`adminClient`) | n/a | Service-role Supabase client | Already used in `join-waitlist/index.ts` [VERIFIED: read from repo] |

### New `deno.json` for `join-waitlist` additions

The existing `join-waitlist/deno.json` only has `@supabase/supabase-js`. Adding React Email rendering requires adding the same imports as `notify/deno.json`:

```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.103.2",
    "react": "npm:react@18.3.1",
    "@react-email/components": "npm:@react-email/components@0.0.22"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

[VERIFIED: `notify/deno.json` and `join-waitlist/deno.json` read directly from repo]

**Note on React Email versioning:** React Email released `@react-email/components@0.0.23` with a breaking API change — `renderAsync` was renamed to `render` (which now returns a Promise). The main repo is pinned to `0.0.22` where `renderAsync` is the correct function. Do NOT upgrade; preserve parity with the existing `notify/` function. [CITED: React Email 3.0 changelog, Supabase discussion #40286]

---

## Architecture Patterns

### System Architecture Diagram

```
join-waitlist Edge Function (existing)
  │
  ├─ [new-user success path, ~line 199]
  │    → import renderAsync + WaitlistConfirmationEmail
  │    → renderAsync(createElement(WaitlistConfirmationEmail, {}))
  │    → sendResendEmail({ from, to, subject, html, idempotencyKey, apiKey })
  │                                           ↓
  │                                    Resend API
  │                                    (letters@sealedapp.io)
  │                                    via verified sealedapp.io domain
  │
  ├─ [unverified resend path, ~line 162]
  │    → same 1A send (no new token generated — just resend confirmation)
  │
  └─ [1B test trigger — standalone script or guarded endpoint]
       → insert into app_private.verification_tokens → token UUID
       → build verify URL: https://sealedapp.io/verify?token=<uuid>
       → import renderAsync + SealLetterEmail
       → renderAsync(createElement(SealLetterEmail, { verifyUrl }))
       → sendResendEmail({ from, to, subject, html, idempotencyKey, apiKey })
                                           ↓
                                    Resend API
                                    (same domain, same sender)

DNS layer (Nour configures at registrar — critical path):
  sealedapp.io TXT  → v=spf1 include:_spf.resend.com -all
  sealedapp.io      → DKIM CNAME: resend._domainkey → resend._domainkey.resend.com
  send.sealedapp.io → MX + SPF TXT (Resend Return-Path subdomain — bounce routing)
  _dmarc.sealedapp.io TXT → v=DMARC1; p=reject; sp=reject; adkim=s
```

### Recommended Project Structure (main SEALED-org repo additions)

```
supabase/
├── functions/
│   ├── _shared/
│   │   └── resend.ts              # NO CHANGE — reuse as-is
│   ├── join-waitlist/
│   │   ├── deno.json              # ADD react + @react-email/components imports
│   │   └── index.ts               # ADD 1A send at lines 162 + 199 TODOs; ADD 1B test trigger (or separate endpoint)
│   └── notify/
│       └── emails/
│           ├── DeliveryLetterEmail.tsx  # NO CHANGE — reference only
│           ├── WaitlistConfirmationEmail.tsx  # NEW: Template 1A
│           └── SealLetterEmail.tsx            # NEW: Template 1B
└── migrations/
    └── 0034_verification_tokens.sql   # NEW: custom token table for 7-day TTL
```

**Note on template location:** Templates could live in `join-waitlist/emails/` (co-located with the sending function) or in `notify/emails/` (grouped with all templates). Grouping in `notify/emails/` matches the existing pattern and keeps all email templates in one place. The planner should decide based on this tradeoff; the `notify/` location is recommended for discoverability.

### Pattern 1: React Email Template (matching DeliveryLetterEmail.tsx)

```typescript
// Source: read from /supabase/functions/notify/emails/DeliveryLetterEmail.tsx
import {
  Body, Container, Head, Html, Preview, Section, Text, Link
} from '@react-email/components';
import * as React from 'react';

export type WaitlistConfirmationEmailProps = Record<string, never>;

export const WaitlistConfirmationEmail = () => (
  <Html>
    <Head />
    <Preview>You're on the SEALED waitlist.</Preview>
    <Body style={{ backgroundColor: '#faf6ef', fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <Container style={{ padding: '48px 32px', maxWidth: 560 }}>
        <Section>
          <Text style={{ color: '#3a342e', fontSize: 14, letterSpacing: '0.2em', opacity: 0.5 }}>
            S E A L E D
          </Text>
          <Text style={{ color: '#3a342e', opacity: 0.2 }}>──────────</Text>
        </Section>
        <Section style={{ marginTop: 32 }}>
          <Text style={{ color: '#3a342e', fontSize: 16, lineHeight: 1.7 }}>
            You're on the waitlist.
          </Text>
          <Text style={{ color: '#3a342e', fontSize: 16, lineHeight: 1.7 }}>
            Nothing to do now. We'll email you{'\n'}when SEALED opens in 2027.
          </Text>
        </Section>
        <Section style={{ marginTop: 48 }}>
          <Text style={{ color: '#7a716a', fontSize: 13 }}>— SEALED</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
```

**Key constraints from D-01/D-02/D-03:**
- `backgroundColor: '#faf6ef'` (cream paper)
- `fontFamily: 'Georgia, "Times New Roman", serif'` — no web fonts; Georgia is universally available
- Body text: `#3a342e`; secondary/muted text: `#7a716a`
- `<Text>` auto-escapes — never `dangerouslySetInnerHTML` (existing codex note in `DeliveryLetterEmail.tsx`)
- No images; no image-based logo; no wax seal

### Pattern 2: Render + Send in Edge Function

```typescript
// Source: notify/index.ts pattern, adapted for join-waitlist
import { renderAsync } from '@react-email/components';
import * as React from 'react';
import { WaitlistConfirmationEmail } from '../notify/emails/WaitlistConfirmationEmail.tsx';
import { sendResendEmail } from '../_shared/resend.ts';

// Inside Deno.serve handler, after user creation:
const html = await renderAsync(
  React.createElement(WaitlistConfirmationEmail, {})
);

await sendResendEmail({
  from: env.SEALED_FROM_ADDRESS,          // 'SEALED <letters@sealedapp.io>'
  to: [body.email],
  subject: "You're on the list.",         // D-04
  html,
  idempotencyKey: `1a-${created.user.id}`, // user_id-scoped; stable across retries
  apiKey: env.RESEND_API_KEY,
});
// CODEX MEDIUM email-body privacy: log only status + user_id (no email, no html)
```

**Idempotency key derivation:**
- 1A new-user: `1a-${user_id}` — one confirmation per user; stable across retries
- 1A unverified resend: `1a-resend-${user_id}-${Date.now()}` — allow resend (can't use stable key or Resend dedupes it within 24h)
- 1B test trigger: `1b-test-${user_id}-${token_id}`

### Pattern 3: Custom Token Generation for 1B

```typescript
// Insert verification token; use token UUID as URL token
const { data: tokenRow, error: tokenErr } = await supabase.rpc(
  'create_verification_token',
  { p_user_id: userId }
);
if (tokenErr || !tokenRow) throw tokenErr ?? new Error('token creation failed');

const verifyUrl = `https://sealedapp.io/verify?token=${tokenRow.token}`;

const html = await renderAsync(
  React.createElement(SealLetterEmail, { verifyUrl })
);

await sendResendEmail({
  from: env.SEALED_FROM_ADDRESS,
  to: [email],
  subject: 'Seal your letter.',           // D-04
  html,
  idempotencyKey: `1b-${tokenRow.id}`,
  apiKey: env.RESEND_API_KEY,
});
```

**Note:** `create_verification_token` is a new SECURITY DEFINER wrapper (same pattern as `0033_join_waitlist_public_wrappers.sql`) that inserts into `app_private.verification_tokens` and returns the row's `token` + `id`.

### Anti-Patterns to Avoid

- **Using `generateLink` for Path B:** Returns a Supabase-auth link that expires in ≤24 hours regardless of config. Does not satisfy EMAIL-04. The custom token table is the correct path.
- **Importing from `framer-motion` or `motion` in email templates:** Email templates render to static HTML — React animations are irrelevant and the import would break in Deno.
- **Using `dangerouslySetInnerHTML` in templates:** `<Text>` auto-escapes; this is already called out in `DeliveryLetterEmail.tsx` as a codex mitigation.
- **Reading `RESEND_API_KEY` from `Deno.env` inside a template:** Secrets are injected at the function entry point and passed to `sendResendEmail` as `apiKey`. The `_shared/resend.ts` wrapper never reads env.
- **Stable idempotency key on the unverified-resend path:** The `1a-${user_id}` key would be deduped by Resend within 24 hours if the user hits resend multiple times. Use a timestamp-scoped key for the resend path.
- **Upgrading `@react-email/components` to 0.0.23+:** Breaking API change (renderAsync → render). The main repo is pinned to 0.0.22 and working; do not upgrade.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Custom template-string interpolation | `@react-email/components` + `renderAsync` | Already in main repo; React component model handles escaping, inline styles, and client compatibility automatically |
| HTTP send to Resend | New fetch wrapper | `_shared/resend.ts` `sendResendEmail` | Privacy-safe logging, idempotency header, error handling already baked in |
| 7-day TTL token | `generateLink` (Supabase Auth) | Custom `app_private.verification_tokens` table | Auth is capped at 24h — no workaround exists on hosted Supabase |
| DKIM/SPF headers | DIY email auth | Resend domain verification | Managing DKIM private keys + SPF TXT records is the entire point of Resend; it handles signing automatically after verification |
| Plain-text alternative | Manual HTML-strip | Resend auto-generation | Resend automatically generates a plain-text alternative from HTML if `text` is not passed — no code change needed to `sendResendEmail` for this |

**Key insight:** The main repo already solves the email rendering and sending problem. Phase 3 work is wiring + DNS + one new table — not re-implementing existing infrastructure.

---

## Resend DNS Records Shape

**Context:** Resend requires records on TWO domains even when the from-address is the root:
1. `sealedapp.io` — DKIM CNAME (proves the root domain authorized Resend to sign)
2. `send.sealedapp.io` — SPF TXT + MX (Return-Path/Envelope-From subdomain for bounce routing)

This is not a subdomain-sending requirement; `letters@sealedapp.io` is still the from-address. The `send.` subdomain is only used for the Return-Path header (not visible to recipients).

**Exact record values are generated per-domain by the Resend dashboard.** Nour must add `sealedapp.io` in the Resend dashboard and copy the four records it shows. The shapes are:

| Record | Host | Type | Value (shape) |
|--------|------|------|---------------|
| DKIM | `resend._domainkey.sealedapp.io` | CNAME | `resend._domainkey.resend.com` |
| SPF | `send.sealedapp.io` | TXT | `v=spf1 include:_spf.resend.com ~all` |
| MX | `send.sealedapp.io` | MX | Resend's bounce endpoint (dashboard provides value) |
| DMARC | `_dmarc.sealedapp.io` | TXT | `v=DMARC1; p=reject; sp=reject; adkim=s` |

[CITED: dmarc.wiki/resend, dev.to Resend integration guide, Resend docs] — **exact values come from the Resend dashboard. The DMARC record is added manually by Nour (not generated by Resend) with the D-07 policy.**

**SPF alignment note:** Because SPF is on `send.sealedapp.io` (not `sealedapp.io`), DMARC SPF alignment will be "relaxed pass" or a miss, NOT strict. This is fine because Resend supports **strict DKIM alignment** (`adkim=s`) and DMARC passes on either SPF or DKIM. The DKIM domain (`sealedapp.io`) exactly matches the from-address domain, so strict DKIM alignment passes. [CITED: dmarc.wiki/resend — "Resend supports strict alignment on DKIM but only relaxed alignment on SPF"]

**`dig` verification commands:**
```bash
# SPF
dig TXT send.sealedapp.io +short
# DKIM
dig CNAME resend._domainkey.sealedapp.io +short
# DMARC
dig TXT _dmarc.sealedapp.io +short
```

**Propagation:** DNS TTL-dependent, typically 15 minutes to 4 hours, occasionally up to 24 hours. Nour must initiate DNS changes as the absolute first step in the handoff before any other work proceeds.

---

## mail-tester.com ≥ 9/10 Requirements

mail-tester.com runs SpamAssassin + checks authentication headers and blacklists. Key factors for this template design:

| Check | Status for Phase 3 templates | Action |
|-------|-------------------------------|--------|
| SPF pass | Achieved after DNS verification | None (Resend handles) |
| DKIM pass | Achieved after DNS verification | None (Resend handles) |
| DMARC pass | Achieved with p=reject + strict DKIM | None (Resend signs with DKIM) |
| Plain-text alternative | Automatic — Resend generates from HTML since Aug 2025 | None — `sendResendEmail` wrapper sends HTML only; Resend auto-generates text [VERIFIED: Resend changelog, Aug 21 2025] |
| No web fonts | Georgia (websafe serif) only — by design (D-01) | None |
| No images | No images in either template (D-02) | None |
| No shortened URLs | Verify URL is full `https://sealedapp.io/verify?token=...` | Ensure verify URL is not shortened or redirected |
| List-Unsubscribe header | Not in `sendResendEmail` wrapper | For transactional emails (not bulk marketing), this is flagged but typically does NOT lose a full point; 9/10 is achievable without it. Adding it is optional — it would require modifying `sendResendEmail` to accept a `headers` arg. [ASSUMED] |
| Not on IP blacklist | Resend's shared IPs are generally clean for new senders | Check Resend dashboard for IP reputation; if flagged, contact Resend |
| SpamAssassin HTML-only MIME flag | Was a -0.7 penalty; mitigated by Resend auto-generating plain text | No action needed |

**Strategy for ≥ 9/10:** The three-point authentication suite (SPF + DKIM + DMARC) + plain-text auto-generation + no images + no web fonts + no shortened URLs should yield 9–10/10 for a clean new domain. The mail-tester test is the acceptance proof — run both templates and score before considering the phase done. [CITED: mail-tester.com ANS docs, inventoryalarm.com 10/10 writeup]

---

## Common Pitfalls

### Pitfall 1: DNS propagation blocks every real deliverability test
**What goes wrong:** Resend returns errors or sends land in spam because the domain shows "unverified" in Resend's dashboard. All mail-tester runs score below 5 due to failed DKIM/SPF.
**Why it happens:** DNS changes can take 15 minutes to 24 hours to propagate globally. The Resend dashboard polls DNS and won't mark the domain verified until it sees all records.
**How to avoid:** Nour must add DNS records as the absolute first handoff step — before any template code is even written. This buys propagation time during development.
**Warning signs:** `resend._domainkey.sealedapp.io` CNAME not resolving in `dig`.

### Pitfall 2: Upgrading `@react-email/components` past 0.0.22
**What goes wrong:** `renderAsync` is removed in 0.0.23+; the Deno Edge Function throws a "renderAsync is not a function" error at runtime.
**Why it happens:** React Email 3.0 replaced `renderAsync` with a new `render` function that returns a Promise.
**How to avoid:** Pin `0.0.22` in `join-waitlist/deno.json` to match `notify/deno.json`. Never auto-upgrade.
**Warning signs:** `renderAsync` import resolves to `undefined`.

### Pitfall 3: Using `generateLink` TTL for Path B
**What goes wrong:** Users receive a "verify and seal" link that expires in 1 hour (or at most 24h) instead of 7 days. REQUIREMENTS.md EMAIL-04 is violated.
**Why it happens:** Supabase Auth's hard cap is 86,400 s (24 h); `generateLink` inherits the project setting and cannot be overridden per-call.
**How to avoid:** Use the custom `app_private.verification_tokens` table. `generateLink` is not used for Path B in Phase 3 or 4.
**Warning signs:** Any code path that calls `supabase.auth.admin.generateLink` for the 1B link.

### Pitfall 4: Stable idempotency key on the unverified-resend path
**What goes wrong:** User signs up, gets confirmation, immediately signs up again (fat-finger), requests resend — Resend deduplicates the second send within its 24h window because the idempotency key is the same as the first send.
**Why it happens:** Resend deduplicates requests with the same `Idempotency-Key` within 24 hours.
**How to avoid:** Use a timestamp-scoped key for the `unverified` resend path: `1a-resend-${user_id}-${Date.now()}`. The new-user path uses a stable `1a-${user_id}` (one confirmation per user is fine to deduplicate).
**Warning signs:** User reports not receiving the resent confirmation.

### Pitfall 5: `deno.json` missing `jsx`/`jsxImportSource` compiler options
**What goes wrong:** Deno cannot compile `.tsx` files; Edge Function deployment fails with "JSX transform not configured" or React JSX syntax errors.
**Why it happens:** `join-waitlist/deno.json` currently lacks `compilerOptions` because it has no TSX. Adding `WaitlistConfirmationEmail.tsx` and `SealLetterEmail.tsx` imports requires the JSX options.
**How to avoid:** Add `"compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "react" }` to `join-waitlist/deno.json` when adding react-email imports. [VERIFIED: `notify/deno.json` pattern read from repo]
**Warning signs:** Deployment error mentioning "jsx" or "pragma".

### Pitfall 6: `app_private` access via PostgREST schema exposure
**What goes wrong:** Edge Function calls `.schema('app_private').from('verification_tokens')` and receives "Invalid schema: app_private".
**Why it happens:** Supabase's hosted Data API only exposes `public` schema; `app_private` is not routable through PostgREST even with service-role key (confirmed by Phase 2's fix in migration 0033).
**How to avoid:** All `app_private` access in Edge Functions must go through SECURITY DEFINER wrapper functions in `public` schema (same pattern as `0033_join_waitlist_public_wrappers.sql`). Add wrappers `create_verification_token` and (for Phase 4) `consume_verification_token` in migration 0034.
**Warning signs:** Edge Function returning "Invalid schema" or 400 on any `app_private` operation.

### Pitfall 7: RESEND_API_KEY and SEALED_FROM_ADDRESS missing at function startup
**What goes wrong:** `join-waitlist` starts up, hits the 1A send path, `Deno.env.get('RESEND_API_KEY')` returns `undefined`, `sendResendEmail` is called with an empty API key, Resend returns 401, and the function throws — but the waitlist signup already succeeded. State is partial (user created, no email sent).
**Why it happens:** Phase 2's `join-waitlist` function did not need these secrets and they were not set in the Phase 2 handoff (per Phase 2 D-03 explicitly deferring them to Phase 3).
**How to avoid:** The Phase 3 handoff must include `supabase secrets set RESEND_API_KEY=... SEALED_FROM_ADDRESS='SEALED <letters@sealedapp.io>'`. The function should fail fast at startup if `RESEND_API_KEY` is missing (following `notify/index.ts` pattern lines 17–20). The 1A send should be wrapped so that a Resend error does NOT roll back the signup — log and continue (return `{ state: 'success' }`) to avoid making the signup appear to fail.
**Warning signs:** `RESEND_API_KEY` missing in `supabase secrets list`.

---

## Code Examples

### Template 1A: WaitlistConfirmationEmail.tsx

```typescript
// Location: supabase/functions/notify/emails/WaitlistConfirmationEmail.tsx
// Source: Clone of DeliveryLetterEmail.tsx aesthetic (D-01)
// Copy: D-04 approved direction
import {
  Body, Container, Head, Html, Preview, Section, Text
} from '@react-email/components';
import * as React from 'react';

export const WaitlistConfirmationEmail = () => (
  <Html>
    <Head />
    <Preview>You're on the SEALED waitlist.</Preview>
    <Body style={{ backgroundColor: '#faf6ef', fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <Container style={{ padding: '48px 32px', maxWidth: 560 }}>
        <Section>
          <Text style={{ color: '#3a342e', fontSize: 13, letterSpacing: '0.15em', opacity: 0.45 }}>
            S E A L E D
          </Text>
        </Section>
        <Section style={{ marginTop: 32 }}>
          <Text style={{ color: '#3a342e', fontSize: 16, lineHeight: 1.7 }}>
            You're on the waitlist.
          </Text>
          <Text style={{ color: '#3a342e', fontSize: 16, lineHeight: 1.7 }}>
            Nothing to do now. We'll email you when SEALED opens in 2027.
          </Text>
        </Section>
        <Section style={{ marginTop: 48 }}>
          <Text style={{ color: '#7a716a', fontSize: 13 }}>— SEALED</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
```

### Template 1B: SealLetterEmail.tsx

```typescript
// Location: supabase/functions/notify/emails/SealLetterEmail.tsx
// Source: Clone of DeliveryLetterEmail.tsx aesthetic (D-01)
// Copy: D-04 approved direction
import {
  Body, Container, Head, Html, Preview, Section, Text, Link
} from '@react-email/components';
import * as React from 'react';

export type SealLetterEmailProps = {
  verifyUrl: string;  // https://sealedapp.io/verify?token=<uuid>
};

export const SealLetterEmail = ({ verifyUrl }: SealLetterEmailProps) => (
  <Html>
    <Head />
    <Preview>Your letter is ready — verify your email to seal it.</Preview>
    <Body style={{ backgroundColor: '#faf6ef', fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <Container style={{ padding: '48px 32px', maxWidth: 560 }}>
        <Section>
          <Text style={{ color: '#3a342e', fontSize: 13, letterSpacing: '0.15em', opacity: 0.45 }}>
            S E A L E D
          </Text>
        </Section>
        <Section style={{ marginTop: 32 }}>
          <Text style={{ color: '#3a342e', fontSize: 16, lineHeight: 1.7 }}>
            Your letter is ready. Verify your email to seal it.
          </Text>
        </Section>
        <Section style={{ marginTop: 32 }}>
          <Link
            href={verifyUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#3a342e',
              color: '#faf6ef',
              padding: '12px 24px',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Verify and seal
          </Link>
        </Section>
        <Section style={{ marginTop: 32 }}>
          <Text style={{ color: '#7a716a', fontSize: 13 }}>
            This link works for 7 days.
          </Text>
        </Section>
        <Section style={{ marginTop: 32 }}>
          <Text style={{ color: '#7a716a', fontSize: 13 }}>— SEALED</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
```

### Migration 0034: verification_tokens + public wrappers

```sql
-- supabase/migrations/0034_verification_tokens.sql
-- Custom 7-day verification tokens for Path B (letter sealing).
-- Required because Supabase Auth OTP/magic-link expiry is hard-capped at 86,400s (24h).
-- Phase 4's verify-email Edge Function reads this table to seal letters.

create table app_private.verification_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index verification_tokens_token_idx
  on app_private.verification_tokens (token) where used_at is null;
create index verification_tokens_expires_idx
  on app_private.verification_tokens (expires_at) where used_at is null;

alter table app_private.verification_tokens enable row level security;
revoke all on app_private.verification_tokens from anon, authenticated, public;
grant select, insert, update on app_private.verification_tokens to service_role;

-- Public wrapper: create a token for a user, return token + id for URL construction
create or replace function public.create_verification_token(p_user_id uuid)
returns table (id uuid, token text)
language sql
security definer
set search_path = ''
as $$
  insert into app_private.verification_tokens (user_id)
  values (p_user_id)
  returning id, token;
$$;

revoke all on function public.create_verification_token(uuid) from public;
grant execute on function public.create_verification_token(uuid) to service_role;

comment on table app_private.verification_tokens is
  'Custom 7-day email verification tokens for Path B (letter sealing). Supabase Auth OTP is capped at 24h; this table holds tokens with a 7-day expiry. Phase 4 verify-email function consumes tokens.';
```

---

## Runtime State Inventory

> Phase 3 adds a new table and two new secrets. No existing data or registrations are renamed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No existing data; new `app_private.verification_tokens` table is created empty | Migration deploy at handoff |
| Live service config | `RESEND_API_KEY` and `SEALED_FROM_ADDRESS` NOT yet set in Supabase secrets (explicitly deferred by Phase 2 D-03) | `supabase secrets set` in handoff |
| OS-registered state | None | None |
| Secrets/env vars | `RESEND_API_KEY` missing; `SEALED_FROM_ADDRESS` missing; `SUPABASE_SERVICE_ROLE_KEY` confirmed already set (Phase 2 handoff verified this) | Set at handoff |
| Build artifacts | None — server-side code only | None |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `renderAsync` from `@react-email/components@0.0.22` | `render` (Promise) in `@react-email/components@0.0.23+` | React Email 3.0 (2024-2025) | Main repo is on 0.0.22 — stay pinned; do NOT upgrade |
| Manual plain-text in Resend API body | Resend auto-generates plain text from HTML | Aug 21, 2025 | `sendResendEmail` wrapper does not need a `text` field — Resend handles it automatically |
| Supabase `generateLink` for magic links (direct use) | Custom token table for long-TTL verification | N/A — Supabase Auth cap always existed | EMAIL-04's 7-day requirement mandates the custom table |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | List-Unsubscribe header absence does not lose a full point on mail-tester for transactional email — 9/10 is achievable without it | mail-tester ≥ 9/10 section | If mail-tester deducts a full point, score drops to 8/10; mitigation: add `List-Unsubscribe` header to `sendResendEmail` wrapper |
| A2 | Resend's auto-generated plain-text (from HTML, no `text` param passed) is sufficient for SpamAssassin's MIME_HTML_ONLY check | Don't Hand-Roll | If auto-generation doesn't apply to direct HTTP API calls (only SDK), the `sendResendEmail` wrapper needs a `text` field; low risk — changelog explicitly states API-level behavior |
| A3 | `admin.generateLink` in the Edge Function (service role, server-to-server) returns `data.properties.action_link` (pre-PKCE shape) because server-side admin calls bypass client PKCE | D-09 verdict / Pattern 3 | If the admin API has also migrated to PKCE token-hash returns, `action_link` would be missing; however, since we're NOT using generateLink for Path B (custom tokens instead), this assumption is moot for Phase 3 |
| A4 | Resend's DKIM CNAME record host is `resend._domainkey.sealedapp.io` pointing to `resend._domainkey.resend.com` — these exact values are what the dashboard will show | DNS Records Shape | Dashboard generates per-domain values; the shape is correct but Nour must copy exact values from dashboard — do not hard-code |
| A5 | Template file location: `notify/emails/` is preferable to `join-waitlist/emails/` for grouping | Project Structure | Co-location in `join-waitlist/` is equally valid; planner's call |

**A3 is moot** because Phase 3 uses the custom token table for 1B, not `generateLink`. If Phase 4 needs `generateLink` for something else, A3 should be re-verified.

---

## Open Questions

1. **`generate_verification_token` wrapper: return single row or scalar?**
   - What we know: `create` wrappers in 0033 return `void`; a token insert needs to return the new row.
   - What's unclear: Whether `RETURNING` in a SECURITY DEFINER `language sql` function that returns a TABLE is the cleanest pattern for Supabase RPC.
   - Recommendation: Return `table (id uuid, token text)` — confirmed by Postgres `RETURNING` with `TABLE` return type. Edge Function calls `.rpc('create_verification_token', { p_user_id })` and reads `data[0].token`.

2. **1B test trigger: standalone script vs guarded endpoint?**
   - What we know: Context D-09 says "a temporary script, a guarded debug endpoint, or a manual generateLink + sendResendEmail invocation."
   - What's unclear: Which is least intrusive and cleanest to remove in Phase 4.
   - Recommendation: A guarded debug endpoint in `join-waitlist/index.ts` behind a `?test_1b=1` query param + an `Authorization: Bearer <test_key>` header check against a `TEST_TRIGGER_KEY` secret. This sends 1B to a provided email without needing a real letter. Remove in Phase 4 when production wiring lands.

3. **Resend `send.sealedapp.io` subdomain — SPF record host conflict?**
   - What we know: Resend requires an SPF TXT record on `send.sealedapp.io`, not on the root. The root domain does not need an SPF TXT record from Resend.
   - What's unclear: Whether sealedapp.io currently has an existing SPF TXT record on the root domain that might conflict.
   - Recommendation: Nour should check existing root-domain TXT records at the registrar before adding Resend's records. If an existing `v=spf1` record exists on the root, it may need to be merged.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `supabase` CLI | Function deploy, secrets set | Confirmed (Phase 2 used it) | `^2.91.2` | — |
| Resend account + API key | Template sends | Requires Nour to create / locate | — | No fallback — required |
| sealedapp.io registrar access | DNS records (DEPLOY-04) | Nour has access | — | No fallback — required for DNS |
| Supabase hosted project | Migrations, function deploy | Confirmed active (Phase 2 verified) | — | — |

**Missing dependencies with no fallback:**
- Resend API key — Nour must retrieve from Resend dashboard and pass to handoff.
- Registrar DNS panel access — Nour must add SPF/DKIM/DMARC/MX records; no programmatic path.

**Note:** All these are Nour's handoff tasks, not executor tasks. The executor writes code and migrations; Nour deploys and configures external services.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (verification token as auth factor) | Custom token table; one-time use (`used_at` set on consumption); 7-day expiry |
| V3 Session Management | No | No session created in Phase 3; that's Phase 4 (`verify-email`) |
| V4 Access Control | Yes | `service_role` only on `app_private.verification_tokens`; SECURITY DEFINER wrappers |
| V5 Input Validation | Yes | Token from URL param validated against DB (no eval, no SQL interpolation — RPC params only) |
| V6 Cryptography | Yes | `gen_random_bytes(32)` encoded as hex for token — 256-bit entropy; cryptographically secure PRNG from Postgres |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token prediction / brute force | Spoofing | 256-bit random hex token (`gen_random_bytes(32)`) — computationally infeasible to brute-force |
| Token replay | Repudiation | `used_at` field set on first use; Phase 4 `consume_verification_token` wrapper checks `used_at IS NULL` before sealing |
| Letter bombing (sending 1B to arbitrary addresses) | Tampering | Path B trigger in Phase 3 is a test-only guarded endpoint; production trigger (Phase 4) verifies user wrote the letter via DB check before sending |
| API key exposure in logs | Information Disclosure | `sendResendEmail` logs only `status` + `outboxId` + `letterId` — never API key, recipient, or body (CODEX MEDIUM annotation in `_shared/resend.ts`) |
| `RESEND_API_KEY` in client bundle | Information Disclosure | Secrets stored via `supabase secrets set` only; never in `VITE_*` vars or committed files |
| Expired token accepted | Repudiation | Phase 4 wrapper checks `expires_at > now()` before consuming token |

---

## Sources

### Primary (HIGH confidence)
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/` — Direct codebase read; all patterns verified against real code
- [Supabase passwordless email docs](https://supabase.com/docs/guides/auth/auth-email-passwordless) — OTP 86,400s hard cap verified
- [Supabase generateLink JS API reference](https://supabase.com/docs/reference/javascript/auth-admin-generatelink) — No expiry parameter confirmed
- [Resend Send Email API reference](https://resend.com/docs/api-reference/emails/send-email) — `text` optional; auto-generated from HTML confirmed
- [Resend automatic plain-text changelog](https://resend.com/changelog/automatic-plain-text-emails) — Aug 21, 2025; auto-generation confirmed

### Secondary (MEDIUM confidence)
- [dmarc.wiki/resend](https://dmarc.wiki/resend) — DNS record shapes for Resend; `send.` subdomain requirement; strict DKIM alignment
- [Resend domain verification docs](https://resend.com/docs/dashboard/domains/introduction) — Domain verification flow; subdomain recommendation
- [Supabase Edge Functions + React Email example](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend) — `renderAsync` + `0.0.22` confirmed for Deno
- [catjam.fi generateLink PKCE migration](https://catjam.fi/articles/supabase-generatelink-fix) — PKCE consideration documented

### Tertiary (LOW confidence — noted as [ASSUMED] where used)
- [inventoryalarm.com 10/10 mail-tester writeup](https://inventoryalarm.com/mail-tester-10-out-of-10-score/) — Mail-tester scoring factors
- [ANS mail-tester docs](https://www.ans.co.uk/docs/email/mailtester/) — Scoring criteria summary

---

## Metadata

**Confidence breakdown:**
- D-09 verdict (7-day TTL): HIGH — VERIFIED from official Supabase docs; official cap is explicit
- Standard stack (React Email, `sendResendEmail`, `renderAsync`): HIGH — read directly from main repo
- Resend DNS record shapes: MEDIUM — generic shapes from third-party guides; exact values come from dashboard
- mail-tester ≥ 9/10 path: MEDIUM — factors documented; score depends on Resend IP reputation which is unknown without a test run
- Custom token table schema: HIGH — standard Postgres patterns; follows existing 0033 migration shape

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (30 days; Supabase Auth cap is stable policy; Resend DNS shapes are stable)
