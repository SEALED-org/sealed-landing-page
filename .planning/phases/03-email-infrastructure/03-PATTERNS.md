# Phase 3: Email Infrastructure - Pattern Map

**Mapped:** 2026-06-03
**Files analyzed:** 5 (2 new templates, 1 new migration, 1 modified function, 1 modified deno.json)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/notify/emails/WaitlistConfirmationEmail.tsx` | template | request-response | `supabase/functions/notify/emails/DeliveryLetterEmail.tsx` | exact |
| `supabase/functions/notify/emails/SealLetterEmail.tsx` | template | request-response | `supabase/functions/notify/emails/DeliveryLetterEmail.tsx` | exact |
| `supabase/migrations/0034_verification_tokens.sql` | migration | CRUD | `supabase/migrations/0033_join_waitlist_public_wrappers.sql` | exact |
| `supabase/functions/join-waitlist/index.ts` | service | request-response | `supabase/functions/notify/index.ts` (render+send flow) | role-match |
| `supabase/functions/join-waitlist/deno.json` | config | n/a | `supabase/functions/notify/deno.json` | exact |

---

## Pattern Assignments

### `supabase/functions/notify/emails/WaitlistConfirmationEmail.tsx` (template, request-response)

**Analog:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/emails/DeliveryLetterEmail.tsx`

**Imports pattern** (lines 1-4 of analog):
```typescript
import {
  Body, Container, Head, Html, Preview, Section, Text, Link
} from '@react-email/components';
import * as React from 'react';
```
1A does not need `Link` — omit it. All other imports are required.

**Props type pattern** (lines 6-10 of analog):
```typescript
export type DeliveryLetterEmailProps = {
  bodyText: string;
  composedOn: string;
  appLetterUrl: string;
};
```
1A takes no props — use `Record<string, never>` or an empty type. Named export of both the type and the component (no default export in the analog).

**Core template structure** (lines 12-32 of analog):
```typescript
export const DeliveryLetterEmail = ({ bodyText, composedOn, appLetterUrl }: DeliveryLetterEmailProps) => (
  <Html>
    <Head />
    <Preview>A letter you wrote on {composedOn}</Preview>
    <Body style={{ backgroundColor: '#faf6ef', fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <Container style={{ padding: '48px 32px', maxWidth: 560 }}>
        <Section>
          {/* T-02-07 mitigation: <Text> auto-escapes; never use dangerouslySetInnerHTML for letter content. */}
          <Text style={{ color: '#3a342e', fontSize: 16, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {bodyText}
          </Text>
        </Section>
        <Section style={{ marginTop: 48 }}>
          <Text style={{ color: '#7a716a', fontSize: 12 }}>
            <Link href={appLetterUrl} style={{ color: '#7a716a' }}>Read in the app -&gt;</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
```

**What 1A replaces/adds vs the analog:**
- Replace `<Preview>` text with: `You're on the SEALED waitlist.`
- Add a `<Section>` before the message body containing the SEALED wordmark header (D-02):
  ```typescript
  <Text style={{ color: '#3a342e', fontSize: 13, letterSpacing: '0.15em', opacity: 0.45 }}>
    S E A L E D
  </Text>
  ```
- Replace letter `<Text>` blocks with D-04 copy:
  - `You're on the waitlist.`
  - `Nothing to do now. We'll email you when SEALED opens in 2027.`
- Replace link section with sign-off: `<Text style={{ color: '#7a716a', fontSize: 13 }}>— SEALED</Text>`
- Keep: `backgroundColor: '#faf6ef'`, `fontFamily: 'Georgia, "Times New Roman", serif'`, `color: '#3a342e'`, `color: '#7a716a'` for muted text, `padding: '48px 32px'`, `maxWidth: 560`
- Never: `dangerouslySetInnerHTML`, web fonts, images, inline `style` with `url()`

---

### `supabase/functions/notify/emails/SealLetterEmail.tsx` (template, request-response)

