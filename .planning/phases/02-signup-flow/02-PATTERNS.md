# Phase 2: Signup Flow - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 9 to be created/modified (3 cross-repo, 6 landing-repo)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Repo | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|------|-----------|----------------|---------------|
| `supabase/functions/join-waitlist/index.ts` | SEALED-org | edge-function / controller | request-response | `supabase/functions/dispatch/index.ts` | role-match (public vs gated) |
| `supabase/functions/join-waitlist/deno.json` | SEALED-org | config / manifest | n/a | `supabase/functions/dispatch/deno.json` | exact |
| `supabase/migrations/0032_signup_attempts.sql` | SEALED-org | migration | CRUD (ledger) | `supabase/migrations/0031_waitlist_signups.sql` | exact (same author, sibling) |
| `src/lib/supabase.ts` | landing | service / client module | request-response | self (Phase 1 file — modify) | exact |
| `src/lib/messages.ts` | landing | utility / constants | n/a | `src/components/Typewriter.tsx` (named-export constant) | role-match |
| `src/components/WaitlistForm.tsx` | landing | component | event-driven | self (Phase 1.5 file — modify) | exact |
| `src/App.tsx` | landing | composition root | request-response | self (Phase 1.5 file — modify) | exact |
| `.env.local` | landing | config | n/a | (no analog — single file in repo) | n/a |
| `.planning/REQUIREMENTS.md` | landing | docs | n/a | self (text amendment) | exact |

**Out-of-band:** `package.json` gains one dep (`@marsidev/react-turnstile@1.5.2`); the handoff prompt for Nour is a documentation artifact, not source code.

---

## Pattern Assignments

### `supabase/functions/join-waitlist/index.ts` (Edge Function, request-response, PUBLIC endpoint)

**Analog:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/dispatch/index.ts`

**Why this analog (not `notify`):** `notify` uses `requireServiceRole` because it is an ops endpoint. `join-waitlist` is a PUBLIC endpoint called from the browser with the anon JWT (see RESEARCH "Anti-Patterns to Avoid": "`requireServiceRole` guard on `join-waitlist`. This is a PUBLIC endpoint"). `dispatch` shares the structural skeleton (Deno.serve + JSON helper + try/catch + adminClient) and is the closest match without the gate. **Phase 2 keeps the JSON helper + try/catch shape from `dispatch`, drops the `requireServiceRole`/Authorization check from lines 17–21, and adds an OPTIONS preflight + Turnstile/rate-limit/lookup pipeline.**

**Imports pattern** (from `dispatch/index.ts` line 1):
```typescript
import { adminClient } from '../_shared/admin-client.ts';
```
Phase 2 adds nothing else — siteverify uses native `fetch`, CORS headers can be hand-coded inline (per RESEARCH Open Question 2 / Pitfall 6).

**JSON response helper pattern** (`dispatch/index.ts` lines 3–10) — copy verbatim, then extend headers with CORS:
```typescript
const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}
```
**Phase 2 modification:** Merge `corsHeaders` into the JSON_HEADERS spread so every response carries `Access-Control-Allow-Origin` (Pitfall 6).

**Deno.serve handler shape** (`dispatch/index.ts` lines 12–39) — copy structure, replace the auth/Authorization check with CORS preflight handling:
```typescript
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  // ... auth check on lines 17–21 (drop this for join-waitlist) ...

  try {
    const supabase = adminClient();
    // ... operation ...
    return jsonResponse({ ok: true, ... }, 200);
  } catch (e) {
    console.error('dispatch exception', (e as Error).message);
    return jsonResponse({ ok: false, error: 'internal_error' }, 500);
  }
});
```

**Error-logging convention** (`dispatch/index.ts` lines 30–32 and 36–37) — copy verbatim into all error branches of `join-waitlist`:
```typescript
// T-02-02: never echo env or service-role key in error responses.
console.error('dispatch error', error.message);
return jsonResponse({ ok: false, error: 'dispatch_failed' }, 500);
```
Phase 2 prefix uses `'join-waitlist'` instead of `'dispatch'`. The T-02-02 comment (never echo env) is a project-wide convention — preserve the pattern even if not the exact comment.

**Service-role client pattern** (`dispatch/index.ts` line 24):
```typescript
const supabase = adminClient();
```
`adminClient()` is cached internally (see `_shared/admin-client.ts` lines 5–7 — `let cached` + early return). Call it freely; no per-request cost.

**`.schema()` + `.maybeSingle()` query pattern** (from `canary/index.ts` lines 22–29, the closest sibling pattern for app_private reads):
```typescript
const { data: lastCanary, error: queryErr } = await supabase
  .schema('app_private')
  .from('letters')
  .select('id, deliver_at, delivered_at, created_at')
  .eq('is_canary', true)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (queryErr) {
  console.error('canary verifier error', queryErr.message);
  // ... handle ...
}
```
Phase 2 reuses this shape for the 4-state lookup (against `auth.users` + `app_private.letters`) and for the rate-limit count query (against `app_private.signup_attempts`).

**`.schema().from().insert()` write pattern** (from `canary/index.ts` lines 68–79):
```typescript
const { data: newLetter, error: insertErr } = await supabase
  .schema('app_private').from('letters')
  .insert({
    user_id: canaryUserId,
    body: 'canary letter — synthetic ops probe',
    // ... columns ...
  })
  .select('id').single();

