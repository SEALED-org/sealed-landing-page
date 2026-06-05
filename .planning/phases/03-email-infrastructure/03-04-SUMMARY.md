---
phase: 03-email-infrastructure
plan: 04
subsystem: infra
tags: [dns, resend, supabase-secrets, supabase-migration, edge-function-deploy, human-action]

requires:
  - phase: 03-email-infrastructure
    provides: "Plan 01 migration 0034 (verification_tokens + RPC wrappers), Plan 02 templates, Plan 03 join-waitlist wiring + 1B trigger"
provides:
  - "sealedapp.io email DNS live: SPF (send.), DMARC (_dmarc.), MX (send.), DKIM (Resend/SES hashed selectors)"
  - "Resend domain sealedapp.io Verified (DKIM signing active — confirmed by downstream auth pass)"
  - "Migration 0034 applied to live DB (app_private.verification_tokens + create_verification_token + lookup_user_id_by_email)"
  - "Secrets set: RESEND_API_KEY, SEALED_FROM_ADDRESS ('SEALED <letters@sealedapp.io>'), TEST_TRIGGER_KEY"
  - "join-waitlist Edge Function deployed (with verify_jwt=false gateway fix from 03-03 Deviation 2)"
affects: [phase-03-email, phase-04-letter-verify, phase-05-deploy]

tech-stack:
  added: []
  patterns:
    - "Pattern: DMARC entered manually (not Resend-generated) per D-07 — p=reject; sp=reject; adkim=s (+ rua reporting added)"
    - "Pattern: SES-backed Resend domain uses include:amazonses.com SPF + feedback-smtp.us-east-1.amazonses.com MX (not the _spf.resend.com shape the plan assumed) — Resend's actual dashboard values are authoritative"

key-files:
  created: []
  modified: []

key-decisions:
  - "DNS records added at the registrar (not Cloudflare — Cloudflare is Turnstile-only per project scope)"
  - "DMARC includes rua=mailto:info@sealedapp.io for aggregate reports on top of the D-07 p=reject/sp=reject/adkim=s policy"
  - "DKIM verified via downstream signal (mail-tester 'properly authenticated' + delivered mail) rather than the resend._domainkey dig, which is empty because this domain uses Resend/SES hashed DKIM selectors"

patterns-established: []

requirements-completed: [DEPLOY-04, EMAIL-03]

duration: human-action (multi-session, includes DNS propagation wait)
completed: 2026-06-05
---

# Phase 3 Plan 04: Deploy Handoff (DNS + DB Push + Secrets + Function Deploy) Summary

**All four human-action handoff steps completed: sealedapp.io email DNS added and propagated, migration 0034 pushed to the live database, RESEND_API_KEY / SEALED_FROM_ADDRESS / TEST_TRIGGER_KEY set via `supabase secrets set`, and join-waitlist redeployed (with the verify_jwt=false gateway fix). Infrastructure is live; Plan 05 confirmed it deliverable.**

## Performance

- **Type:** checkpoint:human-action (Nour-executed, agent-assisted verification on resume)
- **Completed:** 2026-06-05
- **Tasks:** 4 (all blocking, all confirmed)

## Accomplishments
- **Task 1 — DNS:** Four records added at the sealedapp.io registrar. Confirmed resolving via `dig`:
  - SPF (`send.sealedapp.io`): `v=spf1 include:amazonses.com ~all`
  - DMARC (`_dmarc.sealedapp.io`): `v=DMARC1; p=reject; sp=reject; adkim=s; rua=mailto:info@sealedapp.io`
  - MX (`send.sealedapp.io`): `feedback-smtp.us-east-1.amazonses.com`
  - DKIM: empty at `resend._domainkey` (expected — Resend/SES hashed selectors); **confirmed active** by mail-tester "You're properly authenticated" on a real send.
- **Task 2 — Migration 0034:** Applied to live DB. Confirmed live by `create_verification_token` minting a real 7-day token during Plan 05 (token row present in `app_private.verification_tokens`).
- **Task 3 — Secrets:** All three set. Confirmed live by behaviour — 1A + 1B both delivered (RESEND_API_KEY + SEALED_FROM_ADDRESS valid), and the 1B `?test_1b=1` curl authenticated (TEST_TRIGGER_KEY valid).
- **Task 4 — Function deploy:** join-waitlist redeployed. Required the `verify_jwt = false` config.toml fix surfaced as 03-03 Deviation 2 (commit `95192e5`) for the Bearer-keyed 1B trigger to reach the function past the gateway.

## Task Commits
No commits in this (landing-page) repo — all artifacts live in the sibling SEALED-org repo (migration, function, config.toml `95192e5`) and in external services (registrar DNS, Resend dashboard, Supabase secrets). This is a human-action handoff plan; `files_modified: []`.

## Files Created/Modified
None in this repo.

## Decisions Made
See frontmatter `key-decisions`.

## Deviations from Plan
- **SPF/MX shape differs from the plan's assumption.** Plan expected `include:_spf.resend.com` / generic Resend MX; actual is the SES-backed `include:amazonses.com` / `feedback-smtp.us-east-1.amazonses.com`. This is Resend's real dashboard value for this domain (Resend runs on AWS SES), not an error — the plan itself said "or the value Resend showed you." No action needed.
- **DKIM not dig-verifiable at `resend._domainkey`.** Empty result is expected for the SES-backed selector layout. Verified instead by the authoritative downstream signal (auth pass on delivered mail). No action needed.

## Issues Encountered
None blocking. DNS propagation introduced the expected multi-hour wait between adding records and verification.

## User Setup Required
Complete — this WAS the user-setup plan. Nothing outstanding.

## Next Phase Readiness
Infrastructure live and confirmed deliverable by Plan 05. Phase 4 (verify-email function + verify.html) can proceed — note its verification link target (sealedapp.io) only becomes reachable after the Phase 5 Vercel deploy.

---
*Phase: 03-email-infrastructure*
*Completed: 2026-06-05*
