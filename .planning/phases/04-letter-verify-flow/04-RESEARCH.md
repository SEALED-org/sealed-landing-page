# Phase 4: Letter + Verify Flow - Research

**Researched:** 2026-06-05
**Domain:** Cross-repo Supabase Edge Functions + SECURITY DEFINER RPCs + Deno/React-Email + Vite SPA routing
**Confidence:** HIGH (every schema/shape claim is grounded in a read migration or function in the sibling repo)

## Summary

Phase 4 wires the already-built `FirstLetter` UI to a real two-stage flow: **submit** (draft a letter + mint a 7-day token + send Template 1B) and **verify** (consume the token + seal the letter + insert the one `schedules` row the existing cron watches). All backend code lives in the sibling repo `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org`; the only landing-page changes are (a) passing the letter body to the function, (b) a `/verify` page, and (c) a tiny client wrapper.

The single most important ground-truth finding: **delivery is driven exclusively by `app_private.schedules`** (`status='pending' AND deliver_at <= now()`), claimed every minute by the dispatch cron via `app_private.claim_due_letters`. That function **creates the `notification_outbox` rows itself at delivery time** (`0011_claim_due_letters_fn.sql`). Therefore verify-email must insert a **schedules** row, and must **NOT** pre-insert a `notification_outbox` row — doing so would collide with the cron's `on conflict (letter_id, channel) do nothing` insert and risk a malformed email row. This directly contradicts the literal wording of LETTER-07 / DB-04 / the phase goal ("insert schedules + notification_outbox"). See **Flag F1** — the planner must resolve this before writing tasks.

Second key finding: **no `app_private.letters` row is created today.** `join-waitlist` always calls `create_waitlist_signup(p_user_id, p_has_letter => false)` and the client `joinWaitlist(email, token)` never sends the letter body. Path B is currently identical to Path A. Phase 4 builds the entire letter-creation path from scratch, following the existing `0033`/`0034` public-wrapper pattern (`app_private` sealed; `public` SECURITY DEFINER functions granted to `service_role` only).

**Primary recommendation:** Two new SECURITY DEFINER RPCs in a new migration `0035` (`public.upsert_pending_letter` for submit/D-04, `public.seal_letter_with_token` for verify/SEC-05 — the seal as ONE atomic RPC), one new `verify-email` Edge Function (`verify_jwt = false`), the letter body threaded through `joinWaitlist` → `join-waitlist`, the `?test_1b=1` block removed, and a **standalone `verify.html`** page (mirroring `privacy.html`) for the `/verify` route.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Compose letter, live count, 2.5s seal animation | Browser (FirstLetter.tsx) | — | Already built (Phase 1.5); UI only |
| Client-side 2,000-char cap | Browser | — | UX guard; not the security boundary (D-02) |
| Send letter body + email + token to server | Browser → API | — | `joinWaitlist()` must add `letter` param |
| Draft letter row + token mint + 1B send (Path B submit) | API (join-waitlist Edge Fn) | DB (RPCs) | service-role-only; `app_private` never client-reachable |
| Server-side 2,000-char enforcement | API + DB | — | Edge Fn truncates/rejects; DB CHECK is defense-in-depth (D-02) |
| Token consumption + seal + schedule insert (verify) | API (verify-email Edge Fn) | DB (one atomic RPC) | Atomicity required (SEC-05, no partial seal) |
| `/verify` page (read token, show states) | Browser / Static | CDN (Vercel) | Lowest-friction: standalone HTML, no router |
| Jan 1 2027 delivery | DB (pg_cron) + API (dispatch/notify) | — | Already exists; Phase 4 only feeds it a `schedules` row |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Delivery moment (`deliver_at`):** All sealed letters deliver at a single fixed instant: **`2027-01-01T13:00:00Z`** (Jan 1, 2027, 1pm UTC). One fixed UTC moment for everyone — NOT per-writer local time. Chosen for reliability on the hard deadline (one cron fire, no timezone capture) and daytime reach across most of the world.

**D-02 — Letter length cap:** Maximum **2,000 characters** per letter. Enforced client-side (live count already in FirstLetter) AND server-side (the create-letter path must reject/truncate >2,000 so the cap cannot be bypassed). A DB-level guard is preferred if the `letters` schema supports it.

**D-03 — Writing a letter IS signing up (Path B = waitlist + letter):** A user does NOT need to use the hero form first. Writing a letter and submitting their email **enrolls them in the waitlist AND creates the pending letter in one action.** Already true that FirstLetter calls the same `join-waitlist` function; Phase 4 must preserve this.

