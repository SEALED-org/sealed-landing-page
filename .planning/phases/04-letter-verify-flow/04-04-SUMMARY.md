---
phase: 04-letter-verify-flow
plan: "04"
subsystem: edge-functions
tags: [deno, supabase-edge-functions, cors, rpc, security]

requires:
  - phase: 04-letter-verify-flow
    plan: "01"
    provides: "public.seal_letter_with_token(p_token text) RETURNS text RPC"

provides:
  - "(sibling) supabase/functions/verify-email/index.ts — verify-email Edge Function"
  - "(sibling) supabase/config.toml — [functions.verify-email] verify_jwt = false"

affects: [04-02, 04-05, 04-06]

tech-stack:
  added: []
  patterns:
    - "CORS + OPTIONS preflight pattern (mirrored from join-waitlist)"
    - "adminClient() service-role DI pattern (_shared/admin-client.ts)"
    - "jsonResponse helper with JSON_HEADERS = { ...corsHeaders, Content-Type }"
    - "Privacy-safe logging: only { state } logged, raw token never appears in logs (T-04-20)"
    - "verify_jwt = false for token-auth endpoints (token IS the bearer credential)"

key-files:
  created:
    - "(sibling) supabase/functions/verify-email/index.ts"
  modified:
    - "(sibling) supabase/config.toml"

key-decisions:
  - "No sendResendEmail call in verify-email — EMAIL-B2 prohibits email after verification; sealed confirmation is the /verify page state, not a follow-up email"
  - "All four RPC states (sealed, already_sealed, expired, invalid) map to HTTP 200 — verify.html interprets the state field; 400/500 reserved for missing token and DB errors respectively"
  - "Token IS the bearer credential — verify_jwt=false is correct; auth truth lives inside seal_letter_with_token RPC's FOR UPDATE guard (T-04-18, T-04-21)"
  - "Token value never logged — only { state: sealState } is console.log'd (T-04-20)"

duration: 8min
completed: 2026-06-05
---

# Phase 4 Plan 04: verify-email Edge Function Summary

**verify-email Edge Function created: CORS, POST-only, seal_letter_with_token RPC call, four-state { state } response — no email sent (EMAIL-B2), token never logged (T-04-20), registered with verify_jwt=false.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-05T12:52:00Z
- **Completed:** 2026-06-05T13:00:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `supabase/functions/verify-email/index.ts` created: CORS headers (verbatim from join-waitlist), OPTIONS handler, POST-only gate, body parse with try/catch, token validation, `adminClient()` service-role client, `seal_letter_with_token` RPC call, privacy-safe logging, four-state 200 response
- `supabase/config.toml` appended with `[functions.verify-email] verify_jwt = false` after the join-waitlist block
- Zero sendResendEmail / resend / Resend imports (EMAIL-B2 satisfied)
- Zero notification_outbox references
- Token value never appears in any console.log or console.error call

## Function Structure

```typescript
// Imports: adminClient only — no react-email, no resend
import { adminClient } from '../_shared/admin-client.ts';

// Response contract (consumed by verify.html):
//   200: { state: 'sealed' | 'already_sealed' | 'expired' | 'invalid' }
//   400: { state: 'invalid' }  (missing/empty token)
//   405: { state: 'invalid' }  (non-POST method)
//   500: { state: 'invalid' }  (DB/RPC error)

// RPC call pattern:
const { data: sealState, error: sealErr } = await supabase.rpc(
  'seal_letter_with_token', { p_token: token }
);
```

## Verification Results

| Check | Result |
|-------|--------|
| File exists at real path | PASS |
| `grep -c "seal_letter_with_token"` | 4 (PASS, ≥1) |
| `grep -c "sendResendEmail\|resend\|Resend"` | 0 (PASS) |
| `grep -c "notification_outbox"` | 0 (PASS) |
| `grep -c "corsHeaders"` | 3 (PASS) |
| `grep -c "adminClient"` | 2 (PASS) |
| `grep -A 1 "[functions.verify-email]" config.toml` | `verify_jwt = false` (PASS) |

## Task Commits

Both tasks committed atomically in the sibling repo:

1. **Tasks 1 + 2: verify-email/index.ts + config.toml** — `ecb008f` in sibling repo `feat(04-04): add verify-email Edge Function + config.toml entry`

## Files Created/Modified

- `(sibling) supabase/functions/verify-email/index.ts` — New Edge Function: CORS, seal_letter_with_token RPC call, four-state response
- `(sibling) supabase/config.toml` — [functions.verify-email] verify_jwt = false appended after join-waitlist block

## Threat Model Coverage

All T-04-18 through T-04-23 threat register entries implemented:

| Threat | Status |
|--------|--------|
| T-04-18: Token as bearer credential | MITIGATED — 256-bit CSPRNG validated inside seal RPC |
| T-04-19: Double-seal | MITIGATED — FOR UPDATE in seal_letter_with_token (04-01) |
| T-04-20: Token in logs | MITIGATED — only `{ state: sealState }` logged, never token value |
| T-04-21: verify_jwt=false | MITIGATED — configured in config.toml; auth truth in RPC |
| T-04-22: No email from verify-email | MITIGATED — zero sendResendEmail/resend imports |
| T-04-23: Open POST DoS | ACCEPTED — 256-bit token, cheap 'invalid' returns |

## Deviations from Plan

None — plan executed exactly as written. CORS block, jsonResponse helper, adminClient import, and Deno.serve structure mirror join-waitlist verbatim. All four response states and HTTP status codes match the plan specification.

## Known Stubs

None — this plan writes a backend Edge Function and config entry only; no UI stubs.

## Threat Surface Scan

No new trust boundaries beyond what the plan's threat model covers. The verify-email endpoint accepts an untrusted token string from the browser and passes it to the seal RPC — this exact boundary is documented in the plan's threat model (T-04-18 through T-04-23).

## Next Phase Readiness

- 04-05 (send-verification-email Edge Function) can proceed — does not depend on 04-04
- 04-06 (smoke tests) depends on this function being deployed (`supabase functions deploy verify-email`)
- 04-02 (verify.html) calls this function — the response contract `{ state: string }` is confirmed
