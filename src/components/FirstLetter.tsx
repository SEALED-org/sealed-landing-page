import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import Typewriter, { typewriterPhrases } from './Typewriter';
import type { WaitlistState } from '../lib/supabase';
import { MESSAGES } from '../lib/messages';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

type Step = 'write' | 'email' | 'success';

interface FirstLetterProps {
  initialEmail?: string;
  onEmailSubmit: (email: string, turnstileToken: string) => Promise<WaitlistState>;
  waitlistCount: number;
}

const LEAVE_MS = 300;
const ENTER_MS = 400;

function computeDaysToDelivery(): number {
  return Math.max(
    0,
    Math.ceil((new Date(2027, 0, 1).getTime() - Date.now()) / 86_400_000),
  );
}

export default function FirstLetter({
  initialEmail,
  onEmailSubmit,
  waitlistCount: _waitlistCount,
}: FirstLetterProps) {
  void _waitlistCount;

  const [step, setStep] = useState<Step>('write');
  const [leavingStep, setLeavingStep] = useState<Step | null>(null);
  const [enteringStep, setEnteringStep] = useState<Step | null>(null);

  const [letter, setLetter] = useState('');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [daysToDelivery, setDaysToDelivery] = useState<number>(computeDaysToDelivery);

  const transitioningRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const firstLetterTurnstileRef = useRef<TurnstileInstance | null>(null);
  const [turnstileBlocked, setTurnstileBlocked] = useState(false);
  const [emailError, setEmailError] = useState<WaitlistState | null>(null);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (step !== 'success') return;
    setDaysToDelivery(computeDaysToDelivery());
    const id = window.setInterval(() => {
      setDaysToDelivery(computeDaysToDelivery());
    }, 60_000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!initialEmail) return;
    setEmail((prev) => (prev ? prev : initialEmail));
  }, [initialEmail]);

  const transitionTo = (next: Step) => {
    if (transitioningRef.current || step === next) return;
    transitioningRef.current = true;
    setLeavingStep(step);

    const t1 = window.setTimeout(() => {
      setStep(next);
      setLeavingStep(null);
      setEnteringStep(next);

      const t2 = window.setTimeout(() => {
        setEnteringStep((curr) => (curr === next ? null : curr));
        transitioningRef.current = false;
      }, ENTER_MS);
      timersRef.current.push(t2);
    }, LEAVE_MS);
    timersRef.current.push(t1);
  };

  const stepClass = (which: Step): string => {
    if (which === leavingStep) return 'fl-step fl-step-leaving';
    if (which === step) {
      return which === enteringStep ? 'fl-step fl-step-entering' : 'fl-step';
    }
    return 'fl-step fl-step-hidden';
  };

  const handleLetterChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target;
    setLetter(ta.value);
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const handleSealAndSend = () => {
    if (letter.trim().length === 0) return;
    transitionTo('email');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || turnstileBlocked) return;
    try {
      await firstLetterTurnstileRef.current?.execute();
      const token = firstLetterTurnstileRef.current?.getResponse();
      const state = await onEmailSubmit(email, token ?? '');
      if (state === 'success') {
        setEmailError(null);
        transitionTo('success');
      } else {
        setEmailError(state);
      }
    } catch (error) {
      console.error('Letter email submit failed:', error);
      setEmailError('server_error');
    } finally {
      firstLetterTurnstileRef.current?.reset();
    }
  };

  const wordCount =
    letter.trim() === '' ? 0 : letter.trim().split(/\s+/).length;

  return (
    <section id="first-letter" className="first-letter">
      <div className="fl-inner">
        <div className="fl-eyebrow">
          <span className="rule"></span>
          <span>Try it now</span>
          <span className="rule"></span>
        </div>

        <motion.div
          className="fl-head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <h2>
            Your first letter <em>starts now.</em>
          </h2>
          <p className="fl-head-sub">
            Send a letter to your future self, and we'll deliver it on{' '}
            <strong
              style={{
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 3,
                padding: '1px 5px',
              }}
            >
              January 1, 2027.
            </strong>
          </p>
        </motion.div>

        <motion.div
          className="fl-stage"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.08 }}
        >
          {/* Step 1: Write */}
          <div className={stepClass('write')} id="fl-step-write">
            <div className="fl-pad">
              <div className="fl-pad-bg"></div>
              <div className="fl-pad-content">
                <div
                  className="fl-pad-body"
                  style={{ paddingTop: 8, fontSize: 22, fontWeight: 600 }}
                >
                  <div className="fl-typewriter" id="typewriter">
                    {letter.length === 0 ? (
                      <Typewriter phrases={typewriterPhrases} />
                    ) : null}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="fl-textarea"
                    id="fl-textarea"
                    spellCheck={false}
                    value={letter}
                    onChange={handleLetterChange}
                  />
                </div>
                <div
                  className="fl-pad-foot"
                  style={{ justifyContent: 'flex-start' }}
                >
                  <span id="fl-words">{wordCount} words</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="fl-cta"
              id="fl-cta"
              disabled={letter.trim().length === 0}
              onClick={handleSealAndSend}
            >
              Seal &amp; send
            </button>
          </div>

          {/* Step 2: Email — envelope */}
          <div className={stepClass('email')} id="fl-step-email">
            <div className="fl-pad fl-pad-email">
              {/* Stamp left */}
              <div className="fl-stamps" aria-hidden="true">
                {/* Stamp 1: Wavy lines (cancellation style) */}
                <svg
                  className="fl-stamp"
                  width="119"
                  height="93"
                  viewBox="0 0 160 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2"
                    y="2"
                    width="156"
                    height="116"
                    rx="1.5"
                    stroke="#2b35b0"
                    strokeWidth="1.4"
                    strokeDasharray="3 1.8"
                  />
                  <rect
                    x="5"
                    y="5"
                    width="150"
                    height="110"
                    rx="0.5"
                    stroke="#2b35b0"
                    strokeWidth="0.5"
                    strokeOpacity="0.28"
                  />
                  <path
                    fill="none"
                    stroke="#2b35b0"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    d="M8,16 C20,10 30,10 43,16 C56,22 66,22 79,16 C92,10 102,10 115,16 C128,22 138,22 152,16 M8,23 C20,17 30,17 43,23 C56,29 66,29 79,23 C92,17 102,17 115,23 C128,29 138,29 152,23 M8,30 C20,24 30,24 43,30 C56,36 66,36 79,30 C92,24 102,24 115,30 C128,36 138,36 152,30 M8,37 C20,31 30,31 43,37 C56,43 66,43 79,37 C92,31 102,31 115,37 C128,43 138,43 152,37 M8,44 C20,38 30,38 43,44 C56,50 66,50 79,44 C92,38 102,38 115,44 C128,50 138,50 152,44 M8,51 C20,45 30,45 43,51 C56,57 66,57 79,51 C92,45 102,45 115,51 C128,57 138,57 152,51 M8,58 C20,52 30,52 43,58 C56,64 66,64 79,58 C92,52 102,52 115,58 C128,64 138,64 152,58 M8,65 C20,59 30,59 43,65 C56,71 66,71 79,65 C92,59 102,59 115,65 C128,71 138,71 152,65 M8,72 C20,66 30,66 43,72 C56,78 66,78 79,72 C92,66 102,66 115,72 C128,78 138,78 152,72 M8,79 C20,73 30,73 43,79 C56,85 66,85 79,79 C92,73 102,73 115,79 C128,85 138,85 152,79 M8,86 C20,80 30,80 43,86 C56,92 66,92 79,86 C92,80 102,80 115,86 C128,92 138,92 152,86"
                  />
                  <text
                    x="80"
                    y="110"
                    textAnchor="middle"
                    fontFamily="Space Mono, monospace"
                    fontSize="7.5"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="1.2"
                  >
                    FIRST CLASS · SEALED
                  </text>
                </svg>
              </div>

              {/* Stamps right */}
              <div className="fl-stamps-right" aria-hidden="true">
                {/* Stamp 2: Circular */}
                <svg
                  className="fl-stamp"
                  width="93"
                  height="93"
                  viewBox="0 0 130 130"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <path id="sld-circ-top" d="M 12,65 A 53 53 0 0 1 118,65" />
                    <path id="sld-circ-bot" d="M 12,65 A 53 53 0 0 0 118,65" />
                  </defs>
                  <circle cx="65" cy="65" r="62" stroke="#2b35b0" strokeWidth="1.5" />
                  <circle
                    cx="65"
                    cy="65"
                    r="54"
                    stroke="#2b35b0"
                    strokeWidth="0.9"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx="65"
                    cy="65"
                    r="46"
                    stroke="#2b35b0"
                    strokeWidth="0.4"
                    strokeOpacity="0.35"
                  />
                  <text
                    fontFamily="Space Mono, monospace"
                    fontSize="8.5"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="2"
                  >
                    <textPath href="#sld-circ-top" startOffset="50%" textAnchor="middle">
                      SEALED · FIRST CLASS ·
                    </textPath>
                  </text>
                  <text
                    x="65"
                    y="64"
                    textAnchor="middle"
                    fontFamily="Space Mono, monospace"
                    fontSize="13"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="0.5"
                  >
                    MMXXVI
                  </text>
                  <text
                    x="65"
                    y="79"
                    textAnchor="middle"
                    fontFamily="Space Mono, monospace"
                    fontSize="8"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="2.5"
                  >
                    SEALED
                  </text>
                  <text x="65" y="99" textAnchor="middle" fontSize="12" fill="#2b35b0">
                    ★
                  </text>
                  <text
                    fontFamily="Space Mono, monospace"
                    fontSize="8.5"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="2"
                  >
                    <textPath href="#sld-circ-bot" startOffset="50%" textAnchor="middle">
                      YOUR FUTURE SELF
                    </textPath>
                  </text>
                </svg>

                {/* Stamp 3: Hexagonal — rightmost */}
                <svg
                  className="fl-stamp"
                  width="101"
                  height="87"
                  viewBox="0 0 200 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <path id="sld-hex-top" d="M 40,26 Q 100,13 160,26" />
                    <path id="sld-hex-bot" d="M 40,128 Q 100,143 160,128" />
                  </defs>
                  <polygon
                    points="40,18 160,18 192,80 160,142 40,142 8,80"
                    stroke="#2b35b0"
                    strokeWidth="2.2"
                    fill="none"
                  />
                  <polygon
                    points="47,28 153,28 181,80 153,132 47,132 19,80"
                    stroke="#2b35b0"
                    strokeWidth="0.7"
                    fill="none"
                    strokeOpacity="0.4"
                  />
                  <text
                    fontFamily="Space Mono, monospace"
                    fontSize="10"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="1.8"
                  >
                    <textPath href="#sld-hex-top" startOffset="50%" textAnchor="middle">
                      YOUR FIRST LETTER
                    </textPath>
                  </text>
                  <text x="100" y="57" textAnchor="middle" fontSize="13" fill="#2b35b0">
                    ✦
                  </text>
                  <text x="23" y="85" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#2b35b0">
                    →
                  </text>
                  <text x="177" y="85" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#2b35b0">
                    ←
                  </text>
                  <text
                    x="100"
                    y="87"
                    textAnchor="middle"
                    fontFamily="Space Mono, monospace"
                    fontSize="13"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="0.8"
                  >
                    14 MAY 2026
                  </text>
                  <text
                    x="100"
                    y="105"
                    textAnchor="middle"
                    fontFamily="Space Mono, monospace"
                    fontSize="9"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="2.5"
                  >
                    SEALED
                  </text>
                  <text
                    fontFamily="Space Mono, monospace"
                    fontSize="10"
                    fontWeight="700"
                    fill="#2b35b0"
                    letterSpacing="1.8"
                  >
                    <textPath href="#sld-hex-bot" startOffset="50%" textAnchor="middle">
                      TO YOUR FUTURE SELF
                    </textPath>
                  </text>
                </svg>
              </div>

              <div
                className="fl-pad-content"
                style={{ padding: '106px 0 0', justifyContent: 'center' }}
              >
                <div className="fl-address-block">
                  <div
                    className="fl-address-label"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      width: 444,
                      fontFamily: '"Space Mono"',
                    }}
                  >
                    Where should we send this?
                  </div>
                  <form onSubmit={handleEmailSubmit} style={{ width: '100%' }}>
                    <div className="fl-address-to-row">
                      <span className="fl-address-to-label">To</span>
                      <input
                        type="email"
                        id="fl-email-input"
                        placeholder="your@email.com"
                        required
                        autoComplete="email"
                        className="fl-email-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <button type="submit" className="fl-arrow-btn" aria-label="Seal it">
                        →
                      </button>
                    </div>
                    <div className="fl-env-actions">
                      <button
                        type="button"
                        className="fl-back"
                        onClick={() => transitionTo('write')}
                      >
                        ← Back
                      </button>
                    </div>
                    <Turnstile
                      ref={firstLetterTurnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      options={{
                        execution: 'execute',
                        appearance: 'interaction-only',
                        size: 'invisible',
                      }}
                      onError={() => setTurnstileBlocked(true)}
                      onUnsupported={() => setTurnstileBlocked(true)}
                      onExpire={() => firstLetterTurnstileRef.current?.reset()}
                    />
                  </form>
                  <div
                    className="fl-error-slot"
                    style={{
                      minHeight: 24,
                      fontFamily: 'var(--font-mono)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: 12,
                      opacity: emailError ? 1 : 0,
                      transition: 'opacity 200ms ease',
                      textAlign: 'center',
                      paddingTop: 8,
                    }}
                    aria-live="polite"
                  >
                    {emailError ? MESSAGES[emailError] : ' '}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Success — envelope back */}
          <div className={stepClass('success')} id="fl-step-success">
            <div className="fl-pad fl-pad-success">
              <div className="fl-env-back">
                {/* Envelope flap (triangle from top corners meeting at center) */}
                <svg
                  className="fl-env-flap"
                  viewBox="0 0 800 440"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M0 0 L400 270 L800 0 Z" fill="rgba(0,0,0,0.022)" />
                </svg>

                {/* Wax seal — real wax stamp image */}
                <div className="fl-wax-seal" aria-hidden="true">
                  <img src="/assets/wax-seal.png" alt="" width={140} height={143} />
                </div>

                <div className="fl-env-caption">
                  We'll deliver it on <strong>January 1, 2027</strong> · in{' '}
                  <strong>
                    <span id="fl-countdown-days">{daysToDelivery}</span> days
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="fl-promise"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.16 }}
          style={{ color: '#fff' }}
        >
          <span>Secure</span>
          <span className="sep" style={{ background: 'rgba(255,255,255,0.8)' }}></span>
          <span>Delivered Jan 1, 2027</span>
          <span className="sep" style={{ background: 'rgba(255,255,255,0.8)' }}></span>
          <span>Only you can read it</span>
        </motion.div>
      </div>
    </section>
  );
}
