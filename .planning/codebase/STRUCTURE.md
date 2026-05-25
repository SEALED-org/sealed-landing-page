# Codebase Structure

**Analysis Date:** 2026-05-25

## Directory Layout

```
SEALED Landing Page Claude Design/   # Project root
├── src/                             # React application source
│   ├── App.tsx                      # Root component — page layout and shared state
│   ├── main.tsx                     # React DOM entry point
│   ├── index.css                    # Global styles and Tailwind v4 theme tokens
│   └── components/                  # Feature components
│       ├── FirstLetter.tsx          # Interactive letter writing section
│       ├── FAQ.tsx                  # Accordion FAQ section
│       ├── ShareButtons.tsx         # Social share / copy-link buttons
│       └── Typewriter.tsx           # Animated cycling placeholder text
├── index.html                       # HTML shell and app metadata (OG, Twitter cards)
├── terms.html                       # Standalone Terms of Service page (no React)
├── privacy.html                     # Standalone Privacy Policy page (no React)
├── vite.config.ts                   # Vite build config with React + Tailwind plugins
├── package.json                     # Dependencies and npm scripts
└── .planning/                       # GSD planning documents
    └── codebase/                    # Auto-generated codebase maps
```

## Directory Purposes

**`src/`:**
- Purpose: All React application code
- Contains: Root component, entry point, global CSS, components subdirectory
- Key files: `src/App.tsx`, `src/main.tsx`, `src/index.css`

**`src/components/`:**
- Purpose: Reusable and feature-specific React components
- Contains: One file per component; no further subdirectory nesting
- Key files: `src/components/FirstLetter.tsx`, `src/components/Typewriter.tsx`

**Project root:**
- Purpose: Build config, HTML entry points, static legal pages
- Contains: `index.html` (React app shell), `terms.html`, `privacy.html`, `vite.config.ts`, `package.json`

## Key File Locations

**Entry Points:**
- `index.html`: Browser entry; loads `src/main.tsx` as ES module; contains all SEO/OG metadata
- `src/main.tsx`: React mount — wraps `<App />` in `StrictMode`, renders into `#root`

**Root Component:**
- `src/App.tsx`: Full page layout, shared state (`email`, `isSubscribed`, `waitlistCount`), Firebase integration

**Configuration:**
- `vite.config.ts`: Build tooling — React plugin, Tailwind v4 plugin, `@` path alias
- `package.json`: Dependency manifest and scripts (`dev`, `build`, `preview`)

**Global Styles / Theme:**
- `src/index.css`: Tailwind v4 `@import`, `@theme` custom tokens (fonts, colors), `@layer base` body defaults

**Feature Components:**
- `src/components/FirstLetter.tsx`: Multi-step letter form (`idle` → `needs-email` → `sealing` → `sealed`)
- `src/components/FAQ.tsx`: Accordion list; FAQ data array defined inline in the file
- `src/components/ShareButtons.tsx`: Twitter/Instagram/clipboard share; share text built from `waitlistCount`
- `src/components/Typewriter.tsx`: Animated text; exports both default component and `typewriterPhrases` constant

**Static Legal Pages:**
- `terms.html`: Self-contained Terms of Service (inline styles, Google Fonts link)
- `privacy.html`: Self-contained Privacy Policy (inline styles, Google Fonts link)

**Missing (required for build):**
- `src/firebase.ts`: Imported by `src/App.tsx` but absent from the repository — must be created before building

## Naming Conventions

**Files:**
- React components: PascalCase matching the export name — `FirstLetter.tsx`, `ShareButtons.tsx`, `FAQ.tsx`, `Typewriter.tsx`
- Application files: camelCase — `main.tsx`, `index.css`
- Config files: kebab-case or framework convention — `vite.config.ts`, `package.json`
- Static HTML: kebab-case lowercase — `index.html`, `terms.html`, `privacy.html`

**Directories:**
- Source: lowercase singular — `src/`, `components/`
- Planning/tooling: dot-prefixed — `.planning/`

**Exports:**
- Default export per file, named after the file (e.g. `export default function FirstLetter`)
- Named exports used for constants alongside default exports (e.g. `export const typewriterPhrases` in `Typewriter.tsx`)

**TypeScript interfaces:**
- PascalCase suffixed with `Props` for component prop types — `FirstLetterProps`, `ShareButtonsProps`, `FAQItemProps`

## Where to Add New Code

**New page section (React component):**
- Implementation: `src/components/NewSection.tsx`
- Mount point: Add `<NewSection />` in `src/App.tsx` in the appropriate vertical position

**New shared utility / helper:**
- Implementation: `src/utils/helperName.ts` (directory does not yet exist — create it)
- Pattern: Named exports preferred for utilities

**New Firebase / backend function:**
- Implementation: `src/firebase.ts` (add to the existing stub that must be created)
- Export pattern: Named function exports, consumed by `src/App.tsx`

**New global CSS token:**
- Location: `src/index.css` inside the `@theme {}` block
- Example: `--color-new-token: #value;` — accessible as `text-new-token` / `bg-new-token` in Tailwind classes

**New standalone static page (legal/info):**
- Location: Project root — e.g. `faq.html`, `about.html`
- Pattern: Self-contained HTML with inline `<style>` and Google Fonts CDN link (match `terms.html` / `privacy.html`)

**New TypeScript type / interface:**
- If component-specific: Define inline in the component file above the component function
- If shared: Create `src/types.ts` (does not currently exist)

## Special Directories

**`.planning/`:**
- Purpose: GSD orchestrator planning and codebase map documents
- Generated: Yes (by GSD map commands)
- Committed: Yes (tracked in git)

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (`npm install`)
- Committed: No

---

*Structure analysis: 2026-05-25*