**D-04 — Repeat signup with a pending (unverified) letter:** If a user already has an unverified/pending letter and signs up again with the same email: **do NOT create a duplicate user or duplicate letter. Re-send the Template 1B verify link.** If they wrote a NEW letter on the second visit, the **newest letter wins** (replace the pending letter's content, then re-send). If no new letter (Path A re-signup), just re-send the existing letter's verify link. Re-sending should mint/refresh a valid 7-day token (consistent with Phase 3's `create_verification_token`).

### Claude's Discretion

- **/verify page states** — handle all of: success (sealed), already-used token (idempotent success), expired token (>7 days — offer resend), invalid/unknown token (graceful error). Build on the locked Claude Design aesthetic (cream paper, Instrument Serif, ink). Small surface — UI-SPEC skipped (`--skip-ui`).
- Exact `verify-email` Edge Function shape, token-consumption transaction (check `expires_at > now()` AND `used_at IS NULL`, set `used_at`, seal letter, insert schedule — ideally one DB transaction / SECURITY DEFINER RPC), and the post-verify in-page success state. **No Template 2 is sent on verify** (success criterion 4).

### Deferred Ideas (OUT OF SCOPE)

- HTTPS one-click unsubscribe + auto-unsubscribe webhook (v2).
- Template 2 (app-launch invitation) — deferred to v2 (EMAIL-02).
- "Add to calendar" .ics on the sealed confirmation — v2.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LETTER-01 | Write letter in inline textarea after email submission | Already built in `FirstLetter.tsx` (`letter` state, step machine `write→email→success`). No change. |
| LETTER-02 | Can skip writing entirely (Path A) | Hero form path: `joinWaitlist` with no letter → no token, no 1B. Function already branches on `has_letter`. |
| LETTER-03 | Live word count | Built: `wordCount` in `FirstLetter.tsx:159`. No change. |
| LETTER-04 | Typewriter placeholder prompts | Built: `Typewriter` + `typewriterPhrases`. No change. |
| LETTER-05 | 2.5s sealing animation → sealed confirmation | Built: `transitionTo('success')` step. No change. |
| LETTER-06 | Letter stored in `app_private.letters`, `is_canary=false`, draft (no sealed_at/deliver_at) until verified | NEW: `upsert_pending_letter` RPC inserts draft row (`sealed_at=null, deliver_at=null, is_canary=false`). Schema confirmed `0001`/`0016`. |
| LETTER-07 | On verify: `sealed_at=now()`, `deliver_at` set; insert `schedules` (+ outbox?) | NEW: `seal_letter_with_token` RPC. **⚠ outbox part contradicts cron design — see F1.** |
| SEC-05 | Only verification can schedule delivery; rightful token holder only; expired/used rejected | Atomic seal RPC gated on `expires_at > now() AND used_at IS NULL`; token→user_id→letter ownership chain. |
| EMAIL-B2 | Verify link → letter sealed → success in UI; no further email | verify-email returns a state; `/verify` page renders it. No `sendResendEmail` call in verify-email. |
| EMAIL-B3 | Verification required before scheduling | Draft has no `schedules` row; only `seal_letter_with_token` inserts it. Unverified letters never reach the cron. |
| DB-04 | `verify-email` Edge Function: seal + insert schedule (no email back) | NEW function, mirrors join-waitlist DI/CORS shape; calls the seal RPC. |
| EMAIL-01 | Template 3 (Jan 1 delivery) already built; no new code | Confirmed: `DeliveryLetterEmail.tsx` + dispatch/notify cron handle it. verify-email only feeds `schedules`. |

## Standard Stack

These are already pinned in the repos — Phase 4 adds **no new dependencies**. Do not introduce a router or new packages.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.103.2 | Client `functions.invoke` + Edge Fn admin client | Pinned in both `package.json` and `_shared/admin-client.ts` [VERIFIED: both repos] |
| `@react-email/components` | (Deno npm:) | Render Template 1B HTML+text in Edge Fn | Already used by `join-waitlist/index.ts` [VERIFIED] |
| Deno | 2 (`deno_version = 2`) | Edge Function runtime | `config.toml [edge_runtime] deno_version = 2` [VERIFIED] |
| Vite | 6.2.0 | Static build; serves `/verify.html` natively | `package.json` [VERIFIED] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@marsidev/react-turnstile` | 1.5.2 | Invisible CAPTCHA on letter submit | Already wired in `FirstLetter.tsx` — submit already produces a token |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Standalone `verify.html` | `react-router-dom` SPA route | Adds a dependency + bundle weight + a Vercel rewrite for a single page; the repo already proves the multi-HTML-page pattern (`privacy.html`, `terms.html`). Standalone is lower-friction and Vercel-native (no rewrite needed). |
| Standalone `verify.html` | Vercel rewrite `/verify → index.html` + client routing in `App.tsx` | Couples the marketing SPA to a transactional page; requires `vercel.json` to exist before Phase 5; reflows the whole React tree for one screen. |

**Installation:** None. (`npm install` is a no-op for new deps.)

**Version verification:** Versions read directly from committed `package.json` (landing) and `_shared/admin-client.ts` (`npm:@supabase/supabase-js@2.103.2`, sibling) on 2026-06-05. No registry call needed — versions are locked by the existing build, and Phase 4 must match them, not upgrade.

## Ground-Truth Schema (read from sibling migrations)

### `app_private.letters` — `0001_letters_table.sql` + `0009` + `0016`

```sql
create table app_private.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  deliver_at timestamptz,                 -- NULL while draft
  sealed_at timestamptz,                  -- NULL while draft
  tz text not null,                       -- ⚠ NOT NULL, NO DEFAULT — must be supplied
  label text,
  created_at timestamptz not null default now(),
  check ((sealed_at is null and deliver_at is null)
      or (sealed_at is not null and deliver_at is not null))   -- draft/sealed invariant
);
-- 0009: delivered_at timestamptz   (set by dispatcher, NOT by verify-email)
-- 0016: is_canary boolean not null default false
```

**Findings vs. assumptions:**
- **The column is `body`, not `content`.** [VERIFIED: `0001_letters_table.sql`]
- **There is NO `status` column.** Draft vs sealed is expressed by the `(sealed_at, deliver_at)` pair — both NULL = draft, both set = sealed. Enforced by the CHECK constraint. [VERIFIED: `0001`]
- **`tz` is `NOT NULL` with no default.** The notify worker reads `letter.tz` to format "composed on <date>" in the delivery email (`notify-core.ts:90,95`). For D-01 (one fixed UTC moment) **insert `tz = 'UTC'`** — matches what `seed_test_letter` does (`0030`). [VERIFIED: `0030`, `notify-core.ts`]
- **There is NO length CHECK today.** D-02's preferred DB guard does not exist yet — Phase 4's migration should add `check (char_length(body) <= 2000)` for defense-in-depth. [VERIFIED: full `0001`/`0009`/`0016` read]
- `on delete cascade` from `auth.users` means deleting the auth user cleans up letters/schedules/outbox/tokens automatically.

### `app_private.schedules` — `0007_schedules_table.sql`

```sql
create table app_private.schedules (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references app_private.letters(id) on delete cascade,
  deliver_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','claimed','delivered','failed')),
  claimed_at timestamptz, delivered_at timestamptz,
  attempt_count integer not null default 0, last_error text,
  created_at timestamptz not null default now(),
  unique (letter_id)                       -- one schedule per letter (idempotency anchor)
);
```

**This is the ONLY row the cron needs.** `claim_due_letters` selects `from app_private.schedules where status='pending' and deliver_at <= now()`. The `unique(letter_id)` lets verify-email use `on conflict (letter_id) do update ... status='pending'` for safe re-runs (the `seed_test_schedule` upsert in `0008` is the exact pattern). [VERIFIED: `0007`, `0008`, `0011`]

### `app_private.notification_outbox` — `0010` + `0020`

```sql
create table app_private.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references app_private.letters(id) on delete cascade,
  channel text not null check (channel in ('push','email')),
  status text not null default 'pending'
    check (status in ('pending','claimed','sent','failed','skipped_no_target')),
  ... worker_id, sent_at, attempt_count, next_attempt_at default now(), ...
  unique (letter_id, channel)
);
-- 0020 adds a status-shape CHECK: e.g. status='claimed' requires worker_id NOT NULL.
```

**verify-email should NOT insert into this table.** `claim_due_letters` inserts both the `push` and `email` rows at delivery time with `on conflict (letter_id, channel) do nothing` (`0011`, the `push_outbox`/`email_outbox` CTEs). A pre-inserted `email` row would suppress the cron's insert via the conflict clause — harmless for the email channel, but it would ALSO mean **no `push` row** unless verify-email also inserts that, and the `0020` status-shape CHECK + the canary trigger (`0016`) make hand-crafting these rows fragile. Let the cron own them. [VERIFIED: `0011`, `0020`, `0016`]

### `app_private.verification_tokens` — `0034` (Phase 3, already deployed)

```sql
create table app_private.verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(32),'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
```
- Token is **per-user**, not per-letter (no `letter_id` column). [VERIFIED: `0034`]
- `public.create_verification_token(p_user_id uuid) → (id, token)` already exists and is used by the `?test_1b=1` trigger. Phase 4 reuses it verbatim. [VERIFIED]
- `public.lookup_user_id_by_email(p_email) → uuid` already exists. [VERIFIED]

## How Delivery Actually Works (the cron contract)

```
pg_cron 'invoke-dispatch-every-minute'  (0018, "* * * * *")
   └─ POST /functions/v1/dispatch
        └─ rpc public.dispatch_claim_due(50)        (0021)
             └─ app_private.claim_due_letters(50)   (0011)
                  • SELECT FROM schedules WHERE status='pending' AND deliver_at <= now()  FOR UPDATE SKIP LOCKED
                  • UPDATE letters SET delivered_at=now() WHERE delivered_at IS NULL   (idempotency gate)
                  • INSERT notification_outbox (letter_id,'push','pending') ON CONFLICT DO NOTHING
                  • INSERT notification_outbox (letter_id,'email','pending') ON CONFLICT DO NOTHING
                  • UPDATE schedules SET status='delivered'

