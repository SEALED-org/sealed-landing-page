<!-- refreshed: 2026-05-25 -->
# Architecture

**Analysis Date:** 2026-05-25

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     Browser Entry Point                      │
│                    `index.html` + `src/main.tsx`             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Root Component                           │
│                      `src/App.tsx`                           │
│   Owns: global state, scroll listener, Firebase calls        │
└────────┬──────────────┬──────────────┬──────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│  FirstLetter│ │     FAQ      │ │ ShareButtons │
│  .tsx       │ │    .tsx      │ │   .tsx       │
│ Interactive │ │ Accordion UI │ │ Social share │
│ letter form │ │              │ │ buttons      │
└──────┬──────┘ └──────────────┘ └──────────────┘
       │
       ▼
┌─────────────┐
│  Typewriter │
│   .tsx      │
│ Animated    │
│ placeholder │
└─────────────┘
         │
         ▼ (Firebase calls from App.tsx)
┌─────────────────────────────────────────────────────────────┐
│                    External: Firebase                        │
│              `subscribeToWaitlistCount`, `joinWaitlist`      │
│            (imported from `./firebase` — file not present)   │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App | Root component, global state, waitlist count subscription, scroll behavior | `src/App.tsx` |
| FirstLetter | Multi-step interactive letter writing flow (idle → needs-email → sealing → sealed) | `src/components/FirstLetter.tsx` |
| FAQ | Accordion FAQ list with animated expand/collapse per item | `src/components/FAQ.tsx` |
| ShareButtons | Twitter share, Instagram link, clipboard copy after waitlist join | `src/components/ShareButtons.tsx` |
| Typewriter | Character-by-character animated cycling placeholder text | `src/components/Typewriter.tsx` |

## Pattern Overview

**Overall:** Single-page marketing landing page with embedded React application. No routing. Sections are stacked vertically and navigated via smooth scroll. State is local to components, with `App.tsx` acting as the single source of truth for shared state (email, subscription status, waitlist count).

**Key Characteristics:**
- No global state manager — all state lives in `useState` within `App.tsx` and its children
- Firebase is the only external data dependency; it is imported from `./firebase` (a file not present in the repository — likely injected at deploy time or excluded from version control)
- Animations powered entirely by `motion/react` (the Motion library, v12)
- Tailwind CSS v4 with Vite plugin integration — no `tailwind.config.js` file; theme tokens defined in `src/index.css` via `@theme`
- Two standalone HTML pages (`terms.html`, `privacy.html`) exist outside the React app and are served as static files

## Layers

**Entry / Bootstrap:**
- Purpose: Mount the React tree into the DOM
- Location: `src/main.tsx`
- Contains: `createRoot` call, `StrictMode` wrapper, global CSS import
- Depends on: `src/App.tsx`, `src/index.css`
- Used by: `index.html` via `<script type="module">`

**Root Component:**
- Purpose: Orchestrate all page sections, own shared state, subscribe to Firebase
- Location: `src/App.tsx`
- Contains: Navigation, Hero, How it Works section, FirstLetter mount, FAQ mount, Footer; `handleSubscribe` function; scroll event listener
- Depends on: `src/components/`, `./firebase` (external)
- Used by: `src/main.tsx`

**Feature Components:**
- Purpose: Self-contained UI sections with their own local state
- Location: `src/components/`
- Contains: `FirstLetter.tsx`, `FAQ.tsx`, `ShareButtons.tsx`, `Typewriter.tsx`
- Depends on: `motion/react`, `lucide-react`; `FirstLetter` also depends on `Typewriter` and `ShareButtons`
- Used by: `src/App.tsx`

**Static Pages:**
- Purpose: Legal documents (Terms of Service, Privacy Policy) as standalone HTML with inline styles and Google Fonts
- Location: `terms.html`, `privacy.html`
- Contains: Fully self-contained HTML — no React, no bundler dependency
- Depends on: Google Fonts CDN
- Used by: Linked from footer or direct URL

**Global Styles / Theme:**
- Purpose: Define custom design tokens (font stacks, brand colors) and apply base body styles
- Location: `src/index.css`
- Contains: Tailwind v4 `@import`, `@theme` block, `@layer base` body defaults
- Depends on: Google Fonts CDN (`Plus Jakarta Sans`, `Instrument Serif`, `Space Mono`)
- Used by: `src/main.tsx`

## Data Flow

### Waitlist Subscription Flow

1. App mounts → `useEffect` calls `subscribeToWaitlistCount(setWaitlistCount)` (`src/App.tsx:24`)
2. Firebase real-time listener pushes count updates → `waitlistCount` state updated in `App`
3. `waitlistCount` passed as prop to `FirstLetter` and `ShareButtons`

### Email Capture / Waitlist Join (Hero Form)

1. User submits email in Hero form → `handleSubscribe` called (`src/App.tsx:30`)
2. `joinWaitlist(email)` awaited (Firebase write)
3. On success: `isSubscribed` set to `true`, Hero form replaced with post-subscribe UI
4. `ShareButtons` rendered with current `waitlistCount`

