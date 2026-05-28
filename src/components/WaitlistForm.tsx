import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface WaitlistFormProps {
  onSubmit: (email: string) => Promise<void>;
  isSubmitting: boolean;
  isSubmitted: boolean;
}

export default function WaitlistForm({ onSubmit, isSubmitting, isSubmitted }: WaitlistFormProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !isSubmitting) {
      await onSubmit(email);
    }
  };

  return (
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
    </form>
  );
}