if (insertErr || !newLetter) {
  // ... handle, log, return 500 ...
}
```
Phase 2 reuses this for `waitlist_signups` insert (with `.select()` optional — we just need errors, not the row back) and `signup_attempts` insert.

**OPTIONS / CORS preflight handler** (NOT in dispatch — Phase 2 must add this fresh per RESEARCH Pitfall 6):
```typescript
// MUST be the first line in Deno.serve, before any other logic.
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

**Auth `admin.createUser` call shape** — no sibling has this exact call (the main app uses signInWithOtp), so use RESEARCH Pattern 4 lines 551–555:
```typescript
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email: body.email,
  email_confirm: false,  // Does NOT send email. [VERIFIED]
});
if (createErr || !created.user) throw createErr ?? new Error('createUser returned no user');
```
**Required comment** (per RESEARCH Pitfall 7): document that `email_confirm: false` is intentional — "user exists, verification not yet performed; Phase 3 wires the Resend send."

**Phase 3 stub comment** — at the success path's TODO site, mirror the prose of the resend.ts header style (privacy-safe logging only). Example block from RESEARCH Pattern 4 lines 565–570:
```typescript
// TODO(Phase 3 — EMAIL-A2 / EMAIL-03 / EMAIL-04): send Template 1A.
//   - Call supabase.auth.admin.generateLink({ type: 'magiclink', email }) → action_link
//   - Render Template 1A HTML with action_link
//   - Call sendResendEmail({ from, to, subject, html, idempotencyKey, apiKey }) from '../_shared/resend.ts'
```

---

### `supabase/functions/join-waitlist/deno.json` (manifest, n/a)

**Analog:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/dispatch/deno.json`

**Full content to copy verbatim** (no JSX needed, no React-Email needed — this is just the supabase-js pin):
```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.103.2"
  }
}
```
This matches `dispatch/deno.json` exactly. The version `2.103.2` matches the landing repo's `package.json` line 12 and the main repo's `_shared/admin-client.ts` line 3.

---

### `supabase/migrations/0032_signup_attempts.sql` (migration, CRUD ledger)

**Analog:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0031_waitlist_signups.sql`

**Why this analog:** Phase 1's sibling migration, written by the same author for the same landing-page subsystem. Establishes: 4-digit sequential naming, header comment block citing CONTEXT.md decisions, table in `app_private`, RLS enabled, `revoke all from anon, authenticated, public`, `grant ... to service_role`, `comment on table` description, related index creation.

**Filename pattern** (`0031_waitlist_signups.sql`): 4-digit zero-padded sequential prefix + underscore + snake_case description + `.sql`. Phase 2's file is `0032_signup_attempts.sql` (next sequential after 0031, verified by `ls migrations/`).