pg_cron 'invoke-notify-every-minute'    (0025, "* * * * *")
   └─ POST /functions/v1/notify
        └─ rpc public.claim_notification_outbox_batch(25,'notify-worker')  (0013)
             └─ per row: SELECT letters.body, created_at, tz  → render DeliveryLetterEmail → sendResendEmail
```

**Implication for Phase 4:** verify-email's job is finished once a `schedules` row exists with `deliver_at='2027-01-01T13:00:00Z'` and `status='pending'`, and the letter is sealed. The two crons do everything else on Jan 1. [VERIFIED: `0018`, `0021`, `0011`, `0025`, `0013`, `notify-core.ts`]

## Architecture Patterns

### System Architecture Diagram

```
                         LANDING PAGE (this repo, Vite SPA on Vercel)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  FirstLetter.tsx                                                            │
  │   write ──Seal&send──▶ email ──submit(email,letter,token)──▶ onEmailSubmit  │
  │                                                                  │          │
  │                                          joinWaitlist(email, letter, token) │  ◀── ADD letter param
  └──────────────────────────────────────────────────────────│───────────────┘
                                                              ▼ supabase.functions.invoke('join-waitlist', {email,letter,turnstileToken})
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  SEALED-org  Edge Function: join-waitlist  (verify_jwt=false)               │
  │   Turnstile ✓ → lookup_signup_state(email)                                  │
  │     new + letter ──▶ createUser → create_waitlist_signup(uid, has_letter=T) │
  │                       upsert_pending_letter(uid, body)  ◀── NEW RPC (0035)  │
  │                       create_verification_token(uid)    (0034, reuse)       │
  │                       sendResendEmail(SealLetterEmail, verifyUrl)  ◀── 1B   │
  │     unverified+letter (D-04) ──▶ upsert_pending_letter (newest wins)        │
  │                                 → fresh token → re-send 1B                  │
  │     new/dup no letter ──▶ Template 1A (unchanged)                           │
  └──────────────────────────────────────────────────────────│───────────────┘
                                                              ▼  Resend → user inbox (Template 1B)
       user clicks  https://sealedapp.io/verify?token=<hex>
                                                              ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  verify.html (static, locked aesthetic) ── reads ?token ── fetch ─────────┐ │
  └───────────────────────────────────────────────────────────────────────│──┘ │
                                                                            ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  SEALED-org Edge Function: verify-email  (verify_jwt=false)  ◀── NEW        │
  │   rpc seal_letter_with_token(token)  ◀── NEW atomic RPC (0035)              │
  │     • token valid? (expires_at>now() AND used_at IS NULL)  else→ state      │
  │     • SET used_at=now()                                                     │
  │     • UPDATE newest draft letter SET sealed_at=now(),                       │
  │              deliver_at='2027-01-01T13:00:00Z'                              │
  │     • INSERT schedules(letter_id, deliver_at, 'pending') ON CONFLICT upsert │
  │     • RETURN state: sealed | already_sealed | expired | invalid            │
  │   (NO sendResendEmail — EMAIL-B2)                                           │
  └──────────────────────────────────────────────────────────│───────────────┘
                                                              ▼
              app_private.schedules (status=pending, deliver_at=2027-01-01T13:00Z)
                                                              ▼
              pg_cron dispatch+notify (EXISTING) ── fires Jan 1 2027 ── Template 3
