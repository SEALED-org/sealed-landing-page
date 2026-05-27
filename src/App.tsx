import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Instagram, Twitter, ChevronRight, PenLine, Lock, Inbox, Users, Loader2, Mail } from 'lucide-react';
import FirstLetter from './components/FirstLetter';
import FAQ from './components/FAQ';
import ShareButtons from './components/ShareButtons';
import { subscribeToWaitlistCount, joinWaitlist } from './firebase';

export default function App() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(102);

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 1200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToWaitlistCount(setWaitlistCount);
    return () => unsubscribe();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await joinWaitlist(email);
        setIsSubscribed(true);
      } catch (error) {
        console.error('Subscription failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-8 flex justify-end items-center bg-paper/80 backdrop-blur-sm">
        <button 
          onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
          className="hidden md:block text-sm font-bold font-mono uppercase tracking-widest hover:opacity-60 transition-opacity"
        >
          Join Waitlist
        </button>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-24 px-6 text-center bg-paper relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto relative z-10"
        >
          <div className="text-7xl md:text-9xl font-serif font-bold tracking-tighter mb-12">SEALED</div>
          <h1 className="text-5xl md:text-8xl font-serif mb-8 tracking-tight leading-[1] text-balance">
            <span className="whitespace-nowrap">Some Letters Are</span> <br />
            <span className="italic whitespace-nowrap">Worth Waiting For.</span>
          </h1>
          
          <div className="h-12 mb-12 flex items-center justify-center">
            <p className="text-xl md:text-2xl font-serif italic opacity-40">
              Write it when you feel it. Pick the day it opens.
            </p>
          </div>

          {!isSubscribed ? (
            <div className="space-y-4">
              <form id="waitlist" onSubmit={handleSubscribe} className="max-w-sm mx-auto flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-5 py-3 rounded-full border border-black/10 focus:border-black outline-none transition-all text-base bg-white"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-black text-white px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-black/90 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Get Early Access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.05em] whitespace-nowrap opacity-60">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span>Live</span>
                </div>
                <div className="w-px h-3 bg-black/20" />
                <span>
                  Join {waitlistCount.toLocaleString()} others on the list
                </span>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-3 px-6 py-1.5 bg-black text-white rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="font-bold font-mono uppercase tracking-widest text-[10px]">You're #{waitlistCount} on the list</span>
              </div>

              <ShareButtons waitlistCount={waitlistCount} />

              <div className="pt-4">
                <button
                  onClick={() => document.getElementById('first-letter')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group flex items-center gap-3 mx-auto text-lg font-serif italic hover:opacity-60 transition-opacity"
                >
                  <span>tap to write your first letter</span>
                  <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </header>

      {/* 2-Column Split Section: Quote & How it Works */}
      <section className="pt-12 pb-24 md:pt-16 md:pb-32 px-6 bg-paper relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-6xl font-serif">How it Works</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Column 1: Quote */}
            <div className="flex flex-col justify-center space-y-6 md:space-y-12">
              <h2 className="text-xl sm:text-3xl md:text-9xl font-serif leading-tight text-balance">
                “You are 42% more likely to achieve your goals if you write them down.”
              </h2>
              <div className="space-y-4 md:space-y-10">
                <p className="text-xs sm:text-lg md:text-3xl leading-relaxed opacity-70">
                  The act of writing creates a neurological commitment — your brain treats it as a promise.
                </p>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="w-4 md:w-8 h-px bg-black/20" />
                  <p className="text-[8px] md:text-xs font-mono uppercase tracking-[0.1em] md:tracking-[0.3em] font-bold opacity-40">
                    Dr. Gail Matthews
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: Steps */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-[40px] border border-black/5 flex flex-col justify-center space-y-2 md:space-y-4">
              <div className="space-y-0">
                <h3 className="text-sm sm:text-2xl md:text-3xl font-serif font-bold">Write</h3>
                <p className="text-[10px] sm:text-base md:text-lg opacity-60 leading-relaxed">Reflect on the highs and the lows. Add photos and voice notes to capture the full moment.</p>
              </div>
              <div className="space-y-0">
                <h3 className="text-sm sm:text-2xl md:text-3xl font-serif font-bold">Seal</h3>
                <p className="text-[10px] sm:text-base md:text-lg opacity-60 leading-relaxed">Set the date and let it go. Your letter stays locked until the day it arrives.</p>
              </div>
              <div className="space-y-0">
                <h3 className="text-sm sm:text-2xl md:text-3xl font-serif font-bold">Open</h3>
                <p className="text-[10px] sm:text-base md:text-lg opacity-60 leading-relaxed">Your past self, checking in at exactly the right moment.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Writing Section (Always Visible) */}
      <div id="first-letter">
        <FirstLetter 
          initialEmail={isSubscribed ? email : undefined} 
          onEmailSubmit={async (newEmail) => {
            setEmail(newEmail);
            try {
              await joinWaitlist(newEmail);
              setIsSubscribed(true);
            } catch (error) {
              console.error('Waitlist join failed:', error);
            }
          }} 
          waitlistCount={waitlistCount}
        />
      </div>

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <footer className="py-24 px-6 bg-black text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-4xl font-serif font-bold tracking-tighter">SEALED</div>
          
          <div className="flex gap-12">
            <a href="#" className="flex items-center gap-3 hover:opacity-60 transition-opacity group">
              <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold font-mono uppercase tracking-[0.2em]">@sealed.io</span>
            </a>
            <a href="#" className="flex items-center gap-3 hover:opacity-60 transition-opacity group">
              <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold font-mono uppercase tracking-[0.2em]">Twitter</span>
            </a>
          </div>

          <div className="text-[10px] font-mono uppercase tracking-widest opacity-30 font-bold">
            © 2026 Sealed. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