**Header comment block pattern** (`0031` lines 1–15):
```sql
-- 0031_waitlist_signups.sql
-- Landing page (sealedapp.io) waitlist + counter view.
-- Created for the SEALED landing page (sibling repo: SEALED-Landing-Page).
-- Phase 1 (Foundation) of the landing page roadmap owns this schema.
--
-- Design (per CONTEXT.md decisions D-01 to D-13 + REQUIREMENTS.md DB-01, DB-02, COUNTER-01..03):
--   - app_private.waitlist_signups stores one row per signup. has_letter flags whether
--     ...
```
Phase 2's header cites `02-CONTEXT.md D-04, D-05, D-06` and `REQUIREMENTS.md SEC-02 (amended)`.

**Table creation pattern** (`0031` lines 17–22):
```sql
create table app_private.waitlist_signups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  has_letter boolean not null default false,
  created_at timestamptz not null default now()
);
```
**Phase 2 adaptation:** `id bigserial primary key`, `ip text not null`, `attempted_at timestamptz not null default now()`, `outcome text not null check (outcome in (...))`. See RESEARCH "Migration file naming + structure" lines 1009–1045 for the locked SQL.

**Index pattern** (`0031` lines 24–25):
```sql
create index waitlist_signups_created_at_idx on app_private.waitlist_signups (created_at);
create index waitlist_signups_status_idx     on app_private.waitlist_signups (status);
```
Index name pattern: `<table>_<col>[_<col>]_idx`. Phase 2 uses `signup_attempts_ip_attempted_at_idx on app_private.signup_attempts (ip, attempted_at desc)`.

**RLS + grant pattern** (`0031` lines 27–31) — copy verbatim, retarget table name:
```sql
alter table app_private.waitlist_signups enable row level security;

-- Phase 2's join-waitlist Edge Function uses service_role for inserts.
revoke all on app_private.waitlist_signups from anon, authenticated, public;
grant select, insert, update, delete on app_private.waitlist_signups to service_role;
```
**Phase 2 extras** — for `bigserial` columns there is a sequence; grant explicitly:
```sql
grant usage, select on sequence app_private.signup_attempts_id_seq to service_role;
```

**Comment-on-table pattern** (`0031` lines 33–34):
```sql
comment on table app_private.waitlist_signups is
  'Landing page waitlist signups. One row per email. has_letter flags whether a first letter was also written. service_role: full DML. anon/authenticated: no direct access (read via public.signup_counter view).';
```
Phase 2 comment cites the 3/IP/24h rule + the deferred pruning policy (per RESEARCH lines 1039–1041).

**NO view, NO public grants** — `signup_attempts` is server-internal only (D-04: "the anon client never touches this table"). Skip the `create view public.* ...` block from `0031` lines 42–48.

---

### `src/lib/supabase.ts` (service module, request-response)

**Analog:** self (Phase 1 file). The file's existing top stays; only the `joinWaitlistLocal` stub body is replaced and new types/exports are added.

**Module-load env-var validation pattern** (current `src/lib/supabase.ts` lines 3–13) — keep verbatim, then ADD `VITE_TURNSTILE_SITE_KEY` to the validation chain:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loud at module load — easier to debug than a silent createClient("undefined","undefined")
// that causes confusing CORS/DNS errors on the first fetch.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in .env.local (dev) or Vercel project settings (prod).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
**Phase 2 addition** (place right after existing block, per Phase 1 D-08): add similar fail-loud for `VITE_TURNSTILE_SITE_KEY` so the bundle never quietly mounts an undefined-site-key Turnstile widget.

**JSDoc helper pattern** (current lines 17–24 — keep verbatim above `getSignupCount`):
```typescript
/**
 * Reads the current waitlist count from the public.signup_counter view.
 * The view computes 115 + count(*) from app_private.waitlist_signups.
 *
 * Caller must catch — Phase 1 falls back to 115 (seeded floor) on any error.
 *
 * @throws on network error, timeout (3s), or PostgREST error.
 */
export async function getSignupCount(): Promise<number> { ... }
```
**Phase 2 mirrors this JSDoc style** for the new `joinWaitlist` function — describe what each return state means; cite CONTEXT D-09/D-10 + the discriminated union; document that the function returns a `WaitlistState` rather than throwing for known states.