**Analog:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/emails/DeliveryLetterEmail.tsx`

Same base structure as 1A with these additions:

**Props type** (new — no analog; derive from 1A pattern):
```typescript
export type SealLetterEmailProps = {
  verifyUrl: string;  // https://sealedapp.io/verify?token=<uuid>
};
```

**Link component usage** (from analog line 26-28):
```typescript
<Link href={appLetterUrl} style={{ color: '#7a716a' }}>Read in the app -&gt;</Link>
```
1B uses `Link` for the CTA button with dark ink styling (not muted — this is a primary action):
```typescript
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
```

**D-04 copy structure for 1B:**
- `<Preview>`: `Your letter is ready — verify your email to seal it.`
- Wordmark header: same as 1A (`S E A L E D` letter-spaced, muted)
- Body text: `Your letter is ready. Verify your email to seal it.`
- CTA: `[ Verify and seal ]` button using `<Link>` with dark ink style above
- Below CTA: `<Text style={{ color: '#7a716a', fontSize: 13 }}>This link works for 7 days.</Text>`
- Sign-off: `— SEALED`

**Security note from analog line 19:**
```typescript
{/* T-02-07 mitigation: <Text> auto-escapes; never use dangerouslySetInnerHTML for letter content. */}
```
Apply same comment to the `verifyUrl` render site — `<Link href={verifyUrl}>` is safe; never interpolate `verifyUrl` into raw HTML strings.

---

### `supabase/migrations/0034_verification_tokens.sql` (migration, CRUD)

**Analog:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0033_join_waitlist_public_wrappers.sql`

**Header comment pattern** (lines 1-13 of analog):
```sql
-- 0033_join_waitlist_public_wrappers.sql
-- Public wrappers so the join-waitlist Edge Function can reach auth.users and
-- app_private.* via PostgREST. Same rationale as 0021_dispatch_public_wrapper:
-- the Supabase Data API only routes to exposed schemas (public), and `auth` can
-- never be exposed. SECURITY DEFINER functions run as their owner, so inside the
-- body they read auth/app_private freely while the schema stays sealed to the API.
-- All four are restricted to service_role (the join-waitlist admin client) only.
```
0034 must include equivalent rationale comment explaining why `app_private.verification_tokens` cannot be reached directly and why SECURITY DEFINER wrappers are required.

**Table creation in `app_private` + RLS + grants pattern** — 0033 does not create a table, but uses `app_private` tables. The RLS + grant pattern for `app_private` tables comes from prior migrations (e.g., `0031_waitlist_signups.sql`). The shape to follow for 0034:
```sql
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
```

**SECURITY DEFINER wrapper that returns a row** (analog for `void`-returning wrappers — lines 88-100 of 0033):
```sql
create or replace function public.create_waitlist_signup(p_user_id uuid, p_has_letter boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into app_private.waitlist_signups (user_id, has_letter) values (p_user_id, p_has_letter);
$$;

revoke all on function public.create_waitlist_signup(uuid, boolean) from public;
grant execute on function public.create_waitlist_signup(uuid, boolean) to service_role;
```

**0034's `create_verification_token` wrapper differs in return type** — it must return the new row so the Edge Function can read `token` + `id`:
```sql
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
```

**Key differences from 0033 wrapper pattern:**
- `returns table (id uuid, token text)` instead of `returns void`
- `returning id, token` clause in the INSERT
- Edge Function calls `.rpc('create_verification_token', { p_user_id })` and reads `data[0].token` and `data[0].id`

**Required comment at table end:**
```sql
comment on table app_private.verification_tokens is
  'Custom 7-day email verification tokens for Path B (letter sealing). Supabase Auth OTP is capped at 24h; this table holds tokens with a 7-day expiry. Phase 4 verify-email function consumes tokens.';
```

---

### `supabase/functions/join-waitlist/index.ts` (service, request-response) — MODIFY ONLY

**Analog for render+send insertion:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/index.ts`

**Env DI pattern** (lines 13-20 of `notify/index.ts`):
```typescript
const env = {
  RESEND_API_KEY: Deno.env.get('RESEND_API_KEY') ?? '',
  SEALED_FROM_ADDRESS: Deno.env.get('SEALED_FROM_ADDRESS') ?? 'SEALED <letters@sealedapp.io>',
};
if (!env.RESEND_API_KEY) {
  console.error('notify: missing RESEND_API_KEY env');
  return new Response(JSON.stringify({ ok: false, error: 'missing RESEND_API_KEY' }), { status: 500 });
}
```
In `join-waitlist`, the env block must be hoisted so it is available to both TODO insertion sites. The fail-fast guard must NOT abort the existing signup on missing secrets — instead, log and continue (return existing `{ state: 'success' }`) to avoid making the signup appear to fail (see RESEARCH.md Pitfall 7).

**Render+send pattern** (lines 26-28 of `notify/index.ts`):
```typescript
renderEmail: async (props) =>
  await renderAsync(React.createElement(DeliveryLetterEmail, props)),
