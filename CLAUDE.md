<!-- GSD:project-start source:PROJECT.md -->
## Project

**SEALED Landing Page**

A marketing landing page that captures waitlist signups and optional first sealed letters before the SEALED mobile app launches. Users sign up with their email, optionally write a letter to their future self, and receive it on January 1st, 2027. On app launch day, they log in via OTP using the same email — their account and letter are already waiting.

**Core Value:** A frictionless one-screen moment: enter your email, write a letter to your future self, and forget about it until 2027.

### Constraints

- **Hard deadline**: January 1st, 2027 — letter delivery must fire reliably on this date
- **Database**: Supabase only — no Firebase remnants in final build
- **Build is currently broken**: `src/firebase.ts` is missing; replacing Firebase with Supabase fixes this
- **Domain**: sealedapp.io — Vercel/Netlify deployment and custom domain hookup required
- **GitHub**: New repo under SEALED-org org, pushed before any other launch steps
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ~5.8.2 — all application source files (`src/*.tsx`, `src/components/*.tsx`, `vite.config.ts`)
- HTML — standalone legal/informational pages (`privacy.html`, `terms.html`, `index.html`)
- CSS — global styles via Tailwind v4 directives (`src/index.css`)
## Runtime
- Browser (client-side SPA only; no server runtime)
- npm (implied by `package.json`; no explicit version pinned)
- Lockfile: Not present in repo (no `package-lock.json` or `yarn.lock` detected)
## Frameworks
- React 19.0.0 — UI component framework; entry point `src/main.tsx`, root component `src/App.tsx`
- Motion (Framer Motion) 12.23.24 (`motion` package) — page and component animations via `motion/react`; used in `src/App.tsx`, `src/components/FirstLetter.tsx`, `src/components/FAQ.tsx`
- Vite 6.2.0 — development server (`vite --port=3000`) and production bundler; config at `vite.config.ts`
## Key Dependencies
- `react` 19.0.0 — core UI library
- `react-dom` 19.0.0 — DOM renderer; used in `src/main.tsx`
- `motion` 12.23.24 — animation; imported as `motion/react` across multiple components
- `lucide-react` 0.546.0 — icon library; icons used throughout `src/App.tsx`, `src/components/`
- `tailwindcss` 4.1.14 — utility-first CSS; configured as a Vite plugin via `@tailwindcss/vite` 4.1.14
- Tailwind v4 `@theme` block in `src/index.css` defines custom tokens: `--font-sans`, `--font-serif`, `--font-mono`, `--color-off-white`, `--color-paper`
- `@vitejs/plugin-react` 5.0.4 — Vite plugin enabling React fast refresh and JSX transform
- `@types/node` 22.14.0 — Node.js type definitions for build tooling
## Configuration
- No `.env` files present in the repository
- Environment variables are expected for Firebase (see INTEGRATIONS.md) but are not committed
- Vite exposes env vars prefixed with `VITE_` to the browser bundle; no such references found in current source
- `vite.config.ts` — Vite config with React and Tailwind plugins; path alias `@` maps to repo root
- `src/index.css` — imports Google Fonts (Plus Jakarta Sans, Instrument Serif, Space Mono) and Tailwind; sets `@theme` design tokens; applies base `body` styles
- No `tsconfig.json` detected; TypeScript is invoked through Vite's type-aware pipeline
## Platform Requirements
- Node.js (version unspecified; no `.nvmrc` or `.node-version` file)
- `npm run dev` starts Vite dev server on port 3000
- Static site output (Vite build); suitable for any static hosting (CDN, Vercel, Netlify, etc.)
- Canonical URL referenced in `index.html` OG meta: `https://sealedapp.io`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React component files use PascalCase matching the exported component name: `FAQ.tsx`, `FirstLetter.tsx`, `ShareButtons.tsx`, `Typewriter.tsx`
- Entry point files use lowercase: `main.tsx`, `App.tsx` (App is the exception — PascalCase as it is also a component)
- Module/utility files use camelCase: `firebase` (referenced as `./firebase`)
- CSS file is lowercase: `index.css`
- React components are named PascalCase and exported as `default`: `export default function App()`, `export default function FAQ()`, `export default function ShareButtons()`
- Internal (non-exported) components within a file use PascalCase: `function FAQItem()` inside `FAQ.tsx`
- Event handler functions are prefixed with `handle`: `handleSubscribe`, `handleInitialSubmit`, `handleEmailSubmit`
- Helper functions use camelCase verbs: `startSealing`, `shareOnTwitter`, `copyLink`
- Exported constants use camelCase: `typewriterPhrases` in `Typewriter.tsx`
- State variables use camelCase descriptive nouns: `email`, `isSubscribed`, `showSticky`, `waitlistCount`, `isSubmitting`, `letter`, `status`
- Boolean state variables are prefixed with `is` or `show`: `isSubscribed`, `isSubmitting`, `isOpen`, `showSticky`
- Refs and timeouts use camelCase: `timer`, `unsubscribe`
- Props interfaces are named `[ComponentName]Props`: `FAQItemProps`, `FirstLetterProps`, `ShareButtonsProps`
- Interfaces are declared inline in the same file as the component that uses them
- Optional props are typed with `?`: `className?: string`, `initialEmail?: string`
- Union string literal types are used for multi-state values: `'idle' | 'sealing' | 'needs-email' | 'sealed'`
## Code Style
- No Prettier or ESLint config files are present; formatting is applied manually/by editor
- Indentation: 2 spaces
- Quotes: single quotes for imports, double quotes for JSX string attributes
- Trailing commas present in multi-line arrays and objects
- Semicolons used consistently
- TypeScript 5.8 with strict mode implied (non-null assertion `!` used in `main.tsx`)
- Explicit return types are not used on component functions; TypeScript infers them
- Event types are explicitly annotated: `React.FormEvent`
- State generics used where type is not inferrable: `useState<'idle' | 'sealing' | 'needs-email' | 'sealed'>('idle')`
- React is imported explicitly when JSX types are needed: `import React, { useState } from 'react'`
- React is not imported in files that only use hooks from React 19 automatic JSX transform: `main.tsx` uses named import only
- `motion` imported from `motion/react` (not the legacy `framer-motion`)
- Icons imported destructured from `lucide-react`
- Local components imported without extension in some files, with `.tsx` extension in others (inconsistent): `import App from './App.tsx'` vs `import FAQ from './components/FAQ'`
## Import Organization
- `@` alias resolves to the project root (configured in `vite.config.ts`), but is not used in any source file — all imports use relative paths
## Error Handling
- `try/catch/finally` blocks used for async operations that can fail: `handleSubscribe` in `src/App.tsx`
- Errors are caught and logged with `console.error`: `console.error('Subscription failed:', error)`
- UI loading state managed with `isSubmitting` flag, reset in `finally` block
- No error state displayed to users — failed form submissions silently reset the submitting state
- No global error boundary present
## Logging
- `console.error` used in catch blocks for async failures: `'Subscription failed:', error` and `'Waitlist join failed:', error`
- No `console.log` or `console.warn` usage in source files
- No structured logging library
## Comments
- Inline comments mark major JSX sections: `{/* Navigation */}`, `{/* Hero Section */}`, `{/* Column 1: Quote */}`, `{/* Word count */}`
- Inline comments document deferred work: `// Could add a toast here if needed` in `ShareButtons.tsx`
- Magic numbers/timeouts are commented inline: `// Stay on full quote for 3s`
- No JSDoc or TSDoc comments on functions or interfaces
## Function Design
## Module Design
- All components use `default` export
- Named exports used for constants and types when needed: `export const typewriterPhrases` in `Typewriter.tsx`
- No barrel (`index.ts`) files — all components are imported directly by path
- Sub-components used only within one parent file are co-located in that file without their own export: `FAQItem` inside `FAQ.tsx`
- Shared sub-components have their own file: `ShareButtons.tsx` is used by both `App.tsx` and `FirstLetter.tsx`
## Tailwind CSS Conventions
- Tailwind 4 with `@import "tailwindcss"` in `src/index.css`
- Custom design tokens defined in `@theme` block: `--font-sans`, `--font-serif`, `--font-mono`, `--color-paper`, `--color-off-white`
- Custom utility `.text-balance` defined in `@layer utilities`
- Utility classes are applied directly in JSX `className` props — no CSS modules or styled components
- Responsive breakpoints follow Tailwind's mobile-first convention: `md:text-9xl`, `sm:text-lg`
- Opacity variants used for muted text: `opacity-60`, `opacity-40`, `opacity-30`
- Arbitrary values used sparingly for brand-specific details: `text-[10px]`, `tracking-[0.2em]`, `bg-[#fefcf8]`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- No global state manager — all state lives in `useState` within `App.tsx` and its children
- Firebase is the only external data dependency; it is imported from `./firebase` (a file not present in the repository — likely injected at deploy time or excluded from version control)
- Animations powered entirely by `motion/react` (the Motion library, v12)
- Tailwind CSS v4 with Vite plugin integration — no `tailwind.config.js` file; theme tokens defined in `src/index.css` via `@theme`
- Two standalone HTML pages (`terms.html`, `privacy.html`) exist outside the React app and are served as static files
## Layers
- Purpose: Mount the React tree into the DOM
- Location: `src/main.tsx`
- Contains: `createRoot` call, `StrictMode` wrapper, global CSS import
- Depends on: `src/App.tsx`, `src/index.css`
- Used by: `index.html` via `<script type="module">`
- Purpose: Orchestrate all page sections, own shared state, subscribe to Firebase
- Location: `src/App.tsx`
- Contains: Navigation, Hero, How it Works section, FirstLetter mount, FAQ mount, Footer; `handleSubscribe` function; scroll event listener
- Depends on: `src/components/`, `./firebase` (external)
- Used by: `src/main.tsx`
- Purpose: Self-contained UI sections with their own local state
- Location: `src/components/`
- Contains: `FirstLetter.tsx`, `FAQ.tsx`, `ShareButtons.tsx`, `Typewriter.tsx`
- Depends on: `motion/react`, `lucide-react`; `FirstLetter` also depends on `Typewriter` and `ShareButtons`
- Used by: `src/App.tsx`
- Purpose: Legal documents (Terms of Service, Privacy Policy) as standalone HTML with inline styles and Google Fonts
- Location: `terms.html`, `privacy.html`
- Contains: Fully self-contained HTML — no React, no bundler dependency
- Depends on: Google Fonts CDN
- Used by: Linked from footer or direct URL
- Purpose: Define custom design tokens (font stacks, brand colors) and apply base body styles
- Location: `src/index.css`
- Contains: Tailwind v4 `@import`, `@theme` block, `@layer base` body defaults
- Depends on: Google Fonts CDN (`Plus Jakarta Sans`, `Instrument Serif`, `Space Mono`)
- Used by: `src/main.tsx`
## Data Flow
### Waitlist Subscription Flow
### Email Capture / Waitlist Join (Hero Form)
### Interactive Letter Flow (FirstLetter)
### Scroll Behavior
- `App.tsx` holds: `email`, `isSubscribed`, `showSticky`, `waitlistCount`, `isSubmitting`
- `FirstLetter.tsx` holds: `letter`, `email` (local), `status` (`'idle' | 'sealing' | 'needs-email' | 'sealed'`)
- `FAQ.tsx` → `FAQItem` holds: `isOpen` per accordion item
- `Typewriter.tsx` holds: `currentPhraseIndex`, `currentText`, `isWaiting`
## Key Abstractions
- Purpose: Shared data array of placeholder phrases used in the letter textarea
- Examples: `src/components/Typewriter.tsx` (exported), consumed by `src/components/FirstLetter.tsx`
- Pattern: Named export of a `string[]` constant alongside the default component export
- Purpose: Typed contract for the interactive letter section — receives `initialEmail`, `onEmailSubmit` callback, and `waitlistCount`
- Pattern: Callback prop pattern to lift state changes back to `App`
- Purpose: `waitlistCount` for dynamic share text, optional `className` for theme overrides (used on dark background in `FirstLetter`)
- Pattern: Optional className override for contextual theming without component duplication
## Entry Points
- Location: `index.html`
- Triggers: Browser load; loads `src/main.tsx` as ES module
- Responsibilities: Sets page metadata (title, OG tags, Twitter cards), provides `<div id="root">`
- Location: `src/main.tsx`
- Triggers: Vite module load
- Responsibilities: Renders `<App />` inside `StrictMode` into `#root`
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
### Firebase module missing from source control
## Error Handling
- `handleSubscribe` catches Firebase errors and logs them (`src/App.tsx:36-38`); user sees no error feedback
- `FirstLetter.onEmailSubmit` catches and logs errors (`src/App.tsx:197-200`); no error UI
- No error boundaries are present anywhere in the tree
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
