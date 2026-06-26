# Phase 5: Deploy & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 05-deploy-and-polish
**Areas discussed:** Social handles, Vercel strategy, Error display UX, Copy scope

---

## Social Handles

### Instagram handle

| Option | Description | Selected |
|--------|-------------|----------|
| @sealed.app | Common app brand pattern | |
| @sealedapp | Matches domain | |
| @sealed | Short, clean | |
| Other / freeform | User provided | ✓ |

**User's choice:** `@sealed.io` → `https://www.instagram.com/sealed.io`

---

### X (Twitter) handle

| Option | Description | Selected |
|--------|-------------|----------|
| @sealed_app | Distinguishes from other @sealed accounts | |
| @sealedapp | Matches domain | |
| @sealed | Short, clean | |
| Other / freeform | User provided | ✓ |

**User's choice:** `@sealedapp_io` → `https://x.com/sealedapp_io`

---

### Footer contact email

| Option | Description | Selected |
|--------|-------------|----------|
| Keep hello@sealed.io | Shorter domain | |
| Switch to hello@sealedapp.io | Match landing page domain | |
| Other / freeform | User provided | ✓ |

**User's choice:** `info@sealedapp.io`

---

## Vercel Strategy

### GitHub repo status

| Option | Description | Selected |
|--------|-------------|----------|
| No — needs to be created | Plan will create SEALED-org/sealed-landing | |
| Yes — already exists | Plan will push to existing remote | ✓ |

**User's choice:** Repo already exists — push only.

---

### Deploy wiring

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub → Vercel auto-deploy | Connect repo for CI/CD on every push to main | ✓ |
| One-shot CLI deploy only | Manual `vercel --prod` from local | |

**User's choice:** GitHub → Vercel auto-deploy.

---

### vercel.json for HTML routing

| Option | Description | Selected |
|--------|-------------|----------|
| vercel.json rewrites | Serve standalone HTML at clean paths | |
| Leave as-is | Vercel serves .html files at their path by default | ✓ |

**User's choice:** Leave as-is — no vercel.json needed.
**Notes:** User asked for rationale. Explained that Vite multi-page outputs verify.html / terms.html / privacy.html to dist/ and Vercel serves them at their .html paths automatically. Changing to clean URLs would require updating the Edge Function email template too (scope creep). User accepted this reasoning.

---

## Error Display UX

### WaitlistForm error approach

| Option | Description | Selected |
|--------|-------------|----------|
| Inline text below form | Matches existing pattern | ✓ (auto) |
| Dismissable banner | Heavier, new pattern | |

**Notes:** User clarified:
1. FirstLetter tab errors → keep existing white-on-black format, no change needed.
2. WaitlistForm errors → user wanted to test first; then discovered full error display system already exists (`waitlist-error-slot`, 6 states, `aria-live`). No new UI work needed.
3. **Hard rule established:** Errors must NEVER fail silently.

---

## Copy Scope

### Matthews citation accuracy

| Option | Description | Selected |
|--------|-------------|----------|
| Include verification task | Flag for manual check | |
| It's accurate — no task needed | Lock as-is | ✓ |

**User's choice:** Confirmed accurate — `+42%, n=267, Dominican University of California, 2015`.

---

### General copy status

| Option | Description | Selected |
|--------|-------------|----------|
| Existing copy is locked — ship as-is | Only error messages to review | ✓ |
| I have specific changes | List changes | |

---

### Error message strings review

| Option | Description | Selected |
|--------|-------------|----------|
| All good — no changes | Lock all 6 strings | ✓ |
| Change some of them | Provide revised wording | |

**User's choice:** All 6 error message strings locked as-is.

---

## Claude's Discretion

None — all decisions were made by the user.

## Deferred Ideas

None — discussion stayed within phase scope.