```
Adapted for inline use at the TODO sites:
```typescript
const html = await renderAsync(
  React.createElement(WaitlistConfirmationEmail, {})
);
await sendResendEmail({
  from: env.SEALED_FROM_ADDRESS,
  to: [body.email],
  subject: "You're on the list.",   // D-04
  html,
  idempotencyKey: `1a-${created.user.id}`,  // stable per user; Resend dedupes retries
  apiKey: env.RESEND_API_KEY,
});
```

**Two TODO insertion sites in `join-waitlist/index.ts`:**

Site 1 — `unverified` resend path (line 162 of current file):
```typescript
case 'unverified':
  await recordAttempt(supabase, ip, 'duplicate_unverified');
  // TODO(Phase 3): resend Template 1A via generateLink + sendResendEmail.
  return jsonResponse({ state: 'unverified' }, 200);
```
Replace the TODO comment with a 1A send. Idempotency key for this path MUST be timestamp-scoped (not stable) to bypass Resend's 24h deduplication window:
```typescript
idempotencyKey: `1a-resend-${userId}-${Date.now()}`
```
The `userId` must be fetched from `lookup_signup_state` — the current wrapper returns only the state string. Either extend the wrapper to also return `user_id` (migration change) or add a second small RPC to look up `user_id` by email. The 1A send error must NOT change the `{ state: 'unverified' }` response — wrap in try/catch, log, continue.

Site 2 — new-user success path (lines 199-205 of current file):
```typescript
// TODO(Phase 3 — EMAIL-A2 / EMAIL-03 / EMAIL-04): send Template 1A.
//   - Call supabase.auth.admin.generateLink({ type: 'magiclink', email }) → action_link
//   - Render Template 1A HTML with action_link
//   - Call sendResendEmail({ from, to, subject, html, idempotencyKey, apiKey })
//     from '../_shared/resend.ts'
// Phase 2 leaves this comment; the function returns success without sending.

return jsonResponse({ state: 'success' }, 200);
```
Replace with 1A send using `idempotencyKey: \`1a-${created.user.id}\`` (stable — one confirmation per new user). The send error must NOT change the `{ state: 'success' }` response.

**Required new imports** (add to existing import block at top of `join-waitlist/index.ts`):
```typescript
import { renderAsync } from '@react-email/components';
import * as React from 'react';
import { WaitlistConfirmationEmail } from '../notify/emails/WaitlistConfirmationEmail.tsx';
import { sendResendEmail } from '../_shared/resend.ts';
```

**CRITICAL: do not change the existing structured `{ state }` responses.** The landing-page client depends on this contract. All email-send failures must be caught and logged without altering the response.

---

### `supabase/functions/join-waitlist/deno.json` (config) — MODIFY ONLY

**Analog:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/deno.json`

**Current state of `join-waitlist/deno.json`** (full file, lines 1-5):
```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.103.2"
  }
}
```

**Target state — copy from `notify/deno.json`** (full file, lines 1-11):
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

**Exact change:** Add `"react"` and `"@react-email/components"` to `imports`, and add the entire `"compilerOptions"` block. Preserve `@supabase/supabase-js` version exactly as-is.

**CRITICAL:** Do NOT bump `@react-email/components` above `0.0.22`. `renderAsync` was removed in `0.0.23+`. Pin to `0.0.22` to match `notify/deno.json`.

---

## Shared Patterns

### Env DI (secrets injection)
**Source:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/index.ts` lines 13-20
**Apply to:** `join-waitlist/index.ts` env block addition
```typescript
const env = {
  RESEND_API_KEY: Deno.env.get('RESEND_API_KEY') ?? '',
  SEALED_FROM_ADDRESS: Deno.env.get('SEALED_FROM_ADDRESS') ?? 'SEALED <letters@sealedapp.io>',
};
```
The `sendResendEmail` wrapper never reads `Deno.env` directly — it always receives `apiKey` as an argument.