**Stub-replacement pattern** — current `joinWaitlistLocal` (lines 37–47) is the placeholder. The header comment explicitly says "Phase 2 replaces the body with the real fetch":
```typescript
/**
 * Phase 1 stub — returns void with no network call.
 * Plan 04 wires this into handleSubscribe and FirstLetter.onEmailSubmit
 * so call sites keep the `await joinWaitlistLocal(email)` shape.
 * Phase 2 replaces the body with the real fetch to /functions/v1/join-waitlist
 * without touching the try/catch/finally skeleton in App.tsx.
 */
export async function joinWaitlistLocal(email: string): Promise<void> {
  // Phase 2: replace with fetch('/functions/v1/join-waitlist', { body: { email } })
  return;
}
```
**Phase 2 action** (planner discretion per CONTEXT 175–189): either (a) rename to `joinWaitlist` with new signature `(email, turnstileToken) => Promise<WaitlistState>`, OR (b) keep `joinWaitlistLocal` and add `joinWaitlist` alongside, then update call sites in App.tsx. **Recommendation:** rename + change return type — the stub never shipped to prod; renaming is honest. Update both call sites at the same time (avoids RESEARCH Pitfall 10).

**New `joinWaitlist` body pattern** — verbatim from RESEARCH Pattern 7 (lines 727–779):
```typescript
import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from '@supabase/supabase-js';

export type WaitlistState =
  | 'success'
  | 'unverified'
  | 'verified_no_letter'
  | 'verified_with_letter'
  | 'rate_limited'
  | 'turnstile_failed'
  | 'server_error';

type JoinWaitlistResponse = { state: WaitlistState; retry_after?: number };

export async function joinWaitlist(email: string, turnstileToken: string): Promise<WaitlistState> {
  const { data, error } = await supabase.functions.invoke<JoinWaitlistResponse>(
    'join-waitlist',
    { body: { email, turnstileToken } },
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const parsed = await error.context.json() as JoinWaitlistResponse;
        return parsed.state;
      } catch {
        return 'server_error';
      }
    }
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      console.error('join-waitlist relay/fetch error:', error.message);
      return 'server_error';
    }
    return 'server_error';
  }

  return data?.state ?? 'server_error';
}
```
**Why this shape:** the Edge Function returns structured `{ state }` even on 4xx (rate_limited returns 429 WITH body; turnstile_failed returns 200 WITH body). `FunctionsHttpError.context.json()` extracts the body from non-2xx responses. The function NEVER throws to the caller for known states — only network / unexpected errors yield `'server_error'`.

---

### `src/lib/messages.ts` (utility / named-export constant, n/a)

**Analog:** `/Users/nourismaiel/Downloads/SEALED Landing Page Claude Design/src/components/Typewriter.tsx` (named export of a string array constant) + the JSDoc style from `src/lib/supabase.ts`.

**Named-export pattern** — CONVENTIONS line 18: "Exported constants use camelCase: `typewriterPhrases` in `Typewriter.tsx`". Phase 2 uses ALL-CAPS `MESSAGES` because it is a Record keyed on a discriminated union (RESEARCH Pattern 6 uses ALL-CAPS; planner can choose `MESSAGES` to follow the research code or `messages` to follow strict CONVENTIONS — recommend `MESSAGES` since the union-keyed lookup feels more like a constant table than a list).

**File body to write** (verbatim from RESEARCH Pattern 6, lines 711–725):
```typescript
// Per CONTEXT.md D-09 / D-10.
// Phase 5 CONTENT-01 may refine wording.
import type { WaitlistState } from './supabase';

export const MESSAGES: Record<Exclude<WaitlistState, 'success'>, string> = {
  unverified: 'Welcome back. We just resent your confirmation email.',
  verified_no_letter: "You're already on the waitlist.",
  verified_with_letter: "You're already on the list and your letter is sealed.",
  rate_limited: 'Too many attempts from your network. Try again tomorrow.',
  turnstile_failed: "Couldn't verify you're human. Please try again.",
  server_error: 'Something went wrong. Please try again.',
};
```

**Import style** — relative path, no `@` alias (CONVENTIONS line 64; Phase 1.5 reinforces this).

**Imports CONVENTIONS** (CONVENTIONS line 53) — landing repo is INCONSISTENT on `.tsx` extensions in imports. Recent Phase 1 file `src/lib/supabase.ts` uses NO extension (`'@supabase/supabase-js'`). Phase 2's `messages.ts` imports `'./supabase'` with no extension to match the lib/ neighbor.

