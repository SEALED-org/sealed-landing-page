# Phase 2: Signup Flow - SEALED-org Handoff Prompt

**Audience:** The Claude Code agent in the SEALED-org repo (`/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org`)
**Triggered after:** Phase 2 Plan 02 (migration 0032) and Plan 03 (join-waitlist function source) written in the sibling repo
**Blocks:** Plan 05 (landing-repo client wiring + verification)

---

<prompt>
Run /gsd-quick to apply a new Supabase migration and deploy a new Edge Function for the SEALED landing page.

CONTEXT:
- The sibling repo SEALED-Landing-Page (sealedapp.io) is Phase 2-deploying its signup
  flow. Two new artifacts have been written into THIS repo and need to be applied/
  deployed to our production Supabase project:
    1. supabase/migrations/0032_signup_attempts.sql  (IP rate-limit ledger)
    2. supabase/functions/join-waitlist/{deno.json,index.ts}  (public signup endpoint)
- I did NOT apply the migration or deploy the function. Your job is to do both,
  set one new secret (TURNSTILE_SECRET_KEY), and confirm back.

TASKS:

1. **Apply migration 0032.**
   - Read supabase/migrations/0032_signup_attempts.sql and confirm it follows our
     conventions (app_private schema, RLS enabled, revoke-from-anon then grant-to-
     service_role, bigserial sequence grant, header comment block).
   - Apply: `supabase db push` (or `supabase migration up`) against the production
     project.
   - Verify (Supabase dashboard SQL editor, Run as: service_role):
       select count(*) from app_private.signup_attempts;
         -- expect: 0
       select column_name, data_type
         from information_schema.columns
        where table_schema = 'app_private' and table_name = 'signup_attempts'
        order by ordinal_position;
         -- expect 4 rows: id, ip, attempted_at, outcome
   - Verify (Run as: anon):
       select * from app_private.signup_attempts;
         -- expect: permission denied (this is GOOD — table is service_role-only)

2. **Deploy the join-waitlist function.**
   - Run: `supabase functions deploy join-waitlist` against the production project.
   - Verify: `supabase functions list` shows `join-waitlist` with ACTIVE status.
   - IMPORTANT: This is a PUBLIC endpoint (no service-role guard) called from the
     landing page browser. Do NOT enable any extra Authorization gating; the
     function self-gates with Cloudflare Turnstile.

3. **Set the Turnstile secret.**
   - Nour: go to https://dash.cloudflare.com/?to=/:account/turnstile and create a
     Turnstile widget. Configure: Managed challenge mode (Cloudflare picks visible
     vs invisible per request); hostnames must include BOTH `sealedapp.io` AND
     `localhost`.
   - Copy the SECRET KEY (private — do NOT paste it into any browser or repo file).
   - Run: `supabase secrets set TURNSTILE_SECRET_KEY=<paste-secret-here>` against
     the production project.
   - Verify: `supabase secrets list` shows `TURNSTILE_SECRET_KEY` (value hidden).
   - Also confirm `SUPABASE_SERVICE_ROLE_KEY` is already set (it has been since
     Phase 1 because `dispatch` and `notify` use it). If absent for any reason,
     set it from Project Settings → API → service_role key.

4. **Return the Turnstile SITE KEY to Nour** (separately — this is the PUBLIC key,
   safe to share verbally or via the chat session that started this handoff). Nour
   will paste it into the landing repo's `.env.local` `VITE_TURNSTILE_SITE_KEY=`
   line, replacing the `REPLACE_ME_TURNSTILE_SITE_KEY_FROM_CLOUDFLARE_DASHBOARD`
   placeholder Plan 01 wrote.

5. **Record the cross-repo change in this repo's planning system.**
   - Run `/gsd-quick` (or this repo's equivalent quick-action workflow) and create
     an entry documenting:
       "Migration 0032 (signup_attempts table) + function join-waitlist created in
        response to the SEALED-Landing-Page repo's Phase 2 (Signup Flow). The
        function handles Turnstile siteverify -> IP rate limit (3/IP/24h) ->
        4-state re-signup lookup -> admin.createUser({ email_confirm: false }) ->
        app_private.waitlist_signups insert. Phase 3 of the landing page will
        extend this with the Resend Template 1A send; for Phase 2 the success
        path leaves TODO comments at the email-send sites."
   - Reference the landing repo's Phase 2 path: `.planning/phases/02-signup-flow/`
     so the audit trail closes the loop on both sides.

6. (Optional smoke test) Prove the function is deployed and the secret is set:
       supabase functions invoke join-waitlist --no-verify-jwt \
         --body '{"email":"smoketest+1@example.com","turnstileToken":""}'
   - Expect: `{ "state": "turnstile_failed" }` 200 (the empty token fails
     siteverify, which is the desired failure mode at this layer).
   - Do NOT use a real Cloudflare token here — Nour will exercise the full happy
     path from the landing page itself during Wave 2 verification (Plan 05).

The SEALED-Landing-Page repo is BLOCKED waiting on confirmation. Once steps 1-5
(and optionally 6) are complete, return to that repo's Claude Code session and
reply with: "phase 2 server live" (or paste a short confirmation that the
migration applied + function deployed + Turnstile secret set + site key returned).
The landing repo will then run Plan 05 (client wiring + end-to-end verification).
</prompt>
