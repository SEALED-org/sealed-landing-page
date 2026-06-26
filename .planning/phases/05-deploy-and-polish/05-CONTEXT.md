# Phase 5: Deploy & Polish - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the working landing page to production: push to SEALED-org GitHub, deploy to Vercel, connect sealedapp.io, wire real social handles, confirm copy and accessibility are complete. Phase 5 ends when `https://sealedapp.io` serves the page over HTTPS with all links, handles, and copy final.

</domain>

<decisions>
## Implementation Decisions

### Social Handles
- **D-01:** Instagram handle is `@sealed.io` → link to `https://www.instagram.com/sealed.io`
- **D-02:** X (Twitter) handle is `@sealedapp_io` → link to `https://x.com/sealedapp_io`
- **D-03:** Footer contact email is `info@sealedapp.io` (replace current `hello@sealed.io`)
- **D-04:** Twitter share button pre-fill text must reference `@sealedapp_io` and `sealedapp.io`

### GitHub + Vercel Deployment
- **D-05:** GitHub repo under SEALED-org already exists — push to existing remote; do NOT create a new repo
- **D-06:** Connect GitHub → Vercel for auto-deploy on every push to `main` (continuous deployment, not one-shot CLI)
- **D-07:** No `vercel.json` needed — Vite multi-page outputs `verify.html`, `terms.html`, `privacy.html` to `dist/`; Vercel serves them at their `.html` paths automatically. Email verification link (`/verify.html?token=...`) and footer links (`privacy.html`, `terms.html`) already match.

### Error Display UX
- **D-08 (Hard rule):** Errors must NEVER fail silently — every form error must be presented to the user with a visible message.
- **D-09:** WaitlistForm error display is already complete — `src/components/WaitlistForm.tsx` has a `waitlist-error-slot` div with `aria-live="polite"` and 6 mapped error states. No new UI work needed.
- **D-10:** FirstLetter (write a letter tab) errors stay in existing format — white text on black highlight. No change.

### Copy
- **D-11:** All page copy is locked and ships as-is: headline ("Some letters are *worth waiting for.*"), tagline, FAQ answers, Research section.
- **D-12:** Dr. Gail Matthews citation confirmed accurate by Nour — `+42%, n=267, Dominican University of California, 2015`. No verification task needed.
- **D-13:** All 6 WaitlistForm error message strings are locked as-is (see `src/lib/messages.ts`).

### Already-Met Requirements (Confirmed in Discussion)
- **CONTENT-03:** Paper texture at `public/assets/paper-light.jpg` is already self-hosted in Vite's public dir — no PostImg CDN references exist anywhere. No action needed.
- **CONTENT-06:** WaitlistForm inline error display already implemented in Phase 2 — covers all 6 error states. No new UI work needed.
- All 4 step PNGs (`separator-ink.png`, `step-write.png`, `step-seal.png`, `step-open.png`) are in `public/assets/`. Phase 1.5 concern resolved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §SOCIAL-01–03, §DEPLOY-01–03, §DEPLOY-05, §CONTENT-01–06 — Phase 5 requirement set
- `.planning/ROADMAP.md` §Phase 5 — success criteria and plan structure

### Existing Code to Modify
- `src/components/Footer.tsx` — social links (`href="#"` for Instagram + X) and contact email need updating (D-01 – D-03)
- `src/lib/messages.ts` — WaitlistForm error strings (locked, no change — but planner should read to confirm)
- `src/components/WaitlistForm.tsx` — error slot already implemented; planner should confirm `aria-live` and accessibility labels are in place

### Deployment Context
- `vite.config.ts` — Vite multi-page config (verify.html + index.html inputs); confirms no vercel.json needed (D-07)
- `index.html` — OG/Twitter card meta; canonical URL `https://sealedapp.io`; confirm Twitter meta references updated

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/Footer.tsx`: Simple footer component — social links are icon+anchor pairs; update `href` values only, no structural changes
- `src/lib/messages.ts`: Centralized error message strings — locked, no changes needed
- `src/components/WaitlistForm.tsx`: `waitlist-error-slot` div + `aria-live="polite"` already wired — CONTENT-06 met
- `public/assets/`: Contains all required static assets (paper-light.jpg, step-*.png, separator-ink.png, wax-seal.png) — no asset additions needed

### Established Patterns
- Inline social links use SVG icons + `aria-label` + `title` attributes — maintain this accessibility pattern when updating hrefs
- Error display: muted mono font, centered, opacity transition, `aria-live="polite"` — first-class accessibility pattern already in place
- Vite multi-page: `verify.html` registered in `vite.config.ts` as a separate entry; `terms.html` and `privacy.html` are standalone static HTML (not React)

### Integration Points
- `index.html` Twitter card meta (`twitter:title`, `twitter:description`) — confirm these reference correct handle after social wiring
- Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY` — all must be set in Vercel project settings (DEPLOY-05)

</code_context>

<specifics>
## Specific Ideas

- Twitter share button pre-fill: must mention `@sealedapp_io` (the X handle) and link to `sealedapp.io`
- Footer email contact: `info@sealedapp.io` (replacing current `hello@sealed.io`)
- Vercel project should auto-deploy on push to `main` — not a one-shot CLI deploy

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-deploy-and-polish*
*Context gathered: 2026-06-26*
