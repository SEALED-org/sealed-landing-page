# Phase 1: Foundation - Research

**Researched:** 2026-05-27
**Domain:** Supabase JS client + SQL migration (cross-repo) + Motion v12 odometer counter
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Counter Fetch Strategy**
- **D-01:** Counter uses a one-shot fetch on page mount via the `public.signup_counter` view (no Supabase Realtime subscription). After a user submits their email in the current tab, the count increments by +1 locally for immediate feedback. The next page load anywhere re-reads the view, which recomputes `115 + count(*)` and reflects all new signups.
- **D-02:** No polling, no WebSocket. Realtime is explicitly rejected for Phase 1.

**Migration / DDL Ownership**
- **D-03:** The SQL migration for `app_private.waitlist_signups` and `public.signup_counter` lives in the main SEALED-org repo at `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/`. The landing page repo never owns schema files.
- **D-04:** Phase 1's executor writes the SQL migration file AND drops it in the main repo's `supabase/migrations/` folder. It then generates a **handoff prompt** for Nour to paste into the SEALED-org repo's agent. That agent runs `/gsd-quick` to apply the migration and record in the main repo's planning system that the change exists because of the landing page.
- **D-05:** Phase 1 in this repo does NOT proceed past the wiring step until Nour confirms the SEALED-org agent has applied the migration and the table/view are visible in the Supabase dashboard. **This is a hard handoff blocker.**

**Supabase Client Shape**
- **D-06:** Single client file at `src/lib/supabase.ts`. It calls `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)` once and exports both the bare `supabase` client and named helper functions.
- **D-07:** Phase 1 adds one helper: `export async function getSignupCount(): Promise<number>` which selects from `public.signup_counter`.
- **D-08:** Environment variable names are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The `VITE_` prefix is non-negotiable. Values are identical to the main SEALED-org app's Supabase project URL and anon key.

**Counter UX**
- **D-09:** Counter displays with leading zeros, growing in width: 3 digits below 1000 (`115`, `127`, `999`), 4 digits at 1000–9999 (`1024`), 5 digits at 10000+. Same width within a tier — no layout shift mid-tier.
- **D-10:** On page load, the digits render as `000` and animate (rolling odometer style) up to the real value returned from Supabase. Animation uses the existing `motion/react` library — no new dependency.
- **D-11:** If the Supabase fetch fails or times out (~3s), the counter animates up to `115` instead of staying at `000`. Rationale: `115` is the seeded floor.
- **D-12:** Failure mode is silently logged to the browser console (`console.error('Counter fetch failed:', error)`).
- **D-13:** The pulse indicator (COUNTER-04) remains unchanged.

### Claude's Discretion
- Choice of timeout duration for counter fetch failure (suggested 3s, planner may adjust).
- Exact shape of the odometer animation (per-digit roll vs. number tween).
- Whether to add a small README note in `src/lib/supabase.ts` describing the env var contract.

### Deferred Ideas (OUT OF SCOPE)
- `showSticky` dead-code removal — deferred to Phase 5 polish.
- Supabase Realtime for the counter — deferred to a future v2 milestone.
- Counter UX retries before fallback — deferred unless reliability data shows it's needed.
- Visible error UI for counter failure — deferred; Phase 1 only logs to console.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-05 | Firebase imports completely removed from the codebase; `@supabase/supabase-js@2.103.2` installed | Standard Stack (npm verified). Verification commands in "Common Pitfalls → No Firebase Residue" section. Only one Firebase reference in src tree (verified). |
| DB-01 | `app_private.waitlist_signups` table created (user_id PK, status: active\|unsubscribed, has_letter boolean, created_at) | "SQL Migration Pattern" section — DDL matches sibling repo conventions (schema, grants, RLS, comments). |
| DB-02 | `public.signup_counter` view created and granted to anon role | "SQL Migration Pattern" — view uses `security_invoker = false` per sibling repo convention so anon never needs grants on `app_private`. |
| COUNTER-01 | Counter starts at 115 and increments by 1 on every successful signup | View definition: `select 115 + count(*) as total from app_private.waitlist_signups`. Phase 2 will own the actual signup insert. |
| COUNTER-02 | Counter is computed as a Postgres view with no status filter | View definition explicitly omits any `where status = ...` filter. |
| COUNTER-03 | Counter is readable by the anon Supabase client (view granted to anon) | Grant pattern: `grant select on public.signup_counter to anon, authenticated`. |
| COUNTER-04 | Live "pulse" indicator next to the counter remains | `src/App.tsx` lines 104-116 already render the pulse — Phase 1 leaves this JSX unchanged, only changes the number rendering inside it. |
</phase_requirements>

## Summary

Phase 1 has three independent surgery areas: (1) **remove Firebase / install Supabase** (1 import line, 1 useState init, 1 useEffect block in `src/App.tsx`), (2) **write a SQL migration in the SIBLING `SEALED-org` repo** following its mature 4-digit sequential naming + `app_private` + `security_invoker=false` convention (next number is `0031_waitlist_signups.sql`), and (3) **build a Motion v12 odometer counter** using the free `useMotionValue` + `animate()` + `useTransform` pattern (the `AnimateNumber` component is paywalled and unavailable).

The hard handoff blocker in D-05 splits execution into two waves. **Wave A** (autonomous, before handoff) does everything that does NOT require the database to exist: install the package, write `src/lib/supabase.ts`, write the new Counter component, write the migration SQL file into the sibling repo, generate the handoff prompt. **Wave B** (autonomous, after Nour confirms) wires `App.tsx` to use the real fetch and validates the live count appears. The reason to split: if Wave B runs before the migration is applied, the fetch always times out → the counter always shows the 115 fallback → the executor can't tell whether the wiring is correct or the database is missing.

`@supabase/supabase-js@2.103.2` is confirmed available on npm (latest is 2.106.2; pinning to 2.103.2 keeps the landing page in lockstep with whatever the main SEALED-org app uses). The Postgrest `.abortSignal(signal)` method is verified — combined with `AbortSignal.timeout(3000)` it cleanly handles the timeout-then-fallback flow without `Promise.race` plumbing.

