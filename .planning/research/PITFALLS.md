# Domain Pitfalls

**Project:** SEALED Landing Page
**Domain:** React/Supabase waitlist landing page with deferred email delivery (Jan 1, 2027)
**Researched:** 2026-05-25
**Confidence baseline:** MEDIUM — All claims below are from training-data familiarity with these systems. Web search, WebFetch, and Context7 tooling were unavailable during this research session, so version-specific behavior and the most recent changelog details could not be verified. Phase-level research should re-validate against current docs before implementation.

---

## Critical Pitfalls

Mistakes that cause a missed delivery, data loss, mass spam complaints, or a rewrite of the writes layer.

### Pitfall 1: Scheduled letter delivery silently fails on January 1, 2027

**What goes wrong:** The once-a-year `pg_cron` (or scheduled Edge Function) job that fans out delivery emails to every verified letter writer fires, errors halfway through (Resend rate limit hit, Edge Function 150s wall-clock timeout exceeded, a single malformed letter row throwing an exception, an expired `SUPABASE_SERVICE_ROLE_KEY`, or a database connection saturation event), and there is no automatic retry. The remaining letters never go out, and nobody notices until users complain — which may never happen because users have forgotten they signed up.

**Why it happens:**
- `pg_cron` schedules SQL — it does not retry on failure of the underlying HTTP call to an Edge Function. If `net.http_post` returns a non-2xx, the job entry just records the failed response and moves on.
- Supabase Edge Functions have a hard wall-clock limit (around 150 seconds for the request lifecycle on the Free/Pro tier — verify current ceiling). A loop over 10K+ recipients in a single invocation will be killed mid-flight.
- Resend imposes per-second and daily send rate limits; bursting all letters at once hits 429s and silently drops messages if you do not back off.
- There is exactly one chance to get this right — January 1, 2027 happens once. Nobody is sitting at the dashboard at 00:00 UTC to notice failures.

**Consequences:** Partial delivery (some users get letters, most do not). Mass refunds of trust. The product's entire promise was "I'll deliver this letter on a specific date" — a missed delivery is a category-killing failure.

**Prevention:**
1. **Chunk the work.** Schedule the cron to run hourly (or every 15 min) starting Dec 31 23:00 UTC. Each run claims a batch of N undelivered letters using `SELECT ... FOR UPDATE SKIP LOCKED` and marks them `delivered_at = now()` after Resend returns 2xx. A failed batch is retried on the next tick.
2. **Status column with explicit states.** `pending | sending | delivered | failed | bounced` on the letters table. Never delete the row after sending — keep an audit trail.
3. **Idempotency key per letter.** Use the letter row UUID as the Resend `Idempotency-Key` header so a retry never double-sends.
4. **Dead-man's-switch monitoring.** A separate cron (e.g., Better Stack Heartbeats, Cronitor, or a simple "ping me hourly" check) that alerts you if the delivery job did not run. Configure phone alerts for late December through early January.
5. **Dry-run rehearsal.** In November/December 2026, run the entire delivery pipeline against a staging Supabase project with a small set of test letters and a sandbox Resend domain. Validate templates render, links work, no exceptions.
6. **Backup window.** Treat the date as Dec 31 → Jan 7. If the primary run fails, manually re-trigger from a known-good batch ID for the rest of that week.

**Detection (warning signs):**
- Cron history (`cron.job_run_details`) shows non-2xx responses
- Letters with `status='sending'` older than 10 minutes
- Resend dashboard shows fewer sent than expected count
- Heartbeat monitor goes silent

**Phase:** Schedule + Delivery phase (the phase that wires `pg_cron` and the Jan 1 job). Also revisit during a pre-launch hardening phase before the date itself.

---

### Pitfall 2: Letter bombing — anyone can write a letter to any victim email

**What goes wrong:** Without an email-verification gate, an attacker enters `victim@example.com` plus an abusive letter, and on Jan 1, 2027 the victim receives a "letter you wrote on 2026-05-25" containing harassment. SEALED's domain delivers harassment at scale.

**Why it happens:**
- The signup form is fully public, no login required
- The letter content is stored against whatever email the attacker typed
- Without verification, the system has no proof the writer owns the email

**Consequences:** Domain reputation destroyed (Gmail/Outlook flag `sealedapp.io` as a harassment vector → spam folder for all future legitimate mail). Possible legal exposure depending on jurisdiction. Brand reputation destroyed on a single viral abuse incident.

