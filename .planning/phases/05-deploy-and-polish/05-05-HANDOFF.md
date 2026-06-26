# Phase 5 Plan 05: Deploy Handoff — sealedapp.io on Vercel

**Audience:** Nour — you perform all of these steps in external dashboards (GitHub, Vercel, your DNS registrar).
**Triggered after:** Plans 05-01 through 05-04 are committed and merged to `main` on SEALED-org/sealed-landing-page.
**Status of code:** All Phase 5 fixes are committed. The agent could not push to `main` (requires your GitHub credentials). Start with Step 0 below.

---

## What was shipped in code (Plans 01-04)

Before the deploy sequence, the following is already committed and ready to push:

| Plan | What was fixed |
|------|---------------|
| 05-01 | `terms.html` + `privacy.html` moved to `public/` (will now reach `dist/`); all contact emails → `info@sealedapp.io`; Instagram/X social links wired to real handles; `twitter:site=@sealedapp_io` meta added |
| 05-02 | `ShareRow.tsx` built — X share button (`@sealedapp_io` + `sealedapp.io` prefilled) + copy-link button with clipboard confirmation; mounted in both success states |
| 05-03 | Accessibility: visually-hidden `<label>` on all inputs, `.sr-only` utility, `:focus-visible` rings on all interactive elements |
| 05-04 | `scripts/check-bundle.mjs` — service-role-key leak gate; `npm run build:check` chains Vite build + leak gate |

---

## Step 0 — Push the code to GitHub (DEPLOY-01)

You must push `main` to the existing SEALED-org remote. The code is ready; the agent could not push because it requires your GitHub credentials.

```bash
# Run this in the landing-page repo on your machine:
cd "/Users/nourismaiel/Downloads/SEALED Landing Page Claude Design"
git push origin main
```

Expected output: `branch 'main' set up to track 'origin/main'` (or `Everything up-to-date` if already synced).

If you get a credential error: authenticate via `gh auth login` or the Keychain, then retry.

**DO NOT proceed to Step 1 until the push succeeds.**

---

## Step 1 — Connect Vercel to GitHub (DEPLOY-02)

> Dashboard: https://vercel.com/new (or Vercel Dashboard → Add New → Project)

1. Click **Import Git Repository**.
2. Find and select **SEALED-org / sealed-landing-page**.
3. On the project settings screen, confirm/set:

   | Setting | Value |
   |---------|-------|
   | Framework Preset | **Vite** (Vercel should auto-detect — verify it says Vite, not Other) |
   | Build Command | `npm run build:check` |
   | Output Directory | `dist` |
   | Install Command | `npm install` (default; leave as-is) |
   | Root Directory | `.` (repo root; default) |

   > **Why `npm run build:check`?** This chains `vite build && node scripts/check-bundle.mjs`. The second script scans `dist/` for any service-role key patterns and exits 1 (failing the deploy) if found. This closes the STATE.md "service role key bundle leak" blocker at the build step.

4. Under **Git**, confirm auto-deploy is enabled on the `main` branch (it is on by default).
5. **DO NOT click Deploy yet** — you must set env vars first (Step 2).

---

## Step 2 — Set environment variables in Vercel BEFORE the first build (DEPLOY-05)

> Dashboard: Vercel Project → Settings → Environment Variables

**CRITICAL — set these BEFORE triggering any build.** `VITE_*` variables are inlined at build time. A build without them will produce a blank/erroring page (Pitfall 3).

Add all three with **Production** scope (Preview scope is optional but recommended for testing):

| Variable name | Where to find the value | Scope |
|---------------|------------------------|-------|
| `VITE_SUPABASE_URL` | Your `.env.local` file — the `VITE_SUPABASE_URL=` line | Production |
| `VITE_SUPABASE_ANON_KEY` | Your `.env.local` file — the `VITE_SUPABASE_ANON_KEY=` line | Production |
| `VITE_TURNSTILE_SITE_KEY` | Your `.env.local` file — the `VITE_TURNSTILE_SITE_KEY=` line | Production |

> **WARNING — DO NOT add `VITE_SUPABASE_SERVICE_ROLE_KEY` or any `sb_secret_*` value.** `VITE_*` vars are inlined into the public JS bundle and readable by anyone. The service-role key must NEVER appear here. Secrets (service-role key, Resend API key, Turnstile secret) stay in `supabase secrets set` only (already done in Phase 3).

Once all three are saved, go back to the project and click **Deploy** (or trigger a redeploy from the Deployments tab).

Wait for the first build to complete. It must succeed (green checkmark). If the build fails:
- **Blank page / "Missing VITE_SUPABASE_URL"**: the env var wasn't picked up — force a redeploy.
- **Leak gate exits 1**: something unexpected in `dist/` — open the build log and look for `LEAK:` lines.
- **Other build error**: check build log for npm/TypeScript errors.

---

## Step 3 — Add custom domain sealedapp.io (DEPLOY-03)

> Dashboard: Vercel Project → Settings → Domains

