# Phase 1: Foundation - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Firebase with Supabase, restore a green build, create the `app_private.waitlist_signups` table and `public.signup_counter` view in the shared Supabase project, and wire the hero counter to read the seeded-115 total from that view on every page load.

In scope:
- Remove all Firebase imports and the missing `./firebase` reference from `src/App.tsx`
- Install `@supabase/supabase-js@2.103.2`
- Create `src/lib/supabase.ts` with a single client instance + named helpers
- Replace the hardcoded `useState(102)` with a real fetch from `public.signup_counter`
- Author the SQL migration file for `app_private.waitlist_signups` + `public.signup_counter` and place it in the main SEALED-org repo
- Produce a handoff prompt for the SEALED-org repo's agent to apply and document the migration
- Implement the odometer-style counter UI with rolling-digit animation and failure-fallback to 115

Out of scope (other phases handle):
- The `join-waitlist` Edge Function and Turnstile (Phase 2)
- Email sending and DNS (Phase 3)
- Letter writing, verification, and `verify-email` Edge Function (Phase 4)
- Deployment to Vercel and the sealedapp.io domain (Phase 5)
- Removing dead code like `showSticky` — deferred to Phase 5 polish unless it materially blocks Phase 1

</domain>

<decisions>
## Implementation Decisions

### Counter Fetch Strategy
- **D-01:** Counter uses a one-shot fetch on page mount via the `public.signup_counter` view (no Supabase Realtime subscription). After a user submits their email in the current tab, the count increments by +1 locally for immediate feedback. The next page load anywhere re-reads the view, which recomputes `115 + count(*)` and reflects all new signups.
- **D-02:** No polling, no WebSocket. Realtime is explicitly rejected for Phase 1 because (a) success criteria only require "on every page load," (b) it adds connection overhead per visitor, and (c) the "pulse" indicator already simulates liveness visually.

### Migration / DDL Ownership
- **D-03:** The SQL migration for `app_private.waitlist_signups` and `public.signup_counter` lives in the main SEALED-org repo at `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/`. The landing page repo never owns schema files — the main app is the single source of truth for the Supabase schema.
- **D-04:** Phase 1's executor writes the SQL migration file and places it in the main repo's migrations folder. It then generates a **handoff prompt** for Nour to paste into the SEALED-org repo's agent. The handoff prompt instructs the SEALED-org agent to run `/gsd-quick` (or equivalent) to apply the migration AND document in that repo's planning system that the change exists because of the landing page. This preserves audit trail in both repos.
- **D-05:** Phase 1 in this repo does NOT proceed past the wiring step until Nour confirms the SEALED-org agent has applied the migration and the table/view are visible in the Supabase dashboard. This is a hard handoff blocker.

### Supabase Client Shape
- **D-06:** Single client file at `src/lib/supabase.ts`. It calls `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)` once and exports both the bare `supabase` client and named helper functions.
- **D-07:** Phase 1 adds one helper: `export async function getSignupCount(): Promise<number>` which selects from `public.signup_counter`. Phases 2-4 will add `joinWaitlist`, `verifyEmail`, etc. to the same file.
- **D-08:** Environment variable names are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Vite requires the `VITE_` prefix to expose env vars to the browser; this is non-negotiable. The values are identical to the main SEALED-org app's Supabase project URL and anon key — Nour copy-pastes them between `.env` files.

### Counter UX
- **D-09:** Counter displays with leading zeros, growing in width: 3 digits below 1000 (e.g. `115`, `127`, `999`), 4 digits at 1000–9999 (e.g. `1024`), 5 digits at 10000+. Same width within a tier — no layout shift mid-tier.
- **D-10:** On page load, the digits render as `000` and animate (rolling odometer style) up to the real value returned from Supabase. Animation uses the existing `motion/react` library — no new dependency.
- **D-11:** If the Supabase fetch fails or times out (~3 second timeout), the counter animates up to `115` instead of staying at `000`. Rationale: `115` is the seeded floor — the count cannot truthfully be lower than this. The user always sees a working count-up animation, never a broken `000`.
- **D-12:** Failure mode is silently logged to the browser console (`console.error('Counter fetch failed:', error)`) so production issues are visible to Nour without disturbing the user.
- **D-13:** The pulse indicator (COUNTER-04) remains unchanged.

### Claude's Discretion
- Choice of timeout duration for counter fetch failure (suggested 3s, planner may adjust based on Vite/network defaults).
- Exact shape of the odometer animation (per-digit roll vs. number tween) — pick whichever Motion API yields a clean result; both look like an odometer.
- Whether to add a small README note in `src/lib/supabase.ts` describing the env var contract — planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Two-repo system, security model (Turnstile, IP rate limit, email verification gate), counter seed value (115), email template inventory
- `.planning/REQUIREMENTS.md` — Full v1 requirements; Phase 1 owns DB-05, DB-01, DB-02, COUNTER-01, COUNTER-02, COUNTER-03, COUNTER-04
- `.planning/ROADMAP.md` §"Phase 1: Foundation" — Goal statement and 4 success criteria

