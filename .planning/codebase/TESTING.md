# Testing Patterns

**Analysis Date:** 2026-05-25

## Test Framework

**Runner:**
- None — no test framework is installed or configured

**Assertion Library:**
- None

**Run Commands:**
```bash
# No test commands defined in package.json
# Available scripts:
npm run dev       # Start dev server on port 3000
npm run build     # Production build
npm run preview   # Preview production build
```

## Test File Organization

**Location:**
- No test files exist anywhere in the repository

**Naming:**
- Not applicable — no test files found

**Structure:**
- No `__tests__/` directory, no `*.test.ts` or `*.spec.ts` files detected

## Test Framework Detection

**package.json dependencies** (both `dependencies` and `devDependencies`) contain no testing-related packages:
- No `jest`, `vitest`, `@testing-library/react`, `@testing-library/user-event`
- No `cypress`, `playwright`, `puppeteer`
- No `msw` (Mock Service Worker) for API mocking
- No `@types/jest` or similar test type packages

**Config files present:**
- `vite.config.ts` — Vite build config only, no test configuration
- No `jest.config.*`, `vitest.config.*`, or `cypress.config.*` files

## Mocking

**Framework:** None

**Patterns:**
- Not applicable — no tests exist

## Fixtures and Factories

**Test Data:**
- Not applicable — no tests exist

**Location:**
- No fixtures directory present

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# No coverage tooling configured
```

## Test Types

**Unit Tests:**
- Not present

**Integration Tests:**
- Not present

**E2E Tests:**
- Not present

## Adding Tests (Recommended Setup)

Given the stack (React 19, Vite 6, TypeScript 5.8), the natural testing setup is:

**Install:**
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

**Recommended test file locations:**
- Unit/component tests: co-located with component — `src/components/FAQ.test.tsx`
- Integration tests: `src/__tests__/`

**Components most in need of tests:**
- `src/components/Typewriter.tsx` — pure logic with timers, ideal for unit testing
- `src/components/FAQ.tsx` — accordion expand/collapse interaction
- `src/components/FirstLetter.tsx` — multi-step form state machine (`idle → needs-email → sealing → sealed`)
- `src/App.tsx` — `handleSubscribe` async flow with `joinWaitlist` call

**Key mocking needs:**
- `./firebase` module (`joinWaitlist`, `subscribeToWaitlistCount`) must be mocked in component tests
- `window.scrollY` for sticky nav tests
- `navigator.clipboard.writeText` in `ShareButtons.tsx`
- `window.open` in `ShareButtons.tsx` (Twitter share)
- `setTimeout` via `vi.useFakeTimers()` for `Typewriter.tsx` and `startSealing()` in `FirstLetter.tsx`

---

*Testing analysis: 2026-05-25*
