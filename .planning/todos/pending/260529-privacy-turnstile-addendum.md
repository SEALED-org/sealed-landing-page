---
id: 260529-privacy-turnstile-addendum
created: 2026-05-29
origin: Phase 2 Plan 02-05 verification (Cloudflare Turnstile dashboard requirement)
resolves_phase: 5
priority: required-before-launch
type: legal-compliance
---

# Reference Cloudflare's Turnstile Privacy Addendum in privacy.html

## Why

Cloudflare requires it as a condition of enabling **Invisible** Turnstile mode (the mode we use per 02-CONTEXT.md D-07). Quoted from the Cloudflare Turnstile dashboard:

> "As a condition of enabling invisible mode, you must reference Cloudflare's Turnstile Privacy Addendum in your own privacy policy."

In Invisible mode, Cloudflare silently collects browser-side telemetry (mouse movement, browser features, etc.) without showing a visible challenge. Visitors have no UI cue that a third-party security service is observing them, so disclosure in our privacy policy is the compliance gate.

## What

Add a section to `privacy.html` covering:

- **What:** SEALED uses Cloudflare Turnstile for invisible bot protection on signup forms.
- **What data flows:** Browser fingerprinting signals (mouse movement, headers, navigator properties) sent to Cloudflare during signup.
- **Why:** To prevent automated abuse of the waitlist signup and letter system.
- **Link:** https://www.cloudflare.com/application-services/terms/turnstile-privacy-policy/ (Cloudflare's Turnstile Privacy Addendum)

## Where

`privacy.html` — likely as a new sub-section under "Third-Party Services" or equivalent.

## When

Phase 5 (Deploy & Polish) — bundles with CONTENT-01/02 (proofing all page copy) and DEPLOY-03 (sealedapp.io custom domain hookup). Must be live BEFORE the first real visitor signup on production.

## Acceptance

- `privacy.html` mentions Cloudflare Turnstile and links to the Turnstile Privacy Addendum.
- The disclosure is visible on the rendered page (not commented out, not in a hidden div).
- The link works (no 404 on the Cloudflare-hosted addendum URL).

## Notes

The same applies to any future surface that mounts a Turnstile widget (e.g. the verify-email gate in Phase 4 if it adds Turnstile). Currently only the two signup forms (`WaitlistForm`, `FirstLetter`) mount widgets, both via the same site key.
