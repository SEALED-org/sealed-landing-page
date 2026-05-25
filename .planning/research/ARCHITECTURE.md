# Architecture Research

> Note: Main app repo at `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org` was inaccessible.
> Schema below is a clean greenfield proposal — diff against existing SEALED-org migrations before applying.

---

## Architecture in One Line

Thin React client → single `waitlist-signup` Edge Function (owns Turnstile + rate-limit + user-create + letter-store + Template 1 email) → `verify-email` Edge Function (owns verification + Template 2) → daily `deliver-letters` cron (owns Jan 1 delivery).

---

## Proposed Database Schema

```sql
-- 001: waitlist_signups (landing-page sidecar to auth.users)
create table public.waitlist_signups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'verified', 'unsubscribed')),
  source text not null default 'landing_page',
  ip_hash text,        -- sha256 of submission IP (not raw — GDPR)
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.waitlist_signups enable row level security;
-- No policies: all reads/writes via service role in Edge Functions only

-- 002: letters
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 10000),
  status text not null default 'pending'
    check (status in ('pending', 'sealed', 'delivered', 'failed')),
  composed_on date not null default current_date,
  deliver_at timestamptz not null default '2027-01-01T13:00:00Z'::timestamptz,
  sealed_at timestamptz,
  delivered_at timestamptz,
  resend_message_id text,
  created_at timestamptz not null default now()
);
create unique index letters_one_per_user_idx on public.letters (user_id);
create index letters_status_deliver_idx on public.letters (deliver_at) where status = 'sealed';
alter table public.letters enable row level security;

-- 003: rate_limits (IP-keyed, daily window)
create table public.rate_limits (
  ip_hash text not null,
  bucket text not null,     -- 'waitlist_signup' (extensible)
  window_start timestamptz not null default date_trunc('day', now()),
  count int not null default 1,
  primary key (ip_hash, bucket, window_start)
);
alter table public.rate_limits enable row level security;

-- 004: signup_counter view (public, read-only)
create or replace view public.signup_counter as
  select 115 + count(*)::int as count
  from public.waitlist_signups
  where status = 'verified';
grant select on public.signup_counter to anon, authenticated;
```

### Schema decisions

| Decision | Rationale |
|---|---|
| `auth.users` as identity source | Mobile app OTP on launch day uses `auth.users` directly — no sync layer needed |
| `waitlist_signups.user_id` as PK (== FK) | Enforces 1:1 at schema level |
| `letters.deliver_at` per-row | Future-proof against schedule changes; cron queries `<= now()` |
| `deliver_at` defaults to 13:00 UTC Jan 1 | 8am EST / 5am PST — confirm timezone with product |
| `status` on letters with partial index on `sealed` | Cron scans only sealed letters, not full table |
| IP as sha256 hash, not plaintext | GDPR-safe; rate-limit only needs equality |
| `signup_counter` as view (not counter row) | Always accurate; no increment races; unsubscribes auto-adjust; seed value `115` in view definition |
| RLS on with no policies | Forces all writes through service role in Edge Functions |

---

## Status State Machines

```
waitlist_signups.status:
  pending_verification → verified (via verify-email function)
                       → unsubscribed (admin)

letters.status:
  pending  → sealed    (via verify-email, if letter exists)
  sealed   → delivered (via deliver-letters cron on Jan 1)
  any      → failed    (after retry exhaustion)
```

---

## Component Boundaries

### React client (browser, anon key only)

- Renders UI (existing components stay)
- Mounts Cloudflare Turnstile widget (invisible mode), obtains token on submit
- POSTs to `/functions/v1/waitlist-signup` via `supabase.functions.invoke()`
- Reads `signup_counter.count` via anon Supabase client (view is public)
- Handles verify-link landing: calls `supabase.auth.verifyOtp()`, then POSTs to `verify-email`
- **Never writes directly to tables. Never holds service role key.**

### Edge Function: `waitlist-signup`

Ordered operations (fail-fast):
1. Validate email format + letter length
2. Verify Turnstile token → Cloudflare siteverify
3. Hash IP → check + upsert `rate_limits` (1/day/IP)
4. `admin.createUser({ email, email_confirm: false })` — on `email_exists`, fetch existing user
5. `admin.generateLink({ type: 'magiclink', email })` → `action_link`
6. Upsert `waitlist_signups`
7. Insert/update `letters` (if body provided)
8. Send Template 1 via Resend (action_link embedded)
9. Return `{ ok: true, has_letter: boolean }`

### Edge Function: `verify-email`

Called after browser handles the magic link:
1. Auth JWT in header → `user_id`
2. Update `waitlist_signups` → `verified`
3. Update `letters` → `sealed` (if exists)
4. Send Template 2 via Resend (if letter sealed)
5. Return `{ ok: true, letter_sealed: boolean }`

### Edge Function: `deliver-letters` (cron-triggered)

