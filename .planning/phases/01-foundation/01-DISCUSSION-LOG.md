# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 1-Foundation
**Areas discussed:** Counter fetch strategy, Migration / DDL ownership, Supabase client shape, Counter failure UX

---

## Counter Fetch Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One-shot fetch + local +1 (Recommended) | Fetch the count once when the page loads. After the user signs up in this tab, bump the number locally by 1. Simple, cheap, satisfies Phase 1 success criteria. | ✓ |
| Realtime subscription | Open a live channel to Supabase. Counter ticks up automatically whenever anyone signs up, even on other tabs. Mirrors the current Firebase behavior but uses Supabase Realtime. | |
| One-shot fetch only | Fetch once, never update during a session. Even after this user signs up, the number stays the same until they refresh. Cheapest option but feels broken to the user who just signed up. | |

**User's choice:** "one shot fetch + local +1, and when another use joins they see the number +1, total number is saved somewhere as it grows"
**Notes:** Nour confirmed the model: each visitor gets the up-to-date number on page load because the `signup_counter` view recomputes `115 + count(*)` from the underlying table. The "saved somewhere as it grows" concern is satisfied by the table itself — every signup inserts a row, so the count grows monotonically.

---

## Migration / DDL Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Main SEALED-org repo migrations (Recommended) | Add a migration file to /Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/. Honors the 'main app owns schema' rule. One schema history for the whole product. | ✓ |
| This repo's migrations | Create supabase/migrations/ here and run supabase db push from this repo. Faster for Phase 1 but splits schema ownership across two repos — risk of drift later. | |
| Manual SQL in Supabase dashboard | Just paste the SQL in the dashboard and run it. Fastest now, but no file in git, no reproducibility, hard to audit later. | |

**User's choice:** Main SEALED-org repo migrations
**Notes:** N/A

### Follow-up: How the migration gets applied

| Option | Description | Selected |
|--------|-------------|----------|
| I apply it myself in the main repo (Recommended) | Claude writes the SQL migration file and puts it in the main SEALED-org repo. Nour runs supabase db push himself from there. | |
| I apply it from the main repo for Nour | Claude writes the file AND cd into the main SEALED-org repo to run the push command. | |
| Just give the SQL, Nour handles the file and push | Produce the SQL as text in CONTEXT.md. Nour creates the migration file in the main repo and runs the push. | |

**User's choice (free-text):** "It's a little bit in between. I want you to write the SQL migration file and put it in the main SEALED repo. What I want is to create a GSD quick task in the other repo for the agent. All he's going to do is push to the Supabase database. The reason why I wanted it to be a GSD quick phase in the other repo is I want the documentation to know that there is a landing page and to know that there is this addition to the database. If you do it yourself here and then you go do it over there, the planning now doesn't know it can see it and not know what it is for. You write the SQL migration file. You put it there, and then you give me the full prompt to give it to the other repo's agent. It's going to be one task, but the important thing is proper documentation."
**Notes:** Nour wants the schema change to leave a documentation trail in BOTH repos. Resolution: Claude writes the migration file AND drops it in the main repo's `supabase/migrations/` folder. Claude then produces a handoff prompt that Nour will paste into the SEALED-org repo's agent. That agent runs `/gsd-quick` to apply the migration and record in the main repo's planning system why the migration exists (landing page needs it).

---

## Supabase Client Shape

| Option | Description | Selected |
|--------|-------------|----------|
| src/lib/supabase.ts + named helpers (Recommended) | One file creates the client. Exports both the bare 'supabase' object and named helpers like getSignupCount(). Phases 2-4 add their own helpers to this same file. | ✓ |
| src/lib/supabase.ts — bare client only | One file creates and exports the client. Every component calls supabase.from('...').select() directly. Most flexible, but more boilerplate at call sites. | |
| src/supabase.ts (mirror old structure) | Recreate src/supabase.ts at the repo root of src/ exactly where the deleted src/firebase.ts used to live, with named helpers. | |

