import {
  createClient,
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// Fail loud at module load — easier to debug than a silent createClient("undefined","undefined")
// that causes confusing CORS/DNS errors on the first fetch.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in .env.local (dev) or Vercel project settings (prod).'
  );
}

if (!turnstileSiteKey) {
  throw new Error(
    'Missing VITE_TURNSTILE_SITE_KEY. ' +
    'Set it in .env.local (dev) or Vercel project settings (prod). ' +
    'Get the public site key from https://dash.cloudflare.com/?to=/:account/turnstile.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type WaitlistState =
  | 'success'
  | 'unverified'
  | 'verified_no_letter'
  | 'verified_with_letter'
  | 'rate_limited'
  | 'turnstile_failed'
  | 'server_error';

interface JoinWaitlistResponse {
  state: WaitlistState;
  retry_after?: number;
}

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
 * Submits a waitlist signup to the deployed `join-waitlist` Edge Function.
 *
 * Returns one of seven `WaitlistState` codes; never throws for known states.
 * The seven states map 1:1 to the MESSAGES copy in `src/lib/messages.ts`.
 * Callers should switch on the return value: counter increment + success card
 * on `'success'`, inline error otherwise.
 *
 * @param email          The email address. HTML5 validates client-side; the server validates on receive.
 * @param turnstileToken The Turnstile token from `ref.current.getResponse()`. Pass `''` if the widget failed — the server returns `turnstile_failed`.
 * @returns A `WaitlistState`. Never throws.
 */
export async function joinWaitlist(
  email: string,
  turnstileToken: string,
): Promise<WaitlistState> {
  const { data, error } = await supabase.functions.invoke<JoinWaitlistResponse>(
    'join-waitlist',
    { body: { email, turnstileToken } },
  );
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as JoinWaitlistResponse;
        return body.state;
      } catch {
        return 'server_error';
      }
    }
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      console.error('join-waitlist relay/fetch error:', error.message);
      return 'server_error';
    }
    return 'server_error';
  }
  return data?.state ?? 'server_error';
}
