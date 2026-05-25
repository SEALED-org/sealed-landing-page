# Codebase Concerns

**Analysis Date:** 2026-05-25

## Tech Debt

**Missing Firebase module:**
- Issue: `src/App.tsx` imports `subscribeToWaitlistCount` and `joinWaitlist` from `./firebase`, but no `src/firebase.ts` or `src/firebase.js` file exists in the repository. The project will not build or run without this file.
- Files: `src/App.tsx` (line 7)
- Impact: Fatal build error. All waitlist sign-up functionality and live count subscriptions are broken.
- Fix approach: Create `src/firebase.ts` with Firebase SDK initialisation, Firestore collection reference, and exported `subscribeToWaitlistCount` / `joinWaitlist` functions. Add Firebase config to environment variables.

**Dead state: `showSticky`:**
- Issue: `showSticky` state is declared and set via a scroll listener in `src/App.tsx` (line 12–21), but is never read or used anywhere in the JSX. The sticky CTA UI it was intended for was never implemented or was removed.
- Files: `src/App.tsx` (lines 12, 17)
- Impact: Wasted scroll event listener running on every scroll event for the lifetime of the page; the associated sticky banner feature is silently missing.
- Fix approach: Either implement the sticky navigation CTA (likely a sticky "Join Waitlist" pill that appears below y=1200) or remove the `showSticky` state and the entire `handleScroll` `useEffect`.

**No dependency lockfile:**
- Issue: Neither `package-lock.json`, `yarn.lock`, nor `pnpm-lock.yaml` is present. Only `package.json` with caret ranges exists.
- Files: `package.json`
- Impact: `npm install` on a different machine or CI can resolve different patch/minor versions than what was tested, causing hard-to-diagnose build failures or runtime differences.
- Fix approach: Commit a lockfile. Run `npm install` locally to generate `package-lock.json`, then commit it.

**Legal pages reference non-existent `Landing.html`:**
- Issue: `privacy.html` and `terms.html` link back to `Landing.html` for navigation ("Back to home", "Join the waitlist", "Write a letter"). No `Landing.html` exists in the repo. The React app is served from `index.html`.
- Files: `privacy.html` (lines 241, 242, 428, 429), `terms.html` (lines 234, 235, 484, 485)
- Impact: All "Back to home" and footer links on legal pages are broken 404s. Visitors who navigate to legal pages cannot return to the landing page.
- Fix approach: Replace all `Landing.html` hrefs with `/` (or `index.html`). The React SPA entry is `index.html`.

**Waitlist count display bug — position vs. size:**
- Issue: After a successful subscription, the UI shows "You're #{waitlistCount} on the list". `waitlistCount` is the live Firestore total, not the user's sequential position. A user who joins when there are 500 people is shown "#500" — which is actually the total count, not their personal position.
- Files: `src/App.tsx` (lines 126–127), `src/components/FirstLetter.tsx` (line 71), `src/components/ShareButtons.tsx` (line 10)
- Impact: The copy is misleading; the position displayed grows as new people join after the user and bears no relation to the user's place in queue.
- Fix approach: Either return the user's actual insertion position from `joinWaitlist` (e.g. return the document ID's timestamp rank), or change the copy to "Join {waitlistCount} others" rather than implying a personal position number.

## Known Bugs

**Error after failed `joinWaitlist` leaves UI in incorrect state (`FirstLetter`):**
- Symptoms: In `FirstLetter.tsx`, when `handleEmailSubmit` is called, it calls `onEmailSubmit(email)` (which calls `joinWaitlist`) and then immediately calls `startSealing()` regardless of whether `joinWaitlist` throws. `startSealing` sets `status = 'sealing'` then `'sealed'` after 2.5 s. If the Firebase write fails, the user sees "Your letter is sealed" even though it was not.
- Files: `src/components/FirstLetter.tsx` (lines 29–34)
- Trigger: Any Firebase error (network offline, quota exceeded, invalid config).
- Workaround: None visible to the user; they believe their letter was saved when it was not.

**Error after failed subscription in `App.tsx` shows no feedback to user:**
- Symptoms: If `joinWaitlist(email)` throws in `handleSubscribe`, the error is caught but only logged to the console (`console.error`). No error message is shown to the user; the form just stops spinning and reverts to the idle state with no explanation.
- Files: `src/App.tsx` (lines 37–38)
- Trigger: Firebase unreachable, invalid email not caught by browser validation, Firestore write rejected.
- Workaround: None. The user must retry without knowing why the first attempt failed.

**Instagram share button does nothing:**
- Symptoms: The Instagram share button in `ShareButtons.tsx` (line 32–37) has no `onClick` handler. Clicking it is a no-op.
- Files: `src/components/ShareButtons.tsx` (lines 32–37)
- Trigger: User clicks the Instagram share button after joining.
- Workaround: None.

