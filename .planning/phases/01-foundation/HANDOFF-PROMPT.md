# Phase 1: Foundation - SEALED-org Handoff Prompt

**Audience:** the agent running in `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org`
**Triggered after:** Phase 1 Wave A completes (migration file written, SQL ready for review)
**Blocks:** Phase 1 Wave B (landing page repo cannot proceed until the sibling agent confirms)

---

<prompt>
Run /gsd-quick to apply a new Supabase migration for the SEALED landing page.

CONTEXT:
- The sibling repo SEALED-Landing-Page (sealedapp.io) needs a waitlist_signups
  table and signup_counter view in our shared Supabase project.
- The migration file has already been written into our repo at:
    supabase/migrations/0031_waitlist_signups.sql
- It follows our established conventions (app_private schema, security_invoker=false
  view, service_role grants, anon/authenticated revoked from the underlying table).
- I did NOT apply it. Your job is to (a) review the file, (b) apply it with
  `supabase db push` (or the equivalent CI flow), (c) verify the table and view
  appear in the Supabase dashboard, and (d) record in our planning system that
  this migration exists because the landing page needs it.

TASKS:
1. Open supabase/migrations/0031_waitlist_signups.sql and read it.
2. Verify it follows our conventions (4-digit prefix, app_private schema,
   grants, RLS, comments matching style of 0014 and 0019).
3. Apply the migration: `supabase db push` (or whatever push command the
   CI uses against the production project).
4. Confirm in the Supabase dashboard:
   - Table `app_private.waitlist_signups` exists with columns user_id, status,
     has_letter, created_at.
   - View `public.signup_counter` exists and returns one row with total=115.
   - Test as anon (Supabase SQL editor "Run as: anon"):
       select * from public.signup_counter;  -- should return total=115
       select * from app_private.waitlist_signups;  -- should return permission denied
5. Record this work in your planning system. The migration exists because:
   - The landing page captures waitlist signups before app launch.
   - The counter view powers the social-proof number on the landing page hero.
   - Phase 2 of the landing page roadmap will add the join-waitlist Edge
     Function that actually INSERTs into this table.
6. Reply with a single line confirming the table and view are live, so I can
   unblock the landing page repo and finish wiring its UI.

The landing page repo is BLOCKED on this confirmation. It cannot proceed past
its current Wave A boundary until the table and view are queryable.
</prompt>