Daily at 13:00 UTC via pg_cron + pg_net:
1. `SELECT * FROM letters WHERE status='sealed' AND deliver_at <= now() LIMIT 500`
2. Batch-send via Resend Template 3
3. Mark `delivered` with `resend_message_id`
4. Loop until 0 rows (handles >500 letters)
5. On failure: log + retry; after N failures → mark `failed`

### Edge Function: `app-launch-broadcast` (deferred)

When app launch date is set: batch-send Template 4 to all `verified` waitlist users. Schema already supports it.

---

## Data Flow

```
Signup (no letter):
Browser → POST waitlist-signup → [Turnstile → rate-limit → createUser → generateLink
                                   → waitlist_signups upsert → Resend Template 1]
Browser ← 200 { ok: true, has_letter: false }

Signup (with letter):
Same + letters INSERT between waitlist_signups and Resend.

Verification:
Browser lands on /verify → supabase.auth.verifyOtp(token)
Browser → POST verify-email (with JWT) → [update waitlist_signups → update letters
                                           → Resend Template 2 if letter]
Browser ← 200 { ok: true, letter_sealed: true }

Jan 1, 2027 delivery:
pg_cron (daily 13:00 UTC) → pg_net → deliver-letters Edge Function
→ SELECT sealed letters → Resend batch → mark delivered
```

---

## Scheduled Delivery

**Decision: `pg_cron` + `pg_net` → Edge Function (daily, filter by `deliver_at`)**

| Option | Verdict |
|---|---|
| pg_cron + pg_net → Edge Function | **Recommended** — native, free, one platform |
| Vercel cron | Worse — ties delivery to landing page uptime, free-tier limits |
| GitHub Actions schedule | Don't — not durable for a single critical one-shot event |

**Why daily cron (not one-shot):**
- Every day from now → Jan 1 is a no-op dress rehearsal — if the function is broken, you find out months early
- Add a safety alert: if `count(*) where status='sealed' AND deliver_at <= now()` is non-zero 1h after the cron fires on Jan 1, page someone

```sql
select cron.schedule(
  'deliver-sealed-letters',
  '0 13 * * *',
  $$ select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/deliver-letters',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  ); $$
);
```

---

## Vercel Configuration

| Var | Location | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel env (client-readable) | Anon client URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel env (client-readable) | Counter reads + verifyOtp |
| `VITE_TURNSTILE_SITE_KEY` | Vercel env (client-readable) | Turnstile widget |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase secrets set` only | All privileged writes |
| `TURNSTILE_SECRET_KEY` | `supabase secrets set` only | siteverify |
| `RESEND_API_KEY` | `supabase secrets set` only | All email sends |
| `RESEND_FROM` | `supabase secrets set` only | e.g. `letters@sealedapp.io` |
| `APP_BASE_URL` | `supabase secrets set` only | Redirect URLs in magic links |

**CORS:** Allow `https://sealedapp.io` and `http://localhost:5173` explicitly. Never `*` on functions that write to auth.

---

## Build Order

1. Schema + RLS + view — `supabase db push`. No app code changes.
2. Strip Firebase, wire Supabase anon client + counter view read. Unbreaks the build.
3. `waitlist-signup` Edge Function (Turnstile + rate-limit + DB writes; no Resend yet). Test with curl.
4. Resend + DKIM/SPF setup. Template 1 first. **DNS must be done here.**
5. `verify-email` Edge Function + verify page. End-to-end signup → confirm test.
6. `deliver-letters` Edge Function + pg_cron. Test with `deliver_at` in the past.
7. Vercel deploy + sealedapp.io domain.
8. (Deferred) `app-launch-broadcast`.

**Hard dependencies:** Resend (#4) → Verify (#5) → Delivery (#6) → Deploy (#7).

---

## Open Questions

1. Does SEALED-org already have a `letters` or `waitlist_signups` table? Must check before applying migrations.
2. Exact timezone for `deliver_at`? EST/PST/UTC/per-user?
3. Resignup with same email: replace letter (if pending) or reject?
4. Magic link expiry: 1 hour (Supabase default) vs 24 hours (better UX for "seal your spot")
5. Letter length cap: 10,000 chars — confirm with product.

---

## Anti-Patterns to Avoid

- Direct table writes from the browser with the anon key — always go through Edge Function
- `VITE_RESEND_API_KEY` or `VITE_SUPABASE_SERVICE_ROLE_KEY` — would be public in the bundle
- Supabase default auth emails — use `generateLink` + Resend for all 4 templates
- One-shot pg_cron for Jan 1 — use daily cron + `deliver_at <= now()` filter
- Hardcoding Jan 1 in the Edge Function — date lives in `letters.deliver_at`
- Counting unverified signups in the counter — view filters `status='verified'`
- Storing raw IPs — use sha256 hash