**User's choice:** src/lib/supabase.ts + named helpers
**Notes:** N/A

### Env var names

| Option | Description | Selected |
|--------|-------------|----------|
| VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (Recommended) | Standard Supabase + Vite convention. | ✓ |
| Match the main SEALED-org repo's existing names | If the main app uses different names (e.g. EXPO_PUBLIC_SUPABASE_URL for React Native), check that repo and use the same names with the VITE_ prefix swapped in. | |

**User's choice:** VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (after a clarifying conversation about why the names differ from the main app even though the values are identical)
**Notes:** Nour initially asked "but they're gonna be the same url and anon key of my main supabase project right? so essentially they're the same? i dont get this part" — Claude explained that the values are identical (same Supabase project) but Vite requires the `VITE_` prefix to expose env vars to the browser, while Expo (main app) requires `EXPO_PUBLIC_`. Nour then locked the recommended option.

---

## Counter Failure UX

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic 115, update on success (Recommended) | Page renders '115' instantly. When Supabase responds with the real number, the count updates. If Supabase fails, user sees 115 forever. | |
| Show '—' until loaded, '—' on failure | Honest about uncertainty. User sees a dash for ~200ms on every page load. If Supabase fails, the dash stays. | |
| Hide counter entirely until loaded | Cleanest. Counter only appears once the real number is available. On failure, the social-proof element disappears. | |
| '115' fallback with explicit loading skeleton | Show a thin grey shimmer where the number will go, swap to real number on success. | |

**User's choice (free-text):** "the default before the supabase call happens would be zeros, and as soon as the load happens the numbers move with an animation up to reach the correct number, if in the case that the number didn't load, it would stay at 0000, which isn't ideal of course"
**Notes:** Nour proposed an odometer-style count-up animation: digits start at zeros and roll up to the real value. He acknowledged the failure case (stuck at 0000) "isn't ideal." Claude then proposed animating to 115 on failure as a refinement, which was accepted in the follow-up.

### Follow-up: Failure behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Animate to 115 on failure (Recommended) | Success: 000 → real number. Failure: after a short timeout, animate up to 115. Same animation either way. | ✓ |
| Stay at 000 on failure | Success: 000 → real number. Failure: stays at 000. Visually communicates 'broken' to the user. | |
| Retry silently a few times, then 115 | On failure, retry the Supabase call 2-3 times. If all retries fail, animate to 115. | |

**User's choice:** Animate to 115 on failure
**Notes:** N/A

### Follow-up: Display digit width

| Option | Description | Selected |
|--------|-------------|----------|
| 4 digits with leading zeros (Recommended) | Always 4 digits: 0115, 0127, 1024. Constant width. | |
| No leading zeros — raw number | 115, 127, 1024 — no padding. Slight layout shift at 1000. | |
| 3 digits with leading zeros until 999, then 4 | 115, 127, 999, 1000, 1001. Width transitions once. | |

**User's choice (free-text):** "leading zeros, 3 digits to 999, then 4 to 9999, then 5"
**Notes:** Nour wants a tier-expanding odometer: 3 digits below 1000, 4 digits in the thousands, 5 digits at 10000+. Each tier uses leading zeros to fill its width. Width is constant within a tier, transitions once per tier boundary.

---

## Claude's Discretion

- Counter fetch timeout duration (suggested 3s, planner may refine).
- Exact Motion API for the odometer animation (per-digit roll vs. value tween).
- Whether to add a small README note in `src/lib/supabase.ts` documenting the env var contract.

## Deferred Ideas

- `showSticky` dead-code removal in `src/App.tsx:15-22` — deferred to Phase 5 polish.
- Supabase Realtime upgrade for the counter — deferred to a future v2 milestone.
- Counter UX retries before fallback — deferred unless reliability data shows it's needed.
- Visible error UI for counter failure — deferred; Phase 1 only logs to console.