```

### Recommended File Layout (changes only)

```
SEALED-org/                                       (sibling repo — most of the work)
├── supabase/migrations/
│   └── 0035_letter_seal_rpcs.sql                 # NEW: upsert_pending_letter + seal_letter_with_token + body CHECK
├── supabase/functions/
│   ├── join-waitlist/index.ts                    # EDIT: accept letter, Path B branch, REMOVE ?test_1b=1
│   └── verify-email/index.ts                     # NEW: CORS + GET/POST → seal_letter_with_token RPC
└── supabase/config.toml                          # EDIT: add [functions.verify-email] verify_jwt=false

SEALED Landing Page Claude Design/                (this repo)
├── verify.html                                   # NEW: standalone /verify page (mirror privacy.html)
├── src/
│   ├── lib/supabase.ts                           # EDIT: joinWaitlist(email, letter, token)
│   ├── App.tsx                                    # EDIT: thread letter into onEmailSubmit
│   └── components/FirstLetter.tsx                 # EDIT: onEmailSubmit signature gains letter
└── (vite multi-page picks up verify.html automatically — no config needed)
```

### Pattern 1: SECURITY DEFINER public wrapper over sealed `app_private`
**What:** `app_private` is never exposed to PostgREST; every Edge-Function DB op goes through a `public` function declared `security definer set search_path = ''`, granted to `service_role` only.
**When to use:** Every new RPC in `0035`.
**Example:**
```sql
-- Source: SEALED-org/supabase/migrations/0034_verification_tokens.sql (pattern)
create or replace function public.create_verification_token(p_user_id uuid)
returns table (id uuid, token text)
language sql security definer set search_path = ''
as $$
  insert into app_private.verification_tokens (user_id) values (p_user_id)
  returning id, token;
$$;
revoke all on function public.create_verification_token(uuid) from public;
grant execute on function public.create_verification_token(uuid) to service_role;
```

### Pattern 2: Atomic seal as ONE plpgsql RPC (SEC-05)
**What:** Token-check → mark used → seal letter → insert schedule, all in one function body = one transaction. No partial-seal race.
**When to use:** `public.seal_letter_with_token(p_token text)`.
**Example (shape to implement — verify exact SQL against schema before committing):**
```sql
-- Source pattern: 0011 (atomic claim) + 0008 (schedule upsert) + 0034 (token table)
create or replace function public.seal_letter_with_token(p_token text)
returns text                          -- 'sealed' | 'already_sealed' | 'expired' | 'invalid'
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid; v_used timestamptz; v_expires timestamptz;
  v_letter_id uuid; v_already boolean;
  v_deliver constant timestamptz := '2027-01-01T13:00:00Z';   -- D-01
begin
  -- Lock the token row to serialize concurrent double-clicks (SEC-05 / double-seal).
  select user_id, used_at, expires_at into v_user_id, v_used, v_expires
    from app_private.verification_tokens where token = p_token
    for update;
  if v_user_id is null then return 'invalid'; end if;

  -- Newest draft letter for this user (D-04 newest-wins already applied at submit time).
  select id, (sealed_at is not null) into v_letter_id, v_already
    from app_private.letters
    where user_id = v_user_id
    order by created_at desc limit 1;

  -- Idempotent success: token already used AND a letter is sealed → 'already_sealed'.
  if v_used is not null then
    return case when v_already then 'already_sealed' else 'invalid' end;
  end if;
  if v_expires <= now() then return 'expired'; end if;
  if v_letter_id is null then return 'invalid'; end if;

  update app_private.verification_tokens set used_at = now() where token = p_token;

  if not v_already then
    update app_private.letters
       set sealed_at = now(), deliver_at = v_deliver
     where id = v_letter_id;
    insert into app_private.schedules (letter_id, deliver_at, status)
      values (v_letter_id, v_deliver, 'pending')
      on conflict (letter_id) do update
        set deliver_at = excluded.deliver_at, status = 'pending',
            claimed_at = null, delivered_at = null, attempt_count = 0, last_error = null;
  end if;
  return case when v_already then 'already_sealed' else 'sealed' end;
