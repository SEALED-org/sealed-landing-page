# External Integrations

**Analysis Date:** 2026-05-25

## APIs & External Services

**Waitlist / Realtime Database:**
- Firebase — stores waitlist email signups and exposes a live subscriber count
  - SDK/Client: Not listed in `package.json` (Firebase SDK is absent from declared dependencies)
  - Module: `src/firebase.ts` — imported by `src/App.tsx` as `{ subscribeToWaitlistCount, joinWaitlist }`; this file is NOT committed to the repository
  - Auth: Firebase project credentials expected in environment variables (no `.env` file present; specific var names unknown because `src/firebase.ts` is missing)
  - Functions used: `joinWaitlist(email)` — adds an email to the waitlist; `subscribeToWaitlistCount(callback)` — returns a realtime listener that streams the total waitlist count

**Image Hosting:**
- PostImg CDN — paper texture image loaded in `src/components/FirstLetter.tsx`
  - URL: `https://i.postimg.cc/yWZ0XSgh/lightpaper.jpg`
  - Usage: background texture for the letter-writing textarea; loaded as a static `<img>` tag with `referrerPolicy="no-referrer"`

**Font CDN:**
- Google Fonts — three typefaces loaded via `@import` in `src/index.css` and `<link>` tags in `privacy.html` / `terms.html`
  - Families: Plus Jakarta Sans (weights 300–700), Instrument Serif (regular + italic), Space Mono (regular)
  - Endpoint: `https://fonts.googleapis.com`

## Data Storage

**Databases:**
- Firebase (Firestore or Realtime Database — exact product unknown due to missing `src/firebase.ts`)
  - Connection: credentials expected via environment variables (specific names undetermined)
  - Client: Firebase JS SDK (not listed in `package.json` — must be added or is loaded externally)

**File Storage:**
- External CDN only (PostImg for the paper texture asset)
- No local file storage or cloud bucket integration detected

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- None detected for end users
- Firebase project credentials are required for the backend connection but no user authentication flow exists in the current landing page

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- `console.error` calls in `src/App.tsx` (lines 37, 201) for waitlist submission failures — browser console only, no structured logging service

## CI/CD & Deployment

**Hosting:**
- Static site output; canonical domain `https://sealedapp.io` (referenced in `index.html` OG meta)
- No deployment configuration files (no `vercel.json`, `netlify.toml`, or similar) detected

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- Firebase project config vars (exact names unknown; defined in the missing `src/firebase.ts`)
- Likely `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, and related vars based on standard Firebase JS SDK setup — must be confirmed when `src/firebase.ts` is added

**Secrets location:**
- No `.env` files present; secrets must be injected at build time via environment variables

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Twitter Web Intent URL — `src/components/ShareButtons.tsx` opens `https://twitter.com/intent/tweet` in a new tab with pre-filled share text and URL; this is a client-side redirect, not a webhook

## Social Sharing

**Twitter/X:**
- Share intent: `src/components/ShareButtons.tsx` — opens `https://twitter.com/intent/tweet` with encoded share text
- OG/Twitter Card meta tags in `index.html` for link previews

**Instagram:**
- Share button rendered in `src/components/ShareButtons.tsx` — currently has no `onClick` handler (placeholder only)

**Clipboard:**
- `navigator.clipboard.writeText` in `src/components/ShareButtons.tsx` — copies the current page URL

---

*Integration audit: 2026-05-25*