**Prevention:**
1. **Email verification gate** — already in PROJECT.md requirements. Enforce server-side: `letters` rows with `verified_at IS NULL` are skipped by the Jan 1 cron query (`WHERE verified_at IS NOT NULL`).
2. **Only one unverified letter per email at a time.** If a verification link is pending, do not allow another submission to override it.
3. **Verification token expiry** — 24-48 hours. After expiry, the row is purged or marked abandoned.
4. **Profanity / abuse heuristics on letter content** at submission time (basic filter against obviously abusive content). This is a defense-in-depth measure; the verification gate is the primary defense.
5. **Abuse report mechanism** in the verification email itself: "If you did not sign up, click here to ban this email permanently." Adds an attacker cost.

**Detection:**
- High ratio of unverified → verified signups (>80% unverified indicates abuse)
- Multiple submissions targeting the same email
- Letters from disposable email providers (mailinator, guerrillamail, etc.)

**Phase:** Edge Function writes phase (verification gate is foundational). Abuse-reporting features can be a later hardening phase.

---

### Pitfall 3: Service role key leaks into the client bundle

**What goes wrong:** A developer pastes `SUPABASE_SERVICE_ROLE_KEY` into `.env` using the `VITE_` prefix (so it shows up in `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY`), Vite inlines it into the production bundle, and now anyone viewing the deployed JS has full read/write on the entire Supabase project including the main app's database.

**Why it happens:**
- Vite only exposes env vars prefixed with `VITE_` to the client — this is well-documented, but easy to violate with a single typo
- The anon key (which IS safe to ship to the client) and the service role key look identical in structure (both JWTs)
- A copy-paste from a server-side `.env.example` carries the key into a client-side context

**Consequences:** Full data breach. The service role key bypasses Row Level Security entirely. Attacker can read every letter, every email address, delete the database, or worst — modify the Jan 1 delivery cron to send malicious payloads.