**`copyLink` provides no confirmation feedback:**
- Symptoms: Clicking the "Copy Link" button in `ShareButtons.tsx` silently copies the URL via `navigator.clipboard`. There is no toast, button state change, or any visual confirmation that the copy succeeded or failed. A comment in the source even notes: `// Could add a toast here if needed`.
- Files: `src/components/ShareButtons.tsx` (lines 17–20)
- Trigger: Any click of the copy button.
- Workaround: None visible to user.

**`navigator.clipboard` is not available in all contexts:**
- Symptoms: `navigator.clipboard.writeText` is only available in secure contexts (HTTPS) and may not be present in all browsers. No fallback exists. If called on HTTP or in an unsupported browser, it will throw an unhandled exception.
- Files: `src/components/ShareButtons.tsx` (line 18)
- Trigger: User on HTTP or older browser clicks copy.
- Workaround: None. The call is unguarded.

## Security Considerations

**Firebase configuration not visible — risk depends on implementation:**
- Risk: Firebase client-side API keys, if exposed in the bundle, are publicly visible. Firebase security rules must restrict what unauthenticated users can read/write. If `joinWaitlist` writes directly to a Firestore collection with open write rules, anyone can flood the collection with arbitrary emails or spam.
- Files: `src/firebase.ts` (missing — to be created)
- Current mitigation: File does not yet exist; no assessment possible.
- Recommendations: (1) Enforce Firestore security rules that allow only document creation on the waitlist collection (no reads, no deletes, no updates from unauthenticated users). (2) Add server-side rate limiting or use a Cloud Function intermediary. (3) Never commit Firebase config with `VITE_` prefix env vars to a public repo.

**No email validation beyond browser `type="email"`:**
- Risk: Browser `type="email"` validation is easily bypassed programmatically. Disposable or invalid email formats may pollute the waitlist.
- Files: `src/App.tsx` (line 81), `src/components/FirstLetter.tsx` (line 100)
- Current mitigation: Browser native `required` + `type="email"`.
- Recommendations: Add server-side (Firebase Function) email format validation before persisting to Firestore.

**External image loaded from third-party CDN (`postimg.cc`):**
- Risk: The paper texture image is loaded from `https://i.postimg.cc/yWZ0XSgh/lightpaper.jpg` (a public image hosting service). This image could be removed, replaced, or the CDN could block the request, silently breaking the letter-writing UI background. The third party also receives the user's IP and browser info.
- Files: `src/components/FirstLetter.tsx` (line 139)
- Current mitigation: `referrerPolicy="no-referrer"` is set, limiting referrer leakage.
- Recommendations: Download the image, commit it to `/public/`, and serve it locally. This eliminates the third-party dependency entirely.

**Social links use placeholder `href="#"`:**
- Risk: Footer Instagram and Twitter social links in `src/App.tsx` point to `href="#"` with no real URL. This is a functional gap but not a security risk, though it signals the product is not launch-ready.
- Files: `src/App.tsx` (lines 216, 220)
- Current mitigation: None.
- Recommendations: Replace with real social profile URLs before public launch.

## Performance Bottlenecks

**Typewriter renders on every keystroke interval:**
- Problem: `Typewriter.tsx` uses a chain of `setTimeout` calls inside a `useEffect` that depends on `currentText`, `isWaiting`, `currentPhraseIndex`, and `phrases`. Each character typed triggers a re-render and schedules a new timer. The `isWaiting` wait is set to only 20 ms (essentially a zero delay), causing an immediate phrase transition rather than a visible erase animation.
- Files: `src/components/Typewriter.tsx` (lines 30–53)
- Cause: `isWaiting` timeout of 20 ms is too short to be perceptible; the phrase effectively snaps to blank. This is likely a bug masquerading as a performance issue.
- Improvement path: Increase the `isWaiting` timeout to 400–600 ms and optionally add a deletion animation (decrement `currentText.length` character by character) before cycling to the next phrase.

**Google Fonts loaded via CSS `@import`:**
- Problem: `src/index.css` uses `@import url('https://fonts.googleapis.com/...')` to load three font families at the top of the stylesheet. CSS `@import` blocks rendering; fonts loaded this way add to the critical path.
- Files: `src/index.css` (line 1)
- Cause: `@import` in CSS is synchronous and not preloaded.
- Improvement path: Move font loading to `<link rel="preconnect">` and `<link rel="stylesheet">` tags in `index.html`, which the browser can fetch in parallel with parsing.

**No OG/social image defined:**
- Problem: `index.html` defines Open Graph and Twitter card meta tags but includes no `og:image` or `twitter:image`. When the URL is shared on social platforms, no preview image will appear — only text.
- Files: `index.html` (lines 7–14)
- Cause: Image was never added.
- Improvement path: Create a 1200×630 OG image, commit it to `/public/`, and add `<meta property="og:image" content="/og-image.jpg" />` to `index.html`.

