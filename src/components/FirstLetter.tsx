import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import Typewriter, { typewriterPhrases } from './Typewriter';
import ShareButtons from './ShareButtons';

interface FirstLetterProps {
  initialEmail?: string;
  onEmailSubmit: (email: string) => void;
  waitlistCount: number;
}

export default function FirstLetter({ initialEmail, onEmailSubmit, waitlistCount }: FirstLetterProps) {
  const [letter, setLetter] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<'idle' | 'sealing' | 'needs-email' | 'sealed'>('idle');

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!letter.trim()) return;
    
    if (initialEmail) {
      startSealing();
    } else {
      setStatus('needs-email');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onEmailSubmit(email);
    startSealing();
  };

  const startSealing = () => {
    setStatus('sealing');
    setTimeout(() => {
      setStatus('sealed');
    }, 2500);
  };

  if (status === 'sealed') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-32 px-6"
      >
        <div className="relative inline-block mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="bg-black text-white p-6 rounded-full"
          >
            <CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-4 border border-black rounded-full"
          />
        </div>
        <h2 className="text-5xl font-serif mb-6">Your letter is sealed.</h2>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-6 py-1.5 bg-white text-black rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="font-bold font-mono uppercase tracking-widest text-[10px]">You're #{waitlistCount} on the list</span>
            </div>
            <p className="text-xl opacity-80 max-w-md mx-auto leading-relaxed">
              We’ll deliver it to your inbox on launch day.
            </p>
          </div>
          
          <ShareButtons waitlistCount={waitlistCount} className="text-white" />
        </div>
      </motion.div>
    );
  }

  return (
    <section className="py-24 px-6 bg-black text-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {status === 'needs-email' ? (
            <motion.div
              key="email-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center py-12"
            >
              <h2 className="text-4xl font-serif mb-4">Where should we send it?</h2>
              <p className="text-lg mb-10 text-white/90">Enter your email to seal your letter and join the waitlist.</p>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border border-white/30 rounded-full px-8 py-5 text-xl outline-none focus:border-white transition-all text-center text-white"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full bg-[#fefcf8] text-black py-5 rounded-full font-bold text-lg hover:opacity-90 transition-all"
                >
                  Seal & Join Waitlist
                </button>
                <button 
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="text-sm font-mono uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
                >
                  Go Back to Writing
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="writing-step"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center mb-12">
                <h2 className="text-5xl font-serif mb-4 leading-tight">Your First Letter <br /> Starts Now</h2>
                <p className="text-lg md:text-xl mb-6 text-white/90">Write a letter to your future self and we'll keep it sealed until launch day! No one reads it but you - ever.</p>
              </div>

              <form onSubmit={handleInitialSubmit} className="space-y-6">
                <div className="relative group">
                  <div className="relative border border-white/30 rounded-2xl p-6 md:p-8 shadow-sm min-h-[400px] flex flex-col overflow-hidden">
                    <img 
                      src="https://i.postimg.cc/yWZ0XSgh/lightpaper.jpg" 
                      alt="Paper Texture"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 flex flex-col flex-1">
                      {letter.length === 0 && (
                        <div className="absolute top-0 left-0 right-0 pointer-events-none text-base md:text-lg leading-relaxed opacity-40">
                          <Typewriter phrases={typewriterPhrases} className="font-serif italic text-black" />
                        </div>
                      )}
                      <textarea
                        value={letter}
                        onChange={(e) => setLetter(e.target.value)}
                        className="w-full flex-1 bg-transparent border-none focus:ring-0 resize-none font-serif text-base md:text-lg tracking-wide leading-relaxed text-black"
                        spellCheck={false}
                      />
                      
                      {/* Word count */}
                      <div className="mt-12 flex justify-start items-center text-[10px] font-mono uppercase tracking-widest font-bold text-black/20 h-4">
                        <span>{letter.trim() ? letter.split(/\s+/).filter(Boolean).length : 0} words</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!letter.trim() || status === 'sealing'}
                  className="w-full bg-[#fefcf8] text-black py-6 rounded-full font-bold text-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:cursor-not-allowed group overflow-hidden relative"
                >
                  {status === 'sealing' ? (
                    <motion.div 
                      initial={{ y: 40 }}
                      animate={{ y: 0 }}
                      className="flex items-center gap-3 font-mono text-sm uppercase tracking-widest font-bold"
                    >
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Sealing your words…
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Mail className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      Seal & Send
                    </div>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

