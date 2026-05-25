# Coding Conventions

**Analysis Date:** 2026-05-25

## Naming Patterns

**Files:**
- React component files use PascalCase matching the exported component name: `FAQ.tsx`, `FirstLetter.tsx`, `ShareButtons.tsx`, `Typewriter.tsx`
- Entry point files use lowercase: `main.tsx`, `App.tsx` (App is the exception — PascalCase as it is also a component)
- Module/utility files use camelCase: `firebase` (referenced as `./firebase`)
- CSS file is lowercase: `index.css`

**Functions and Components:**
- React components are named PascalCase and exported as `default`: `export default function App()`, `export default function FAQ()`, `export default function ShareButtons()`
- Internal (non-exported) components within a file use PascalCase: `function FAQItem()` inside `FAQ.tsx`
- Event handler functions are prefixed with `handle`: `handleSubscribe`, `handleInitialSubmit`, `handleEmailSubmit`
- Helper functions use camelCase verbs: `startSealing`, `shareOnTwitter`, `copyLink`
- Exported constants use camelCase: `typewriterPhrases` in `Typewriter.tsx`

**Variables and State:**
- State variables use camelCase descriptive nouns: `email`, `isSubscribed`, `showSticky`, `waitlistCount`, `isSubmitting`, `letter`, `status`
- Boolean state variables are prefixed with `is` or `show`: `isSubscribed`, `isSubmitting`, `isOpen`, `showSticky`
- Refs and timeouts use camelCase: `timer`, `unsubscribe`

**TypeScript Interfaces:**
- Props interfaces are named `[ComponentName]Props`: `FAQItemProps`, `FirstLetterProps`, `ShareButtonsProps`
- Interfaces are declared inline in the same file as the component that uses them
- Optional props are typed with `?`: `className?: string`, `initialEmail?: string`

**Types:**
- Union string literal types are used for multi-state values: `'idle' | 'sealing' | 'needs-email' | 'sealed'`

## Code Style

**Formatting:**
- No Prettier or ESLint config files are present; formatting is applied manually/by editor
- Indentation: 2 spaces
- Quotes: single quotes for imports, double quotes for JSX string attributes
- Trailing commas present in multi-line arrays and objects
- Semicolons used consistently

**TypeScript:**
- TypeScript 5.8 with strict mode implied (non-null assertion `!` used in `main.tsx`)
- Explicit return types are not used on component functions; TypeScript infers them
- Event types are explicitly annotated: `React.FormEvent`
- State generics used where type is not inferrable: `useState<'idle' | 'sealing' | 'needs-email' | 'sealed'>('idle')`

**Imports:**
- React is imported explicitly when JSX types are needed: `import React, { useState } from 'react'`
- React is not imported in files that only use hooks from React 19 automatic JSX transform: `main.tsx` uses named import only
- `motion` imported from `motion/react` (not the legacy `framer-motion`)
- Icons imported destructured from `lucide-react`
- Local components imported without extension in some files, with `.tsx` extension in others (inconsistent): `import App from './App.tsx'` vs `import FAQ from './components/FAQ'`

## Import Organization

**Order (observed pattern):**
1. React and React ecosystem (`react`, `motion/react`)
2. Third-party icon/utility libraries (`lucide-react`)
3. Local components (`./components/...`)
4. Local utilities/services (`./firebase`)

**Path Aliases:**
- `@` alias resolves to the project root (configured in `vite.config.ts`), but is not used in any source file — all imports use relative paths

## Error Handling

**Patterns:**
- `try/catch/finally` blocks used for async operations that can fail: `handleSubscribe` in `src/App.tsx`
- Errors are caught and logged with `console.error`: `console.error('Subscription failed:', error)`
- UI loading state managed with `isSubmitting` flag, reset in `finally` block
- No error state displayed to users — failed form submissions silently reset the submitting state
- No global error boundary present

## Logging

**Framework:** `console.error` only

**Patterns:**
- `console.error` used in catch blocks for async failures: `'Subscription failed:', error` and `'Waitlist join failed:', error`
- No `console.log` or `console.warn` usage in source files
- No structured logging library

## Comments

**When to Comment:**
- Inline comments mark major JSX sections: `{/* Navigation */}`, `{/* Hero Section */}`, `{/* Column 1: Quote */}`, `{/* Word count */}`
- Inline comments document deferred work: `// Could add a toast here if needed` in `ShareButtons.tsx`
- Magic numbers/timeouts are commented inline: `// Stay on full quote for 3s`
- No JSDoc or TSDoc comments on functions or interfaces

## Function Design

**Size:** Functions are kept compact; `App.tsx` contains all page logic in a single component but delegates rendering to sub-components

**Parameters:** Props are destructured in function signatures: `function ShareButtons({ waitlistCount, className = "" }: ShareButtonsProps)`

**Default Parameter Values:** Default values set in destructuring: `className = ""`

**Return Values:** Components always return JSX or `null`-equivalent; early returns used for status-based conditional rendering in `FirstLetter.tsx`

## Module Design

**Exports:**
- All components use `default` export
- Named exports used for constants and types when needed: `export const typewriterPhrases` in `Typewriter.tsx`
- No barrel (`index.ts`) files — all components are imported directly by path

**Component Co-location:**
- Sub-components used only within one parent file are co-located in that file without their own export: `FAQItem` inside `FAQ.tsx`
- Shared sub-components have their own file: `ShareButtons.tsx` is used by both `App.tsx` and `FirstLetter.tsx`

## Tailwind CSS Conventions

**Configuration:**
- Tailwind 4 with `@import "tailwindcss"` in `src/index.css`
- Custom design tokens defined in `@theme` block: `--font-sans`, `--font-serif`, `--font-mono`, `--color-paper`, `--color-off-white`
- Custom utility `.text-balance` defined in `@layer utilities`

**Usage:**
- Utility classes are applied directly in JSX `className` props — no CSS modules or styled components
- Responsive breakpoints follow Tailwind's mobile-first convention: `md:text-9xl`, `sm:text-lg`
- Opacity variants used for muted text: `opacity-60`, `opacity-40`, `opacity-30`
- Arbitrary values used sparingly for brand-specific details: `text-[10px]`, `tracking-[0.2em]`, `bg-[#fefcf8]`

---

*Convention analysis: 2026-05-25*