**No favicon:**
- Problem: `index.html` has no `<link rel="icon">` tag. Browsers will make a 404 request to `/favicon.ico` on every page load.
- Files: `index.html`
- Cause: Favicon was never added.
- Improvement path: Create a favicon (SVG or ICO), commit to `/public/`, add `<link rel="icon" href="/favicon.svg" />` to `index.html`.

## Fragile Areas

**`FirstLetter` sealing flow ignores async result:**
- Files: `src/components/FirstLetter.tsx` (lines 29–34, 36–40)
- Why fragile: `handleEmailSubmit` calls `onEmailSubmit(email)` (async) and `startSealing()` synchronously without awaiting the result. The sealed UI is shown based on a 2.5-second `setTimeout`, entirely decoupled from the actual Firebase write outcome.
- Safe modification: Make `onEmailSubmit` return a Promise, `await` it in `handleEmailSubmit`, and only call `startSealing()` on success. Show an error state on failure.
- Test coverage: No tests exist for this component.

**Waitlist count initialised to hardcoded `102`:**
- Files: `src/App.tsx` (line 13)
- Why fragile: The initial `waitlistCount` value is hardcoded as `102`. Before the Firebase subscription resolves, users see this hardcoded number. If Firebase is slow or fails, the count is permanently stuck at `102`. Any change to the real waitlist count requires a code change to stay accurate during the loading gap.
- Safe modification: Initialise to `null` or `0` and show a loading indicator until the subscription resolves.
- Test coverage: None.

**All FAQ answers are placeholder stubs:**
- Files: `src/components/FAQ.tsx` (lines 6–15)
- Why fragile: All 9 FAQ answers are `"Answer coming soon."`. This is visible to every user who expands a FAQ item. The FAQ section is live and publicly accessible.
- Safe modification: Replace stub answers with real product copy before public launch.
- Test coverage: None.

**Legal pages not integrated into the React build:**
- Files: `privacy.html`, `terms.html`
- Why fragile: `privacy.html` and `terms.html` are standalone HTML files outside the Vite/React build pipeline. They duplicate all styles and fonts inline and have no shared layout. Any brand or style change requires updating three separate files (plus both legal pages) independently.
- Safe modification: Either convert these to React routes under the Vite SPA (using a router like React Router), or maintain them as separate static HTML with a shared CSS file and correct relative links. The current duplication is high maintenance.
- Test coverage: None.

## Scaling Limits

**Firestore real-time subscription per visitor:**
- Current capacity: Every page visitor opens a persistent Firestore `onSnapshot` subscription to read the waitlist count. At low traffic this is fine.
- Limit: At high traffic (viral launch), each concurrent visitor holds an open WebSocket connection to Firestore. This increases Firestore read costs and can hit connection limits on free-tier Firebase plans.
- Scaling path: Poll for count updates on a timer (every 30–60 s) rather than subscribing in real time, or cache the count server-side and serve it via a lightweight API endpoint.

## Dependencies at Risk

**`motion` v12 (Framer Motion fork):**
- Risk: The project uses `"motion": "^12.23.24"` — the standalone `motion` package from the Framer Motion team. This is a relatively new package split from `framer-motion`. The API (`motion/react`) differs from the prior `framer-motion` package. Documentation and community examples still predominantly reference `framer-motion`. If the package diverges further, upgrade paths may become complex.
- Impact: Animation components throughout `src/App.tsx`, `src/components/FirstLetter.tsx`, `src/components/FAQ.tsx`.
- Migration plan: Monitor the `motion` package changelog. If issues arise, `framer-motion` remains the battle-tested alternative with identical API for React.

## Missing Critical Features

**No user identity / deduplication:**
- Problem: There is no mechanism to prevent the same email address from being added to the waitlist multiple times. Submitting the form twice (e.g. by navigating away and returning) will call `joinWaitlist` again.
- Blocks: Accurate waitlist count; clean email delivery list at launch.

**No rate limiting or CAPTCHA on waitlist form:**
- Problem: The waitlist form has no server-side rate limiting or bot protection. Automated submissions can flood the Firestore collection.
- Blocks: Reliable waitlist data quality; Firebase quota safety.

**No letter persistence for the "First Letter" feature:**
- Problem: The letter text entered in `FirstLetter.tsx` is stored only in component state. When the user reaches the "sealed" confirmation, there is no code that saves the letter content to any database. The letter is effectively discarded.
- Blocks: Core product promise — "Write a letter to your future self and we'll keep it sealed until launch day" — is not fulfilled.

## Test Coverage Gaps

**No tests exist anywhere:**
- What's not tested: All components (`App`, `FirstLetter`, `FAQ`, `ShareButtons`, `Typewriter`), all user flows (waitlist sign-up, email submission, sealing animation, FAQ interaction, copy link), all error states.
- Files: `src/App.tsx`, `src/components/*.tsx`
- Risk: Any refactor or dependency upgrade could break core functionality with no safety net.
- Priority: High — particularly for the `handleSubscribe` and `handleEmailSubmit` async paths, and the `startSealing` / error-state logic.

---

*Concerns audit: 2026-05-25*