end;
$$;
```
> Planner: the `for update` on the token row is the double-seal guard. Confirm the `(sealed_at, deliver_at)` CHECK constraint is satisfied (both set together). Do NOT insert `notification_outbox` here (F1).

### Pattern 3: Edge Function env-DI + CORS + privacy-safe logging
**What:** Read env once at module load, inject into wrapper calls; never log recipient/body/token value (only ids); CORS `*` with the existing header set.
**When to use:** `verify-email/index.ts`.
**Example:** mirror `join-waitlist/index.ts:23-61` (corsHeaders, JSON_HEADERS, `adminClient()`, `console.log('...', { token_id })`).

### Pattern 4: Standalone HTML page for `/verify`
**What:** A `verify.html` at repo root with inline `<style>` reusing the locked tokens (`--paper:#fefcf8`, `--font-serif:"Instrument Serif"`, ink scale) and a small inline `<script>` that reads `?token`, POSTs to the verify-email function, and swaps in success/expired/used/invalid copy.
**When to use:** The `/verify` route. Vite emits `verify.html` to `dist/` automatically (multi-page) and Vercel serves `/verify` (clean URL) without any rewrite.
**Source pattern:** `privacy.html` (lines 1-60 read — full inline `:root` token block + paper-grain `body::before`).

### Anti-Patterns to Avoid
- **Pre-inserting `notification_outbox` in verify-email** — the cron owns those rows (F1).
- **Adding `react-router-dom`** — unnecessary; the repo's multi-HTML pattern already solves routing.
- **Per-letter tokens** — the token table is per-user (no `letter_id`); don't invent a join.
- **Capturing the writer's local timezone into `deliver_at`** — D-01 is one fixed UTC instant; store `tz='UTC'`.
- **Sending any email from verify-email** — EMAIL-B2 says no email after verification.
- **Reusing the `1a-...` idempotency key shape for 1B without a unique suffix** — see Pitfall on Resend dedupe.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schedule a Jan-1 delivery | A new cron / timer / queue | Insert one `app_private.schedules` row | Dispatch+notify cron already runs every minute (`0018`/`0025`) |
| Build the delivery email | A new template/send | Existing `DeliveryLetterEmail` + notify worker | EMAIL-01: already built; cron renders it |
| 7-day token table + mint | New token logic | `verification_tokens` + `create_verification_token` (`0034`) | Deployed in Phase 3; reuse verbatim |
| Reach `auth.users` / `app_private` from a function | `.schema('auth')` / `.schema('app_private')` calls | `public` SECURITY DEFINER wrappers | Hosted Data API rejects non-public schemas ("Invalid schema") — see `0033` header |
| Token randomness | `Math.random()` / app-side hex | `encode(gen_random_bytes(32),'hex')` default | Already the column default (`0034`); CSPRNG |
| Atomic claim/seal | SELECT-then-UPDATE in JS | `for update` inside one plpgsql RPC | Prevents double-seal / partial-seal races (Codex HIGH precedent in `0011`) |
| `/verify` routing | React Router | `verify.html` static page | Vite multi-page + Vercel clean URLs, zero deps |

**Key insight:** Almost everything Phase 4 "needs" already exists in the sibling repo. The net-new surface is two RPCs, one Edge Function, one HTML page, and threading the letter body through one existing client call.

## Common Pitfalls

### Pitfall 1: `tz` is NOT NULL with no default — insert will fail silently in the RPC
**What goes wrong:** `insert into app_private.letters (user_id, body)` throws `null value in column "tz"`.
**Why:** `0001` declares `tz text not null` with no default; only `seed_test_letter` supplies it.
**How to avoid:** `upsert_pending_letter` must insert `tz = 'UTC'` (D-01 single-UTC model).
**Warning signs:** Path B submit returns `server_error`; function logs an insert exception.

### Pitfall 2: The letter body never reaches the server today
**What goes wrong:** Planner assumes Path B already stores the letter; it does not.
**Why:** `joinWaitlist(email, token)` (supabase.ts) and `onEmailSubmit(email, token)` (App.tsx) both drop `letter`. `create_waitlist_signup` always passes `has_letter=false`.
**How to avoid:** Add a `letter?: string` param to `joinWaitlist` and `onEmailSubmit`, pass it from `FirstLetter`'s `letter` state, include in the `invoke` body, and branch in `join-waitlist` on a non-empty letter.
**Warning signs:** Letters table stays empty after a Path B submit.

### Pitfall 3: `notification_outbox` double-insert (F1)
**What goes wrong:** verify-email inserts an `email` outbox row; the cron's `email_outbox` insert no-ops on conflict; the `push` row may be missing or the `0020` status-shape CHECK rejects a malformed hand-built row.
**How to avoid:** Insert ONLY a `schedules` row. Let `claim_due_letters` create both outbox rows on Jan 1.