**Why a separate file (over inline in App.tsx):** Both `App.tsx#handleSubscribe` AND `WaitlistForm.tsx`'s inline error slot need the lookup. The CONVENTIONS "shared sub-components have their own file" rule (line 111) extends naturally to shared constants. `src/lib/` is the established home for cross-component utilities (`supabase.ts` already there).

---

### `src/components/WaitlistForm.tsx` (component, event-driven)

**Analog:** self (Phase 1.5 file). The current shape (lines 1–58) is preserved; Turnstile mount + error slot are additive.

**Props interface pattern** (current lines 4–8) — `[ComponentName]Props` per CONVENTIONS line 26:
```typescript
interface WaitlistFormProps {
  onSubmit: (email: string) => Promise<void>;
  isSubmitting: boolean;
  isSubmitted: boolean;
}
```
**Phase 2 changes:**
- `onSubmit` signature changes to `(email: string, turnstileToken: string) => Promise<void>` (D-11 — identical payload shape for both call sites).
- Add `error: WaitlistState | null` prop for the inline slot.

**Submit handler pattern** (current lines 13–18) — preserve `e.preventDefault()` + the `email && !isSubmitting` guard:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (email && !isSubmitting) {
    await onSubmit(email);
  }
};
```
**Phase 2 modification:** wrap in `try/finally` per RESEARCH Pattern 5 lines 638–653 (Turnstile execute → getResponse → onSubmit → ALWAYS reset). The `e.preventDefault()` + guard pattern stays.

**`Loader2` spinner pattern** (current lines 34–55) — preserved verbatim. The spinner covers BOTH the Turnstile execute latency (200–800ms) AND the function round-trip (RESEARCH D-07 rationale). No UI change needed.

**Turnstile mount pattern** — no analog in this repo (first Cloudflare touch). Use RESEARCH Pattern 5 lines 670–682:
```typescript
<Turnstile
  ref={turnstileRef}
  siteKey={TURNSTILE_SITE_KEY}
  options={{
    execution: 'execute',
    appearance: 'interaction-only',
    size: 'invisible',
  }}
  onError={() => setTurnstileBlocked(true)}
  onUnsupported={() => setTurnstileBlocked(true)}
  onExpire={() => turnstileRef.current?.reset()}
/>
```
**Site-key source** — `import.meta.env.VITE_TURNSTILE_SITE_KEY` per supabase.ts pattern.

**React import pattern** (CONVENTIONS line 49) — current file has `import React, { useState } from 'react'`. Phase 2 needs `useRef` too:
```typescript
import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import type { WaitlistState } from '../lib/supabase';
```

**Inline error slot pattern (Pattern 5 lines 685–699)** — fixed-height div with `aria-live="polite"` and opacity transition driven by `error ? 1 : 0`. Use a non-breaking-space placeholder so empty state still has height (D-08). Mono font + `--color-ink-60` tokens per D-08.

**Token-after-execute pattern** — RESEARCH Pattern 5 lines 634–653:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email || isSubmitting || turnstileBlocked) return;

  try {
    await turnstileRef.current?.execute();
    const token = turnstileRef.current?.getResponse();
    if (!token) {
      await onSubmit(email, '');  // empty token → server-side rejection
      return;
    }
    await onSubmit(email, token);
  } finally {
    // Always reset — tokens are single-use (Cloudflare docs).
    turnstileRef.current?.reset();
  }
};
```
**Rationale:** the `finally` reset matches the project's "try/catch/finally with state cleanup" idiom (CONVENTIONS line 70 — App.tsx already does `setIsSubmitting(false)` in finally; this is the same shape for the widget).

---

### `src/App.tsx` (composition root, request-response)

**Analog:** self (Phase 1.5 file). Per CONTEXT D-12, the existing `try/catch/finally` skeletons at `handleSubscribe` (lines 28–42) and `FirstLetter.onEmailSubmit` (lines 103–112) MUST be preserved verbatim; Phase 2 only augments them.

