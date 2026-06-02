import { useEffect, useState } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import WaitlistForm from './components/WaitlistForm';
import WaitlistSuccessCard from './components/WaitlistSuccessCard';
import Counter from './components/Counter';
import HowItWorks from './components/HowItWorks';
import ResearchSection from './components/ResearchSection';
import FirstLetter from './components/FirstLetter';
import FAQ from './components/FAQ';
import { getSignupCount, joinWaitlist, type WaitlistState } from './lib/supabase';

export default function App() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistError, setWaitlistError] = useState<WaitlistState | null>(null);

  useEffect(() => {
    getSignupCount()
      .then(setWaitlistCount)
      .catch((error) => {
        console.error('Counter fetch failed:', error);
        setWaitlistCount(115);
      });
  }, []);

  const handleSubscribe = async (formEmail: string, turnstileToken: string) => {
    if (formEmail && !isSubmitting) {
      setIsSubmitting(true);
      setWaitlistError(null);
      try {
        const state = await joinWaitlist(formEmail, turnstileToken);
        if (state === 'success') {
          setEmail(formEmail);
          setIsSubscribed(true);
          setWaitlistCount((c) => (c ?? 115) + 1);
          setWaitlistError(null);
        } else {
          setWaitlistError(state);
        }
      } catch (error) {
        console.error('Subscription failed:', error);
        setWaitlistError('server_error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen selection:bg-black selection:text-white">
      <Nav />

      <header className="hero">
        <div className="hero-inner">
          <div className="wordmark" style={{ marginBottom: '32px' }}>SEALED</div>

          <h1 className="headline">
            Some letters are<br />
            <em>worth waiting for.</em>
          </h1>
          <p className="hero-tagline">
            Write a letter to your future self.<br />
            Sealed today, opened on the date you choose.
          </p>

          <img
            src="/assets/separator-ink.png"
            alt=""
            aria-hidden="true"
            width={2572}
            height={190}
            className="hero-separator"
            decoding="async"
            fetchPriority="high"
          />

          <WaitlistForm
            onSubmit={handleSubscribe}
            isSubmitting={isSubmitting}
            isSubmitted={isSubscribed}
            error={waitlistError}
          />

          <WaitlistSuccessCard
            onWriteLetter={() => {
              document.getElementById('first-letter')?.scrollIntoView({ behavior: 'smooth' });
            }}
            isVisible={isSubscribed}
          />

          <div className="live-row" style={{ color: 'var(--color-ink-70)' }}>
            <Counter target={waitlistCount ?? 0} />
          </div>
        </div>
      </header>

      <div className="section-divider" aria-hidden="true">
        <div className="inner">
          <span className="rule" style={{ flex: 1, width: 'auto' }}></span>
        </div>
      </div>

      <HowItWorks />

      <ResearchSection />

      <FirstLetter
        initialEmail={isSubscribed ? email : undefined}
        onEmailSubmit={async (newEmail, turnstileToken) => {
          try {
            const state = await joinWaitlist(newEmail, turnstileToken);
            if (state === 'success') {
              setEmail(newEmail);
              setIsSubscribed(true);
              setWaitlistCount((c) => (c ?? 115) + 1);
            }
            return state;
          } catch (error) {
            console.error('Waitlist join failed:', error);
            return 'server_error';
          }
        }}
        waitlistCount={waitlistCount ?? 115}
      />

      <FAQ />

      <Footer />
    </div>
  );
}