### Pitfall 4: Resend idempotency-key dedupe on re-sent 1B (D-04)
**What goes wrong:** D-04 re-sends Template 1B; if the idempotency key is stable (`1b-<token_id>`) and the user re-signs within Resend's 24h dedupe window, the second email is silently dropped.
**Why:** `sendResendEmail` sets `Idempotency-Key`; Resend dedupes within ~24h. Phase 3 solved the same problem for 1A with a `Date.now()` suffix (`1a-resend-${userId}-${Date.now()}`).
**How to avoid:** Mint a FRESH token per re-send (new `token_id`) and key the send `1b-<new_token_id>` — or add a `-${Date.now()}` suffix. A fresh token also satisfies D-04 "refresh a valid 7-day token."
**Warning signs:** User re-signs, sees the success copy, but no new email arrives.

### Pitfall 5: Double-click / refresh on the verify link (idempotency)
**What goes wrong:** User clicks the 1B link twice (or the page auto-fetches twice in React StrictMode-style double-invoke) → two seal attempts.
**How to avoid:** The seal RPC `for update`-locks the token row and returns `already_sealed` on the second call (`used_at` already set). The `/verify` page must render `already_sealed` as a SUCCESS state (idempotent), per Discretion.
**Warning signs:** Second click shows an error instead of "already sealed."

### Pitfall 6: deliver_at literal must be UTC (`Z`), not local
**What goes wrong:** Storing `'2027-01-01 13:00:00'` without `Z`/offset is interpreted in the session timezone → wrong fire time.
**How to avoid:** Use the literal `'2027-01-01T13:00:00Z'` (or `timestamptz '2027-01-01 13:00:00+00'`). The cron compares `deliver_at <= now()`; both are `timestamptz`, so a correctly-tagged literal is unambiguous.

### Pitfall 7: Email send failure must not break the seal/submit response
**What goes wrong:** A Resend outage on the 1B send aborts the whole submit, leaving a draft letter with no email (or no draft at all).
**Why:** Phase 3 established (join-waitlist) that email sends are best-effort try/catch and must not change the `{ state }` response.
**How to avoid:** In `join-waitlist`, wrap the 1B send in try/catch exactly like the 1A send; the draft+token are already persisted, so the user can re-trigger via D-04 re-signup.

### Pitfall 8: react-email / Deno render specifics (already known)
- Render HTML with `renderAsync(element)`; render plain text with `renderAsync(element, { plainText: true })` in a try/catch (best-effort) — exactly as `renderEmail()` in `join-waitlist/index.ts:52-61`.
- Import React as `import * as React from 'react'` and create elements with `React.createElement(SealLetterEmail, { verifyUrl })`.

### Pitfall 9: `verify-email` must have `verify_jwt = false`
**What goes wrong:** The browser hits verify-email with only the anon key; the new `sb_secret_*` service-role token isn't a JWT, and gateway JWT verification rejects valid requests (`UNAUTHORIZED_INVALID_JWT_FORMAT`).
**How to avoid:** Add `[functions.verify-email]\nverify_jwt = false` to `config.toml` (same as every other function in the project). Auth truth is the token check inside the seal RPC. Because the token IS the bearer secret (one-time, 7-day, CSPRNG), no extra header auth is needed for the public verify call (SEC-05 is satisfied by token validity + ownership chain).

## Runtime State Inventory

This is a feature phase, but it removes a runtime trigger (`?test_1b=1`) and its secret. Inventory:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `app_private.verification_tokens` rows minted by the `?test_1b=1` trigger during Phase 3 testing (used_at NULL, valid 7 days) | None blocking — harmless; they expire. Optionally let them stand. |
| Live service config | `pg_cron` jobs `invoke-dispatch-every-minute`, `invoke-notify-every-minute` already registered in the hosted DB (not re-derived from git on push) | None — Phase 4 only feeds them a `schedules` row; do NOT touch the cron. |
| OS-registered state | None | None — no OS-level registrations in this phase. |
| Secrets/env vars | `TEST_TRIGGER_KEY` Supabase secret (set for the Phase 3 1B test trigger). After removing the `?test_1b=1` block it is unused. | After deploy: `supabase secrets unset TEST_TRIGGER_KEY` (cleanup, Phase 5 task — not blocking). No NEW secrets needed (verify-email reuses `SUPABASE_*`, `RESEND_*` — and verify-email sends no email so `RESEND_*` is optional for it). |
| Build artifacts | None — no compiled artifacts carry the old name. | None. |

**Note:** Removing the `?test_1b=1` block also makes the `[functions.join-waitlist] verify_jwt=false` comment about the trigger partly stale — `verify_jwt` must STAY `false` (the public signup path still needs it), only the comment's trigger rationale becomes obsolete.

## State of the Art

| Old Approach (current code) | Current/Target Approach | Why |
|--------------|------------------|--------|
| `?test_1b=1` guarded trigger sends 1B to existing users | Production Path-B branch in the POST pipeline sends 1B on real letter submit | D-04 + EMAIL-B1; trigger removed (03-03 SUMMARY) |
| `create_waitlist_signup(uid, false)` always | `has_letter = (letter is non-empty)` | D-03: writing a letter sets `has_letter=true` |
| Letter body discarded client-side | Body threaded `FirstLetter → joinWaitlist → invoke body → upsert_pending_letter` | LETTER-06 |
| No `/verify` route | `verify.html` static page | EMAIL-B2; link format fixed by `0034`/1B |

