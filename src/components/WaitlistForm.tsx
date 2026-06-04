import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import type { WaitlistState } from '../lib/supabase';
import { MESSAGES } from '../lib/messages';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

interface WaitlistFormProps {
  onSubmit: (email: string, turnstileToken: string) => Promise<void>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: WaitlistState | null;
}

export default function WaitlistForm({ onSubmit, isSubmitting, isSubmitted, error }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [turnstileBlocked, setTurnstileBlocked] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  // True while we wait for the invisible Turnstile challenge to produce a token
  // on submit. Drives the existing spinner so the click feels instant and blocks
  // double-submits. Separate from isSubmitting (the parent), which only covers
  // the network call that follows.
  const [resolving, setResolving] = useState(false);
  // Local-only failure: the human-check could not produce a token. Shown as the
  // friendly turnstile_failed message instead of sending an empty token, which
  // the server rejects as a generic server_error ("Something went wrong").
  const [turnstileFailed, setTurnstileFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting || resolving) return;
    setTurnstileFailed(false);
    if (turnstileBlocked) {
      setTurnstileFailed(true);
      return;
    }
    setResolving(true);
    try {
      // The invisible challenge resolves asynchronously via onSuccess. If the
      // token is not ready yet (fresh load, fast resubmit, or right after a
      // reset), wait for it here instead of submitting an empty token.
      let token = turnstileToken;
      if (!token) {
        try {
          token = (await turnstileRef.current?.getResponsePromise(15000)) ?? '';
        } catch {
          token = '';
        }
      }
      if (!token) {
        setTurnstileFailed(true);
        turnstileRef.current?.reset();
        return;
      }
      await onSubmit(email, token);
    } finally {
      setTurnstileToken('');
      turnstileRef.current?.reset();
      setResolving(false);
    }
  };

  const busy = isSubmitting || resolving;
  const shownError: WaitlistState | null = turnstileFailed ? 'turnstile_failed' : error;

  return (
    <>
      <form
        id="waitlist"
        className={`waitlist${isSubmitted ? ' is-submitted' : ''}`}
        onSubmit={handleSubmit}
      >
        <input
          type="email"
          placeholder="Your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Join the waitlist</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          options={{ size: 'invisible' }}
          onSuccess={(token) => setTurnstileToken(token)}
          onError={() => { setTurnstileBlocked(true); setTurnstileToken(''); }}
          onUnsupported={() => { setTurnstileBlocked(true); setTurnstileToken(''); }}
          onExpire={() => { setTurnstileToken(''); turnstileRef.current?.reset(); }}
        />
      </form>
      <div
        className="waitlist-error-slot"
        style={{
          minHeight: 24,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-ink-50)',
          fontSize: 12,
          opacity: shownError ? 1 : 0,
          transition: 'opacity 200ms ease',
          textAlign: 'center',
        }}
        aria-live="polite"
      >
        {shownError ? MESSAGES[shownError] : ' '}
      </div>
    </>
  );
}
