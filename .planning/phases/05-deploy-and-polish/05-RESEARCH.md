# Phase 5: Deploy & Polish - Research

**Researched:** 2026-06-26
**Domain:** Static SPA deployment (Vercel + Vite multi-page), DNS/custom domain, secret-leak CI gate, web accessibility, content polish
**Confidence:** HIGH (deployment mechanics verified against current official Vercel docs dated 2026-02/03; codebase facts verified directly)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Instagram handle is `@sealed.io` → link to `https://www.instagram.com/sealed.io`
- **D-02:** X (Twitter) handle is `@sealedapp_io` → link to `https://x.com/sealedapp_io`
- **D-03:** Footer contact email is `info@sealedapp.io` (replace current `hello@sealed.io`)
- **D-04:** Twitter share button pre-fill text must reference `@sealedapp_io` and `sealedapp.io`
- **D-05:** GitHub repo under SEALED-org already exists — push to existing remote; do NOT create a new repo
- **D-06:** Connect GitHub → Vercel for auto-deploy on every push to `main` (continuous deployment, not one-shot CLI)
- **D-07:** No `vercel.json` needed — Vite multi-page outputs `verify.html`, `terms.html`, `privacy.html` to `dist/`; Vercel serves them at their `.html` paths automatically. Email verification link (`/verify.html?token=...`) and footer links (`privacy.html`, `terms.html`) already match.
  > ⚠️ **RESEARCH CONFLICT — see Open Questions Q1 + Pitfall 1.** The "no vercel.json" half of D-07 is CORRECT and verified. But the "terms.html, privacy.html output to dist/" half is **FALSE in the current build** — those two files are NOT in `dist/` and will 404 in production. This is a launch blocker that must be fixed (one small task). The fix does not require a vercel.json.
- **D-08 (Hard rule):** Errors must NEVER fail silently — every form error must be presented to the user with a visible message.
- **D-09:** WaitlistForm error display is already complete (`waitlist-error-slot` + `aria-live="polite"` + 6 mapped states). No new UI work needed.
- **D-10:** FirstLetter errors stay in existing format — white text on black highlight. No change.
- **D-11:** All page copy is locked and ships as-is (headline, tagline, FAQ answers, Research section).
- **D-12:** Dr. Gail Matthews citation confirmed accurate (`+42%, n=267, Dominican University of California, 2015`). No verification task needed.
- **D-13:** All 6 WaitlistForm error message strings are locked as-is (`src/lib/messages.ts`).
- **CONTENT-03 (already met):** Paper texture at `public/assets/paper-light.jpg`, self-hosted — no PostImg CDN refs anywhere. **Re-verified this session: confirmed 0 external CDN image references in `src/` or any HTML.**
- **CONTENT-06 (already met):** WaitlistForm inline error display already implemented in Phase 2.