**Existing `try/catch/finally` skeleton — handleSubscribe** (current lines 28–42, MUST preserve per D-12):
```typescript
const handleSubscribe = async (formEmail: string) => {
  if (formEmail && !isSubmitting) {
    setIsSubmitting(true);
    try {
      await joinWaitlistLocal(formEmail);
      setEmail(formEmail);
      setIsSubscribed(true);
      setWaitlistCount((c) => (c ?? 115) + 1);
    } catch (error) {
      console.error('Subscription failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }
};
```
**Phase 2 modifications** (RESEARCH Pitfall 9, lines 932–941):
- Signature: `(formEmail: string, turnstileToken: string) => ...` (accepts the new second arg).
- Replace `await joinWaitlistLocal(formEmail)` with `const state = await joinWaitlist(formEmail, turnstileToken)`.
- Move counter increment + `setIsSubscribed(true)` INSIDE `if (state === 'success')` so non-success states don't lie about the count.
- Inside `else`: `setWaitlistError(state)` for the inline error slot.
- **KEEP** `console.error('Subscription failed:', error)` line verbatim per D-12 (it's the canonical log; the new state-setter sits alongside, not replacing).

**Existing `FirstLetter.onEmailSubmit` skeleton** (current lines 103–112):
```typescript
onEmailSubmit={async (newEmail) => {
  setEmail(newEmail);
  try {
    await joinWaitlistLocal(newEmail);
    setIsSubscribed(true);
    setWaitlistCount((c) => (c ?? 115) + 1);
  } catch (error) {
    console.error('Waitlist join failed:', error);
  }
}}
```
**Phase 2 modifications** — mirror handleSubscribe exactly (RESEARCH Pitfall 10 warns against divergence):
- Add `turnstileToken` parameter to the callback signature.
- Conditional `setIsSubscribed`/`setWaitlistCount` only on `state === 'success'`.
- On non-success: set FirstLetter's own error state (or hoist to `App.tsx` via shared `waitlistError`).
- Keep `console.error('Waitlist join failed:', error)` verbatim.

**Counter optimistic-increment pattern** (current line 35 + line 108) — `setWaitlistCount((c) => (c ?? 115) + 1)`. Phase 1 D-06 carry-forward (per CONTEXT 228): increment on success only.

**State declaration pattern** (current lines 14–17) — explicit generics for nullable union types:
```typescript
const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
```
**Phase 2 addition:** `const [waitlistError, setWaitlistError] = useState<WaitlistState | null>(null);` — matches the generic style + nullable union.

**useEffect + .catch fallback pattern** (current lines 19–26) — preserve verbatim; this is the Phase 1 D-09 fail-soft counter pattern:
```typescript
useEffect(() => {
  getSignupCount()
    .then(setWaitlistCount)
    .catch((error) => {
      console.error('Counter fetch failed:', error);
      setWaitlistCount(115);
    });
}, []);
```
Phase 2 does NOT touch this. The counter falls back to 115 on error — independent of signup flow.

**`<WaitlistForm onSubmit={handleSubscribe}>` pass-through pattern** (current lines 72–76) — Phase 2 adds `error={waitlistError}` to the prop set.

**Prop-threading FirstLetter pattern** (current lines 101–114) — Phase 2 adds the same `waitlistError` state and pass-through prop, OR mounts a sibling Turnstile widget inside FirstLetter (RESEARCH Pitfall 10 recommends the latter — easier than threading a ref through three components).

---

### `.env.local` (config, n/a)

**Analog:** none (single file, Phase 1 created it). Pattern derived from CONTEXT D-03 + STATE.md Blockers reference.

**Phase 2 changes** (no analog code — straight edits):
1. Strip leading space from `VITE_SUPABASE_ANON_KEY=` (currently has a space-after-equals that breaks Vite parsing).
2. Reconcile `VITE_SUPABASE_URL` host against the JWT's `ref` claim. Cross-check against `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/.env` or `.env.local` to find the canonical project ref. Update whichever side is wrong.
3. Add `VITE_TURNSTILE_SITE_KEY=<value from Cloudflare Turnstile dashboard>`.

**Validation tie-in:** the new module-load check in `src/lib/supabase.ts` throws if `VITE_TURNSTILE_SITE_KEY` is missing — so the dev server refuses to boot until step 3 is done. No silent bug surface.

---

### `.planning/REQUIREMENTS.md` (docs, n/a — text amendment)

**Analog:** self (text edit). Per CONTEXT D-05: the SEC-02 wording changes from "1 attempt per IP per 24h" to "Server-side IP rate limit of 3 signup attempts per rolling 24h per IP enforced in the Edge Function."

**Pattern for amending:** locate SEC-02 in the file, change the threshold wording in place, add a sibling note like `(Amended Phase 2 per 02-CONTEXT.md D-05 — rationale: NAT/shared-IP false positives.)`. No structural change to the requirement ID or surrounding requirements.

---

## Shared Patterns

### Error Handling (try/catch/finally + console.error)
**Source:** `src/App.tsx` lines 28–42 (`handleSubscribe`) and lines 103–112 (`FirstLetter.onEmailSubmit`); cross-repo `supabase/functions/dispatch/index.ts` lines 23–38.
**Apply to:** All Phase 2 async call sites. **Phase 1.5 D-06 mandates verbatim preservation of these skeletons** (CONTEXT D-12).
**Pattern:**
```typescript
setIsSubmitting(true);
try {
  // ... async work ...
} catch (error) {
  console.error('<Action> failed:', error);  // KEEP VERBATIM
  // Phase 2 ADDS: setWaitlistError(...) HERE
} finally {
  setIsSubmitting(false);
}
```
Mirror in Edge Function:
```typescript
try {
  // pipeline
} catch (e) {
  console.error('join-waitlist exception', (e as Error).message);
  // Optional: record outcome='db_error' attempt
  return jsonResponse({ state: 'server_error' }, 500);
}
```

### Module-Load Env-Var Validation (Phase 1 D-08)
**Source:** `src/lib/supabase.ts` lines 8–13.
**Apply to:** `src/lib/supabase.ts` (extend with `VITE_TURNSTILE_SITE_KEY` check). NOT applied to Edge Function — the `adminClient()` helper already validates `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` at first call (`_shared/admin-client.ts` lines 11–14).
**Pattern:**
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in .env.local (dev) or Vercel project settings (prod).'
  );
}
```
**Edge Function mirror** (`_shared/admin-client.ts` lines 11–14):
```typescript
if (!url || !key) {
  // T-02-02: do NOT include env values in the error message.
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
}
```

### Default Exports + Named Helpers (CONVENTIONS line 105–106)
**Source:** Every existing component file. `src/lib/supabase.ts` for the named-helpers-on-a-module variant.
**Apply to:**
- `src/lib/messages.ts` → named export `MESSAGES` (no default).
- `src/lib/supabase.ts` → named exports `supabase`, `getSignupCount`, `joinWaitlist`, type `WaitlistState`.
- `src/components/WaitlistForm.tsx` → default export `WaitlistForm` (current shape preserved).
- Edge Function `index.ts` → `Deno.serve(...)` at module level, no exports (matches `dispatch`, `notify`, `canary`).

### Service-Role Client via `adminClient()` (DB-06)
**Source:** `_shared/admin-client.ts` lines 7–17.
**Apply to:** `join-waitlist/index.ts`. Import `import { adminClient } from '../_shared/admin-client.ts';` at the top, call `const supabase = adminClient();` once per request inside the try block. Never `createClient` directly inside the function (the `_shared` helper caches; direct creation defeats the cache).

### CORS Headers + OPTIONS Preflight (Pitfall 6)
**Source:** No exact sibling — sibling Edge Functions are service-role-gated and don't need CORS. Hand-code per RESEARCH Pitfall 6 (lines 888–893).
**Apply to:** `join-waitlist/index.ts` only.
**Pattern:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // public signup; OK per Pitfall 6 reasoning
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inside Deno.serve, MUST be the first thing:
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```
Merge `corsHeaders` into every `jsonResponse` so non-OPTIONS responses also carry the header.