**Primary recommendation:** Execute as two waves separated by a human-gated checkpoint. Use `security_invoker = false` for the view (matches sibling repo convention; means anon never needs grants on `app_private.waitlist_signups`). Use `AbortSignal.timeout(3000)` chained via `.abortSignal()` on the Supabase query. Render the odometer with one `useMotionValue` tweened from `0` to `target`, formatted into a tier-aware leading-zero string via `useTransform`, and displayed inside a `motion.span`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema (table + view DDL) | Database / Storage (sibling repo) | — | Per D-03, the main SEALED-org repo is the single source of truth for Supabase schema. The landing page repo never owns DDL. |
| Counter aggregation (`115 + count(*)`) | Database / Storage | — | View runs in Postgres. Client never sees the underlying table. |
| Anon access control | Database / Storage | — | `security_invoker = false` view + `revoke all on app_private.waitlist_signups from anon` keeps the table inaccessible. |
| Supabase client instance | Browser / Client | — | Pure browser SPA. The anon key is safe to ship to the browser (it's gated by RLS / role grants, not by secrecy). |
| Counter fetch + timeout | Browser / Client | — | Single `getSignupCount()` helper called from `useEffect` in `App.tsx`. |
| Odometer animation | Browser / Client | — | `motion/react` is a client-side library. No SSR in this stack. |
| Local +1 increment after submit | Browser / Client | — | Local state update; the server view will reflect the real count on next page load. |
| Env var injection | CDN / Static (Vercel build) | Browser / Client | `import.meta.env.VITE_*` is replaced at build time by Vite — values become string literals in the bundle. |
| Cross-repo planning audit trail | Out of this repo (handoff to SEALED-org agent) | — | The handoff prompt instructs the sibling agent to run `/gsd-quick` so the migration is documented in BOTH planning systems. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.103.2 | Browser client to read `public.signup_counter` | Per D-08, pinned to match the main SEALED-org app version. [VERIFIED: npm view returned `version = '2.103.2'`, latest is 2.106.2 — 2.103.2 is published and installable.] |

### Supporting (already installed — no new install needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `motion` | 12.23.24 | Odometer animation (`useMotionValue`, `animate`, `useTransform`, `motion.span`) | Counter render. [VERIFIED: already in package.json line 15.] |
| `react` / `react-dom` | 19.0.0 | `useState` + `useEffect` for fetch + local state | Counter mount + Wave B `App.tsx` rewire. [VERIFIED: package.json lines 16-17.] |
| `lucide-react` | 0.546.0 | Existing icons (no new icons needed) | N/A in Phase 1 — pulse indicator is already a CSS div, not an icon. |
| `tailwindcss` + `@tailwindcss/vite` | 4.1.14 | Counter container styling | Reuse existing `font-mono`, `text-[10px]`, `opacity-60` utility classes already in the pulse row. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/supabase-js@2.103.2` | Latest `2.106.2` | Decision D-08 locks 2.103.2 to match main app. Drift between repos is the bigger risk than missing 3 patch versions. |
| `useMotionValue` + `animate` + `useTransform` | Per-digit `motion.span` stack with `useSpring` + `useTransform` (BuildUI pattern: 3 stacked `<Number>` columns, each `translateY`-animated) | Per-digit is visually more "rolling," but requires re-laying out columns at tier boundaries (3 → 4 digits at 1000). Single-tween + padStart is simpler, scales across tiers without layout work, and looks like an odometer because of the digit-by-digit visual jump from rounding. [CITED: motion.dev/docs/react-animation imperative pattern.] |
| `useMotionValue` + `animate` + `useTransform` | `AnimateNumber` from `motion-plus/react` (one-prop API) | **`AnimateNumber` is paywalled — Motion+ membership required.** [VERIFIED: motion.dev/docs/react-animate-number states "AnimateNumber is exclusive to Motion+ members." This is a hard blocker — do NOT plan around it.] |
| `AbortSignal.timeout(3000)` + `.abortSignal()` | `Promise.race([fetch, setTimeout])` | Less ergonomic, doesn't actually cancel the underlying request — the fetch continues in the background and the error bubbles up later. `AbortSignal.timeout` is widely supported (96% browser support per caniuse, available in Node 17.3+). [CITED: MDN AbortSignal.timeout static method.] |
| `security_invoker = false` on the view | `security_invoker = true` with explicit anon grants on `app_private.waitlist_signups` | Setting `security_invoker = true` would force you to grant SELECT on the underlying table to anon, defeating the `app_private` schema isolation. The sibling repo's migrations 0014 (observability views) and 0019 (sealed_letters) BOTH use `security_invoker = false` exactly for this reason. [VERIFIED by reading SEALED-org/supabase/migrations/0014, 0019, 0023.] |

**Installation:**
```bash
npm install @supabase/supabase-js@2.103.2
```

**Version verification:**
- `@supabase/supabase-js@2.103.2` — [VERIFIED: `npm view @supabase/supabase-js@2.103.2 version` returned `'2.103.2'` on 2026-05-27. Latest tag is `2.106.2`. Pin is intentional per D-08.]
- `motion@12.23.24` — [VERIFIED: already in package.json. npm latest is 12.40.0 but no upgrade needed.]

## Architecture Patterns

### System Architecture Diagram

```text
                        ┌─────────────────────────────────────────────┐
                        │   Page Load (browser navigates to /)        │
                        └────────────────────┬────────────────────────┘
                                             │
                                             ▼
                        ┌─────────────────────────────────────────────┐
                        │   src/main.tsx  →  <App />                  │
                        └────────────────────┬────────────────────────┘
                                             │
                                             ▼
                        ┌─────────────────────────────────────────────┐
                        │   src/App.tsx                                │
                        │   useState(waitlistCount, null)              │  (null = not loaded yet)
                        │   useEffect(() => fetch on mount)            │
                        └────────────────────┬────────────────────────┘
                                             │
                                             │ calls
                                             ▼
                        ┌─────────────────────────────────────────────┐
                        │   src/lib/supabase.ts                        │
                        │   getSignupCount(): Promise<number>          │
                        │   - supabase.from('signup_counter')          │
                        │   - .select('total')                         │
                        │   - .single()                                │
                        │   - .abortSignal(AbortSignal.timeout(3000))  │
                        └────────────────────┬────────────────────────┘
                                             │
                                             │ HTTPS
                                             ▼
                        ┌─────────────────────────────────────────────┐
                        │   Supabase (shared project — same as app)    │
                        │   GET /rest/v1/signup_counter?select=total   │
                        │   PostgREST → public.signup_counter view     │
                        │   security_invoker = false                   │
                        │   view body: SELECT 115 + count(*)           │
                        │              FROM app_private.waitlist_signups│
                        └────────────────────┬────────────────────────┘
                                             │ { total: 115 }
                                             │
                                             ▼
                  ┌───────────────────────────┴─────────────────────────┐
                  │ Success path                  Failure / timeout path │
                  │ setWaitlistCount(115)         setWaitlistCount(115)  │
                  │                               console.error(...)     │
                  └───────────────────────────┬─────────────────────────┘
                                              │
                                              ▼
                        ┌─────────────────────────────────────────────┐
                        │   <Counter target={waitlistCount ?? 115} /> │
                        │   useMotionValue(0)                         │
                        │   animate(mv, target, { duration: 1.2 })    │
                        │   useTransform(mv → padded string)          │
                        │   <motion.span>{display}</motion.span>      │
                        └─────────────────────────────────────────────┘
```

### Recommended Project Structure (additive — only new file)
```
src/
├── App.tsx               # Rewired: import getSignupCount, replace useEffect, replace useState init
├── main.tsx              # Unchanged
├── index.css             # Unchanged
├── lib/                  # NEW directory
│   └── supabase.ts       # NEW: createClient + getSignupCount helper
└── components/
    ├── Counter.tsx       # NEW: odometer component (or inline in App.tsx — discretion)
    ├── FAQ.tsx           # Unchanged
    ├── FirstLetter.tsx   # Unchanged (Phase 2 will rewire its joinWaitlist call)
    ├── ShareButtons.tsx  # Unchanged
    └── Typewriter.tsx    # Unchanged
```

Note: `src/lib/` is a new directory but Vite + the existing `@` alias handle it without config changes. Path: `./lib/supabase` (relative, per CONVENTIONS.md: "no `@` alias usage in source").

### Pattern 1: Supabase Client + Helper (single file)

**What:** One module creates the client once and exports purpose-built helpers. Future phases add `joinWaitlist`, `verifyEmail`, etc. to the same file.

**When to use:** Phase 1 (`getSignupCount`), Phase 2 (`joinWaitlist`), Phase 4 (`verifyEmail`).

**Example:**
```typescript
// Source: docs.supabase.com/docs/reference/javascript/initializing (verified)
// File: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud at module load — easier to debug than silent undefined.
  // This will throw before App.tsx renders, so the build fails visibly.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in .env.local (dev) or Vercel project settings (prod).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Reads the current waitlist count from the public.signup_counter view.
 * The view computes 115 + count(*) from app_private.waitlist_signups.
 *
 * @throws on network error, timeout (3s), or PostgREST error.
 *   Caller is responsible for catching and falling back (Phase 1: animate to 115).
 */
export async function getSignupCount(): Promise<number> {
  const { data, error } = await supabase
    .from('signup_counter')
    .select('total')
    .single()
    .abortSignal(AbortSignal.timeout(3000));

  if (error) throw error;
  if (!data) throw new Error('signup_counter view returned no row');
  return data.total as number;
}
```

[VERIFIED: `.abortSignal(signal)` exists on PostgrestTransformBuilder at github.com/supabase/postgrest-js/blob/master/src/PostgrestTransformBuilder.ts, returns `this`. Signature: `abortSignal(signal: AbortSignal): this`.]

[VERIFIED: `AbortSignal.timeout(ms)` returns an AbortSignal that auto-aborts with a `TimeoutError` DOMException — MDN, 96% browser support per caniuse.]

[VERIFIED: `.single()` returns `{ data, error }` where `data` is the single row or null — supabase docs.]

### Pattern 2: Odometer Counter (Motion v12, free API)

**What:** A `useMotionValue(0)` tweened to the target via `animate()`, formatted into a tier-aware leading-zero string via `useTransform`, rendered as a `motion.span` child.

**When to use:** Replace the inline `{waitlistCount.toLocaleString()}` on `src/App.tsx:114`.

**Example:**
```typescript
// Source: motion.dev/docs/react-animation (verified) + motion.dev/docs/react-use-transform (verified)
// File: src/components/Counter.tsx
import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

interface CounterProps {
  target: number;
}

/**
 * Returns padded leading-zero string sized to the value's tier.
 *  - 0..999    → 3 digits  ("000", "115", "999")
 *  - 1000..9999 → 4 digits ("1024")
 *  - 10000+    → 5 digits  ("10001")
 *
 * Width is determined by the TARGET, not the current animating value,
 * so during the 000 → 115 animation the width stays at 3 (no layout shift).
 */
function formatCounter(current: number, target: number): string {
  const width = target >= 10000 ? 5 : target >= 1000 ? 4 : 3;
  return Math.floor(current).toString().padStart(width, '0');
}

export default function Counter({ target }: CounterProps) {
  const motionCount = useMotionValue(0);
  const display = useTransform(motionCount, (latest) => formatCounter(latest, target));

  useEffect(() => {
    const controls = animate(motionCount, target, {
      duration: 1.2,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [target, motionCount]);

  return <motion.span>{display}</motion.span>;
}
```

[CITED: motion.dev/docs/react-animation — `animate(motionValue, target, opts)` returns controls with `.stop()`; cleanup pattern via `useEffect` return.]
[CITED: motion.dev/docs/react-use-transform — transform functions can return strings; subscribed motion values trigger recomputation.]
[CITED: motion.dev — "When a MotionValue is passed as a child to a motion component, it displays the latest animated value without triggering React re-renders, updating the DOM directly instead."]

**Why a single tween instead of per-digit rolling:** The single-tween approach handles tier boundaries (3 → 4 digits at 1000) automatically just by changing the padStart length — no DOM restructuring. The BuildUI per-digit pattern would need its parent to swap from 3 stacked digit columns to 4 mid-animation, which causes layout shift. The single-tween still looks like an odometer because `Math.floor(latest)` jumps discretely as the tween progresses (you never see decimal points). For a 0 → 115 animation over 1.2s, the user sees roughly 115 discrete integer steps — visually identical to a rolling odometer.

### Pattern 3: App.tsx rewire (Wave B)

**What:** Replace the Firebase import, hardcoded useState, and Firebase useEffect with the Supabase versions.

**When to use:** Once — only after Nour confirms the migration is live in Supabase.

**Example (diff-style — apply these three surgical edits, leave everything else alone):**
```typescript
// REMOVE (src/App.tsx line 7):
import { subscribeToWaitlistCount, joinWaitlist } from './firebase';

// ADD (src/App.tsx line 7):
import { getSignupCount } from './lib/supabase';
import Counter from './components/Counter';

// REPLACE (src/App.tsx line 13):
const [waitlistCount, setWaitlistCount] = useState(102);
// WITH:
const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

// REPLACE (src/App.tsx lines 23-26):
useEffect(() => {
  const unsubscribe = subscribeToWaitlistCount(setWaitlistCount);
  return () => unsubscribe();
}, []);
// WITH:
useEffect(() => {
  getSignupCount()
    .then(setWaitlistCount)
    .catch((error) => {
      console.error('Counter fetch failed:', error);
      setWaitlistCount(115); // D-11 fallback to seeded floor
    });
}, []);

// REPLACE (src/App.tsx line 114 — the JSX inside the pulse row):
<span>
  Join {waitlistCount.toLocaleString()} others on the list
</span>
// WITH:
<span>
  Join <Counter target={waitlistCount ?? 115} /> others on the list
</span>
```

Note on `waitlistCount: number | null`: Until the fetch resolves (success OR failure), `waitlistCount` is `null`. The `<Counter target={waitlistCount ?? 115} />` renders with target=115 immediately, so the digits start at 000 and animate up to 115. When the fetch resolves with the real number (say 142), `target` becomes 142 and the `useEffect` in Counter re-runs, animating from the current value (115 or wherever it got to) up to 142. The animation feels seamless.

`handleSubscribe` and the `FirstLetter.onEmailSubmit` callback still call `joinWaitlist` — those calls are kept but routed through a stub that resolves immediately and bumps `waitlistCount` by 1 locally (per D-01). Phase 2 will replace the stub with the real Edge Function call. **Tasking decision for the planner:** either (a) add a `joinWaitlistLocal` placeholder helper that just does `setWaitlistCount(c => (c ?? 115) + 1)`, or (b) leave the Firebase `joinWaitlist` import in place temporarily and just stub the function in `src/lib/supabase.ts` so the existing `import` line doesn't break. Recommended: (a) — fully removes the Firebase name from the codebase.

### Pattern 4: SQL Migration (sibling repo)

**What:** A new `.sql` file in the SEALED-org repo's `supabase/migrations/` folder, named by the next sequential 4-digit number, following the established conventions.

**When to use:** Wave A — written by the executor, applied by the SEALED-org agent.

**File path:** `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0031_waitlist_signups.sql`

[VERIFIED: ran `ls` on the migrations folder — the highest existing number is `0030_seed_test_letter_optional_schedule.sql` (dated May 24). The next number is `0031`. Naming convention: `NNNN_snake_case_description.sql`, 4-digit zero-padded sequential.]

**Example (full migration content, ready to write):**
```sql
-- 0031_waitlist_signups.sql
-- Landing page (sealedapp.io) waitlist + counter view.
-- Created for the SEALED landing page (sibling repo: SEALED-Landing-Page).
-- Phase 1 (Foundation) of the landing page roadmap owns this schema.
--
-- Design (per CONTEXT.md decisions D-01 to D-13 + REQUIREMENTS.md DB-01, DB-02, COUNTER-01..03):
--   - app_private.waitlist_signups stores one row per signup. has_letter flags whether
--     the user also wrote a first letter (Path B in PROJECT.md), purely for analytics
--     and re-signup detection (DB-07).
--   - public.signup_counter is a security_invoker=false view that aggregates the table.
--     The anon role never gets grants on app_private.waitlist_signups, only on the view.
--   - Status column allows future unsubscribe handling without column add (Phase 5+).
--   - user_id references auth.users because Phase 2 will create the auth user via
--     admin.createUser before inserting the waitlist row. ON DELETE CASCADE keeps
--     the table aligned with auth.users cleanup.

create table app_private.waitlist_signups (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  status     text not null default 'active' check (status in ('active', 'unsubscribed')),
  has_letter boolean not null default false,
  created_at timestamptz not null default now()
);

create index waitlist_signups_created_at_idx on app_private.waitlist_signups (created_at);
create index waitlist_signups_status_idx     on app_private.waitlist_signups (status);

alter table app_private.waitlist_signups enable row level security;

-- Phase 2's join-waitlist Edge Function uses service_role for inserts.
revoke all on app_private.waitlist_signups from anon, authenticated, public;
grant select, insert, update, delete on app_private.waitlist_signups to service_role;

comment on table app_private.waitlist_signups is
  'Landing page waitlist signups. One row per email. has_letter flags whether a first letter was also written. service_role: full DML. anon/authenticated: no direct access (read via public.signup_counter view).';

-- ===== public.signup_counter view =====
-- COUNTER-01: starts at 115, increments by 1 on every successful signup.
-- COUNTER-02: no status filter — unsubscribed rows still count toward social proof.
-- security_invoker = false: view runs as owner (postgres), so anon never needs grants
--   on app_private.waitlist_signups. Same pattern as migrations 0014 and 0019.

create view public.signup_counter
  with (security_invoker = false) as
select (115 + count(*))::bigint as total
  from app_private.waitlist_signups;

-- COUNTER-03: readable by anon. authenticated too in case the main app ever wants it.
grant select on public.signup_counter to anon, authenticated;

comment on view public.signup_counter is
  'Single-row view exposing the public waitlist count: 115 (seed) + count(app_private.waitlist_signups). Read by the landing page on every page load. security_invoker=false isolates anon from the underlying private table.';
```

[VERIFIED by reading these sibling-repo migrations: 0001 (table + schema create + grants + comments), 0002 (view + security_invoker), 0014 (count(*)::bigint pattern + security_invoker=false on a view that touches app_private), 0019 (revoke from anon/authenticated/public + grant to service_role), 0026 (comment style + multi-line rationale headers).]

### Pattern 5: Cross-repo Handoff Prompt

**What:** A self-contained prompt that Nour pastes verbatim into the SEALED-org repo's agent. Output by the Phase 1 executor at the end of Wave A.

**When to use:** Once, at the Wave A → Wave B boundary.

**Example (the prompt — store in `.planning/phases/01-foundation/HANDOFF-PROMPT.md` or print to stdout):**
```text
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
```

The prompt is intentionally explicit about (a) the migration file path, (b) the `/gsd-quick` requirement, and (c) the reason the migration exists — these are the three requirements from CONTEXT.md §"Specific Ideas".

### Anti-Patterns to Avoid

- **Don't grant SELECT on `app_private.waitlist_signups` to anon.** Use the view. The sibling repo's mature pattern (migration 0019) explicitly revokes all on the table from anon to prevent direct PostgREST access. Replicate that.
- **Don't use `Promise.race` with manual `setTimeout` for the timeout.** `AbortSignal.timeout(3000)` + `.abortSignal()` actually cancels the underlying fetch. Promise.race just resolves the wrapper while the in-flight request keeps running and may log a stray error 5s later.
- **Don't use `useState(115)` as the initial render value.** Use `useState<number | null>(null)` and let the Counter component handle the "no data yet" case with its target=115 fallback. Initializing with 115 means the animation will start from 115 and tween to 115 (no movement) before the real fetch resolves.
- **Don't import from `framer-motion`.** All existing components use `motion/react` (Motion v12). Mixing the two breaks animations.
- **Don't write the migration into THIS repo's `supabase/migrations/`.** Per D-03, this repo never owns schema files. There's no `supabase/` folder in this repo — don't create one.
- **Don't run `supabase db push` from this repo's executor.** Per D-04, the executor only writes the SQL file and generates the handoff prompt. The SEALED-org agent applies it.
- **Don't add `.env` to git.** Vite expects `.env.local` for dev (gitignored by default in Vite projects). Document the contract via `.env.example` instead. Currently no `.env` files exist; either create `.env.example` listing `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=`, or note in `src/lib/supabase.ts` that these are required.
- **Don't use `AnimateNumber` from `motion-plus/react`.** It's paywalled. Use the free `useMotionValue` + `animate` + `useTransform` pattern.
- **Don't proceed past Wave A without the human checkpoint.** D-05 is explicit: this is a hard blocker. If Wave B runs first, the fetch fails (table doesn't exist), the counter shows 115 (fallback), and you can't tell the wiring is correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP fetch with retry/cancel | Custom `fetch` wrapper with manual timeout | `supabase-js .abortSignal(AbortSignal.timeout(ms))` | Handles cancellation correctly, integrates with PostgREST error shape, no race condition with stale promises. |
| Number tweening over time | `setInterval` + `setState` (like Typewriter.tsx does for character cycling) | `motion` `animate(motionValue, target, opts)` | Motion uses requestAnimationFrame with frame budgeting + easing curves; setInterval drifts and re-renders React on every tick. The Typewriter pattern is fine for char-by-char but wrong for smooth number animation. |
| String formatting with leading zeros | Manual `if (n < 1000) return '0' + n; ...` | `n.toString().padStart(width, '0')` | Native String method, handles all tier widths uniformly. |
| Counter aggregation | Client-side `count()` from a fetched list | `public.signup_counter` Postgres view | Server-computed aggregate is one int over the wire, not N rows. Also keeps the seed (`+115`) server-side, avoiding client/server drift. |
| Migration numbering | Timestamp prefix (`20260527_...`) | Sequential 4-digit (`0031_...`) | Matches sibling repo's established convention. Mixing schemes breaks `ls`-sorted apply order. |
| Anon access control on aggregates | RLS policy on the underlying table | `security_invoker = false` view + revoked grants on the table | RLS on aggregates is awkward (count(*) leaks row existence). The view-as-definer pattern is the sibling repo's house style — see migrations 0014, 0019. |

**Key insight:** All of the "deceptively complex" problems in this phase already have standard solutions that the sibling repo or one of the existing dependencies provides for free. The temptation will be to build a one-off solution because the phase is "small" — resist it. Match the sibling repo's migration style exactly so future audits don't see drift between the two repos' schemas.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **App-side:** `useState(102)` hardcoded in `src/App.tsx:13` — replaced when the new fetch wires in. **Supabase side:** `app_private.waitlist_signups` does not yet exist in the shared Supabase project [VERIFIED: grep over sibling repo migrations 0000–0030 found zero references to `waitlist` or signup-related tables]. | Code edit (App.tsx). DDL migration (new file 0031 in sibling repo). |
| Live service config | **Supabase project config:** the sibling repo's `supabase/config.toml` already exposes `public`, `graphql_public`, and `app_private` schemas to the API — no config change needed. **PostgREST schema cache:** after the migration is applied, PostgREST will auto-reload and pick up the new view. No manual cache refresh required. | None — auto. |
| OS-registered state | None — this is a browser-only SPA. No launchd, Task Scheduler, pm2, or systemd registrations. | None. |
| Secrets/env vars | New env vars introduced: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. **Local dev:** Nour must create `.env.local` with these values (copy-paste from sibling repo's `.env.local` — values are identical, only the prefix differs). **Vercel:** Phase 5 will set these in the Vercel dashboard. **Old Firebase vars:** see "Build artifacts" below. | (Wave A) Create `.env.example` documenting the required vars. (Wave B trigger by Nour) Create `.env.local` with real values. (Phase 5) Set in Vercel. |
| Build artifacts / installed packages | **Firebase package:** NOT in `package.json` [VERIFIED — read package.json, no firebase entry]. So no `node_modules/firebase` cleanup needed. **Missing `src/firebase.ts`:** doesn't exist [VERIFIED by `ls src/` showing only App.tsx, main.tsx, index.css, components/]. **Old Firebase env vars:** none committed in this repo [VERIFIED — `.env` files absent]. **CONVENTIONS.md and ARCHITECTURE.md still mention Firebase:** these are planning docs and should be refreshed at the Phase 1 transition (`/gsd-transition`), not during Phase 1 itself. | Phase 1: install `@supabase/supabase-js@2.103.2` (creates `node_modules/@supabase/`). At phase transition: planning docs in `.planning/codebase/` get re-mapped. |

## Common Pitfalls

### Pitfall 1: Wiring App.tsx before the migration is applied

**What goes wrong:** Wave B runs (App.tsx rewired to call `getSignupCount()`), but the migration isn't applied yet. Every page load fails with a PostgREST error like `relation "public.signup_counter" does not exist`. The counter falls back to 115. The executor sees the counter showing 115 and thinks "it works!" — but it's actually broken; 115 is the fallback, not the real count.

**Why it happens:** The success path and the failure path BOTH show 115 in an empty database (because the view returns `115 + 0 = 115`). A casual visual check can't distinguish them.

**How to avoid:** Strict Wave A / Wave B separation gated by Nour's confirmation. Wave A ends with the handoff prompt printed. Wave B begins only after Nour says "migration is live." During Wave B verification, check the browser network tab: a successful response is `200 OK` with `{ total: 115 }`; a missing-table response is `404` or `400` with an error body.

**Warning signs:** Counter shows 115 immediately on a fresh page load with no console error — but also a network 4xx in DevTools. If you see this, the migration is not applied.

### Pitfall 2: `import.meta.env.VITE_SUPABASE_URL` is `undefined` at build time

**What goes wrong:** No `.env.local` exists. Vite replaces `import.meta.env.VITE_SUPABASE_URL` with the literal string `"undefined"` (per Vite docs). `createClient("undefined", "undefined")` doesn't throw — it returns a client that fails on every actual request with a confusing CORS or DNS error.

**Why it happens:** [CITED: vite.dev/guide/env-and-mode — "When a `VITE_` variable is undefined during build, it gets replaced with the string `'undefined'` in your code."] Vite does NOT fail the build for missing env vars.

**How to avoid:** Fail loud at module load time. The recommended pattern in `src/lib/supabase.ts` (above) throws if either var is missing. This makes the bug visible at `npm run dev` startup instead of later when the first fetch is attempted.

**Warning signs:** `createClient` is called with the string `"undefined"`. Network tab shows requests to `https://undefined/rest/v1/...`.

### Pitfall 3: `useEffect` re-runs the animation on every render

**What goes wrong:** If `Counter`'s useEffect dependency array omits `target`, the animation only runs on mount — the counter never updates when the real number arrives. If the dependency array also includes objects that change identity every render, the animation restarts on every render and never finishes.

**Why it happens:** React 19's strict mode in dev double-mounts components. Each mount creates a new `motionCount` motion value (because `useMotionValue(0)` is called fresh). Need to make sure the cleanup stops the previous animation.

**How to avoid:** Dependency array is `[target, motionCount]`. Cleanup function calls `controls.stop()`. The example pattern in Pattern 2 above does both. Also: do NOT recreate `motionCount` outside the `useMotionValue` hook — keep that hook call at the top of the component.

**Warning signs:** Counter ticks up briefly then resets. Counter is stuck at 0. Counter shows the value then snaps to 0 on the next render.

### Pitfall 4: `single()` throws when the view returns no rows

**What goes wrong:** `.single()` throws an error if the result has zero rows OR more than one row. If somehow the view definition got corrupted and returned 0 rows, the helper throws and falls back to 115 — but the underlying problem (broken view) is silent.

**Why it happens:** The view's definition uses an aggregate (`count(*)`) which ALWAYS returns exactly one row even if the table is empty. So in practice this won't happen. But if a future migration accidentally adds a `where` clause, it could.

**How to avoid:** Use `.single()` (not `.maybeSingle()`) intentionally. Single's strict behavior is desirable: we WANT to know if the view returns zero rows. The catch-all in App.tsx will log the error to `console.error`, which is the D-12 behavior.

**Warning signs:** Counter immediately animates to 115 (fallback) and console shows `PGRST116` (the postgrest error code for "no rows returned").

### Pitfall 5: Firebase residue check passes because grep misses CONVENTIONS.md

**What goes wrong:** The DB-05 verification step runs `grep -r firebase src/` and it passes. But `.planning/codebase/CONVENTIONS.md`, `ARCHITECTURE.md`, and `INTEGRATIONS.md` still talk about Firebase. CLAUDE.md still references `src/firebase.ts`.

**Why it happens:** Planning docs document the state at analysis time. They're refreshed at phase boundaries, not during phase execution.

**How to avoid:** Scope DB-05's verification to source code only, NOT planning docs. The planning docs are refreshed by `/gsd-transition` after Phase 1 completes. The verification commands in this RESEARCH.md (see "Verification Commands" below) intentionally exclude `.planning/`, `node_modules/`, and `.git/`.

**Warning signs:** Verification grep returns hits in `.planning/` or `CLAUDE.md`. Those are expected — not a Phase 1 task.

### Pitfall 6: Re-installing breaks the lockfile-less build

**What goes wrong:** `npm install @supabase/supabase-js@2.103.2` creates `package-lock.json` (currently absent per package.json analysis). Future `npm install` runs without `--no-save` may pull a newer version because of `^` semver in package.json.

**Why it happens:** No lockfile means npm resolves loosely. Adding one suddenly means resolution becomes strict.

**How to avoid:** Either (a) commit `package-lock.json` so future installs are reproducible, or (b) pin the Supabase version exactly (no `^`): `"@supabase/supabase-js": "2.103.2"` (no caret). Recommended: (a) — commit the lockfile. Reproducible builds matter for Vercel.

**Warning signs:** Two devs see different Supabase versions in `node_modules` and call different methods on the client.

## Code Examples

### Example 1: Minimal `getSignupCount` Helper (verified composition)

```typescript
// Source: composed from
//   supabase.com/docs/reference/javascript/initializing
//   supabase.com/docs/reference/javascript/select
//   supabase.com/docs/reference/javascript/db-abortsignal
//   developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
// File: src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url, key);

export async function getSignupCount(): Promise<number> {
  const { data, error } = await supabase
    .from('signup_counter')
    .select('total')
    .single()
    .abortSignal(AbortSignal.timeout(3000));

  if (error) throw error;
  if (!data) throw new Error('signup_counter returned no row');
  return data.total as number;
}
```

### Example 2: Vite env type declarations

```typescript
// Source: vite.dev/guide/env-and-mode (verified)
// File: src/vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

This file is conventional for Vite TypeScript projects. It does not currently exist in this repo. Adding it gives `import.meta.env.VITE_*` proper IntelliSense in `src/lib/supabase.ts`.

### Example 3: Verification commands for "no Firebase residue"

```bash
# These commands are the verification for DB-05. Run them after Wave B completes.
# They must all return ZERO matches.

# 1. No Firebase imports in source code (scope: src/ only)
grep -rn "firebase\|Firebase" src/ 2>&1
# Expected output: (empty)

# 2. No firebase package in dependencies
grep -E '"firebase' package.json 2>&1
# Expected output: (empty)

# 3. No firebase.ts/.js file lingering
find src/ -name "firebase*" -type f 2>&1
# Expected output: (empty)

# 4. Production build succeeds (catches type errors from removed Firebase imports)
npm run build 2>&1 | tail -20
# Expected output: ends with "✓ built in Xs" — no error lines

# 5. Bundle output contains no firebase symbols (paranoid check, only run if very paranoid)
grep -c "firebase" dist/assets/*.js 2>&1 || echo "0"
# Expected output: 0
```

These five commands together prove the Firebase removal is complete in the build artifact, not just the source. They intentionally exclude `.planning/`, `node_modules/`, `.git/`, and the root `CLAUDE.md` (those are planning docs / dependencies and not part of Phase 1's scope).

### Example 4: Local +1 stub for Wave B (replaces Firebase joinWaitlist)

```typescript
// File: src/lib/supabase.ts (added in Wave B)

/**
 * Phase 1 stub. Phase 2 will replace this with a real Edge Function call
 * to join-waitlist (Turnstile → IP rate limit → admin.createUser → DB insert).
 *
 * For Phase 1, this just resolves immediately so the existing UI flow
 * (handleSubscribe in App.tsx) continues to work without throwing.
 * The local +1 increment in App.tsx happens in handleSubscribe directly.
 */
export async function joinWaitlist(_email: string): Promise<void> {
  // Phase 2: replace with supabase.functions.invoke('join-waitlist', { body: { email } })
  return Promise.resolve();
}
```

And in `App.tsx` after Wave B (showing the local +1 pattern):
```typescript
const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();
  if (email && !isSubmitting) {
    setIsSubmitting(true);
    try {
      await joinWaitlist(email);
      setIsSubscribed(true);
      // D-01: local +1 for immediate feedback
      setWaitlistCount(c => (c ?? 115) + 1);
    } catch (error) {
      console.error('Subscription failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setTimeout`-wrapped Promise.race for HTTP timeouts | `AbortSignal.timeout(ms)` as fetch signal | Browsers 2022, Node 17.3+ | Cancels the actual request; no stale promise resolution. |
| `framer-motion` package name | `motion` package, import from `motion/react` | Motion 11 rename, late 2024 | This project already uses the new name (`motion 12.23.24`). |
| Firebase Firestore for waitlist counts | Supabase view + REST | This phase | Single source of truth (same DB as the main app), no realtime cost. |
| Per-digit `motion.span` columns with `useTransform` for `translateY` (BuildUI recipe) | Single `useMotionValue` + `useTransform` to padded string | Same era — choice of style | Single-tween scales across tier boundaries (3 → 4 digits) without DOM restructuring. |
| `tsconfig.json` for TS compile | Vite's built-in type-aware pipeline (no tsconfig.json present here) | — | This repo skips the type-check step in `npm run build`. Phase 1 won't add tsconfig.json (out of scope), but the new `src/vite-env.d.ts` works without one. |

**Deprecated/outdated:**
- `framer-motion` package (renamed to `motion`) — don't add it as a new dependency.
- `AnimateNumber` from `motion/react` — never existed; that component is in the paid `motion-plus` package only.
- Manual `setTimeout` race patterns for HTTP timeout — use AbortSignal.timeout.
- `subscribeToWaitlistCount` realtime callback from Firebase — replaced by one-shot fetch (D-02).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The shared Supabase project's `auth.users` table is the one Phase 2 will create users in. The waitlist_signups.user_id FK assumes this. | Pattern 4 (migration) | Low — sibling repo's existing migrations all use `references auth.users(id)` (e.g., 0001). [VERIFIED by reading migration 0001.] |
| A2 | `npm run build` (Vite's `vite build`) will fail if `src/App.tsx` still imports from `./firebase` and that file is missing. | Pitfall 5 | Low — verified: `src/firebase.ts` is currently missing and the build is broken per CLAUDE.md ("Build is currently broken"). |
| A3 | The Vite dev server resolves `import.meta.env.VITE_*` from `.env.local` by default. | Pitfall 2 | None — [CITED: vite.dev/guide/env-and-mode is explicit on this.] |
| A4 | The sibling repo's executor (running `/gsd-quick`) will apply the migration via `supabase db push` to the production project, not a local dev DB. | Pattern 5 (handoff) | Medium — the handoff prompt should ask the sibling agent to clarify which environment it's pushing to. If unclear, the agent will ask. |
| A5 | Phase 2's `join-waitlist` Edge Function will insert into `app_private.waitlist_signups` as the service_role. The grants in migration 0031 reflect this. | Pattern 4 | Low — matches REQUIREMENTS.md DB-03 wording exactly. |
| A6 | The `bigint` cast on `count(*)` matches the sibling repo's view pattern. | Pattern 4 | None — [VERIFIED by reading migration 0014: `count(*)::bigint as due_count`.] |
| A7 | Nour's `.env.local` for this repo does not yet exist and must be created at the Wave A → Wave B handoff. | Runtime State Inventory | Low — verified by `ls` showing no `.env*` files in repo root. |
| A8 | The `motion.span` will render a `MotionValue<string>` as its updating text content without re-rendering the React component on every animation frame. | Pattern 2 | None — [CITED: motion.dev — "When a MotionValue is passed as a child to a motion component, it displays the latest animated value without triggering React re-renders."] |

## Open Questions

1. **Should the new Counter component live in `src/components/Counter.tsx` or inline in `App.tsx`?**
   - What we know: Both work. CONVENTIONS.md says "sub-components used only within one parent file are co-located in that file" (e.g., FAQItem inside FAQ.tsx).
   - What's unclear: Whether Phase 2's "You're #N on the list" chip (`src/App.tsx:124-127`) should also use the odometer animation. If yes, Counter should be its own file to be reused.
   - Recommendation: Make it `src/components/Counter.tsx`. The chip might want to reuse it in Phase 2, and having it as a standalone file makes test surface area cleaner.

2. **Should we add `.env.example` to this repo?**
   - What we know: No `.env*` file exists today. CLAUDE.md says they're expected.
   - What's unclear: Whether documenting the contract belongs in Phase 1 (small, self-contained) or Phase 5 (deploy & polish).
   - Recommendation: Yes, add `.env.example` in Phase 1 with `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` (empty values). Documents the contract immediately for any future contributor or for Nour himself when he sets up Vercel in Phase 5.

3. **Should we commit `package-lock.json` in Phase 1?**
   - What we know: No lockfile exists today. Adding `@supabase/supabase-js` will create one when running `npm install`.
   - What's unclear: Whether Nour wants reproducible builds locked in now or wait for Phase 5.
   - Recommendation: Commit it now. Vercel uses the lockfile if present. Locking the Supabase version on day one prevents drift between Nour's machine and Vercel.

4. **Animation duration — 1.2s, or something else?**
   - What we know: The original Firebase counter just hard-set the number; no animation. D-09/D-10 says "rolling odometer style" but doesn't set duration.
   - What's unclear: How fast feels right for an odometer rolling from 0 to ~115.
   - Recommendation: 1.2s with `easeOut`. Long enough to feel deliberate, short enough to not delay perceived load. Numbers larger than ~999 (4-tier and 5-tier) might want a 1.6s duration so each digit feels intentional — but for v1 with `target ≈ 115`, 1.2s is fine. Planner can lock the value at one and revisit if Nour wants tuning.

5. **The handoff prompt: store as a file or just print to stdout?**
   - What we know: Per CONTEXT.md "Specifics", the prompt is for Nour to paste verbatim.
   - What's unclear: Whether to commit it (audit trail) or just emit it at the end of Wave A.
   - Recommendation: Write it to `.planning/phases/01-foundation/HANDOFF-PROMPT.md` AND print it to stdout. The file lets Nour copy it cleanly even after the terminal scrolls; printing makes it impossible to miss.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Install `@supabase/supabase-js`, run `npm run build` | ✓ | npm 11.8.0, Node 24.13.0 [VERIFIED via prior bash output] | — |
| `@supabase/supabase-js` package | `src/lib/supabase.ts` | ✗ (not yet installed) | will install 2.103.2 | — (must install; no fallback) |
| `motion` (already installed) | `src/components/Counter.tsx` | ✓ | 12.23.24 | — |
| `react` 19, `react-dom` 19 | Counter component, App rewire | ✓ | 19.0.0 | — |
| Sibling repo at `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/` | Writing migration 0031 | ✓ | last commit May 24 [VERIFIED via ls] | — |
| Supabase CLI (`supabase db push`) | Applying migration | Unknown (not invoked from THIS repo per D-04) | — | Manual application in dashboard if CLI fails — sibling repo's agent handles that decision. |
| Live Supabase project (production URL + anon key) | Wave B validation | Unknown to this researcher | — | Wave B is gated on Nour confirming the project is configured. |
| Vite dev server (`npm run dev`) | Local Wave B verification | ✓ (port 3000 per package.json) | — | — |
| Browser with `AbortSignal.timeout` support | Counter timeout | ✓ all modern browsers (96% support) | — | The fallback is built into the helper — `error` is caught and 115 is shown. |
| `AnimateNumber` from `motion-plus` | NOT used (paywalled) | ✗ | — | Use the free `useMotionValue` + `animate` + `useTransform` pattern. **This is the chosen path, not a fallback.** |

**Missing dependencies with no fallback:**
- `@supabase/supabase-js@2.103.2` — must be installed as Task 1 of Wave A. No alternative.

**Missing dependencies with fallback:**
- None — the only unknowns (live Supabase project, CLI availability in the sibling repo) are out of scope and explicitly delegated to Nour / the sibling agent per D-04 and D-05.

## Validation Architecture

> Note: No `.planning/config.json` was found in this repo. Treating `workflow.nyquist_validation` as **enabled** (default per the spec).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed — see Wave 0 |
| Config file | None |
| Quick run command | n/a — manual verification only in Phase 1 |
| Full suite command | n/a — manual verification only in Phase 1 |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DB-05 | No Firebase imports / Supabase installed | smoke | `grep -rn "firebase\|Firebase" src/ ; grep '"firebase' package.json ; find src -name "firebase*"` (all return empty) AND `grep '"@supabase/supabase-js"' package.json` (returns the dep line) | ✅ commands work today |
| DB-05 | `npm run build` succeeds | smoke | `npm run build` (exits 0) | ✅ (currently fails because of missing firebase.ts — passes after Wave A) |
| DB-01 | `app_private.waitlist_signups` table exists with correct columns | manual-only (SEALED-org agent's job) | Open Supabase dashboard → SQL editor → `\d app_private.waitlist_signups` OR `select * from app_private.waitlist_signups limit 0` | ❌ Wave 0 (no SQL test infra in this repo) |
| DB-02 | `public.signup_counter` view exists and returns one row | manual-only (SEALED-org agent's job) | Supabase dashboard SQL: `select * from public.signup_counter` returns one row with `total=115` | ❌ Wave 0 |
| DB-02 | View readable as anon | manual-only (SEALED-org agent's job) | Supabase dashboard SQL "Run as: anon": `select * from public.signup_counter` returns row; `select * from app_private.waitlist_signups` returns permission denied | ❌ Wave 0 |
| COUNTER-01 | Counter starts at 115 | smoke (visual + network) | Open `http://localhost:3000` → DevTools Network tab → request to `signup_counter` returns `{ total: 115 }` → counter animates to 115 | ❌ Wave 0 (manual browser check) |
| COUNTER-02 | View formula is `115 + count(*)` no filter | code review | Read `supabase/migrations/0031_waitlist_signups.sql` and confirm the view body has no `where` clause | ✅ direct file read |
| COUNTER-03 | View readable by anon Supabase client | smoke (browser) | Page loads, network tab shows 200 OK from `signup_counter` endpoint, response is `{ total: <int> }`. If 401/403, grants are wrong. | ❌ Wave 0 (manual browser check) |
| COUNTER-04 | Pulse indicator unchanged | code review | `git diff src/App.tsx` shows lines 105-110 (the pulse divs) are unchanged | ✅ git diff |

### Sampling Rate
- **Per task commit:** Run `npm run build` and the 3 grep commands from Example 3 above.
- **Per wave merge:** Wave A complete → run build + grep + visually inspect the migration SQL. Wave B complete → run build + open `npm run dev` and check the counter renders + animates.
- **Phase gate:** All five DB-05 verification commands pass AND Nour confirms (a) the migration was applied successfully in the sibling repo and (b) the counter shows the real number in the browser, not the fallback.

### Wave 0 Gaps
- [ ] No test framework is installed (no vitest, jest, playwright, or similar). The phase requirements are observable via build success, grep, and manual browser inspection. **Installing a test framework is out of scope for Phase 1** — Phase 6 (Pre-launch QA) is the formal QA phase per ROADMAP.md.
- [ ] No SQL assertion harness. Migration validation is delegated to the sibling repo's agent per D-04 and uses the Supabase dashboard.
- [ ] **Recommendation:** Defer test framework setup to a later phase (or to Phase 6). Phase 1's success criteria are all observable without a runner.

## Security Domain

> Required (no `security_enforcement: false` configuration found; treating as enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 1 does not authenticate end users. The anon Supabase key is intentionally shipped to the browser. |
| V3 Session Management | no | No sessions in Phase 1. |
| V4 Access Control | yes | Postgres role grants + `security_invoker = false` view. anon reads ONLY the view; the underlying table is revoked. RLS enabled on the table but no policies grant anon access. |
| V5 Input Validation | no | Phase 1 has zero user input flowing to the database. The counter is read-only. The form's `handleSubscribe` is a stub for Phase 2. |
| V6 Cryptography | no | Phase 1 does not encrypt/hash anything. Supabase handles TLS for transport. |
| V8 Data Protection | partial | Anon key is public-by-design (intended for the browser); service_role key is NEVER added to this repo. `.env.example` documents only the safe vars. |
| V14 Configuration | yes | env vars are the only secret-adjacent surface. Module-load assertion in `supabase.ts` prevents accidental "undefined"-as-URL bugs. `.env.local` is gitignored by Vite default. |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Anon can read raw signup rows from `app_private.waitlist_signups` (information disclosure: leaks signup emails) | I | `revoke all on app_private.waitlist_signups from anon, authenticated, public` + `security_invoker = false` view that returns only the aggregate. View body uses `count(*)` which discloses only a single integer. **Critically: NEVER select email or user_id columns in the view.** |
| Counter inflation via repeated requests | T | Out of scope for Phase 1. Phase 2's Turnstile + IP rate limit on the join-waitlist Edge Function prevents inflation at the INSERT path. The counter VIEW is just a read of whatever's in the table. |
| Service role key leak in client bundle | I/E | Phase 1 never references `SUPABASE_SERVICE_ROLE_KEY`. Only `VITE_SUPABASE_ANON_KEY` is used client-side. STATE.md flags a future CI grep on `dist/` to catch this — recommend adopting it in Phase 5 along with the deploy hook. |
| `.env.local` accidentally committed | I/E | Vite default `.gitignore` includes `.env*` patterns. Add `.env*.local` to this repo's `.gitignore` if not already there (currently no `.gitignore` was found at repo root — Phase 1 should ensure one exists and excludes env files). |
| PostgREST cache miss after migration | A | Auto-handled by PostgREST schema reload. If the SEALED-org agent does NOT reload after `db push`, the view appears 404 for a few minutes. Mitigation: the handoff prompt explicitly asks the agent to verify by querying the view before declaring done. |
| `import.meta.env.VITE_*` accidentally exposing a secret | I | The `VITE_` prefix is the whitelist. Only the URL and anon key get the prefix. Service role key MUST NEVER be prefixed `VITE_`. Documented in the `src/lib/supabase.ts` comment block. |

## Sources

### Primary (HIGH confidence)
- Sibling repo migrations (read directly): `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0001_letters_table.sql`, `0002_sealed_view.sql`, `0004_rls_policies.sql`, `0005_revoke_direct_access.sql`, `0014_observability_views.sql`, `0019_harden_private_letter_access.sql`, `0023_canary_view_filter.sql`, `0026_grant_authenticator_app_private_usage.sql`, `0030_seed_test_letter_optional_schedule.sql` — established the entire DDL convention (file naming, schema, grants, RLS, comments, `security_invoker=false` pattern).
- Sibling repo `supabase/config.toml` — confirmed PostgreSQL 15, exposed schemas, project_id.
- This repo's source: `src/App.tsx`, `src/components/Typewriter.tsx`, `vite.config.ts`, `package.json` — confirmed Firebase residue scope and existing Motion patterns.
- npm registry: `npm view @supabase/supabase-js@2.103.2 version` returned `'2.103.2'` (confirmed available, with `latest = '2.106.2'`).
- Supabase official docs: `supabase.com/docs/reference/javascript/initializing` (createClient signature), `supabase.com/docs/reference/javascript/select` (`.single()` semantics), `supabase.com/docs/reference/javascript/db-abortsignal` (abort signal API existence).
- supabase/postgrest-js source on GitHub: `PostgrestTransformBuilder.ts` line 310-315 — confirmed `abortSignal(signal: AbortSignal): this`.
- Vite official docs: `vite.dev/guide/env-and-mode` — VITE_ prefix rule, undefined behavior, vite-env.d.ts pattern.
- MDN: `developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static` — AbortSignal.timeout returns aborting signal.
- Motion official docs (free pages): `motion.dev/docs/react-animation`, `motion.dev/docs/react-use-transform`, `motion.dev/docs/react-motion-value` — animate() imperative pattern, useTransform string output, motion.span direct DOM rendering.

### Secondary (MEDIUM confidence)
- caniuse.com `AbortSignal.timeout` — 96% browser support, available in Node 17.3+.
- BuildUI animated counter recipe (`buildui.com/recipes/animated-counter`) — alternative per-digit pattern; documented as a considered-and-rejected alternative.

### Tertiary (LOW confidence)
- `motion.dev/docs/react-animate-number` — confirms `AnimateNumber` is Motion+ paywalled; treated as a hard blocker, not an option. (Confidence is high on the paywall claim — explicit doc statement — but tertiary because we don't depend on this source for anything we WILL build.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Supabase JS version verified on npm; Motion already installed at exact version known.
- Architecture: HIGH — sibling repo conventions read directly from 9 migration files; the exact pattern is reproducible.
- Pitfalls: HIGH — each pitfall traces to a verified source or a direct codebase observation.
- Migration SQL: HIGH — composed by adapting the sibling repo's mature patterns (table + view + grants + comments). One assumption (A1: auth.users FK) is verified via existing migrations.
- Motion odometer pattern: MEDIUM-HIGH — `useMotionValue` + `animate` + `useTransform` is documented, but specific to the leading-zero formatting use case I composed (no off-the-shelf example exists in the free docs). Will work; planner should run it once visually before locking.
- Cross-repo handoff mechanism: MEDIUM — the prompt format and the structural pattern (file in `.planning/` + stdout print) are reasonable but untested in this codebase. Nour's actual review of the prompt is the validation step.

**Research date:** 2026-05-27
**Valid until:** 2026-06-26 (30 days; stack is mature and stable. Re-verify Supabase JS version pinning if main SEALED-org repo bumps its version.)
