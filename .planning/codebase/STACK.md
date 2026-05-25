# Technology Stack

**Analysis Date:** 2026-05-25

## Languages

**Primary:**
- TypeScript ~5.8.2 — all application source files (`src/*.tsx`, `src/components/*.tsx`, `vite.config.ts`)

**Secondary:**
- HTML — standalone legal/informational pages (`privacy.html`, `terms.html`, `index.html`)
- CSS — global styles via Tailwind v4 directives (`src/index.css`)

## Runtime

**Environment:**
- Browser (client-side SPA only; no server runtime)

**Package Manager:**
- npm (implied by `package.json`; no explicit version pinned)
- Lockfile: Not present in repo (no `package-lock.json` or `yarn.lock` detected)

## Frameworks

**Core:**
- React 19.0.0 — UI component framework; entry point `src/main.tsx`, root component `src/App.tsx`

**Animation:**
- Motion (Framer Motion) 12.23.24 (`motion` package) — page and component animations via `motion/react`; used in `src/App.tsx`, `src/components/FirstLetter.tsx`, `src/components/FAQ.tsx`

**Build/Dev:**
- Vite 6.2.0 — development server (`vite --port=3000`) and production bundler; config at `vite.config.ts`

## Key Dependencies

**Critical:**
- `react` 19.0.0 — core UI library
- `react-dom` 19.0.0 — DOM renderer; used in `src/main.tsx`
- `motion` 12.23.24 — animation; imported as `motion/react` across multiple components
- `lucide-react` 0.546.0 — icon library; icons used throughout `src/App.tsx`, `src/components/`

**Styling:**
- `tailwindcss` 4.1.14 — utility-first CSS; configured as a Vite plugin via `@tailwindcss/vite` 4.1.14
- Tailwind v4 `@theme` block in `src/index.css` defines custom tokens: `--font-sans`, `--font-serif`, `--font-mono`, `--color-off-white`, `--color-paper`

**Infrastructure:**
- `@vitejs/plugin-react` 5.0.4 — Vite plugin enabling React fast refresh and JSX transform
- `@types/node` 22.14.0 — Node.js type definitions for build tooling

## Configuration

**Environment:**
- No `.env` files present in the repository
- Environment variables are expected for Firebase (see INTEGRATIONS.md) but are not committed
- Vite exposes env vars prefixed with `VITE_` to the browser bundle; no such references found in current source

**Build:**
- `vite.config.ts` — Vite config with React and Tailwind plugins; path alias `@` maps to repo root

**CSS:**
- `src/index.css` — imports Google Fonts (Plus Jakarta Sans, Instrument Serif, Space Mono) and Tailwind; sets `@theme` design tokens; applies base `body` styles

**TypeScript:**
- No `tsconfig.json` detected; TypeScript is invoked through Vite's type-aware pipeline

## Platform Requirements

**Development:**
- Node.js (version unspecified; no `.nvmrc` or `.node-version` file)
- `npm run dev` starts Vite dev server on port 3000

**Production:**
- Static site output (Vite build); suitable for any static hosting (CDN, Vercel, Netlify, etc.)
- Canonical URL referenced in `index.html` OG meta: `https://sealedapp.io`

---

*Stack analysis: 2026-05-25*
