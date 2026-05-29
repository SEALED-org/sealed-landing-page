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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting || turnstileBlocked) return;
    try {
      turnstileRef.current?.execute();
      const token = (await turnstileRef.current?.getResponsePromise(10_000)) ?? '';
      await onSubmit(email, token);
    } catch (err) {
      console.warn('Turnstile token not produced in time:', err);
      await onSubmit(email, '');
    } finally {
      turnstileRef.current?.reset();
    }
  };

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
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
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
          options={{
            execution: 'execute',
            appearance: 'interaction-only',
            size: 'invisible',
          }}
          onError={() => setTurnstileBlocked(true)}
          onUnsupported={() => setTurnstileBlocked(true)}
          onExpire={() => turnstileRef.current?.reset()}
        />
      </form>
      <div
        className="waitlist-error-slot"
        style={{
          minHeight: 24,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-ink-50)',
          fontSize: 12,
          opacity: error ? 1 : 0,
          transition: 'opacity 200ms ease',
          textAlign: 'center',
        }}
        aria-live="polite"
      >
        {error ? MESSAGES[error] : ' '}
      </div>
    </>
  );
}