1. Click **Add Domain** and enter: `sealedapp.io`
2. Click **Add Domain** again and enter: `www.sealedapp.io`
3. Vercel will show you the exact DNS records to add. **Copy the exact values Vercel displays** — do NOT use documentation examples verbatim (the per-project CNAME suffix varies). You will typically see something like:

   | Type | Name | Value |
   |------|------|-------|
   | A | `@` | _(Vercel's apex IP — use the value Vercel shows)_ |
   | CNAME | `www` | _(e.g. `cname.vercel-dns.com` or similar — use the exact value Vercel shows)_ |

4. Go to your DNS registrar (wherever sealedapp.io is registered) and **ADD** those records.

> **WARNING — DO NOT TOUCH EXISTING DNS RECORDS.**
> The following records are live and authenticating Resend email delivery for sealedapp.io. Removing or overwriting them will break email authentication (SPF/DKIM failures → spam):
>
> - **MX records** (Resend mail routing)
> - **TXT records** starting with `v=spf1` (SPF)
> - **TXT records** on `resend._domainkey` or similar (DKIM)
> - **TXT records** starting with `v=DMARC1` (DMARC)
>
> You are ONLY adding new records (A and CNAME). These coexist with MX/TXT records — they are independent record types and do not conflict.

5. Vercel automatically provisions and renews the HTTPS certificate once DNS propagates (usually within minutes to an hour).

---

## Step 4 — Verify the live production site

Once the first successful build is deployed and DNS has propagated, run through this checklist:

### Build (Vercel dashboard)
- [ ] Vercel build log shows `OK: no service-role secret in dist/` (leak gate passed)
- [ ] Build exit 0 (green checkmark in Deployments)

### Page load
- [ ] `https://sealedapp.io` loads over HTTPS (padlock shown in browser)
- [ ] Page is NOT blank; the hero, counter, and form are visible
- [ ] Counter shows a real number (not `00000`) — confirms env vars were inlined correctly

### Routes (all must return 200, not 404)
- [ ] `https://sealedapp.io/verify.html` — returns 200 (email verification landing page)
- [ ] `https://sealedapp.io/terms.html` — returns 200 (Terms of Service)
- [ ] `https://sealedapp.io/privacy.html` — returns 200 (Privacy Policy)

> These are the D-14 launch-blocker checks. If any return 404, `public/terms.html` or `public/privacy.html` didn't reach `dist/` — check whether the Plan 05-01 commits are in the pushed tree.

### Footer and share
- [ ] Footer Instagram link opens `https://www.instagram.com/sealed.io`
- [ ] Footer X link opens `https://x.com/sealedapp_io`
- [ ] Footer Privacy / Terms links open `/privacy.html` and `/terms.html` (no 404)
- [ ] Footer contact email reads `info@sealedapp.io`
- [ ] After joining the waitlist: "Share on X" button opens X compose with `@sealedapp_io` and `sealedapp.io` pre-filled
- [ ] After joining the waitlist: "Copy link" button shows "Copied!" confirmation and puts `https://sealedapp.io` on clipboard

### Keyboard accessibility
- [ ] Tab through the page — focus rings are visible on the email input, buttons, links, letter textarea, and FAQ items

### DNS integrity (Resend email auth must remain intact)
- [ ] At your registrar: confirm the existing MX / SPF / DKIM / DMARC TXT records for sealedapp.io are STILL present
- [ ] Optional spot-check: `dig sealedapp.io MX` and `dig sealedapp.io TXT` still show Resend records

---

## Resume signal

Once all items above are confirmed, return to the Claude Code session and type:

**`approved`**

Or if something failed, describe the symptom:
- `blank page` — env vars not inlined (Step 2 issue)
- `404 on /terms.html or /privacy.html` — `public/` files didn't reach `dist/` (check that Plan 05-01 commits are in the pushed tree)
- `auth failure on push` — Step 0 needs your GitHub credentials
- `build failed` — paste the Vercel build log error

---

## Summary of values to enter

| Where | Field | Value |
|-------|-------|-------|
| Vercel → Build Settings | Framework Preset | Vite |
| Vercel → Build Settings | Build Command | `npm run build:check` |
| Vercel → Build Settings | Output Directory | `dist` |
| Vercel → Env Vars | `VITE_SUPABASE_URL` | From `.env.local` |
| Vercel → Env Vars | `VITE_SUPABASE_ANON_KEY` | From `.env.local` (public anon key ONLY) |
| Vercel → Env Vars | `VITE_TURNSTILE_SITE_KEY` | From `.env.local` |
| Vercel → Domains | apex | `sealedapp.io` |
| Vercel → Domains | www | `www.sealedapp.io` |
| DNS Registrar | A record (apex `@`) | _(exact IP Vercel shows — do not use doc examples)_ |
| DNS Registrar | CNAME (`www`) | _(exact CNAME Vercel shows — do not use doc examples)_ |

---

*Phase: 05-deploy-and-polish*
*Created: 2026-06-26*
