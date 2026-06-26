---
phase: 05-deploy-and-polish
plan: 01
subsystem: infra
tags: [vite, static-html, social-links, meta-tags, email, deploy]

# Dependency graph
requires:
  - phase: 04-letter-verify-flow
    provides: "Completed React app build; verify.html; public/ directory structure"
provides:
  - "public/terms.html and public/privacy.html reach dist/ on every Vite build"
  - "All contact emails canonically set to info@sealedapp.io across Footer, legal pages, and verify page"
  - "Footer Instagram and X links point to real social handles with noopener/noreferrer"
  - "index.html twitter:site = @sealedapp_io for share card attribution"
affects: [05-02, 05-03, 05-04, 05-05, deploy-sequence]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static legal HTML in public/ (Vite copies verbatim to dist/) rather than rollupOptions.input"
    - "External social anchors use target=_blank + rel=noopener noreferrer (T-05-RT reverse-tabnabbing mitigation)"

key-files:
  created:
    - "public/terms.html (moved from repo root)"
    - "public/privacy.html (moved from repo root)"
  modified:
    - "src/components/Footer.tsx"
    - "index.html"
    - "verify.html"

key-decisions:
  - "D-14: Move terms.html and privacy.html to public/ (Option A) so Vite copies them verbatim to dist/ — no rollupOptions.input entries, no vercel.json"
  - "D-01/D-02: Footer Instagram → https://www.instagram.com/sealed.io, X → https://x.com/sealedapp_io, both with noopener noreferrer"
  - "D-03/D-17: Single canonical contact email info@sealedapp.io replaces hello@sealed.io (x6) and hello@sealedapp.io (x1)"
  - "D-16: twitter:site = @sealedapp_io added to index.html for share card attribution"

patterns-established:
  - "Legal/standalone HTML pages belong in public/ not repo root for Vite MPA builds"
  - "External <a> elements with target=_blank require rel=noopener noreferrer (enforced for all Phase 5 social links)"

requirements-completed: [DEPLOY-01, SOCIAL-01, CONTENT-01]

# Metrics
duration: 8min
completed: 2026-06-26
---

# Phase 05 Plan 01: Static Content Polish & Legal Page Fix Summary

**Moved both legal HTML pages into public/ (D-14 launch blocker closed), replaced all 7 stale contact email strings with info@sealedapp.io (D-03/D-17), wired Footer social hrefs to real handles with noopener/noreferrer (D-01/D-02/T-05-RT), and added twitter:site=@sealedapp_io meta (D-16).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-26T09:05:00Z (approx)
- **Completed:** 2026-06-26T09:13:25Z
- **Tasks:** 3 of 3
- **Files modified:** 5

## Accomplishments

- D-14 launch blocker closed: `dist/terms.html` and `dist/privacy.html` now present after every `npm run build` (confirmed); footer links will no longer 404 in production
- 7 stale contact email strings eliminated; every surface now reads `info@sealedapp.io` exactly once per location
- Footer social links de-stubbed: Instagram and X anchors have real URLs with reverse-tabnabbing mitigation (`rel="noopener noreferrer"`, `target="_blank"`)
- Twitter share cards now attributed to `@sealedapp_io` via `twitter:site` meta

## Task Commits

1. **Task 1: Move terms.html and privacy.html into public/** - `fa60b3a` (chore)
2. **Task 2: Replace all hello@ contact emails with info@sealedapp.io** - `bc81a5e` (fix)
3. **Task 3: Wire Footer social hrefs and add twitter:site meta** - `4f42d11` (feat)

## Files Created/Modified

- `public/terms.html` — moved from repo root; now reaches `dist/terms.html` via Vite public/ copy; email updated
- `public/privacy.html` — moved from repo root; now reaches `dist/privacy.html` via Vite public/ copy; 3 email occurrences updated
- `src/components/Footer.tsx` — Instagram href, X href, email mailto all updated; noopener/noreferrer added to external social links
- `index.html` — `<meta name="twitter:site" content="@sealedapp_io">` added
- `verify.html` — email href/aria-label/title updated from hello@sealedapp.io to info@sealedapp.io

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all changed fields are wired to their real values.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The plan's threat model covered all changes:
- T-05-RT (reverse-tabnabbing): mitigated by adding `rel="noopener noreferrer"` to Instagram and X anchors.
- T-05-404 (legal page 404 in prod): mitigated by moving to public/ (Task 1).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| public/terms.html exists | FOUND |
| public/privacy.html exists | FOUND |
| src/components/Footer.tsx exists | FOUND |
| index.html exists | FOUND |
| verify.html exists | FOUND |
| 05-01-SUMMARY.md exists | FOUND |
| Commit fa60b3a (Task 1) | FOUND |
| Commit bc81a5e (Task 2) | FOUND |
| Commit 4f42d11 (Task 3) | FOUND |