**Deprecated/outdated after this phase:**
- `?test_1b=1` block in `join-waitlist/index.ts` (lines 167-216) — delete.
- `TEST_TRIGGER_KEY` secret — unset after deploy.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Resend dedupes on `Idempotency-Key` within ~24h (basis for Pitfall 4) | Pitfalls | If Resend's window differs, the fresh-token-per-resend fix still works; only the rationale shifts. LOW. |
| A2 | Vercel serves `dist/verify.html` at the clean URL `/verify` with no rewrite (Vite multi-page output) | Standard Stack / Pattern 4 | If Vercel needs `cleanUrls: true` or a rewrite, Phase 5's `vercel.json` adds one line. The 1B link is `/verify` (no `.html`), so confirm clean-URL serving in Phase 5 deploy. MEDIUM. |
| A3 | One fixed `deliver_at='2027-01-01T13:00:00Z'` for all letters is compatible with the cron (it compares `deliver_at <= now()` only) | Pattern 2 | Verified by reading `claim_due_letters`; no per-letter timezone logic in the cron. LOW. |

## Open Questions (RESOLVED)

1. **F1 — LETTER-07/DB-04 say "insert schedules + notification_outbox"; the cron design says schedules ONLY.**
   - What we know: `claim_due_letters` (`0011`) creates BOTH `notification_outbox` rows itself at delivery time with `on conflict (letter_id, channel) do nothing`. Pre-inserting them in verify-email is at best redundant and at worst breaks the `0020` status-shape CHECK / push-row creation.
   - What's unclear: whether the requirement text is prescriptive or descriptive.
   - **Recommendation:** Plan verify-email to insert the `schedules` row ONLY. Treat LETTER-07/DB-04's "+ notification_outbox" as satisfied transitively by the cron. The planner should note this deviation in the plan and the verifier should check that NO outbox insert exists in verify-email. (HIGH confidence this is correct — grounded in `0011`.)

2. **One letter per user (REQUIREMENTS "Out of Scope: Multi-letter") vs. D-04 newest-wins.**
   - What we know: Out-of-scope says one letter per user; D-04 says newest letter replaces the pending one.
   - What's unclear: whether `upsert_pending_letter` should UPDATE the existing draft or INSERT a new draft and seal the newest.
   - **Recommendation:** `upsert_pending_letter` should UPDATE the user's existing DRAFT letter (sealed_at IS NULL) if one exists, else INSERT — guaranteeing one row per user and making the seal RPC's "newest draft" lookup deterministic. If a user already has a SEALED letter, D-04's verified_with_letter path returns early (no new draft). The planner should make this explicit in the RPC spec.

3. **`label` column usage.**
   - What we know: `letters.label` is nullable; `seed_test_letter` sets `'test-fixture'`. The delivery email does not require it.
   - **Recommendation:** Leave `label` NULL for production letters (or set a small constant like `'first-letter'` for analytics). Non-blocking — Claude's discretion.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (hosted) | All DB/Edge work | ✓ (Phase 1-3 deployed) | PG 15 | — |
| `pg_cron` dispatch+notify jobs | Jan-1 delivery | ✓ registered | `0018`/`0025` | — |
| `verification_tokens` + RPCs | Token mint/consume | ✓ | `0034` | — |
| Resend verified domain (sealedapp.io) | 1B send | ⚠ DNS pending (STATE.md DEPLOY-04) | — | Send is best-effort; draft+token persist regardless (Pitfall 7) |
| Vercel deploy / clean URLs | `/verify` reachable in prod | ✗ (Phase 5) | — | Local: `vite preview` serves `verify.html`; prod confirmed in Phase 5 (A2) |
| `supabase` CLI (db push, functions deploy, secrets) | Ship `0035` + verify-email | Assumed (used in Phase 3) | — | Same human-action handoff as Phase 3 |

**Missing dependencies with no fallback:** None block PLANNING. Prod `/verify` reachability and Resend DNS are Phase 5 deploy gates, not Phase 4 code gates.

**Missing dependencies with fallback:** Resend DNS (best-effort send); Vercel clean URLs (verify in Phase 5).

## Project Constraints (from CLAUDE.md)