**Prevention:**
1. **Never define `VITE_SUPABASE_SERVICE_ROLE_KEY`.** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` may exist with `VITE_` prefix.
2. **Service role key lives only in Supabase Edge Function secrets** (`supabase secrets set ...`). It is never touched by the React app or by Vercel env vars.
3. **All writes go through an Edge Function** — already in PROJECT.md. The browser never holds a write-capable key.
4. **Pre-commit hook / CI check** that greps the built bundle for known key prefixes (`eyJhbGciOiJIUzI1NiI...service_role`).
5. **Rotate the service role key immediately** if any team member suspects it was ever logged, committed, or pasted into Slack.
6. **Enable RLS on every table** so even a leaked anon key only exposes what RLS policies allow.

**Detection:**
- `npm run build && grep -r "service_role" dist/` returns hits
- Sourcemap inspection of production bundle reveals JWT strings
- Sudden writes from unexpected origins in Supabase logs

**Phase:** Initial Supabase wiring phase (foundational). CI grep check should be added as soon as the Edge Function is introduced.

---

### Pitfall 4: Resend domain not verified → all emails land in spam (or never deliver)

**What goes wrong:** The team ships the landing page, the first 50 signups happen, the verification email goes out — and 80% of recipients never see it (Gmail dumps it in spam, Outlook silently quarantines, Yahoo bounces). The waitlist looks dead because nobody verifies, and the Jan 1 delivery to those unverified letter writers will never fire.

**Why it happens:**
- Resend (like all reputable ESPs) requires DNS verification of the sending domain before high-volume sending is trustworthy
- Even after Resend verification, recipient ISPs need to see correct SPF, DKIM, and DMARC records to trust the mail
- Sending from `sealedapp.io` without DMARC will be aggressively filtered by Gmail's 2024+ bulk-sender requirements
- `noreply@sealedapp.io` with no reply-to and no unsubscribe is itself a spam signal

**Consequences:** Quiet failure mode — emails APPEAR sent (Resend returns 200), but recipients never see them. The signup flow looks broken to users but does not actually error. By the time it is noticed (weeks later), reputation damage has already accumulated.

**Prevention:**
1. **Verify the sending domain in Resend before any emails are sent.** Add the SPF, DKIM (Resend provides specific CNAME/TXT records), and DMARC records to the DNS zone for `sealedapp.io`. Wait for "Verified" status in the Resend dashboard.
2. **Use a subdomain for transactional mail** (e.g., `mail.sealedapp.io` or `send.sealedapp.io`). Keeps marketing/cold mail reputation off the root domain, and limits blast radius if reputation tanks.
3. **DMARC policy:** start with `p=none` for monitoring, move to `p=quarantine` after observing reports, eventually `p=reject`.
4. **Include unsubscribe header** (`List-Unsubscribe: <mailto:unsubscribe@...>, <https://...>`) and an unsubscribe link in the email body. Required by Gmail/Yahoo for senders sending >5K/day, good practice always.
5. **Set a real `Reply-To`** — `support@sealedapp.io` or similar. Don't send from `noreply@`.
6. **Warm up gradually.** First few weeks, send small volumes. Avoid a 10K-letter blast on day one of the Jan 1 delivery (mitigated by the chunked cron in Pitfall 1).
7. **Pre-flight test:** send to test inboxes on Gmail, Outlook, Yahoo, iCloud, ProtonMail before launch. Run the email through [mail-tester.com](https://www.mail-tester.com) — aim for 9+/10.

**Detection:**
- Resend dashboard "delivered" rate <95%
- Verification click-through rate <40% suggests spam folder placement
- Bounces or "complained" events appearing
- Mail-tester score below 8/10

**Phase:** Email infrastructure phase (immediately before Edge Function email sending is wired). DNS work is on the critical path — do it first since DNS propagation takes hours.

---

## Moderate Pitfalls

### Pitfall 5: Cloudflare Turnstile + React StrictMode renders the widget twice

**What goes wrong:** In dev mode, React StrictMode intentionally double-invokes effects. The Turnstile widget script may attach two iframes to the same container, throwing a "Turnstile container is not empty" warning or producing two tokens (one of which is stale). The user submits, the form posts the wrong token, and validation fails server-side.

**Why it happens:**
- `window.turnstile.render(container, options)` is not idempotent — calling it twice on the same container is undefined behavior
- StrictMode's double-effect-firing is the primary trigger in development
- The official `@marsidev/react-turnstile` wrapper handles this cleanly; rolling your own with raw script tags often does not

**Consequences:** Annoying dev experience (mostly warnings), occasional broken submissions, hard-to-reproduce intermittent failures in prod where multiple submit attempts leave stale widgets behind.

**Prevention:**
1. **Use a maintained React wrapper** like `@marsidev/react-turnstile` (or `react-turnstile`) — they handle cleanup in `useEffect` return functions and dedupe `render` calls.
2. **Always call `turnstile.remove(widgetId)` in the effect cleanup function** if rolling your own.
3. **Test in both StrictMode-on and a production build** before shipping.
4. **Reset the widget after every form submission** (`turnstile.reset(widgetId)`) — Turnstile tokens are single-use and expire after ~5 minutes. A user who fails server-side validation and retries with the same token will be rejected.
5. **Handle token expiry callback** (`expired-callback`) to re-trigger the widget invisibly before the user submits.

**Phase:** Form wiring phase (when Turnstile is added to the React component).

---

### Pitfall 6: IP rate limiting is bypassed because the wrong header is read

**What goes wrong:** The Edge Function reads `request.headers.get('x-forwarded-for')`, gets a comma-separated list of IPs (`client, proxy1, proxy2`), and stores the entire string as the rate-limit key. An attacker spoofs the `X-Forwarded-For` header with a random IP per request and bypasses the 1-per-day-per-IP limit entirely. Or, the function reads `cf-connecting-ip` but the request did not actually pass through Cloudflare (direct Vercel hit) and the header is absent → rate limit collapses to a single global bucket.

**Why it happens:**
- `X-Forwarded-For` is a chain. The client's real IP is typically the FIRST entry, but in some deployments the LAST trusted entry. Mistakes here are common.
- `X-Forwarded-For` is trivially spoofable by the client before it reaches your proxy. The proxy is supposed to overwrite or append, but if the function reads the client-supplied value directly, it's worthless.
- IPv6 addresses can vary per-request even for the same physical client (privacy extensions), making per-IP limits ineffective.
- Mobile users behind carrier-grade NAT share IPs — a strict 1/day limit can lock out an entire mobile network.

**Consequences:** Either the rate limit does nothing (attacker bypasses) or it locks out legitimate users (false positives), depending on the bug.

**Prevention:**
1. **Use the platform-provided trusted header.** On Supabase Edge Functions, the request object exposes `req.headers.get('x-real-ip')` or the leftmost entry of `x-forwarded-for`. Document which one is authoritative for your hosting situation and verify with a curl test from a known IP.
2. **For IPv6, truncate to /64.** Treat the first 64 bits as the "client" for rate-limit purposes — that's the network prefix, individual addresses within /64 are the same household.
3. **Combine signals.** Rate-limit on `(ip_prefix, email)` rather than ip alone. Same email + same IP rapidly = abuse. Different emails from same /64 in 24h is normal household behavior.
4. **Bucket by Turnstile token validity, not just IP.** A valid Turnstile token already proves the request passed bot detection — make Turnstile the primary gate and IP rate limit the safety net.
5. **Store rate-limit state in Postgres** (`rate_limits` table with `ip_key`, `last_seen`, `count`, `window_start`) rather than in-memory — Edge Function instances are ephemeral, in-memory state is lost across cold starts.

**Detection:**
- Single IP showing in rate-limit table making 50 signups (limit not enforcing)
- Legitimate user reports inability to sign up from their phone after a friend signed up on the same WiFi (limit too aggressive)

**Phase:** Edge Function writes phase. Worth one explicit verification test (sign up twice from the same browser, expect rejection).

---

### Pitfall 7: Creating Supabase Auth users at signup creates duplicate-signup chaos

**What goes wrong:** User A signs up with `alice@example.com` on day 1, never verifies. On day 5 they return, retry with the same email. The Edge Function calls `supabase.auth.admin.createUser({ email })` again — Supabase returns "User already registered" 422. The Edge Function bubbles the error up as "Signup failed, please try again," and Alice is stuck. Worse: if the code "fixes" this by deleting the prior user and re-creating, any prior letter (if multiple-letter mode is added later) is orphaned.

**Why it happens:**
- Supabase Auth treats email as a unique identifier. `createUser` is not idempotent across calls.
- The same flow needs to handle: new email, existing-unverified email (resend verification), existing-verified email (already on waitlist), and possibly existing-app-user email (already has a real account in the mobile app's auth system).
- Magic links / OTP signup paths have their own subtle differences from `createUser` admin calls.

**Consequences:** Users with broken signup flow, support tickets, double letters, or accidentally deleted accounts.

**Prevention:**
1. **Define the four states explicitly** in the Edge Function:
   - **(a) New email** → `createUser`, store letter, send Template 1
   - **(b) Existing unverified** → resend Template 1 (re-trigger verification), update letter if a new one was submitted (or reject — your call)
   - **(c) Existing verified, no letter on file** → "You're already on the waitlist!" message, optionally accept a letter if not present
   - **(d) Existing verified with letter** → "Your letter is already sealed" — friendly idempotent response, no error
2. **Lookup before create.** Query `auth.users` (via service role) by email first; branch into one of the four flows above. Do not rely on `createUser`'s error.
3. **Treat the email as the natural key.** All your domain tables (`letters`, `signups`) reference `auth.users.id` via FK; no email duplication possible.
4. **Distinct messaging for each state** — never show the same "submitted!" message regardless of underlying state, because the user-perceived behavior differs (mailbox check vs no-op).
5. **Magic link / OTP for verification** — Supabase Auth's built-in email verification flow has a `verify` endpoint and configurable expiry. Set expiry to 24-48 hours (default is often shorter).

**Phase:** Edge Function signup logic phase. Worth a state-diagram in code comments.

---

### Pitfall 8: Magic link / verification link expires before user clicks it

**What goes wrong:** Supabase's default magic-link / verification token expiry is short (often 1 hour, sometimes 24h depending on auth settings). User signs up on a Friday evening, doesn't check email until Monday morning, clicks the link → "Token expired." They have no resend button. They give up.

**Why it happens:**
- Default Supabase auth token TTL is conservative for security
- Users do not check email immediately
- The verification page has no graceful "resend" flow if you don't build one

**Consequences:** Verified-signup conversion rate is lower than it should be; some letters are written but never sealed because the verification expired.

**Prevention:**
1. **Set verification email link TTL to 7 days** in Supabase Auth settings (or the longest you're comfortable with given Pitfall 2). Per-template TTL is configurable.
2. **Build a "Resend verification email" page.** Either a dedicated route or part of the verification-failure page. User enters their email, gets a fresh token if the prior was expired.
3. **Frontend reminder.** After the user submits, the post-submit UI says "Check your inbox — link expires in 7 days." Sets expectation.
4. **Re-verification flow at delivery time.** A safety net: if a letter is `pending` (unverified) but the user has been silent, one final reminder 30 days before Jan 1, 2027, "Last chance to seal your letter."

**Phase:** Email infrastructure phase + signup phase.

---

### Pitfall 9: Cold starts on the Edge Function feel slow → users double-submit

**What goes wrong:** Supabase Edge Functions can have cold starts of 500ms-2s depending on size and runtime warmth. User submits, sees the spinner, waits, gets impatient, clicks again. The second submit either creates a duplicate or hits the rate limit and shows an error.

**Why it happens:**
- Edge Functions run on Deno Deploy infrastructure; cold starts are inherent to serverless
- No request deduplication at the function level by default
- The React form doesn't disable the submit button during the in-flight request

**Consequences:** Duplicate work, occasional duplicate signups (if the dedup logic is weak), bad UX.

**Prevention:**
1. **Disable the submit button** while `isSubmitting === true`. Already a `useState` pattern present in `App.tsx` — make sure it actually disables the button visually and via `disabled` attribute.
2. **Idempotency key on the request.** Generate a UUID in the form's `useState` on mount, send as `Idempotency-Key` header. The Edge Function stores the key in a short-lived table and returns the cached response on re-submission.
3. **Optimistic UI.** Show "Sealing your letter..." immediately, complete the network call in the background. If it fails, show error state.
4. **Keep the Edge Function small.** Fewer imports = faster cold start. Avoid heavy SDKs; use `fetch` directly for Resend rather than the official SDK if startup time matters.

**Phase:** Edge Function + form wiring phase.

---

### Pitfall 10: Tailwind v4 + Vite 6 + React 19 — known rough edges

**What goes wrong:** These are all recent major versions (Tailwind v4 GA was relatively recent; React 19 introduced new APIs and breaking deprecations; Vite 6 changed module resolution). Specific friction points to verify:
- **Tailwind v4** dropped the `tailwind.config.js` pattern in favor of `@theme` in CSS, but some third-party plugin ecosystems hadn't fully caught up at the time of v4 GA. Verify any UI lib (e.g., shadcn/ui style libs) you adopt is v4-compatible.
- **React 19** removed `propTypes` / `defaultProps` for function components, changed `useRef` to require an argument, and made hydration mismatch errors stricter. Older third-party component libs may emit warnings.
- **Vite 6** changed default ports, dropped some Node 16 support, and tightened TypeScript transpile behavior.
- **No `tsconfig.json` in this repo** (per STACK.md) — TypeScript is checked through Vite only. Missing configuration means `strict: false` by default, which weakens type safety on the Edge Function client code as well.

**Confidence:** LOW — version-specific bug status changes rapidly; verify against current `package.json` and current changelogs at implementation time.

**Consequences:** Hard-to-diagnose build errors, type-check gaps, third-party UI lib incompatibility.

**Prevention:**
1. **Add a `tsconfig.json` with `strict: true`** as part of the Supabase migration. The Edge Function code in particular needs strong typing for the request/response shapes.
2. **Pin versions in `package.json`** (remove the `^` to lock to exact known-good versions). Already noted in STACK.md that there is no lockfile — fix that immediately: `npm install` generates `package-lock.json`, commit it.
3. **Verify any new UI lib explicitly.** For Tailwind v4 specifically, check the lib's docs for v4 support before adopting.
4. **Test the production build, not just dev.** `npm run build && npm run preview` regularly — Vite's dev mode is more forgiving than production.

**Phase:** Initial setup / Supabase migration phase. Lock versions and add tsconfig before any other code changes.

---

### Pitfall 11: Firebase removal leaves orphaned config, hooks, and imports

**What goes wrong:** Per ARCHITECTURE.md, the current build is broken because `src/firebase.ts` is missing but is still imported in `src/App.tsx:7`. A naive "remove Firebase" pass deletes the import line but leaves: env var references (`VITE_FIREBASE_*` documented somewhere), the `subscribeToWaitlistCount` real-time pattern (which has no direct Supabase Realtime equivalent without re-architecting), the `joinWaitlist(email)` call site contract, and possibly Firebase entries in `package.json` if it was ever installed and the install was reverted.

**Why it happens:**
- Mixed-version refactors leave dead references
- The realtime subscription pattern (`subscribeToWaitlistCount(setWaitlistCount)`) doesn't map 1:1 to Supabase — Supabase Realtime exists but requires explicit table + RLS setup
- Documentation files (README, .env.example) often retain Firebase mentions

**Consequences:** Lingering security exposures if any Firebase config remains, dead code paths, confusion for future maintainers.

**Prevention:**
1. **Grep the entire repo for "firebase" (case-insensitive)** before declaring migration complete: `grep -rni firebase . --exclude-dir node_modules --exclude-dir dist`. Address every hit (delete, document, or replace).
2. **Replace the realtime count subscription explicitly.** Options: (a) Supabase Realtime channel subscribed to `INSERT` on `signups` table — polls Postgres replication slot, requires Realtime enabled per table; (b) periodic `fetch` every 30s with `count: exact` (simpler, slightly stale, fine for social proof); (c) static "115+" with the seed value, no live count at all.
3. **Remove Firebase from `package.json`** explicitly (`npm uninstall firebase`) and verify with `npm ls firebase` returning empty.
4. **Delete or update `.env.example`** to reflect Supabase-only env vars.
5. **Smoke test from a clean checkout:** `git clean -fdx && npm install && npm run build`. Build must succeed.

**Phase:** Migration phase (the first code-changing phase). Should be done in a single PR to avoid a half-migrated state on `main`.

---

## Minor Pitfalls

### Pitfall 12: Counter increments before verification creates inflation

**What goes wrong:** If the social-proof counter increments at submission (not at verification), the displayed count includes unverified abuse signups, spam attempts, and abandoned signups. Counter says "5,000" but only 1,200 are real.

**Prevention:** Counter query is `SELECT 115 + COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL`. Increments only on verification.

**Phase:** Counter logic phase.

---

### Pitfall 13: Letter content unbounded → DB bloat or attack vector

**What goes wrong:** No max length on letter textarea → user pastes a 10MB string → row insert balloons → eventually fills the Supabase free-tier DB.

**Prevention:** Enforce client-side `maxLength={5000}` AND server-side `CHECK (length(content) <= 5000)` column constraint. Reject server-side with clear error.

**Phase:** Schema design phase.

---

### Pitfall 14: Timezone confusion on "January 1st, 2027"

**What goes wrong:** Cron fires at midnight UTC → user in California gets the letter at 4 PM Dec 31. User in Tokyo gets it at 9 AM Jan 1. "Delivered on Jan 1" is technically true for some, false for others.

**Prevention:** Pick a clear policy upfront. Either (a) fire at 00:00 UTC and update marketing copy to "First moments of Jan 1, 2027 UTC," or (b) store user's timezone at signup (or geolocate from IP) and bucket deliveries by local midnight. Option (a) is dramatically simpler. Document the choice in PROJECT.md.

**Phase:** Schedule design phase.

---

### Pitfall 15: Vercel function logs are short-retention by default

**What goes wrong:** Something goes wrong on Jan 1, 2027 — you check logs the next morning, but Vercel/Supabase only retains 1-3 days of function logs on the free tier, so the evidence is gone.

**Prevention:** Pipe critical Edge Function logs to an external sink (Logflare, BetterStack, or just a `cron_log` table in Postgres). At minimum, every batch run of the delivery cron writes a summary row: `{run_id, started_at, completed_at, sent_count, failed_count, errors}`. Postgres rows never expire on you.

**Phase:** Schedule + Delivery phase.

---

### Pitfall 16: No error boundaries → a single component crash blanks the whole page

**What goes wrong:** Per ARCHITECTURE.md, "No error boundaries are present anywhere in the tree." A bug in `Typewriter`, `FAQ`, or `FirstLetter` crashes React → user sees a white screen → bounces.

**Prevention:** Add a top-level `<ErrorBoundary>` in `App.tsx` (or via `react-error-boundary` package) that catches crashes and renders a fallback "Something went wrong, please refresh" with the email form still functional. Report errors to a logging endpoint.

**Phase:** Hardening / polish phase, before launch.

---

### Pitfall 17: Anti-pattern `showSticky` state still bleeds in after migration

**What goes wrong:** Per ARCHITECTURE.md, `showSticky` is computed but unused. If the Firebase removal pass is sloppy, this stays. Wastes re-renders on every scroll, technical debt accumulates.

**Prevention:** Either wire it up (render the sticky CTA conditionally) or delete the state + effect entirely. Decide before merging the migration PR.

**Phase:** Migration phase (clean up while touching `App.tsx`).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Migration (Firebase → Supabase) | Pitfalls 3, 10, 11, 17 | Lock versions, grep for "firebase," add tsconfig, clean dead state |
| Edge Function writes | Pitfalls 2, 3, 6, 7, 9 | Verification gate, no service role in client, idempotency keys, state-machine for signup flows |
| Email infrastructure | Pitfalls 4, 8 | DNS verification first; long verification TTL; resend flow |
| Form wiring (Turnstile) | Pitfall 5 | Use `@marsidev/react-turnstile`; reset token after submit |
| Schedule + Delivery (Jan 1, 2027) | Pitfalls 1, 14, 15 | Chunked cron, dead-man's switch, dry-run rehearsal, log-to-Postgres |
| Counter | Pitfall 12 | Count only verified users |
| Schema design | Pitfall 13 | Length constraints in DB |
| Hardening / pre-launch | Pitfall 16 + a final review of all above | Error boundaries; full migration grep; staging rehearsal |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Supabase Edge Function limits | MEDIUM | Familiar with the platform's wall-clock and cold-start behavior, but specific current limits should be re-verified against Supabase docs at implementation time |
| pg_cron + scheduled delivery patterns | MEDIUM | Standard pattern; the "chunked claim with SKIP LOCKED" recipe is well-established. The "run does not retry on 5xx" behavior of `cron.schedule + net.http_post` is the specific gotcha to re-verify |
| Cloudflare Turnstile + React | MEDIUM | `@marsidev/react-turnstile` is the de-facto wrapper; StrictMode double-mount is a known class of issue but specific symptoms vary by version |
| Resend deliverability | HIGH | DNS verification + DMARC + warm-up is universal ESP best practice, not Resend-specific |
| Supabase Auth duplicate-email flows | MEDIUM | The four-state model is a derived best practice, not directly cited from docs |
| IP rate limiting headers | MEDIUM | Header semantics vary per host; verify which header Supabase Edge Functions populate as trusted at implementation time |
| React 19 + Vite 6 + Tailwind v4 specifics | LOW | Version-specific issues evolve fast; web search was unavailable to verify current state. Treat as "expect surprises, verify against changelogs" |
| Firebase removal | HIGH | Grep-based migration cleanup is standard practice; mechanically verifiable |
| Letter bombing / verification gate | HIGH | Verification-before-send is the standard defense; the threat model is well-understood |
| Service role key leak | HIGH | The `VITE_` prefix rule and "service role never on client" are core Supabase guidance |

---

## Sources

**Note:** Web search, WebFetch, and Context7 CLI were unavailable during this research session — all of the following are training-data references that should be re-verified at implementation time by the engineer responsible for each phase.

- Supabase docs — Edge Functions limits and scheduled functions (verify at `supabase.com/docs/guides/functions/limits` and `.../schedule-functions`)
- Supabase docs — Auth admin API and email verification (`supabase.com/docs/guides/auth`)
- Cloudflare Turnstile docs (`developers.cloudflare.com/turnstile/`)
- `@marsidev/react-turnstile` GitHub repo for the React integration pattern
- Resend docs — domain verification and DKIM/SPF (`resend.com/docs/dashboard/domains/`)
- Gmail bulk sender requirements (Google 2024 announcement on DMARC requirements)
- PostgreSQL `pg_cron` extension docs (current best practices on retry semantics)
- React 19 release notes and Vite 6 changelog (for version-specific behavior)
- Tailwind v4 migration guide

**Reliable patterns referenced without external verification:**
- `SELECT ... FOR UPDATE SKIP LOCKED` queue pattern (Postgres standard)
- Idempotency-Key header convention (Stripe-popularized, widely adopted)
- Dead-man's-switch monitoring (cron monitoring services like Cronitor, BetterStack Heartbeats)
- DMARC progressive rollout (`p=none` → `p=quarantine` → `p=reject`)
