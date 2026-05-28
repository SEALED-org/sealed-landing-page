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
import { getSignupCount, joinWaitlistLocal } from './lib/supabase';

export default function App() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSignupCount()
      .then(setWaitlistCount)
      .catch((error) => {
        console.error('Counter fetch failed:', error);
        setWaitlistCount(115);
      });
  }, []);

  const handleSubscribe = async (formEmail: string) => {
    if (formEmail && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await joinWaitlistLocal(formEmail);
        setEmail(formEmail);
        setIsSubscribed(true);
        setWaitlistCount((c) => (c ?? 115) + 1);
      } catch (error) {
        console.error('Subscription failed:', error);
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
          />

          <WaitlistSuccessCard
            onWriteLetter={() => {
              document.getElementById('first-letter')?.scrollIntoView({ behavior: 'smooth' });
            }}
            isVisible={isSubscribed}
          />

          <div className="live-row" style={{ color: 'var(--color-ink-70)' }}>
            <Counter target={waitlistCount ?? 115} />
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
        onEmailSubmit={async (newEmail) => {
          setEmail(newEmail);
          try {
            await joinWaitlistLocal(newEmail);
            setIsSubscribed(true);
            setWaitlistCount((c) => (c ?? 115) + 1);
          } catch (error) {
            console.error('Waitlist join failed:', error);
          }
        }}
        waitlistCount={waitlistCount ?? 115}
      />

      <FAQ />

      <Footer />
    </div>
  );
}
