# Phase 3: Email Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 3-email-infrastructure
**Areas discussed:** Email visual design, Email copy & voice, From-address & sending domain, Path B scope

---

## Email Visual Design — foundation

| Option | Description | Selected |
|--------|-------------|----------|
| Match delivery email | Cream paper #faf6ef, Georgia serif, muted ink, deliverability-proven; one coherent SEALED hand across confirmation + 2027 delivery | ✓ |
| Landing-page palette | Translate Claude Design landing aesthetic into websafe-email terms; diverges from delivery email | |
| Distinct treatment | Brighter "product onboarding" look; risks brand inconsistency | |

**User's choice:** Match delivery email
**Notes:** Flagged up front that email clients strip web fonts (Instrument Serif / Plus Jakarta Sans won't render), so the realistic choice is palette + feel, not fonts.

## Email Visual Design — brand mark

| Option | Description | Selected |
|--------|-------------|----------|
| Light wordmark header | Small letter-spaced "SEALED" text wordmark at top, then message | ✓ |
| Stay bare | No mark, identical restraint to delivery email; relies on from-name | |
| Wax-seal motif | Emblem image; risks broken/blocked images in inboxes | |

**User's choice:** Light wordmark header

---

## Email Copy & Voice

| Option | Description | Selected |
|--------|-------------|----------|
| Warm & intimate | Quiet, personal, a little poetic | |
| Minimal & transactional | Short, clean, no flourish | |
| Playful & anticipatory | Lighter, hype, wink | |

**User's choice:** Other (free text) — "warm but minimal, you sound generic AI when you try to be poetic (although sometimes you say good shit) but I prefer less words, minimal, straight to the point, no fluff, apply that for everything where there will be content"
**Notes:** Saved as a standing preference memory (`feedback-minimal-copy-voice`) applying to ALL shipped content. Redrafted 1A and 1B to warm-but-minimal, no em-dashes; user confirmed direction (locked as working copy in CONTEXT D-04).

---

## From-Address & Sending Domain

### From-address
**User's choice:** Other — asked to settle domain/subdomain architecture first (marketing vs letters, minimum viable, no cost blowup) before deciding from-line.
**Notes:** Answered: subdomains are free (Resend bills on volume, not domain count). Two-stream model = transactional (root) vs marketing (future subdomain). Resolved to `SEALED <letters@sealedapp.io>` once domain settled.

### Sending domain (re-asked after architecture answer)

| Option | Description | Selected |
|--------|-------------|----------|
| Root, letters@sealedapp.io | Verify root now; matches existing notify default; cleanest from-line; marketing subdomain deferred | ✓ |
| Subdomain now, send.sealedapp.io | Max reputation isolation; less clean from-line; forces change to delivery function | |

**User's choice:** Root, letters@sealedapp.io

### DMARC (re-asked after architecture answer)

| Option | Description | Selected |
|--------|-------------|----------|
| p=reject, sp=reject | Strongest anti-spoofing; safe (Resend only sender); future subdomain inherits | ✓ |
| p=quarantine | Failing mail to spam; conservative middle | |
| p=none + monitor | Permissive start, tighten later; leaves brand spoofable at launch | |

**User's choice:** p=reject, sp=reject

---

## Path B Scope in Phase 3

| Option | Description | Selected |
|--------|-------------|----------|
| Build + test-deliver 1B now | Build template + magic-link (7-day TTL) + one-off test send to prove deliverability; production letter→1B wiring stays Phase 4 | ✓ |
| Template only, defer sending | Build HTML only; defer magic-link/sending to Phase 4; contradicts roadmap | |
| Pull letter flow forward | Wire real letter-writing now; scope creep from Phase 4 | |

**User's choice:** Build + test-deliver 1B now
**Notes:** Flagged the 7-day magic-link TTL as a research item (Supabase native expiry historically caps below 7 days; fallback is a custom verification token Phase 4 would read anyway).

---

## Claude's Discretion

- 7-day magic-link TTL mechanism (Supabase config vs custom token) — RESEARCH FLAG
- Template file/component names and folder location
- Word-level copy refinement (must honor minimal voice)
- Idempotency-key derivation for sends
- Form of the 1B test trigger (script vs guarded endpoint vs manual)
- HALT/handoff wave structure

## Deferred Ideas

- `news.sealedapp.io` marketing subdomain — when marketing exists
- Resend bounce/complaint webhook → v2
- Production letter→1B wiring → Phase 4
- Richer email imagery (wax-seal) — image-blocking risk
- Todo `260529-privacy-turnstile-addendum` — reviewed, not folded (tagged resolves_phase: 5)
