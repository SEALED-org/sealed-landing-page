import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loud at module load — easier to debug than a silent createClient("undefined","undefined")
// that causes confusing CORS/DNS errors on the first fetch.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in .env.local (dev) or Vercel project settings (prod).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Reads the current waitlist count from the public.signup_counter view.
 * The view computes 115 + count(*) from app_private.waitlist_signups.
 *
 * Caller must catch — Phase 1 falls back to 115 (seeded floor) on any error.
 *
 * @throws on network error, timeout (3s), or PostgREST error.
 */
export async function getSignupCount(): Promise<number> {
  const { data, error } = await supabase
    .from('signup_counter')
    .select('total')
    .single()
    .abortSignal(AbortSignal.timeout(3000));

  if (error) throw error;
  if (!data) throw new Error('signup_counter view returned no row');
  return data.total as number;
}

/**
 * Phase 1 stub — returns void with no network call.
 * Plan 04 wires this into handleSubscribe and FirstLetter.onEmailSubmit
 * so call sites keep the `await joinWaitlistLocal(email)` shape.
 * Phase 2 replaces the body with the real fetch to /functions/v1/join-waitlist
 * without touching the try/catch/finally skeleton in App.tsx.
 */
export async function joinWaitlistLocal(email: string): Promise<void> {
  // Phase 2: replace with fetch('/functions/v1/join-waitlist', { body: { email } })
  return;
}
