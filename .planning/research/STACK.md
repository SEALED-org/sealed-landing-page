# Stack & Integration Research

## Main App Repo Findings (from direct read)

**Critical: delivery infrastructure is already fully built. No new cron jobs needed.**

### Existing Schema (app_private schema)

```
app_private.letters        — letter storage (user_id, body, deliver_at, sealed_at, tz, is_canary)
app_private.schedules      — one-per-letter delivery schedule (deliver_at, status: pending→claimed→delivered)
app_private.notification_outbox — per-channel notifications (channel: push|email, resend_id)
app_private.system_actors  — canary user lookup
app_private.waitlist_signups — DOES NOT EXIST (need to create)
```

**letters table:** Draft = sealed_at IS NULL AND deliver_at IS NULL. Sealed = both set (check constraint enforces this).
**is_canary column:** must be `false` for real users; triggers filter canaries from notification_outbox.

### Existing Edge Functions

| Function | Purpose | Cron |
|---|---|---|
| `dispatch` | Claims due schedules (dispatch_claim_due RPC) | Every minute |
| `notify` | Sends email+push from notification_outbox | Every minute |
| `receipts` | Polls Expo push receipts | Every 15 min |
| `canary` | Health check | Separate |
| `reconcile` | Consistency checks | Separate |

**Template 3 (letter delivery email) is already handled by `notify/emails/DeliveryLetterEmail.tsx`.** Landing page just inserts into `app_private.schedules` + `app_private.notification_outbox`.

### Shared Patterns (follow exactly)

```ts
// admin-client: npm:@supabase/supabase-js@2.103.2 (pin this exact version)
import { adminClient } from '../_shared/admin-client.ts';

// resend: direct HTTP to api.resend.com via sendResendEmail()
import { sendResendEmail } from '../_shared/resend.ts';
// Env vars: RESEND_API_KEY, SEALED_FROM_ADDRESS

// auth guard (for service-role-only functions)
import { requireServiceRole } from '../_shared/auth.ts';
```

### Supabase JS Version

```
@supabase/supabase-js: ^2.103.2 (pin to match exactly)
supabase CLI: ^2.91.2
```

### No Waitlist Tables Exist

Confirmed: `grep -r "waitlist\|signup" supabase/` → no results. Need to create `app_private.waitlist_signups`.

### How Landing Page Hooks Into Existing Delivery

On signup: insert into `app_private.letters` (body, is_canary=false, no sealed_at/deliver_at — draft state)  
On verify: `UPDATE letters SET sealed_at=now(), deliver_at='2027-01-01T...'` + insert into `schedules` + insert into `notification_outbox(channel='email')` → the running cron delivers it automatically on Jan 1.

---

## Auth Flow: Email-Only Signup with OTP Mobile Compatibility

**Recommended: `admin.createUser` + `generateLink` + Resend (inside Edge Function)**

```ts
// Inside Edge Function (service-role client)
const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
  email,
  email_confirm: false,  // user confirms via the link we send via Resend
  user_metadata: { source: "landing" },
});

// Generate magic link for verification
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
  type: "magiclink",
  email,
});
// linkData.properties.action_link → send via Resend as Template 1
```

