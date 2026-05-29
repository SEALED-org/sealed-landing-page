// Per 02-CONTEXT.md D-09 / D-10.
// Phase 5 CONTENT-01 may refine wording — keep the copy verbatim until then.
import type { WaitlistState } from './supabase';

export const MESSAGES: Record<Exclude<WaitlistState, 'success'>, string> = {
  unverified: 'Welcome back. We just resent your confirmation email.',
  verified_no_letter: "You're already on the waitlist.",
  verified_with_letter: "You're already on the list and your letter is sealed.",
  rate_limited: 'Too many attempts from your network. Try again tomorrow.',
  turnstile_failed: "Couldn't verify you're human. Please try again.",
  server_error: 'Something went wrong. Please try again.',
};