### Relative Imports, No `@` Alias (CONVENTIONS line 64)
**Source:** Every existing file. CONVENTIONS line 64 is explicit.
**Apply to:** All landing-repo files. `'../lib/supabase'`, `'./messages'`, etc. No `@/lib/...`.
**Edge Function mirror:** `'../_shared/admin-client.ts'` (Deno requires the `.ts` extension; landing repo does not).

### Privacy-Safe Error Logging (T-02-02 main-repo convention)
**Source:** `_shared/admin-client.ts` lines 12–13; `dispatch/index.ts` line 30; `_shared/resend.ts` lines 30–34.
**Apply to:** `join-waitlist/index.ts` error paths. **Never include `Deno.env.get(...)` values, secrets, or full request bodies in error logs.** Log: status code, error message, IP (already in scope), `outcome` enum. Do NOT log: email, turnstile token, service role key, anon key.
**Pattern:**
```typescript
console.error('join-waitlist exception', (e as Error).message);  // safe
// NEVER: console.error('turnstile failed', { secret: Deno.env.get('TURNSTILE_SECRET_KEY') })
```

### Migration Schema/Grant/Comment Block (Phase 1 carry-forward)
**Source:** `supabase/migrations/0031_waitlist_signups.sql` lines 1–34.
**Apply to:** `0032_signup_attempts.sql`. Header comment block → `create table` → indexes → `alter ... enable row level security` → `revoke all` from public roles → `grant ... to service_role` → `comment on table`. Bigserial requires the additional `grant usage, select on sequence ... to service_role` line that 0031 doesn't need (uuid PK).

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| (none) | — | Every Phase 2 file has at least one role-match analog in either the landing repo (for client files) or the cross-repo (for Edge Function + migration files). |