**Why this approach:**
- Custom Template 1 email sent via Resend (not Supabase's generic template)
- User becomes a real `auth.users` entry — mobile app OTP just calls `signInWithOtp({ email, options: { shouldCreateUser: false } })` on launch day and finds the pre-existing account
- Service role key never touches the client

**Mobile OTP flow on app launch:**
```ts
// Mobile app
await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
// `shouldCreateUser: false` prevents accidental new account creation from email typos
```

**Do NOT use:**
- `signInWithOtp({ shouldCreateUser: true })` from the client — loses Resend template control and can't atomically store the letter
- `signUp({ email, password: randomGenerated })` — pollutes auth.users with junk credentials

**Confidence: MEDIUM-HIGH** — verify `generateLink` return shape against current Supabase docs.

---

## Edge Function Structure

Single `join-waitlist` function handles everything in one call:

```
supabase/functions/
  join-waitlist/
    index.ts        # main handler: Turnstile → rate-limit → createUser → letter insert → send email
    turnstile.ts    # Cloudflare siteverify helper
    rate-limit.ts   # DB-backed IP rate limiting
    email.ts        # Resend client + Template 1/2 render
    cors.ts         # shared CORS headers (reuse from main app if exists)
```

**Why single function (not split calls):** Atomicity — if user creation succeeds but letter storage fails, you can return a specific error and the client can retry. Multiple round-trips create partial-state failure modes.

### Turnstile Verification

```ts
const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    secret: Deno.env.get("TURNSTILE_SECRET_KEY")!,
    response: token,
    remoteip: ip,
  }),
});
const { success } = await res.json();
```

**IP detection:** Use `cf-connecting-ip` header first (Cloudflare sets this), then `x-forwarded-for` fallback.

### Rate Limiting (DB-backed)

```sql
create table signup_attempts (
  ip text primary key,
  last_attempt_at timestamptz not null
);
```

Check `last_attempt_at < now() - interval '24 hours'` before allowing. For atomicity, promote to a Postgres function: `select try_record_attempt($1)` — does the check+insert in one statement.

---

## Client → Edge Function

**Use `supabase.functions.invoke()`** (not raw `fetch`):

```ts
// src/lib/supabase.ts
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// src/lib/joinWaitlist.ts
const { data, error } = await supabase.functions.invoke("join-waitlist", {
  body: { email, letter, turnstileToken },
});
```

**Env vars (Vite):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...   # site key is public
```
Service role key NEVER has a `VITE_` prefix — lives only in `supabase secrets set`.

**Confidence: HIGH**

---

## Resend Integration

**Inline in Edge Function for Templates 1 & 2** (not DB webhooks):
- Template 1 (verify) failure = broken signup — must be synchronous so you can return error to client
- Template 2 (letter sealed) triggered by email verification click handler

**Template 3 (Jan 1 2027):** Scheduled Edge Function via cron
```toml
# supabase/config.toml (verify current syntax)
[functions.deliver-letters]
schedule = "0 8 1 1 *"   # 08:00 UTC on Jan 1
```
Batch-send via Resend's `/emails/batch` endpoint. Function must be idempotent — check `delivered_at IS NULL` before sending, set after.

**Resend + Deno:** Either use the npm Resend SDK via `esm.sh` or call `https://api.resend.com/emails` directly via `fetch`. Direct HTTP is simpler and avoids Deno/npm compatibility friction.

**Confidence: HIGH** on inline-vs-webhook decision. **MEDIUM** on scheduled function syntax.

---

## Supabase JS Client Version

- Use `@supabase/supabase-js` v2.x — framework-agnostic, works with React 19 + Vite 6 with no config changes
- **Critical:** Pin to the EXACT version the main app uses — read `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/package.json` and match it
- `@supabase/ssr` NOT needed (that's for Next.js/SvelteKit SSR — not a Vite SPA)
- `@supabase/auth-helpers-react` NOT needed (deprecated)

**Confidence: HIGH**

---

## Blocking Items Before Implementation

| # | Item | Why Blocking |
|---|------|--------------|
| 1 | Read main app repo schema | Must not create conflicting tables or duplicate Edge Functions |
| 2 | Match `@supabase/supabase-js` version to main app | Auth flow and type parity |
| 3 | Check what Edge Functions already exist | May have shared CORS helper, Resend client, types to reuse |
| 4 | Check `supabase/config.toml` auth settings | Email OTP must be enabled as a provider |
| 5 | Set up sealedapp.io DNS (SPF/DKIM/DMARC) in Resend | Required before sending Template 1 in production |
| 6 | Verify `admin.generateLink` return shape | API may have shifted since training cutoff |