- **GSD workflow:** all edits via a GSD command (this is `/gsd-plan-phase 4`). No direct edits outside the workflow.
- **UI workflow:** `verify.html` is a NEW visual surface → normally requires `frontend-design` + `/gsd-ui-phase`. **However** CONTEXT.md explicitly ran `--skip-ui` (design language locked from Claude Design; small surface). The verify page MUST reuse the locked tokens from `privacy.html`/`index.css` verbatim (`--paper:#fefcf8`, `--font-serif:"Instrument Serif"`, ink scale, paper grain). No new aesthetic decisions.
- **Supabase only:** no Firebase remnants. (Already removed in Phase 1, DB-05.)
- **Animation:** use `motion/react` only (not `framer-motion`) — though `verify.html` is plain HTML/CSS and may use CSS transitions to stay dependency-free.
- **Code style:** 2-space indent, single-quote imports / double-quote JSX attrs, trailing commas, `handle*` event handlers, `is*/show*` booleans, `default` component export, inline `[ComponentName]Props` interfaces, relative imports.
- **Edge Fn boundary:** `admin-client.ts` / service-role never imported by client code (`scripts/check-edge-imports.ts` enforces this in the sibling repo).
- **Privacy-safe logging:** never log recipient, verifyUrl, html, or raw token — only ids (`token_id`, `user_id`, `letter_id`). Established in Phase 3 (Codex MEDIUM).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Custom one-time 7-day token (`verification_tokens`); token IS the bearer credential for the verify call |
| V3 Session Management | no | No sessions on the landing site (OTP login is the app, out of scope) |
| V4 Access Control | yes | `app_private` sealed; SECURITY DEFINER `public` wrappers granted to `service_role` only; token→user→letter ownership chain (SEC-05) |
| V5 Input Validation | yes | Email (HTML5 + server), letter ≤2000 chars (client + Edge Fn + DB CHECK), token format implicit (unique hex) |
| V6 Cryptography | yes | `gen_random_bytes(32)` CSPRNG token (never hand-rolled) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Letter-bombing arbitrary emails | Spoofing/Repudiation | Verification gate (SEC-05): unverified letters never reach `schedules`; token only mints for the submitter's own auth user |
| Token replay / double-seal | Tampering | `for update` lock + `used_at` check in the seal RPC; second use → idempotent `already_sealed` |
| Expired token use | Tampering | `expires_at > now()` check → `expired` state |
| Forged/guessed token | Spoofing | 256-bit CSPRNG hex, unique constraint; unknown token → `invalid` |
| Service-role key exposure | Info Disclosure | Key only in Edge Fn env (`admin-client.ts`); never in bundle; import-boundary check (SEC-04) |
| `app_private` exposure via Data API | Info Disclosure | Schema revoked from anon/authenticated; access only via SECURITY DEFINER `public` wrappers (`0019`/`0033`/`0034`) |
| Open verify endpoint abuse | DoS | `verify_jwt=false` but the body requires a valid token; consider a light per-IP limit if abuse appears (not required for v1) |
| Letter body / PII in logs | Info Disclosure | Privacy-safe logging — ids only (Phase 3 precedent) |

## Sources

### Primary (HIGH confidence) — files read this session
- `SEALED-org/supabase/migrations/0001_letters_table.sql` — letters columns, draft/sealed CHECK, `tz NOT NULL`, `body` (not content), no status column, no length CHECK
- `0007_schedules_table.sql`, `0008_test_helper_schedule.sql` — schedules shape + upsert pattern
- `0009_letters_delivered_at.sql`, `0016_letters_canary_and_filter.sql` — `delivered_at`, `is_canary`, canary outbox trigger
- `0010_notification_outbox.sql`, `0020_notification_outbox_status_shape.sql` — outbox shape + status CHECK
- `0011_claim_due_letters_fn.sql` — **delivery is driven by schedules; cron creates outbox rows itself**
- `0013`, `0021`, `0018`, `0025` — claim/dispatch wrappers + pg_cron registration
- `0019_harden_private_letter_access.sql`, `0023_canary_view_filter.sql` — `app_private` sealed; view security model
- `0030_seed_test_letter_optional_schedule.sql`, `0006_test_helpers.sql` — canonical letter+schedule insert (the seal RPC's template)
- `0031_waitlist_signups.sql`, `0032`, `0033_join_waitlist_public_wrappers.sql` — waitlist + 4-state lookup wrappers
- `0034_verification_tokens.sql` — token table + `create_verification_token` + `lookup_user_id_by_email`
- `SEALED-org/supabase/functions/join-waitlist/index.ts` — pipeline, env DI, `?test_1b=1`, renderEmail, 1B send shape
- `SEALED-org/supabase/functions/_shared/{resend.ts,admin-client.ts,auth.ts,notify-core.ts}` — send wrapper, admin client, service-role guard, **email path reads `letters.body/created_at/tz`**
- `SEALED-org/supabase/functions/notify/emails/SealLetterEmail.tsx` — 1B props (`verifyUrl`), verify URL format
- `SEALED-org/supabase/config.toml` — `verify_jwt=false` for all functions; deno_version=2; schemas exposed
- `Landing/{index.html,privacy.html,vite.config.ts,package.json}` — SPA + multi-HTML routing, no router, locked tokens
- `Landing/src/{App.tsx,lib/supabase.ts,lib/messages.ts,components/FirstLetter.tsx}` — current wiring (letter body discarded)
- `Landing/.planning/{04-CONTEXT.md,REQUIREMENTS.md,STATE.md}` — locked decisions + requirement text

### Secondary / Tertiary
- None required — all findings are grounded in committed source.

## Metadata

**Confidence breakdown:**
- Schema / shapes (letters, schedules, outbox, tokens): HIGH — read directly from migrations.
- Delivery/cron contract (schedules-only): HIGH — read `claim_due_letters` end to end.
- Edge Function patterns (DI, CORS, verify_jwt, render, privacy logging): HIGH — read join-waitlist + shared + config.
- `/verify` page approach: MEDIUM — standalone HTML is proven in-repo; Vercel clean-URL serving to confirm in Phase 5 (A2).
- D-04 / one-letter-per-user reconciliation: MEDIUM — requires an explicit RPC-design decision (Open Q2).

**Research date:** 2026-06-05
**Valid until:** ~2026-07-05 (stable; backed by committed schema. Re-check if `app_private.letters`/`schedules` migrations change in the sibling repo.)

## RESEARCH COMPLETE

**File:** `/Users/nourismaiel/Downloads/SEALED Landing Page Claude Design/.planning/phases/04-letter-verify-flow/04-RESEARCH.md`