### Privacy-safe email logging
**Source:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/resend.ts` lines 31-33
**Apply to:** All `sendResendEmail` call sites in `join-waitlist/index.ts`
```typescript
// CODEX MEDIUM email-body privacy: log ONLY status + outboxId + letterId.
// Never include subject, body, recipient, API key, or Resend response body in the log.
```
Log only `user_id` and template name on success. Never log `body.email`, `html`, or `env.RESEND_API_KEY`.

### SECURITY DEFINER wrapper pattern
**Source:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0033_join_waitlist_public_wrappers.sql` lines 19-52
**Apply to:** `0034_verification_tokens.sql`
Every wrapper must:
1. Use `security definer` + `set search_path = ''` (prevents search-path injection)
2. `revoke all on function public.<name>(...) from public;`
3. `grant execute on function public.<name>(...) to service_role;`
No `authenticated` or `anon` grants on any function touching `app_private`.

### React Email cream aesthetic
**Source:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/notify/emails/DeliveryLetterEmail.tsx` lines 16-17
**Apply to:** Both `WaitlistConfirmationEmail.tsx` and `SealLetterEmail.tsx`
```typescript
<Body style={{ backgroundColor: '#faf6ef', fontFamily: 'Georgia, "Times New Roman", serif' }}>
  <Container style={{ padding: '48px 32px', maxWidth: 560 }}>
```
These two inline style objects are the aesthetic anchor — do not alter the values.

### sendResendEmail call signature
**Source:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/_shared/resend.ts` lines 1-11
**Apply to:** Every call site in `join-waitlist/index.ts`
```typescript
export type ResendSendArgs = {
  from: string;        // injected from env.SEALED_FROM_ADDRESS
  to: string[];        // array, not a string
  subject: string;
  html: string;        // output of renderAsync(...)
  idempotencyKey: string;
  apiKey: string;      // injected from env.RESEND_API_KEY — NOT read inside wrapper
  fetchImpl?: typeof fetch;
  outboxId?: string;   // optional; omit for confirmation sends
  letterId?: string;   // optional; omit for confirmation sends
};
```
`to` is `string[]` — wrap the email address: `to: [body.email]`.

---

## Reused Files (no modification — call signature documentation)

### `supabase/functions/_shared/resend.ts` — `sendResendEmail`
**Full signature** (lines 1-11 of file):
```typescript
export type ResendSendArgs = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  idempotencyKey: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  outboxId?: string;
  letterId?: string;
};
export async function sendResendEmail(args: ResendSendArgs): Promise<{ id: string }>
```
Returns `{ id: string }` (Resend's email ID). Throws on non-2xx response.

### `supabase/functions/notify/index.ts` — render+send flow
The render+send idiom the executor copies into `join-waitlist`:
```typescript
const html = await renderAsync(React.createElement(TemplateComponent, props));
await sendResendEmail({ from, to, subject, html, idempotencyKey, apiKey });
```
`renderAsync` is from `@react-email/components@0.0.22`. `React.createElement` is required because Deno does not transform JSX at the call site in `.ts` files — use this form, not JSX syntax, at the call site.

---

## No Analog Found

None. All five files have strong analogs in the main SEALED-org repo.

---

## Idempotency Key Reference

| Send path | Key pattern | Rationale |
|-----------|-------------|-----------|
| 1A new-user success (~line 199) | `1a-${created.user.id}` | Stable — Resend deduplication protects against double-sends on retry |
| 1A unverified resend (~line 162) | `` `1a-resend-${userId}-${Date.now()}` `` | Timestamp-scoped — user must be able to request resend; stable key would suppress it within Resend's 24h window |
| 1B test trigger | `` `1b-test-${tokenRow.id}` `` | Token-scoped — one send per token row; prevents double-send on test reruns |

---

## Metadata

**Analog search scope:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/` and `supabase/migrations/`
**Files read:** `DeliveryLetterEmail.tsx`, `notify/index.ts`, `notify/deno.json`, `join-waitlist/index.ts`, `join-waitlist/deno.json`, `_shared/resend.ts`, `_shared/notify-core.ts`, `0033_join_waitlist_public_wrappers.sql`
**Pattern extraction date:** 2026-06-03