### Interactive Letter Flow (FirstLetter)

1. User types letter text → local `letter` state in `FirstLetter` (`src/components/FirstLetter.tsx:14`)
2. User submits form → `handleInitialSubmit` checks if `initialEmail` prop is present
3. If email known: `startSealing()` called immediately (status: `sealing` → `sealed` after 2500ms timeout)
4. If no email: status transitions to `needs-email`, email form rendered
5. User submits email → `onEmailSubmit` callback invoked (calls `joinWaitlist` in `App`) → `startSealing()`
6. Sealed state: confirmation UI with `ShareButtons`

### Scroll Behavior

1. Scroll event listener in `App` (`src/App.tsx:15-20`) sets `showSticky` when `window.scrollY > 1200`
2. `showSticky` state currently unused in JSX (sticky CTA is rendered but controlled via nav button only)

**State Management:**
- `App.tsx` holds: `email`, `isSubscribed`, `showSticky`, `waitlistCount`, `isSubmitting`
- `FirstLetter.tsx` holds: `letter`, `email` (local), `status` (`'idle' | 'sealing' | 'needs-email' | 'sealed'`)
- `FAQ.tsx` → `FAQItem` holds: `isOpen` per accordion item
- `Typewriter.tsx` holds: `currentPhraseIndex`, `currentText`, `isWaiting`

## Key Abstractions

**`typewriterPhrases` export:**
- Purpose: Shared data array of placeholder phrases used in the letter textarea
- Examples: `src/components/Typewriter.tsx` (exported), consumed by `src/components/FirstLetter.tsx`
- Pattern: Named export of a `string[]` constant alongside the default component export

**`FirstLetterProps` interface:**
- Purpose: Typed contract for the interactive letter section — receives `initialEmail`, `onEmailSubmit` callback, and `waitlistCount`
- Pattern: Callback prop pattern to lift state changes back to `App`

**`ShareButtonsProps` interface:**
- Purpose: `waitlistCount` for dynamic share text, optional `className` for theme overrides (used on dark background in `FirstLetter`)
- Pattern: Optional className override for contextual theming without component duplication

## Entry Points

**Browser entry:**
- Location: `index.html`
- Triggers: Browser load; loads `src/main.tsx` as ES module
- Responsibilities: Sets page metadata (title, OG tags, Twitter cards), provides `<div id="root">`

**React mount:**
- Location: `src/main.tsx`
- Triggers: Vite module load
- Responsibilities: Renders `<App />` inside `StrictMode` into `#root`

**Vite dev/build:**
- Location: `vite.config.ts`
- Triggers: `npm run dev` / `npm run build`
- Responsibilities: Registers React and Tailwind v4 plugins; sets `@` alias to project root

## Architectural Constraints

- **Routing:** None — single `index.html` SPA; `terms.html` and `privacy.html` are separate static files not managed by React Router
- **Firebase module:** `./firebase` is imported in `src/App.tsx` but the source file is absent from the repository — the build will fail without it
- **Global state:** No context or store; `waitlistCount` and `isSubscribed` are the only values passed down as props
- **Circular imports:** None detected
- **Animation:** All animations use `motion/react` (Motion v12 API); do not mix with `framer-motion` imports

## Anti-Patterns

### `showSticky` state set but never consumed

**What happens:** `showSticky` is computed from scroll position in `App.tsx` but is never referenced in JSX.
**Why it's wrong:** Dead state — adds a scroll event listener with no rendered effect, wastes a re-render on every scroll past 1200px.
**Do this instead:** Either render a sticky CTA element conditionally on `showSticky`, or remove the `useEffect` and `showSticky` state entirely until it is needed (`src/App.tsx:15-22`).

### Firebase module missing from source control

**What happens:** `import { subscribeToWaitlistCount, joinWaitlist } from './firebase'` (`src/App.tsx:7`) references a file not present in the repository.
**Why it's wrong:** The project cannot build from a clean checkout.
**Do this instead:** Add `src/firebase.ts` to the repository (with credentials loaded from env vars, not hardcoded), or document the setup step explicitly.

## Error Handling

**Strategy:** Minimal — errors from Firebase calls are caught with `try/catch` in `App.tsx` and logged to console only.

**Patterns:**
- `handleSubscribe` catches Firebase errors and logs them (`src/App.tsx:36-38`); user sees no error feedback
- `FirstLetter.onEmailSubmit` catches and logs errors (`src/App.tsx:197-200`); no error UI
- No error boundaries are present anywhere in the tree

## Cross-Cutting Concerns

**Logging:** `console.error` only on Firebase call failures — no structured logging
**Validation:** HTML5 `required` + `type="email"` on inputs; no client-side validation library
**Authentication:** None — the landing page is fully public; Firebase writes are unauthenticated

---

*Architecture analysis: 2026-05-25*
