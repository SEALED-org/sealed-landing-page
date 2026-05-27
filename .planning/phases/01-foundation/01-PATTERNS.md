# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 7 (3 new app code, 1 modified app code, 1 cross-repo SQL migration, 1 planning artifact, 1 config touch)
**Analogs found:** 6 / 7 (HANDOFF-PROMPT.md has no in-repo analog — flagged below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/supabase.ts` | new module (browser-side data client + helpers) | producer: bare `supabase` client + named async helpers consumed by `App.tsx` | `src/firebase` (now missing — surface area reconstructed from `src/App.tsx:7`) + `src/components/Typewriter.tsx` (file-scope `export` next to `default export` shape) | role-match (no live file; reconstructing previous shape) |
| `src/components/Counter.tsx` | new module (presentational component, animation-driven) | consumer: receives `target: number` prop; producer of animated DOM updates via `motion/react` | `src/components/Typewriter.tsx` (closest by structure: animate-over-time, props interface, default export) + `src/components/FAQ.tsx` and `src/components/FirstLetter.tsx` (closest by API: `motion/react` v12 usage) | role-match (Typewriter for shape, FAQ/FirstLetter for the actual Motion v12 import) |
| `src/App.tsx` | modified module (root component surgery — 3 targeted edits + 1 JSX swap) | consumer: now consumes `getSignupCount` + `Counter` from local modules | `src/App.tsx` itself (the file shows the exact patterns to preserve, including the existing `try/catch/finally` and the surrounding pulse JSX that must stay intact) | exact (self-analog — the surgery edits sit inside the current file) |
| `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0031_waitlist_signups.sql` | new schema migration (sibling repo) | producer: creates `app_private.waitlist_signups` table + `public.signup_counter` view that PostgREST/anon will read | sibling `0001_letters_table.sql` (table + schema + RLS + grant + comment) and `0014_observability_views.sql` (`security_invoker = false` view + `count(*)::bigint` + revoke/grant ordering + view comment) and `0019_harden_private_letter_access.sql` (revoke-from-anon then grant-to-role ordering) | exact (three direct templates) |
| `/Users/nourismaiel/Downloads/SEALED Landing Page Claude Design/.planning/phases/01-foundation/HANDOFF-PROMPT.md` | new planning artifact (human-paste handoff) | producer: text content Nour copies into a sibling agent | **none in repo** — see "No Analog Found" section | none |
| `.env.example` | new config doc (env var contract) | producer: documents required env var names (no real values) | **no `.env*` file exists in this repo today** — RESEARCH.md Open Question #2 recommends creating it fresh in Phase 1 | none in this repo; uses the canonical Vite key=value, comment-above-each pattern called out in RESEARCH.md Example 2 area |
| `package.json` (+ generated `package-lock.json`) | modified config (dep add) | producer: pins `@supabase/supabase-js@2.103.2` for `src/lib/supabase.ts` to import | `package.json` itself (current pins for `motion`, `react`, etc. show the project's `^`-prefix convention — but Pitfall 6 recommends an exact pin and a committed lockfile for this addition) | exact (self-analog) |

## Pattern Assignments

---

### `src/lib/supabase.ts` (new module, browser-side data client + helpers)

**Analog A (shape):** the missing `src/firebase` — surface area recovered from `src/App.tsx:7`
**Analog B (file-scope export style):** `src/components/Typewriter.tsx`

**Why this pairing:** No live `src/firebase.ts` exists, but `src/App.tsx:7` proves the public API the project expects from a "single-client + named helpers" module. Typewriter shows the in-repo convention for shipping a `default export` next to a named export from the same file — exactly what `src/lib/supabase.ts` does (the `supabase` client is the named export; future helpers are sibling named exports; no `default`).

**Imports pattern to mirror** (`src/components/FirstLetter.tsx` lines 1-5 — closest in-repo example of "external lib + a few named imports"):
```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import Typewriter, { typewriterPhrases } from './Typewriter';
import ShareButtons from './ShareButtons';
```
**Note:** Single quotes for module paths, named imports destructured. For `supabase.ts` the new file will use the same style: `import { createClient } from '@supabase/supabase-js';`.

**Reconstructed previous surface area** (the only line of evidence — `src/App.tsx:7`):
```typescript
import { subscribeToWaitlistCount, joinWaitlist } from './firebase';
```
**Note:** This proves the previous `firebase` module exported **named** async helpers (no `default`). Replicate verbatim: `src/lib/supabase.ts` exports `supabase` and `getSignupCount` as **named** exports only. No default. Phase 2-4 will add `joinWaitlist`, `verifyEmail`, etc. as additional named exports to the same file (per CONTEXT.md D-07).

**Named-export-next-to-default precedent** (`src/components/Typewriter.tsx` lines 1-25):
```typescript
import React, { useState, useEffect } from 'react';

export const typewriterPhrases = [
  "To the person you're becoming",
  ...
];

interface TypewriterProps {
  phrases: string[];
  className?: string;
}

export default function Typewriter({ phrases, className }: TypewriterProps) {
```
**Note:** Copy the spirit (named exports declared at file scope, not nested) but NOT the `default export` — `supabase.ts` is a utility module, not a component. Use only `export const supabase = ...` and `export async function getSignupCount() {...}`.

**Error handling pattern to mirror** (`src/App.tsx:30-43`):
```typescript
const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();
  if (email && !isSubmitting) {
    setIsSubmitting(true);
    try {
      await joinWaitlist(email);
      setIsSubscribed(true);
    } catch (error) {
      console.error('Subscription failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }
};
```
**Note:** This is the **caller-side** pattern, not the helper-side pattern. `getSignupCount` itself should **throw** on error (matching its `Promise<number>` contract — see RESEARCH.md Pattern 1, lines 228-238). The `try/catch/finally` is then applied at the call site in `App.tsx`'s new useEffect, with the same `console.error('<context>:', error)` shape. Copy the `console.error('Counter fetch failed:', error)` wording from D-12.

---

### `src/components/Counter.tsx` (new module, animation-driven presentational component)

**Analog A (component shape, props interface, animate-over-time):** `src/components/Typewriter.tsx`
**Analog B (Motion v12 import + `motion.span` rendering):** `src/components/FAQ.tsx` lines 1-3 and `src/components/FirstLetter.tsx` lines 1-3

**Why this pairing:** Typewriter is the only existing component whose job is "animate a value over time via React state and clean up on unmount." Its file structure (named export of supporting data + default export of the component + inline `Props` interface + `useEffect` cleanup) is exactly the template Counter follows. But Typewriter uses raw `setTimeout` + `setState`, which RESEARCH.md "Don't Hand-Roll" table explicitly **rejects** for number tweening — Counter must use `motion`'s `animate()` instead. So FAQ and FirstLetter provide the actual Motion v12 import line.

**Component file structure to mirror** (`src/components/Typewriter.tsx` lines 20-61):
```typescript
interface TypewriterProps {
  phrases: string[];
  className?: string;
}

export default function Typewriter({ phrases, className }: TypewriterProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    const fullText = phrases[currentPhraseIndex];

    if (isWaiting) {
      const timer = setTimeout(() => {
        setCurrentText("");
        setIsWaiting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 20);
      return () => clearTimeout(timer);
    }
    ...
  }, [currentText, isWaiting, currentPhraseIndex, phrases]);

  return (
    <span className={`inline-block ${className || ""}`}>
      {currentText}
      <span className="animate-pulse ml-1">|</span>
    </span>
  );
}
```
**Copy verbatim:**
- Inline `interface CounterProps { target: number }` declared right above the component (CONVENTIONS.md: "Props interfaces are named `[ComponentName]Props`" and "declared inline in the same file").
- `export default function Counter({ target }: CounterProps)` — PascalCase default-exported component.
- A single `useEffect` with a cleanup return.

**Change vs Typewriter:**
- Drop `setTimeout` + `setState` (Pitfall in RESEARCH.md). Replace with `useMotionValue(0)` + `animate(motionValue, target, opts)` + `useTransform`. Cleanup becomes `controls.stop()` instead of `clearTimeout(timer)`.
- Dependency array is `[target, motionCount]` (NOT `[currentText, ...]`) — RESEARCH.md Pitfall 3 explicitly calls this out.

**Motion v12 import line to mirror** (`src/components/FAQ.tsx` line 2 and `src/components/FirstLetter.tsx` line 2):
```typescript
import { motion, AnimatePresence } from 'motion/react';
```
**Note:** Drop `AnimatePresence` (Counter doesn't mount/unmount conditionally) and add the imperative hooks Counter needs:
```typescript
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
```
**Critical:** Path is `'motion/react'`, NOT `'framer-motion'`. CONVENTIONS.md line 51 and RESEARCH.md "Anti-Patterns" line 470 are explicit. This is non-negotiable.

**Rendering pattern to mirror** (`src/components/Typewriter.tsx` lines 56-60 — outer `<span>` with optional `className`):
```typescript
return (
  <span className={`inline-block ${className || ""}`}>
    {currentText}
    <span className="animate-pulse ml-1">|</span>
  </span>
);
```
**Change vs Typewriter:** The outer element becomes `<motion.span>` so the `useTransform`-derived `MotionValue<string>` can be passed as a child without triggering React re-renders (per RESEARCH.md Assumption A8). Counter does NOT need a `className` prop in Phase 1 — `App.tsx` mounts it inline inside the existing pulse row, which already provides the surrounding font/opacity utilities.

**Props interface convention to mirror** (`src/components/ShareButtons.tsx` lines 4-9):
```typescript
interface ShareButtonsProps {
  waitlistCount: number;
  className?: string;
}

export default function ShareButtons({ waitlistCount, className = "" }: ShareButtonsProps) {
```
**Copy verbatim:** `interface CounterProps { target: number }`, destructured single-arg signature `({ target }: CounterProps)`, default export.

**Change vs ShareButtons:** No `className` prop and no default value needed for Phase 1. Just `target: number`.

---

### `src/App.tsx` (modified module — 4 surgical edits, everything else untouched)

**Analog:** `src/App.tsx` itself — this is in-place surgery, so the analog is the current file. Each edit's surrounding code is the contract that must NOT change.

**Edit 1 — Replace the broken Firebase import** (current `src/App.tsx:7`):
```typescript
import { subscribeToWaitlistCount, joinWaitlist } from './firebase';
```
**Change to:**
```typescript
import { getSignupCount } from './lib/supabase';
import Counter from './components/Counter';
```
**Note:** Two new imports replacing one removed import. Path uses relative `./lib/supabase` per CONVENTIONS.md line 64 ("`@` alias resolves to the project root … but is not used in any source file — all imports use relative paths"). The `joinWaitlist` symbol disappears in Phase 1 — calls to it (lines 35 and 197) are addressed by Edits 5a/5b below (stub or local-only behavior, per RESEARCH.md "Pattern 3" tasking note).

**Edit 2 — Replace the hardcoded counter useState** (current `src/App.tsx:13`):
```typescript
const [waitlistCount, setWaitlistCount] = useState(102);
```
**Change to:**
```typescript
const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
```
**Note:** Generic type annotation matches CONVENTIONS.md line 46: "State generics used where type is not inferrable: `useState<'idle' | 'sealing' | 'needs-email' | 'sealed'>('idle')`." Initial value flips from `102` (hardcoded) to `null` (RESEARCH.md Anti-Pattern #3 — initializing with `115` would cause the counter to start at 115 and tween to 115, no movement).

**Edit 3 — Replace the Firebase realtime useEffect** (current `src/App.tsx:23-26`):
```typescript
useEffect(() => {
  const unsubscribe = subscribeToWaitlistCount(setWaitlistCount);
  return () => unsubscribe();
}, []);
```
**Change to:**
```typescript
useEffect(() => {
  getSignupCount()
    .then(setWaitlistCount)
    .catch((error) => {
      console.error('Counter fetch failed:', error);
      setWaitlistCount(115); // D-11 fallback to seeded floor
    });
}, []);
```
**Note:** Mirrors the existing `console.error('<context>:', error)` shape from `src/App.tsx:38` (`'Subscription failed:'`) and `src/App.tsx:200` (`'Waitlist join failed:'`). New context string is `'Counter fetch failed:'` — locked by CONTEXT.md D-12. No cleanup return needed (the promise has already settled when the component unmounts, and `AbortSignal.timeout` lives inside the helper). Empty dependency array `[]` preserved exactly — this useEffect runs once on mount, same as the one it replaces.

**Edit 4 — Replace the inline count render with the Counter component** (current `src/App.tsx:113-115`):
```typescript
<span>
  Join {waitlistCount.toLocaleString()} others on the list
</span>
```
**Change to:**
```typescript
<span>
  Join <Counter target={waitlistCount ?? 115} /> others on the list
</span>
```
**Note:** The surrounding pulse row JSX (`src/App.tsx:104-116`) — including the `flex items-center justify-center gap-3 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.05em] whitespace-nowrap opacity-60` container, the ping/pulse divs, and the `|` separator — must remain **byte-identical**. This is COUNTER-04 (the pulse stays). RESEARCH.md "Validation Architecture" makes this a code-review-level check.

**Edit 5 — Reconcile the two surviving `joinWaitlist` call sites** (current `src/App.tsx:35` and `src/App.tsx:197`):

Both call sites currently reference the symbol removed in Edit 1. RESEARCH.md Pattern 3 (lines 346-347) recommends option (a): add a `joinWaitlistLocal` helper or inline a local +1 (no real network call in Phase 1).

**Pattern to follow at call site 1** (`src/App.tsx:30-43`, the existing try/catch/finally — preserve its shape verbatim; only the body inside `try` changes):
```typescript
const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();
  if (email && !isSubmitting) {
    setIsSubmitting(true);
    try {
      await joinWaitlist(email);          // <-- this line changes
      setIsSubscribed(true);
    } catch (error) {
      console.error('Subscription failed:', error);   // <-- KEEP verbatim
    } finally {
      setIsSubmitting(false);                          // <-- KEEP verbatim
    }
  }
};
```
**Change inside `try`:** Replace `await joinWaitlist(email);` with the Phase 1 local stub recommended in RESEARCH.md Example 4 (lines 671-684):
```typescript
// Phase 2 will replace this with the real Edge Function call.
setIsSubscribed(true);
// D-01: local +1 increment for immediate feedback in this tab.
setWaitlistCount((c) => (c ?? 115) + 1);
```
The `console.error('Subscription failed:', error)` line and the `finally` block stay byte-identical. The whole point of preserving the `try/catch/finally` skeleton is so that when Phase 2 reintroduces a real network call, the wrapper is already correct.

**Pattern to follow at call site 2** (`src/App.tsx:193-202`, the `FirstLetter onEmailSubmit` callback):
```typescript
onEmailSubmit={async (newEmail) => {
  setEmail(newEmail);
  try {
    await joinWaitlist(newEmail);                        // <-- this line changes
    setIsSubscribed(true);
  } catch (error) {
    console.error('Waitlist join failed:', error);       // <-- KEEP verbatim
  }
}}
```
**Same change inside `try`:** Replace `await joinWaitlist(newEmail);` with the same local `setIsSubscribed(true); setWaitlistCount(c => (c ?? 115) + 1);`. The `console.error('Waitlist join failed:', error)` log line stays — Phase 2 reintroduces a real `await` that can throw and uses this log.

---

### `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/0031_waitlist_signups.sql` (new schema migration in sibling repo)

**Analogs (three direct templates from sibling repo):**
- `0001_letters_table.sql` — table + schema + RLS + grant + table comment
- `0014_observability_views.sql` — `security_invoker = false` view + `count(*)::bigint` + revoke/grant ordering + view comment
- `0019_harden_private_letter_access.sql` — revoke-from-anon-then-grant-to-role ordering on a private table

**Why this pairing:** No single existing migration creates BOTH a private table AND a public view that aggregates it for anon. So the Phase 1 migration is a composition of three patterns from three sibling files. RESEARCH.md "Architecture Patterns → Pattern 4" (lines 359-414) already shows the assembled output verbatim — these excerpts confirm the sources.

**Table + schema + RLS + grant + comment pattern** (`0001_letters_table.sql` lines 1-32):
```sql
-- 0001_letters_table.sql
-- Canonical letter storage. Client access goes through projections only.
create schema if not exists app_private;

grant usage on schema app_private to authenticated, service_role;

create table app_private.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  deliver_at timestamptz,
  sealed_at timestamptz,
  tz text not null,
  label text,
  created_at timestamptz not null default now(),
  check (...)
);

create index letters_deliver_at_idx on app_private.letters (deliver_at);
create index letters_user_id_idx on app_private.letters (user_id);
create index letters_sealed_at_idx on app_private.letters (sealed_at);

alter table app_private.letters enable row level security;

grant select on app_private.letters to authenticated, service_role;

comment on table app_private.letters is
  'Canonical letter storage. Drafts keep sealed_at and deliver_at null until sealed.';
```
**Copy verbatim for the waitlist_signups table:**
- Header comment line `-- 0031_waitlist_signups.sql` matching the file name (exact convention from 0001 line 1 and 0014 line 1).
- A second/third descriptive header comment line explaining purpose (0014 lines 2-4 model this).
- `create table app_private.<name> (...)` with `user_id uuid ... references auth.users(id) on delete cascade` (0001 line 9 — verified by RESEARCH.md A1).
- `create index <table>_<col>_idx on app_private.<table> (<col>);` per filterable column (0001 lines 22-24).
- `alter table app_private.<name> enable row level security;` (0001 line 26).
- `comment on table app_private.<name> is '...';` at the bottom of the table block (0001 lines 30-31).

**Change vs `0001_letters_table.sql`:**
- Do NOT use `default gen_random_uuid()` for the PK. The Phase 1 PK is `user_id` itself (one row per auth user) — `user_id uuid primary key references auth.users(id) on delete cascade`. This matches RESEARCH.md Pattern 4 line 378.
- `0001` grants `select` on the table to `authenticated, service_role`. Phase 1's table grants are stricter — see the next excerpt.

**Strict revoke-from-anon pattern for the table** (`0019_harden_private_letter_access.sql` lines 5-9):
```sql
revoke usage on schema app_private from anon, authenticated, public;
grant usage on schema app_private to service_role;

revoke all on app_private.letters from anon, authenticated, public;
grant select, insert, update, delete on app_private.letters to service_role;
```
**Copy the body verbatim** but scoped to `app_private.waitlist_signups`. Skip the `revoke usage on schema app_private` line — that's already in place from migration 0019, re-issuing it is redundant. Keep the per-table block:
```sql
revoke all on app_private.waitlist_signups from anon, authenticated, public;
grant select, insert, update, delete on app_private.waitlist_signups to service_role;
```
**Change vs `0019`:** Only the table name differs. The grant set is identical (Phase 2's Edge Function uses service_role for inserts — RESEARCH.md line 389).

**`security_invoker = false` view + `count(*)::bigint` + view-grant pattern** (`0014_observability_views.sql` lines 7-12, 36-49):
```sql
create or replace view public.letters_due_today
  with (security_invoker = false) as
select count(*)::bigint as due_count
  from app_private.schedules
  where deliver_at::date = (current_timestamp at time zone 'UTC')::date
    and status in ('pending', 'claimed', 'delivered', 'failed');

...

-- Privileges (per Codex MEDIUM: privilege test verifies after this).
revoke all on public.letters_due_today from anon, authenticated, public;
...
grant select on public.letters_due_today to service_role;
...

comment on view public.letters_due_today is 'Ops-only count of schedules with deliver_at on today (UTC). service_role only.';
```
**Copy verbatim for `public.signup_counter`:**
- `create or replace view public.<name> with (security_invoker = false) as` — verbatim including the `or replace` clause and the `with (security_invoker = false)` block on its own indented line (0014 lines 7-8 style).
- `select count(*)::bigint as <colname> from app_private.<table>` — the `::bigint` cast is mandatory per RESEARCH.md Assumption A6.
- A `comment on view public.<name> is '...';` at the bottom (0014 lines 46-49).

**Change vs `0014`:**
- Grant target is **`anon, authenticated`** instead of `service_role` only (per CONTEXT.md COUNTER-03 — the landing page reads as anon). This is the critical difference: `0014` is ops-only; `0031`'s view is anon-public.
- View body adds `115 +` to the count: `select (115 + count(*))::bigint as total ...` (RESEARCH.md Pattern 4 line 404). The seed value is the only literal in the view.
- View body has **no `where` clause** (CONTEXT.md COUNTER-02 explicitly requires no status filter — `0014`'s deliver_at filter is the wrong template here; the structure is right, the predicate is wrong).

**Migration file name and number rule** (verified by `ls` on the migrations folder above — highest existing is `0030_seed_test_letter_optional_schedule.sql`):
- Filename: `0031_waitlist_signups.sql` — 4-digit zero-padded sequential prefix, snake_case description, `.sql` suffix.
- Placement: `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` (NOT this repo).

**Header-comment style to mirror** (composite of 0014 lines 1-4 and 0019 lines 1-3):
```sql
-- 0031_waitlist_signups.sql
-- Landing page (sealedapp.io) waitlist + counter view.
-- Created for the SEALED landing page (sibling repo: SEALED-Landing-Page).
-- Phase 1 (Foundation) of the landing page roadmap owns this schema.
```
**Note:** Multi-line rationale comment at the top of the file is the house style (0014 has 3 lines of context, 0019 has 2). RESEARCH.md Pattern 4 already drafted a longer 13-line header — keep that draft; it matches the convention.

---

### `/Users/nourismaiel/Downloads/SEALED Landing Page Claude Design/.planning/phases/01-foundation/HANDOFF-PROMPT.md` (new planning artifact)

**Analog:** **none in this repo.**

This is the first cross-repo handoff artifact this repo has ever produced. The closest precedent is the `.planning/phases/01-foundation/01-CONTEXT.md` and `01-RESEARCH.md` files themselves — they show the project's house style for planning markdown (`# Phase X: Name - <Doc Type>` H1, `**Bold Key:** value` metadata block at top, `<tag>` XML-style sections for machine-readable structure).

**Planner action:** Create the pattern fresh. RESEARCH.md Pattern 5 (lines 422-461) already drafted the prompt verbatim as a code block; the planner can:
1. Lift that draft into the new `HANDOFF-PROMPT.md` file.
2. Wrap it with a minimal header so the file matches the planning-doc family it lives in:
   ```markdown
   # Phase 1: Foundation - SEALED-org Handoff Prompt

   **Audience:** the agent running in `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org`
   **Triggered after:** Phase 1 Wave A completes (migration file written, SQL ready for review)
   **Blocks:** Phase 1 Wave B (landing page can't proceed until the sibling agent confirms)

   ---

   <prompt>
   [the verbatim text from RESEARCH.md Pattern 5 — paste from "Run /gsd-quick..." through "...unblock the landing page repo and finish wiring its UI."]
   </prompt>
   ```
3. Match the existing planning docs' tone (matter-of-fact, second person addressed to the next agent, no marketing language).

RESEARCH.md Open Question #5 also recommends printing the same text to stdout at the end of Wave A so Nour can copy it directly from the terminal — that's an executor concern, not a pattern. The file is the audit trail; stdout is the convenience.

---

### `.env.example` (new config doc)

**Analog:** **none in this repo.** No `.env*` files exist (verified by `ls -la` on repo root) and no `.gitignore` either.

**Conventional Vite pattern to follow** (from RESEARCH.md Example 2 area and "Anti-Patterns" line 473):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
With a leading comment explaining the contract — matches the in-repo convention of "comment above the thing it explains" used in the planning docs and inline in the React files (CONVENTIONS.md line 88: "Inline comments document deferred work" — same spirit applied to a config file).

**Recommended content** (composite of RESEARCH.md Pitfall 2 and Open Question #2):
```
# Required: Supabase project URL and anon key.
# The VITE_ prefix is mandatory — Vite only exposes vars with this prefix to the browser bundle.
# Values are identical to the main SEALED-org app's Supabase project — copy from there.
# For local dev: copy this file to .env.local and fill in the values.
# Phase 5 will set the same vars in the Vercel dashboard.
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Companion concern (not strictly a "pattern" but called out in RESEARCH.md "Security Domain" V14 and "Anti-Patterns" line 473):** A `.gitignore` should also exist and exclude `.env*.local`. RESEARCH.md notes "no `.gitignore` was found at repo root." Planner decision: create a minimal `.gitignore` in the same Phase 1 step (Open Question recommendation), or defer to Phase 5. CONTEXT.md does not lock this — it's Claude's discretion.

---

### `package.json` (+ `package-lock.json`) (modified config — dep add)

**Analog:** `package.json` itself — lines 11-19 show the existing dep block style.

**Current dep block to extend** (`package.json` lines 11-19):
```json
"dependencies": {
  "@tailwindcss/vite": "^4.1.14",
  "@vitejs/plugin-react": "^5.0.4",
  "lucide-react": "^0.546.0",
  "motion": "^12.23.24",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "vite": "^6.2.0"
}
```
**Change:** Add `"@supabase/supabase-js"` to the `dependencies` block (alphabetical order would put it first, before `@tailwindcss/vite`; the existing block isn't strictly alphabetical but `@`-scoped packages appear first, so `@supabase/...` would slot in at the top of the `@`-group).

**Pin style — deviate from the in-repo convention here:** Existing deps use `^` (e.g., `"motion": "^12.23.24"`), which allows minor/patch upgrades. RESEARCH.md Pitfall 6 (lines 552-560) recommends an **exact** pin for this addition: `"@supabase/supabase-js": "2.103.2"` (no caret), AND committing the generated `package-lock.json`. The reason: D-08 locks the version to match the main SEALED-org app. `^` would silently drift the next time someone runs `npm install` after Supabase publishes 2.103.3+.

**Note vs the rest of the repo:** This is a one-off divergence from the existing `^` convention. The planner should call it out explicitly in PLAN.md so it doesn't look like an oversight. RESEARCH.md recommends EITHER no-caret-pin OR commit-the-lockfile — Pitfall 6 recommends doing both for belt-and-suspenders reproducibility.

**Install command** (RESEARCH.md line 109):
```bash
npm install @supabase/supabase-js@2.103.2
```
This generates the dep entry and the `package-lock.json`. Both should be committed in the same task.

---

## Shared Patterns

### Pattern S1: `console.error('<context>:', error)` for async failures

**Sources:**
- `src/App.tsx:38` — `console.error('Subscription failed:', error);`
- `src/App.tsx:200` — `console.error('Waitlist join failed:', error);`

**Apply to:**
- `src/App.tsx` Edit 3 (new useEffect): `console.error('Counter fetch failed:', error);` (string locked by CONTEXT.md D-12)
- Any future helper failure surfaced at a call site in `App.tsx`

**Format rule:** Single quotes around the context string. Colon then space inside the quotes. `error` passed as the second argument so DevTools shows the full stack. No `console.log` / `console.warn` anywhere — CONVENTIONS.md "Logging" lines 75-82 are explicit.

### Pattern S2: `try { await ... } catch (e) { console.error(...) } finally { cleanup }` around async UI actions

**Source:** `src/App.tsx:30-43` (the `handleSubscribe` function above)

**Apply to:** Both surviving `joinWaitlist` call sites after Edit 5 (the `handleSubscribe` and the `FirstLetter.onEmailSubmit` callback). The skeleton stays — the body inside `try` becomes a local-only state update for Phase 1, and Phase 2 will reintroduce a real `await` call inside the same skeleton.

**Do NOT apply to:** `src/lib/supabase.ts` helpers. Helpers throw; callers catch. RESEARCH.md Pattern 1 line 235 (`if (error) throw error`) sets this contract.

### Pattern S3: Module-load assertion for required env vars

**Source:** `src/main.tsx:6` — `document.getElementById('root')!` uses the non-null assertion operator at module load. Pattern: assume the contract is met; throw immediately if it isn't.

**Apply to:** `src/lib/supabase.ts` — RESEARCH.md Pattern 1 lines 210-217 shows the explicit `throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')` pattern. This is the same spirit as `main.tsx`'s `!` operator (fail loud at module load, before any user-facing code runs) but with a readable error message instead of a silent null deref.

### Pattern S4: Named exports next to default exports from the same file

**Source:** `src/components/Typewriter.tsx` lines 3-18 (`export const typewriterPhrases = [...]`) alongside line 25 (`export default function Typewriter(...)`)

**Apply to:** `src/lib/supabase.ts` — use only named exports (`export const supabase`, `export async function getSignupCount`). This is the closest existing precedent for "module that exports more than one symbol from the same file."

### Pattern S5: Path style — relative imports, single-quoted, no `@` alias

**Sources (all source files in this repo):**
- `src/App.tsx:4` — `import FirstLetter from './components/FirstLetter';`
- `src/App.tsx:6` — `import ShareButtons from './components/ShareButtons';`
- `src/components/FirstLetter.tsx:4` — `import Typewriter, { typewriterPhrases } from './Typewriter';`
- `src/main.tsx:3` — `import App from './App.tsx';`

**Apply to:**
- `src/App.tsx` new imports: `import { getSignupCount } from './lib/supabase';` and `import Counter from './components/Counter';`
- `src/components/Counter.tsx` imports: `import { motion, useMotionValue, useTransform, animate } from 'motion/react';` (external pkg, no relative path) — there are no local imports needed for Counter in Phase 1.

**Note on the existing inconsistency** (CONVENTIONS.md line 53): some files use `.tsx` extension in imports (`./App.tsx`), some don't (`./components/FAQ`). For new code, **omit the extension** to match the majority of files in `src/` and `src/components/` — `./lib/supabase` (not `./lib/supabase.ts`), `./components/Counter` (not `./components/Counter.tsx`). The `main.tsx` case is the outlier.

### Pattern S6: Sectioning JSX with inline comments (preserved through Edit 4)

**Source:** `src/App.tsx:47, 57, 153, 171, 207, 210` — `{/* Navigation */}`, `{/* Hero Section */}`, `{/* Column 1: Quote */}`, etc.

**Apply to:** Don't introduce new section comments in Edit 4. The Counter mount happens inside the existing pulse row — no new section. But the surrounding `{/* ... */}` comments in `App.tsx` MUST be preserved byte-identical (COUNTER-04 requirement).

---

## No Analog Found

Files with no in-repo precedent. Planner should use RESEARCH.md patterns + the conventions called out in this PATTERNS.md inline.

| File | Role | Data Flow | Why No Analog | Planner Guidance |
|------|------|-----------|---------------|-------------------|
| `.planning/phases/01-foundation/HANDOFF-PROMPT.md` | new planning artifact (cross-repo paste-prompt) | producer: text for a sibling agent | First cross-repo handoff doc this repo has produced. The existing planning docs (CONTEXT, RESEARCH) are inputs to this repo's own agents — none target a sibling repo. | Use RESEARCH.md Pattern 5 verbatim as the body. Wrap in a minimal header matching the `.planning/phases/01-foundation/` doc family (see "HANDOFF-PROMPT.md" Pattern Assignment above). |
| `.env.example` | new config doc | producer: env var contract | No `.env*` files exist in this repo today; no `.gitignore` either (verified). | Use the standard Vite key=value with leading comment block from RESEARCH.md Pitfall 2 + Open Question #2. Consider adding a minimal `.gitignore` (excluding `.env*.local`, `node_modules`, `dist`) in the same task — Claude's discretion per CONTEXT.md. |

---

## Metadata

**Analog search scope (this repo):**
- `src/` (all 5 source files: `App.tsx`, `main.tsx`, `index.css`, `components/FAQ.tsx`, `components/FirstLetter.tsx`, `components/ShareButtons.tsx`, `components/Typewriter.tsx`)
- `vite.config.ts`, `package.json`
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/ARCHITECTURE.md`
- Repo root for `.env*` and `.gitignore` (verified absent)

**Analog search scope (sibling repo):**
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` — listed all 31 files, read `0001`, `0014`, `0019` in full (the three templates the new migration composes). Other migrations were cross-referenced via RESEARCH.md "Pattern 4 → VERIFIED" citation (lines 414-415).

**Files scanned in full:** 8 (5 in this repo's `src/`, `App.tsx` twice for surgery confirmation, 3 sibling-repo migrations)
**Files scanned headers/structure only:** 28 sibling-repo migrations (via `ls`)

**Pattern extraction date:** 2026-05-27
**Valid until:** until any of `src/App.tsx`, `src/components/Typewriter.tsx`, `src/components/FirstLetter.tsx`, sibling migrations 0014/0019 change. If you re-enter this phase after edits, re-read those files first.