### Claude's Discretion
- Exact mechanism for the service-role-key bundle-leak grep gate (npm script vs CI vs pre-push) — research recommends `npm run` script invoked in the Vercel build/CI step (see §Service-Role-Key Leak Gate).
- Exact accessibility implementation (visually-hidden `<label>` vs `aria-label`; `:focus-visible` ring styling) within the locked visual design.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (And explicitly out of v1 scope per REQUIREMENTS.md: analytics/cookie banner, error boundary, .ics button, sample-letter preview.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Codebase pushed to GitHub repo under SEALED-org | Remote already configured: `origin → https://github.com/SEALED-org/sealed-landing-page.git` (verified `git remote -v`). Task = push, not create. §GitHub → Vercel. |
| DEPLOY-02 | Landing page deployed to Vercel | §Vercel Vite Preset. Framework auto-detected as Vite; build `vite build`, output `dist`. Build verified green this session. |
| DEPLOY-03 | sealedapp.io custom domain connected to Vercel | §Custom Domain & DNS. Apex A record + www CNAME; existing Resend SPF/DKIM/DMARC/MX preserved (coexist). |
| DEPLOY-05 | All `VITE_*` env vars set in Vercel; secrets via `supabase secrets set` (already done Phase 3) | §Environment Variables. Three vars needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`. NO service-role key in VITE_*. |
| SOCIAL-01 | Instagram + X links point to real handles | §Component Changes. `Footer.tsx` lines 22, 40 currently `href="#"`. Update to D-01/D-02 URLs. |
| SOCIAL-02 | Twitter/X share button pre-populates message referencing sealedapp.io | **GAP — not implemented.** No share component exists anywhere in `src/`. §Share Functionality Gap. New build required. |
| SOCIAL-03 | "Copy link" button copies landing page URL to clipboard | **GAP — not implemented.** No clipboard logic exists. §Share Functionality Gap. New build required. |
| CONTENT-01 | All copy proofed/finalized | Copy locked (D-11). Action = the email-address polish across HTML files (see CONTENT-03-adjacent finding) + verifying Twitter meta. |
| CONTENT-02 | Matthews citation verified | Already confirmed (D-12). No task. |
| CONTENT-03 | Paper texture self-hosted (not i.postimg.cc) | Already met. Re-verified 0 external refs this session. Confirm-only task. |
| CONTENT-04 | Form inputs have proper `<label>` associations | **GAP — no `<label>` elements exist.** Inputs rely on `placeholder` only. §Accessibility. 2 inputs need labels (WaitlistForm email, FirstLetter email). |
| CONTENT-05 | Focus rings visible on all interactive elements | **PARTIAL.** `outline: none` set globally on inputs; only the waitlist email has a `:focus` replacement. No keyboard `:focus-visible` ring on buttons/links/FirstLetter input. §Accessibility. |
| CONTENT-06 | Error states have visible inline messages | Already met (D-09). Confirm-only. |
</phase_requirements>

## Summary

Phase 5 is a deploy-and-polish phase on a functionally complete React 19 + Vite 6 + Tailwind v4 static SPA. The build is green (`npm run build` succeeds, ~1.6s, outputs `index.html` + `verify.html`). The repo's git remote already points at `https://github.com/SEALED-org/sealed-landing-page.git`, so DEPLOY-01 is a push, not a repo creation.

The deployment mechanics are low-risk and well-understood. Vercel's Vite framework preset does **not** apply an automatic SPA catch-all rewrite — it serves the static `dist/` output as-is, and the official docs (updated 2026-03-09) explicitly recommend "Multi-Page App mode for production builds." This project is already in MPA mode (two `input` entries in `vite.config.ts`). **The "no vercel.json" decision (D-07) is verified correct — no conflict.** Custom-domain DNS (apex A record + www CNAME) coexists with the existing Resend SPF/DKIM/DMARC/MX records and will not disrupt email authentication. Vercel auto-provisions HTTPS.

However, research surfaced **four concrete gaps** the planner must scope as real work, three of them launch-affecting:
1. **`terms.html` / `privacy.html` will 404 in production** — they live in the repo root, NOT in `public/` and NOT in `vite.config.ts` inputs, so they never reach `dist/`. The footer links to them. This is the single most important finding and it partially contradicts D-07's stated assumption (the fix is small and needs no vercel.json).
2. **SOCIAL-02 + SOCIAL-03 are unimplemented** — there is no share/copy-link component anywhere in `src/` (the `ShareButtons.tsx` described in CLAUDE.md's architecture does not exist in the rebuilt UI). This is net-new UI, not a polish edit.
3. **CONTENT-04 + CONTENT-05 accessibility gaps** — zero `<label>` elements exist (inputs use `placeholder` only), and `outline: none` is applied globally with only a single `:focus` replacement, leaving keyboard users without visible focus on most controls.
4. **Email-address inconsistency is broader than CONTEXT states** — `hello@sealed.io` appears 6 times (Footer.tsx ×1, privacy.html ×3, terms.html ×2), and verify.html uses `hello@sealedapp.io` (wrong local part). The locked value is `info@sealedapp.io` (D-03).

**Primary recommendation:** Plan ~6 task groups: (1) fix terms/privacy → dist + footer/email polish; (2) wire social handles (Footer hrefs); (3) build the missing share + copy-link UI (SOCIAL-02/03); (4) accessibility labels + focus-visible rings; (5) add the service-role-key bundle-leak npm gate and run it; (6) the deploy sequence itself (push → connect Vercel → set 3 env vars → add domain → verify HTTPS + all routes). Steps 1–5 are code; step 6 is a human-driven dashboard/DNS checkpoint.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Serving static HTML/JS/CSS | CDN / Static (Vercel edge) | — | Vite outputs static `dist/`; Vercel serves from its edge CDN. No server runtime. |
| Direct access to `verify.html`, `terms.html`, `privacy.html` | CDN / Static | — | MPA static files served at `.html` paths; no SPA rewrite intercepts them. |
| Env var injection (`VITE_*`) | Build step (Vercel build container) | — | Vite inlines `VITE_*` into the bundle at **build time**, not runtime. Set in Vercel dashboard before/at build. |
| Custom domain + HTTPS | CDN / DNS | Registrar (DNS host) | Vercel terminates TLS and auto-provisions certs; registrar holds A/CNAME + existing MX/TXT. |
| Social link navigation | Browser / Client | — | Plain anchor `href` to instagram.com / x.com. |
| Share intent + copy-to-clipboard | Browser / Client | — | `window.open(twitter intent URL)` + `navigator.clipboard.writeText()`. Pure client. |
| Form label / focus-ring a11y | Browser / Client | — | HTML semantics + CSS `:focus-visible`. No backend involvement. |
| Service-role-key leak gate | Build / CI | Local pre-push (optional) | A grep over `dist/` runs after `vite build`; best placed as an npm script run in the build pipeline. |
| Secrets (`SUPABASE_SERVICE_ROLE_KEY`, Resend, Turnstile secret) | Backend (sibling repo, Edge Functions) | — | Already set via `supabase secrets set` in Phase 3. **Out of scope — do not touch.** |

## Standard Stack

Phase 5 **installs no new runtime packages.** It uses existing deps for the share UI and platform tooling for deploy.

### Core (already installed — for the SOCIAL-02/03 build)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 19.0.0 | Share/copy button component | Already the UI framework. [VERIFIED: package.json] |
| `lucide-react` | 0.546.0 | Icons for share/copy buttons (e.g. `Link`, `Twitter`/`Share2`, `Check`) | Already the icon lib used project-wide. [VERIFIED: package.json] |
| Web Platform APIs | — | `navigator.clipboard.writeText()` (SOCIAL-03); X/Twitter intent URL via `window.open` (SOCIAL-02) | Native, zero-dependency, universally supported on the target browsers. [CITED: developer.mozilla.org/Clipboard_API] |

### Supporting (platform / tooling — not npm runtime deps)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Vercel platform | current (2026) | Hosting, CI/CD on push, HTTPS, custom domain | DEPLOY-02/03. Dashboard + Git integration. [CITED: vercel.com/docs/frameworks/frontend/vite] |
| `vite` | 6.4.2 (resolved at build) | Build / `dist/` output | Already in use. Build verified green this session. [VERIFIED: build output] |
| `git` / `gh` CLI | — | Push to existing SEALED-org remote (DEPLOY-01) | Remote already configured. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `navigator.clipboard.writeText()` | `document.execCommand('copy')` | Deprecated legacy fallback; not needed for HTTPS production target. Use the modern API; gate behind a `try/catch` with a graceful no-op. |
| X intent URL `https://x.com/intent/tweet?...` | `twitter.com/intent/tweet` | Both work; `x.com` is the canonical current host. Use `https://x.com/intent/post` (current) or `/intent/tweet` (still redirects). Prefer `x.com`. [ASSUMED — verify final URL at build time] |
| No `vercel.json` (D-07) | Minimal `vercel.json` | **Not needed.** Confirmed no SPA rewrite is auto-applied; MPA static files are served directly. Adding a catch-all rewrite would *break* `verify.html`/`terms.html`/`privacy.html`. |

**Installation:** None. `npm ci` / existing `package-lock.json` only.

## Package Legitimacy Audit

> Phase 5 installs **no new packages**. The table below covers existing deps touched by Phase 5 work (share UI). slopcheck was unavailable this session (offline/restricted); these are pre-existing, already-locked dependencies confirmed via `package-lock.json`, not new additions.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `react` 19.0.0 | npm | mature | very high | github.com/facebook/react | n/a (unavailable) | Pre-existing — Approved |
| `lucide-react` 0.546.0 | npm | mature | high | github.com/lucide-icons/lucide | n/a (unavailable) | Pre-existing — Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none (no new installs).
**Packages flagged as suspicious [SUS]:** none.

*No new packages are introduced in Phase 5, so the legitimacy gate is informational only. If the planner decides to add a share library (NOT recommended — use Web Platform APIs), that package must pass the full gate before install.*

## Architecture Patterns

### System Architecture Diagram (deploy data flow)

```
                         ┌─────────────────────────────────────────────┐
   git push origin main  │  GitHub: SEALED-org/sealed-landing-page      │
  ───────────────────────▶  (remote already configured — verified)     │
                         └───────────────────┬─────────────────────────┘
                                             │ webhook (auto-deploy, D-06)
                                             ▼
                         ┌─────────────────────────────────────────────┐
                         │  Vercel build container                      │
                         │  framework = Vite (auto-detected)            │
                         │  install: npm ci                             │
                         │  build:   vite build   ──►  dist/            │
                         │  VITE_* env vars INLINED here (build time)   │
                         │  ┌──────────────────────────────────────┐   │
                         │  │ leak gate: grep dist/ for svc-role key│◀──┼── npm script (Discretion)
                         │  └──────────────────────────────────────┘   │
                         └───────────────────┬─────────────────────────┘
                                             │ deploy static dist/
                                             ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  Vercel Edge CDN  (MPA static serving — NO SPA catch-all rewrite)  │
        │   /             → index.html  (React SPA bundle)                    │
        │   /verify.html  → verify.html  (email verify target, ?token=...)    │
        │   /terms.html   → terms.html   ⚠ MUST be in dist/ first (see gap)   │
        │   /privacy.html → privacy.html ⚠ MUST be in dist/ first (see gap)   │
        │   /assets/*     → JS / CSS / paper-light.jpg / step-*.png           │
        └──────────────────────────────┬─────────────────────────────────────┘
                                        │ TLS (auto-provisioned)
                     DNS (registrar) ───┤
   sealedapp.io  A    → Vercel apex IP  │      ◀── browser: https://sealedapp.io
   www           CNAME→ <proj>.vercel-dns-017.com
   (UNCHANGED:  MX, SPF TXT, DKIM TXT, DMARC TXT  ← Resend email auth, coexist)
```

A reader can trace the launch path: `git push` → GitHub webhook → Vercel build (env inlined, leak gate) → static `dist/` deployed to edge → DNS points sealedapp.io at Vercel → HTTPS served, email DNS untouched.

### Recommended Project Structure (changes only)
```
public/
└── assets/                # unchanged (paper-light.jpg, step-*.png, wax-seal.png, separator-ink.png)
                           # NOTE: terms.html / privacy.html must reach dist/ — see Pitfall 1.
                           #   Option A (recommended): move terms.html + privacy.html → public/
                           #   Option B: add them as rollupOptions.input entries in vite.config.ts
src/
├── components/
│   ├── Footer.tsx         # EDIT: social hrefs (D-01/D-02), email → info@sealedapp.io (D-03)
│   ├── ShareRow.tsx       # NEW (or co-located): SOCIAL-02 X-share + SOCIAL-03 copy-link
│   ├── WaitlistForm.tsx   # EDIT: add <label> for email input (CONTENT-04)
│   └── FirstLetter.tsx    # EDIT: add <label> for fl-email-input (CONTENT-04)
├── index.css              # EDIT: add :focus-visible ring (CONTENT-05); visually-hidden label util
index.html                 # VERIFY: og:url + twitter meta correct (already correct this session)
privacy.html / terms.html  # EDIT: hello@sealed.io → info@sealedapp.io (×3 + ×2)
verify.html                # EDIT: hello@sealedapp.io → info@sealedapp.io
```

### Pattern 1: Vite Multi-Page App (MPA) static deploy on Vercel
**What:** Vite is configured with multiple HTML `input` entries; the build emits one static HTML file per entry plus shared `assets/`. Vercel's Vite preset serves this `dist/` directly — each `.html` is reachable at its own path with no rewrite.
**When to use:** This is the project's existing model and the Vercel-recommended production mode.
**Example:**
```ts
// Source: vite.config.ts (verified in repo) — current state
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'index.html'),
      verify: path.resolve(__dirname, 'verify.html'),
      // GAP: terms.html and privacy.html are NOT listed here and NOT in public/,
      //      so they are absent from dist/. Add them here (Option B) or move to public/ (Option A).
    },
  },
}
```
```
// Source: vercel.com/docs/frameworks/frontend/vite (last_updated 2026-03-09)
// "Deploying your app in Multi-Page App mode is recommended for production builds."
// The SPA rewrite (rewrites: source "/(.*)" → "/index.html") is ONLY for apps
// "configured to deploy as a Single Page Application (SPA)" — opt-in, NOT automatic.
```

### Pattern 2: X / Twitter share intent (SOCIAL-02)
**What:** Open the platform's pre-filled compose window in a new tab; no API, no auth.
**Example:**
```tsx
// Pattern (compose at build): https://x.com/intent/tweet
const text = encodeURIComponent("I just sealed a letter to my 2027 self. Join me — @sealedapp_io");
const url  = encodeURIComponent("https://sealedapp.io");
window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
// Must reference @sealedapp_io and sealedapp.io per D-04. [ASSUMED final copy — confirm with Nour, minimal voice]
```

### Pattern 3: Copy link to clipboard (SOCIAL-03)
**What:** Modern async Clipboard API with a transient "copied" confirmation; graceful no-op on failure (satisfies D-08 spirit — never silently lie about success).
**Example:**
```tsx
// Source: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
async function copyLink() {
  try {
    await navigator.clipboard.writeText('https://sealedapp.io');
    setCopied(true);                 // show "Copied" for ~2s
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // Clipboard blocked — keep button text unchanged / show a fallback hint.
  }
}
```

### Pattern 4: Visible focus ring without breaking the locked design (CONTENT-05)
**What:** Use `:focus-visible` so the ring appears only for keyboard users (not mouse clicks), preserving the locked aesthetic for pointer interaction.
**Example:**
```css
/* Source: developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible */
:where(a, button, input, textarea, [tabindex]):focus-visible {
  outline: 2px solid #000;
  outline-offset: 2px;
}
/* The existing `outline: none` on inputs (index.css:287, 852, 963) removes the default
   ring for ALL focus states — replace with :focus-visible so keyboard nav stays visible. */
```

### Anti-Patterns to Avoid
- **Adding an SPA catch-all rewrite in vercel.json.** It would route `/verify.html`, `/terms.html`, `/privacy.html` to `index.html`, breaking the email verify flow and legal pages. This project is MPA — do not add it.
- **Setting the service-role key (or any secret) as a `VITE_*` var in Vercel.** `VITE_*` is inlined into the public bundle at build time. Only the three public values belong there. Secrets stay in `supabase secrets set` (already done Phase 3).
- **Relying on `placeholder` as an accessible name.** Placeholder text is not a label (disappears on input, not reliably announced). CONTENT-04 needs a real `<label>` (visually-hidden is fine) or `aria-label`.
- **Naive `grep eyJ` for the leak gate.** The legitimate anon key is also a JWT starting `eyJ` and is *supposed* to be in the bundle. A blanket `eyJ` grep false-positives. See §Service-Role-Key Leak Gate for the correct pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Custom domain TLS / cert renewal | Manual cert provisioning | Vercel auto-provisioned HTTPS | Vercel issues + renews certs automatically once DNS points at it. [CITED: vercel.com/docs/domains] |
| CI/CD pipeline | A custom GitHub Action to build + deploy | Vercel ↔ GitHub native integration (D-06) | Push-to-main auto-deploy is built in; no workflow YAML needed. |
| Copy-to-clipboard | `document.execCommand` polyfill / `<textarea>` hack | `navigator.clipboard.writeText()` | Native, async, supported on all modern target browsers over HTTPS. |
| Share dialog | A custom modal | `window.open` to X intent URL | Platform-native compose UI; zero maintenance. |
| Focus-only-for-keyboard logic | JS that tracks mouse vs keyboard | CSS `:focus-visible` | Browser handles the heuristic natively. |
| SPA route fallback | A vercel.json rewrite | Nothing — MPA serves files directly | No client router; each page is a real file. |

**Key insight:** Phase 5 is almost entirely *platform configuration + small semantic-HTML/CSS edits*. The only genuinely new code is the share/copy UI (SOCIAL-02/03), and even that is two thin wrappers over Web Platform APIs — no libraries.

## Runtime State Inventory

> Phase 5 is a deploy + small-edit phase. There is one rename-like change (email address `hello@sealed.io` → `info@sealedapp.io`), audited below. The deploy itself introduces platform state (Vercel project, DNS records) tracked separately.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 5 writes no DB records. Supabase data untouched. | None — verified (no DB calls in scope). |
| Live service config | **Vercel project** (new): Git connection, 3 env vars, custom domain. **DNS** (registrar): add apex A + www CNAME. **EXISTING Resend records on sealedapp.io: MX, SPF TXT, DKIM TXT, DMARC TXT — must remain untouched** (verified live + authenticating per STATE.md Phase 3). | Add Vercel A/CNAME at registrar; do NOT modify or remove Resend TXT/MX records (they coexist). Human dashboard/DNS checkpoint. |
| OS-registered state | None. | None — verified (static site, no OS services). |
| Secrets/env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY` — names confirmed present in `.env.local`; must be re-entered in Vercel dashboard (Production scope; Preview optional). Backend secrets (`SUPABASE_SERVICE_ROLE_KEY`, Resend, Turnstile **secret**) already set via `supabase secrets set` Phase 3 — **not in this repo, do not touch.** | Set 3 `VITE_*` in Vercel. No secret rename. |
| Build artifacts | `dist/` is gitignored and rebuilt by Vercel — no stale-artifact risk. **But the leak-gate must run on the freshly built `dist/`, not a stale local one.** | Leak gate runs post-`vite build` in the pipeline. |
| Email-address string (rename) | `hello@sealed.io`: Footer.tsx:47, privacy.html:367/404/441, terms.html:468/497 (6 total). verify.html:244 uses `hello@sealedapp.io` (wrong local part). | Replace all 7 with `info@sealedapp.io` (D-03). Pure string edit; no data migration. |

**The canonical question — after every file is updated, what runtime systems still have the old string cached/registered?** None for the email rename (no service stores it). For the deploy: the only externally-held state is the registrar's DNS zone and the Vercel dashboard, both updated by the human checkpoint task.

## Common Pitfalls

### Pitfall 1: `terms.html` / `privacy.html` 404 in production (LAUNCH BLOCKER)
**What goes wrong:** The footer links to `privacy.html` and `terms.html`, but the deployed site returns 404 for both, because they never made it into `dist/`.
**Why it happens:** Vite only emits to `dist/` (a) files in `public/` (copied verbatim) and (b) HTML files listed in `build.rollupOptions.input`. `terms.html` and `privacy.html` are in the **repo root**, are NOT in `public/`, and are NOT in `vite.config.ts` inputs. **Verified this session:** `npm run build` produced only `dist/index.html`, `dist/verify.html`, `dist/assets/` — `dist/terms.html` and `dist/privacy.html` do not exist. This directly contradicts D-07's stated assumption ("Vite multi-page outputs verify.html, terms.html, privacy.html to dist/").
**How to avoid:** Pick ONE — (A) move `terms.html` + `privacy.html` into `public/` (simplest; they're standalone static HTML with no bundler deps, ideal for `public/`), or (B) add them as `rollupOptions.input` entries. Option A is recommended; Option B re-processes them through Rollup unnecessarily.
**Warning signs:** `ls dist/terms.html` errors after build; clicking footer "Privacy Policy" on the deployed site 404s. **A post-build verification task must assert `dist/terms.html` and `dist/privacy.html` exist.**

### Pitfall 2: Service-role key leaks into the bundle
**What goes wrong:** A secret (service-role key) ends up inlined in the public JS bundle, exposing full DB access.
**Why it happens:** Accidentally adding `VITE_SUPABASE_SERVICE_ROLE_KEY` (or pasting the secret into a `VITE_*` var) inlines it at build time. STATE.md flags this as a known watch.
**How to avoid:** Add the leak gate (§Service-Role-Key Leak Gate) and run it after every build. **Current `dist/` is clean — verified this session: 0 `service_role` literals, 0 `sb_secret_` occurrences; 4 `eyJ`-prefixed tokens which are the legitimate anon key.**
**Warning signs:** The gate exits non-zero; any `sb_secret_` or `service_role`-claim JWT in `dist/`.

### Pitfall 3: `VITE_*` env vars not set in Vercel before first build → blank/erroring site
**What goes wrong:** The app throws at module load. `src/lib/supabase.ts` (lines 14-27) *intentionally* `throw`s if any of the 3 vars are missing — so a deploy without them produces a hard-failed page, not a degraded one.
**Why it happens:** `VITE_*` vars must exist **at build time** (inlined), so they must be set in Vercel *before* the build that should pick them up; changing a var requires a redeploy.
**How to avoid:** Set all 3 `VITE_*` vars (Production scope) in the Vercel dashboard before/at the first production build; verify the deployed site loads and the counter fetches.
**Warning signs:** Deployed page is blank; console shows "Missing VITE_SUPABASE_URL…".

### Pitfall 4: Editing DNS removes Resend email authentication
**What goes wrong:** While adding Vercel's A/CNAME at the registrar, someone deletes or overwrites the SPF/DKIM/DMARC/MX records → emails start failing SPF/DKIM and land in spam.
**Why it happens:** A/CNAME (web) and MX/TXT (email) are independent record types that coexist; a careless "replace all records" action wipes email auth.
**How to avoid:** ADD only the Vercel A record (apex) and www CNAME; leave every existing MX and TXT record exactly as-is. The records do not conflict. [CITED: vercel.com/docs/domains — "keep all existing records intact, especially MX, SPF, DKIM, DMARC."]
**Warning signs:** mail-tester score drops; "SPF/DKIM fail" after the domain switch. (STATE.md Phase 6 already re-runs mail-tester on the live send — this is the safety net.)

### Pitfall 5: Twitter/OG meta references a stale or wrong handle
**What goes wrong:** Share cards show the wrong handle/URL.
**Why it happens:** `index.html` meta and the share button copy can drift from the locked handles.
**How to avoid:** `index.html` `og:url` is already `https://sealedapp.io` (verified). Twitter card meta has no `twitter:site`/`twitter:creator` handle currently — if the planner wants the card attributed, add `twitter:site` = `@sealedapp_io`. Ensure share-button copy uses `@sealedapp_io` + `sealedapp.io` (D-04).
**Warning signs:** Card preview (e.g. opengraph.xyz) shows wrong/empty attribution.

## Service-Role-Key Leak Gate (STATE.md blocker — Claude's Discretion on mechanism)

**The problem with a naive grep:** the legitimate **anon** key is a JWT starting `eyJ` and *belongs* in the public bundle. So `grep eyJ dist/` false-positives on every build. Both legacy keys share the `eyJ` prefix; they differ only in the decoded `"role"` claim (`anon` vs `service_role`). New-format keys are unambiguous: anon-like = `sb_publishable_`, secret = `sb_secret_`. [CITED: supabase.com/docs/guides/api/api-keys]

**Recommended gate (reliable, zero false positives):** check for the patterns that should *never* appear in a client bundle:

```bash
# Recommended: an npm script run AFTER vite build, fails the build on any hit.
# package.json:  "verify:no-secrets": "node scripts/check-bundle.mjs"  (or inline grep below)

set -e
LEAK=0
# 1. New-format secret keys — must never be in dist/
grep -rl 'sb_secret_' dist/ && { echo "LEAK: sb_secret_ key in dist/"; LEAK=1; }
# 2. Service-role JWT claim — decode is overkill; the literal role string is a strong signal
grep -rl '"role":"service_role"' dist/ && { echo "LEAK: service_role JWT claim in dist/"; LEAK=1; }
grep -rl 'service_role' dist/ && { echo "LEAK: service_role string in dist/"; LEAK=1; }
# 3. The env var NAME (shouldn't be referenced client-side at all)
grep -rl 'SERVICE_ROLE_KEY' dist/ && { echo "LEAK: SERVICE_ROLE_KEY ref in dist/"; LEAK=1; }
[ "$LEAK" -eq 0 ] && echo "OK: no service-role secret in dist/"
exit $LEAK
```

**Most robust variant (recommended for the actual gate):** grep `dist/` for the literal first ~24 characters of the *real* service-role key value (read from the sibling-repo / Supabase dashboard, never committed). This is deterministic and has no false positives, because the exact secret value is unique. The planner can implement this as a script that reads the prefix from a CI secret (e.g. `$SERVICE_ROLE_KEY_PREFIX`) and greps for it — never hardcode the value in the repo.

**Where to run it (recommendation):**
- **Primary:** an npm script (`verify:no-secrets`) chained into the build, e.g. set Vercel's Build Command to `npm run build && npm run verify:no-secrets`. A non-zero exit fails the Vercel deploy → secret never ships.
- **Secondary (optional, fast feedback):** a local pre-push hook running the same script against a fresh local `dist/`.

**Current status:** Gate passes against today's `dist/` (verified: 0 hits for all four patterns above).

## Accessibility (CONTENT-04 / CONTENT-05) — concrete audit

**Verified current state (this session):**
- **`<label>` elements: ZERO** anywhere in `src/`. Both email inputs (`WaitlistForm.tsx:75`, `FirstLetter.tsx:502`) rely on `placeholder` only. CONTENT-04 = NOT met.
- **Focus rings:** `outline: none` is set on form inputs at `index.css:287` (waitlist email), `:852` (letter textarea), `:963` (fl email field). Only the waitlist email has a `:focus` replacement (`index.css:289-292`: black border + soft shadow). The textarea, the FirstLetter email input, all buttons, and all links have NO visible focus indicator → keyboard navigation is invisible. CONTENT-05 = PARTIAL.
- **`aria-live`:** present and correct on error slots (`WaitlistForm`, `FirstLetter`, `WaitlistSuccessCard`) and `Counter`. CONTENT-06 = met (D-09).

**Concrete fixes (within locked visual design):**
| Element | File:line | Fix |
|---------|-----------|-----|
| Waitlist email input | `WaitlistForm.tsx:75` | Add a visually-hidden `<label htmlFor="waitlist-email">Your email address</label>` + `id="waitlist-email"`, OR `aria-label="Email address"`. |
| FirstLetter email input | `FirstLetter.tsx:502` (has `id="fl-email-input"`) | Add `<label htmlFor="fl-email-input">…</label>` (visually-hidden) or `aria-label`. The visible "To" span (`fl-address-to-label`) could be wired via `aria-labelledby`. |
| Letter textarea | `FirstLetter.tsx:230` | Add `aria-label` (e.g. "Write your letter"). |
| All interactive elements | `index.css` | Add a `:focus-visible` ring (Pattern 4) so keyboard focus is visible without changing pointer-click appearance. Add a `.sr-only`/visually-hidden utility for the labels. |

**Note:** This is UI-touching CSS/markup. CLAUDE.md normally requires `frontend-design` + `/gsd-ui-phase` for UI work, but the user has explicitly opted to `--skip-ui` for Phase 5 (surface is tiny and locked; a11y semantics do not alter the visual design when using `:focus-visible` + visually-hidden labels).

## Share Functionality Gap (SOCIAL-02 / SOCIAL-03)

**Verified:** there is **no share or copy-link code anywhere in `src/`** (grep for share/twitter/clipboard/copy returned nothing). CLAUDE.md's architecture section describes a `ShareButtons.tsx`, but that file **does not exist** in the rebuilt UI — it predates the Phase 1.5 redesign. So SOCIAL-02 and SOCIAL-03 are **net-new UI**, not edits.

**Recommendation for the planner:**
- Build a small component (e.g. `ShareRow.tsx` or co-locate in `WaitlistSuccessCard` / sealed-letter success state) with: an X-share button (Pattern 2, D-04 copy) and a copy-link button (Pattern 3, copies `https://sealedapp.io`).
- Natural placement: the post-signup success state (`WaitlistSuccessCard`) and/or the FirstLetter sealed-success state — moments of peak user delight, consistent with the original design intent.
- Minimal copy (per user's "minimal voice" memory): tightest version first; confirm exact share text with Nour before locking.
- This is genuinely UI. Given `--skip-ui`, keep it visually minimal and consistent with existing button styles; flag to the user that two new buttons are being added.

## Deploy Sequence (DEPLOY-01/02/03/05) — recommended task order

1. **Pre-deploy code fixes merged first** (so the first Vercel build is correct): terms/privacy → dist fix (Pitfall 1), Footer social hrefs + email, share UI, a11y, leak-gate script.
2. **Push to existing remote** (DEPLOY-01): `git push origin main` to `SEALED-org/sealed-landing-page` (remote already configured — verified).
3. **Connect Vercel ↔ GitHub** (DEPLOY-02, D-06): import the repo in Vercel; framework auto-detects as **Vite**; defaults — Build Command `vite build` (or `npm run build && npm run verify:no-secrets`), Output Directory `dist`, Install `npm install`/`npm ci`. Enable auto-deploy on `main`.
4. **Set env vars** (DEPLOY-05): add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY` (Production scope; Preview optional). **No service-role key.** Trigger a (re)deploy so they're inlined.
5. **Add custom domain** (DEPLOY-03): add `sealedapp.io` (apex) + `www.sealedapp.io` in Vercel → Settings → Domains. At the registrar, add the apex **A** record + www **CNAME** (`<project>.vercel-dns-017.com`, per-project value Vercel shows). **Do NOT touch existing MX/SPF/DKIM/DMARC TXT records.** Vercel auto-provisions HTTPS.
6. **Verify (human checkpoint):** `https://sealedapp.io` loads over HTTPS; `/verify.html?token=...`, `/terms.html`, `/privacy.html` all 200; footer links work; counter fetches; a test signup succeeds; (Phase 6 re-runs mail-tester on the live send).

> **Steps 3–6 are dashboard/DNS actions** the agent cannot perform headlessly — plan them as `checkpoint:human-verify` tasks with explicit instructions and the exact values to enter.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Add SPA catch-all rewrite for any Vite app on Vercel | MPA static serving is the *recommended* production mode; rewrite is opt-in only for true SPAs | Vercel Vite docs (current, 2026-03-09) | This project (MPA) needs **no** vercel.json. D-07 verified correct. |
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | execCommand deprecated years ago | Use the async Clipboard API for SOCIAL-03. |
| `:focus { outline }` (shows ring on mouse click too) | `:focus-visible` (keyboard-only ring) | Broadly supported now | Keep locked design for pointer; show ring for keyboard (CONTENT-05). |
| Legacy `eyJ…` anon/service JWT keys | New `sb_publishable_` / `sb_secret_` keys rolling out | Supabase API-key migration (in progress 2025–2026) | Leak gate must cover BOTH formats; this project still uses a legacy `eyJ` anon key (verified). |

**Deprecated/outdated:**
- `ShareButtons.tsx` referenced in CLAUDE.md architecture: does not exist in the current codebase (pre-redesign artifact). Treat SOCIAL-02/03 as net-new.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Final X-share button copy text (the exact tweet wording referencing `@sealedapp_io` + `sealedapp.io`) | Share Functionality / Pattern 2 | Low — copy, easily adjusted; confirm with Nour (minimal voice). |
| A2 | `x.com/intent/tweet` is the preferred share URL (vs `/intent/post`) | Alternatives Considered / Pattern 2 | Low — both redirect correctly; verify the canonical URL at build time. |
| A3 | The www CNAME value is the `vercel-dns-017.com`-style per-project host (docs example) | Custom Domain / Deploy Sequence | Low — Vercel shows the exact value in the dashboard when adding the domain; use that, not the doc example. |
| A4 | Vercel auto-detects this repo as the Vite framework preset | Deploy Sequence | Low — standard Vite project layout; if not, set preset = Vite manually. |
| A5 | slopcheck unavailable means no new-package risk (because Phase 5 adds none) | Package Legitimacy Audit | None — no installs planned. |

## Open Questions

1. **D-07 conflict: terms.html / privacy.html are NOT in dist/ (launch blocker).**
   - What we know: Build verified — `dist/` contains only `index.html`, `verify.html`, `assets/`. The two legal pages are repo-root files, absent from `public/` and from `vite.config.ts` inputs. Footer links to them.
   - What's unclear: which fix the user prefers — move to `public/` (Option A, recommended) vs add as Vite inputs (Option B).
   - Recommendation: Option A (move both to `public/`). Add a post-build assertion that `dist/terms.html` + `dist/privacy.html` exist. The planner should NOT treat D-07's "outputs … to dist/" clause as already-satisfied.

2. **Where should the share/copy UI live, and is a new component acceptable under `--skip-ui`?**
   - What we know: SOCIAL-02/03 are unimplemented; this is net-new UI; `--skip-ui` is in effect.
   - Recommendation: place in the success states (post-signup card / sealed-letter success); keep minimal and consistent with existing button styles; surface the two new buttons to Nour for a quick visual OK.

3. **Twitter card attribution:** `index.html` has `twitter:card/title/description` but no `twitter:site`/`twitter:creator`.
   - Recommendation: optionally add `twitter:site = @sealedapp_io` for card attribution. Low priority; confirm with user.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build (`vite build`) | ✓ | v22.22.3 | — |
| npm | Install/build | ✓ | 10.9.8 | — |
| Vite | Build | ✓ | 6.4.2 (resolved) | — |
| git remote `origin` (SEALED-org) | DEPLOY-01 push | ✓ | `https://github.com/SEALED-org/sealed-landing-page.git` | — |
| `gh` CLI | optional (PR/auth convenience) | not checked | — | use `git push` directly |
| Vercel account/access to SEALED-org | DEPLOY-02/03/05 | n/a (external) | — | human must perform dashboard steps |
| Registrar DNS access for sealedapp.io | DEPLOY-03 | n/a (external) | — | human must add A/CNAME |
| slopcheck | (package audit) | ✗ | — | No new packages installed → not needed; audit is informational. |

**Missing dependencies with no fallback:** None that block the *code* work. The deploy/DNS steps require human dashboard access (planned as checkpoints, not agent-executable).

**Missing dependencies with fallback:** slopcheck (not needed — no installs); `gh` CLI (use plain `git push`).

## Security Domain

> `security_enforcement` not present in config.json (absent = enabled). Phase 5 is deploy/static; the security surface is secret-handling + transport, not application auth (handled in Edge Functions, sibling repo).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | OTP/auth lives in Supabase + sibling Edge Functions; out of Phase 5 scope. |
| V3 Session Management | no | No sessions in the landing page. |
| V4 Access Control | no | No protected resources served by the static site. |
| V5 Input Validation | partial | Email inputs use HTML5 `type=email required`; server validates in Edge Function. No new inputs in Phase 5 (share/copy take no user input). |
| V6 Cryptography | partial (transport) | TLS auto-provisioned by Vercel (HTTPS). No app-level crypto. |
| V14 Configuration | **yes** | Secret hygiene: `VITE_*` = public only; service-role key never in bundle (leak gate). HTTPS enforced. Env scoping. |

### Known Threat Patterns for static Vite + Vercel

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service-role key inlined into public bundle | Information Disclosure | Leak gate over `dist/` (sb_secret_ / service_role / SERVICE_ROLE_KEY / literal-prefix); only 3 public `VITE_*` vars set. |
| Secret pasted into a `VITE_*` var | Information Disclosure | Policy: only public values in `VITE_*`; secrets via `supabase secrets set` (done Phase 3). |
| Reverse-tabnabbing on `window.open`/external links | Tampering | `rel="noopener noreferrer"` on share `window.open` and external anchors. |
| DNS misconfig breaks email auth (SPF/DKIM/DMARC) | Spoofing (downstream email) | ADD only Vercel A/CNAME; never modify existing MX/TXT (Pitfall 4). |
| Clipboard write silently failing | (UX/integrity) | `try/catch`; never show "Copied" unless `writeText` resolved (honors D-08 spirit). |

## Sources

### Primary (HIGH confidence)
- `vite.config.ts`, `package.json`, `src/**`, `*.html`, `.env.local` (names only), `dist/` build output — direct codebase inspection this session.
- `git remote -v` — confirmed existing SEALED-org remote.
- `npm run build` — confirmed green build + exact `dist/` contents.
- vercel.com/docs/frameworks/frontend/vite (last_updated 2026-03-09) — Vite preset, MPA-recommended, SPA-rewrite is opt-in, env vars build-time inlined.
- vercel.com/docs/domains/working-with-domains/add-a-domain (last_updated 2026-02-27) — apex A record, www CNAME (`*.vercel-dns-017.com` style), nameserver caveat.

### Secondary (MEDIUM confidence)
- vercel.com/docs/domains (DNS records coexist; keep MX/SPF/DKIM/DMARC intact) — via WebSearch + official-doc cross-reference.
- supabase.com/docs/guides/api/api-keys — legacy `eyJ` JWT (role claim) vs new `sb_publishable_`/`sb_secret_` formats.
- developer.mozilla.org — Clipboard API `writeText`, CSS `:focus-visible`.

### Tertiary (LOW confidence — flagged for build-time confirmation)
- Exact X intent URL host (`x.com/intent/tweet` vs `/intent/post`) — verify when wiring SOCIAL-02.
- Exact www CNAME value — read from Vercel dashboard when adding the domain (do not use the doc example verbatim).

## Metadata

**Confidence breakdown:**
- Deployment mechanics (Vercel/Vite/DNS): HIGH — verified against current official docs + local build.
- Codebase facts (gaps, file contents, build output): HIGH — directly inspected and reproduced this session.
- Accessibility audit: HIGH — grep-confirmed absence of labels and presence of `outline:none`.
- Share UI gap: HIGH — confirmed no share/copy code exists.
- Share copy wording + exact X URL: LOW — assumptions, confirm at build time.

**Research date:** 2026-06-26
**Valid until:** ~2026-07-26 (Vercel/Supabase platform behavior is stable but the Supabase API-key migration is in progress — re-confirm key format if it changes before launch).