### Codebase Maps
- `.planning/codebase/INTEGRATIONS.md` — Current Firebase state (broken), env var expectations, social/asset integrations
- `.planning/codebase/ARCHITECTURE.md` — Component graph and data flow before Phase 1
- `.planning/codebase/STACK.md` — React 19 + Vite 6 + Tailwind v4 + Motion v12 + lucide-react versions
- `.planning/codebase/CONVENTIONS.md` — Naming, import, and code-style rules new files must follow

### Cross-Repo Hand-off
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org` — Main app repo, source of truth for Supabase schema. Phase 1 writes a new migration into its `supabase/migrations/` folder. Read its existing migrations before writing the new one to match its naming convention and schema patterns.
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/supabase/migrations/` — Destination directory for the Phase 1 migration file
- `/Users/nourismaiel/SEALED ORG (FINAL)/SEALED-org/.planning/` (if it exists) — Where the receiving agent will record that the migration was applied for the landing page

### Existing Code to Replace
- `src/App.tsx:7` — `import { subscribeToWaitlistCount, joinWaitlist } from './firebase';` — to be removed
- `src/App.tsx:13` — `useState(102)` — hardcoded counter value to be removed
- `src/App.tsx:23-26` — Firebase realtime subscription useEffect — to be removed
- `src/firebase.ts` — Missing file currently breaking the build — never re-create

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`motion/react` (Motion v12)** — Already a dependency. Use it for the odometer count-up animation. No new dependency needed.
- **`useState` / `useEffect` patterns in `src/App.tsx`** — The existing realtime subscription useEffect is the closest analog for the new one-shot fetch useEffect. Same shape minus the cleanup return.
- **`src/components/Typewriter.tsx`** — Has an analogous "animate over time" pattern (cycling characters) that the odometer can mirror in structure (interval-driven state updates).

### Established Patterns
- **Default exports + named helpers** — `src/firebase` (now missing) exported named functions (`joinWaitlist`, `subscribeToWaitlistCount`). The new `src/lib/supabase.ts` follows the same shape: named exports for purpose-built helpers.
- **Inline `try/catch/finally`** — `handleSubscribe` in `src/App.tsx:30-43` shows the project's error-handling pattern for async ops. The counter fetch should follow it: log to console.error on failure, no UI error surface in Phase 1.
- **Tailwind utility-first** — All styling stays in className props; no CSS modules. Counter UI follows this.
- **Relative imports, no `@` alias** — Despite the `@` alias being configured in `vite.config.ts`, no source file uses it. New code uses relative paths (`./lib/supabase`) for consistency.

### Integration Points
- `src/App.tsx` is the only consumer of the old Firebase functions and the only place that currently reads `waitlistCount`. Phase 1's surgery is localized here: replace import, replace useEffect, replace useState initialization, then mount the new odometer component (or inline the new render) where the count is shown.
- `src/lib/supabase.ts` is a new file consumed by `src/App.tsx` in Phase 1 and by Phase 2-4 code later. Keep its public API stable.
- The `public.signup_counter` view returns a single column (the int total). The helper should return `number`, not the raw row.

</code_context>

<specifics>
## Specific Ideas

- **Odometer aesthetic:** Nour described "the default before the supabase call happens would be zeros, and as soon as the load happens the numbers move with an animation up to reach the correct number." This is the rolling-digit / scoreboard / odometer effect. Pick the Motion API (per-digit transform, or `motion.span` with `animate={{ value }}`) that yields the cleanest result.
- **Plain-language documentation:** When Phase 1's planner produces PLAN.md, write step descriptions and task notes in language that a non-engineer can follow. Nour is the founder, not the implementer — clarity for him matters more than terseness.
- **Migration handoff prompt format:** Phase 1's executor produces a self-contained prompt that Nour can paste verbatim into the SEALED-org agent. The prompt must (a) reference the migration file path, (b) instruct that agent to run `/gsd-quick` so the change is documented in the main repo's planning system, and (c) note that the migration exists because of the landing page.

</specifics>

<deferred>
## Deferred Ideas

- **`showSticky` dead-code removal** (`src/App.tsx:15-22`) — Identified as dead but not load-bearing for Phase 1. Defer to Phase 5 (Deploy & Polish) where the polish pass already touches `App.tsx`.
- **Supabase Realtime for the counter** — Could be added in a future v2 milestone if "live activity" becomes a marketing priority. Phase 1 explicitly chose one-shot.
- **Counter UX retries before fallback** — Phase 1 uses a single timeout. If Supabase reliability becomes an issue, retry-then-fallback could be added later. Not worth the complexity for launch.
- **Error UI for counter failure** — Phase 1 only logs to console. If future analysis shows visitors actually hit the failure path often, a quiet toast or banner could be added — but not now.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-27*
</content>
</invoke>