The Turnstile widget mount is the only NEW pattern with no existing analog — Phase 2 introduces the first Cloudflare touch point. RESEARCH Pattern 5 (lines 605–705) fills the gap with verified `@marsidev/react-turnstile@1.5.2` props and ref usage. The planner pastes that pattern wholesale.

---

## Phase 1 / Phase 1.5 Patterns That Phase 2 MUST Preserve

Per CONTEXT D-12 + RESEARCH "Project Constraints (from CLAUDE.md)" lines 1141–1156:

1. **try/catch/finally skeletons in `App.tsx`** (lines 28–42 + 103–112) — preserve verbatim per Phase 1.5 D-06; add `setWaitlistError(...)` calls alongside, KEEP `console.error('...failed:', error)` lines as-is.

2. **Module-load env-var validation** in `src/lib/supabase.ts` (lines 8–13) — extend to include `VITE_TURNSTILE_SITE_KEY`; do not remove or modify the existing `VITE_SUPABASE_*` checks.

3. **`getSignupCount` + .catch(115)` fallback** (App.tsx lines 19–26) — Phase 2 does NOT touch the counter fetch path. Counter remains independent of signup outcome.

4. **`public.signup_counter` view contract** — Phase 1 D-01 / COUNTER-01: `115 + count(*)` no status filter. Phase 2's `signup_attempts` insertions do NOT touch this view. The counter increments via inserts into `app_private.waitlist_signups`, which only happens on `state === 'success'`.

5. **Default exports + named helpers** — CONVENTIONS lines 105–106. `WaitlistForm` stays a default export; `MESSAGES` and `WaitlistState` are named exports.

6. **HALT-after-handoff pattern** — Phase 1 D-05 mirror. Wave 1 ends with the handoff prompt; Wave 2 starts after Nour confirms deploy. This is a process pattern, not a code pattern, but Phase 2 mirrors Phase 1's prompt format precisely.

7. **Cross-repo source-of-truth** — Phase 1 D-03/D-04: all Supabase server-side code lives in the main SEALED-org repo. Phase 2's Edge Function + migration go THERE, not in the landing repo. The landing repo touches ONLY `src/lib/supabase.ts`'s `supabase.functions.invoke(...)` call.

---

## Metadata

**Analog search scope:**
- Landing repo: `src/lib/`, `src/components/`, `src/App.tsx`, `src/main.tsx`
- Cross-repo: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/functions/{_shared,dispatch,notify,canary}/`
- Cross-repo: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` (Phase 1's `0031` + Phase 0's `0001` for `app_private.letters` shape)

**Files scanned:** 14 (5 sibling Edge Function files, 2 migrations, 7 landing-repo source files)
**Pattern extraction date:** 2026-05-28
