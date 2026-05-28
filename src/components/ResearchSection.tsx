import { motion } from 'motion/react';

const REVEAL_VIEWPORT = { once: true, amount: 0.12 } as const;
const REVEAL_INITIAL = { opacity: 0, y: 20 } as const;
const REVEAL_ANIMATE = { opacity: 1, y: 0 } as const;
const REVEAL_TRANSITION = { duration: 0.9, ease: 'easeOut' } as const;

export default function ResearchSection() {
  return (
    <section className="research">
      <div className="research-inner">
        <motion.div
          className="rs-stamp"
          aria-hidden="true"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={REVEAL_TRANSITION}
        >
          <svg viewBox="0 0 100 100">
            <defs>
              <path
                id="rs-stamp-arc"
                d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
              />
            </defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <text
              fontFamily='"Space Mono", monospace'
              fontSize="5.4"
              fontWeight="700"
              fill="currentColor"
              letterSpacing="1.6"
            >
              <textPath href="#rs-stamp-arc" startOffset="0">
                PEER REVIEWED · METHODOLOGY ·{' '}
              </textPath>
            </text>
            <text
              x="50"
              y="46"
              textAnchor="middle"
              fontFamily='"Instrument Serif", serif'
              fontStyle="italic"
              fontSize="14"
              fill="currentColor"
            >
              vetted
            </text>
            <text
              x="50"
              y="60"
              textAnchor="middle"
              fontFamily='"Space Mono", monospace'
              fontSize="4.2"
              fontWeight="700"
              fill="currentColor"
              letterSpacing="1.4"
            >
              N = 2 STUDIES
            </text>
          </svg>
        </motion.div>

        <motion.div
          className="research-eyebrow"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={REVEAL_TRANSITION}
        >
          <span className="rule"></span>
          <span>The science</span>
          <span className="rule"></span>
        </motion.div>

        <motion.h2
          className="rs-headline"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={REVEAL_TRANSITION}
        >
          Writing it down <em>actually works.</em>
        </motion.h2>

        <motion.p
          className="rs-deck"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={REVEAL_TRANSITION}
        >
          Two studies <span className="mark">·</span> one conclusion
        </motion.p>

        <motion.div
          className="rs-stats"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={{ ...REVEAL_TRANSITION, delay: 0.08 }}
        >
          <span className="rs-tick-bl" aria-hidden="true"></span>
          <span className="rs-tick-br" aria-hidden="true"></span>

          <figure className="rs-stat">
            <span className="rs-stat-tag">
              <span className="dot"></span>Study 01
            </span>
            <div className="rs-stat-num">
              <span className="rs-sign">+</span>22<span className="rs-pct">%</span>
            </div>
            <figcaption>
              Performance increase when goals are written.<sup className="rs-ref">1</sup>
            </figcaption>
          </figure>

          <div className="rs-divider" aria-hidden="true">
            <span className="rs-divider-mark">×</span>
          </div>

          <figure className="rs-stat">
            <span className="rs-stat-tag">
              <span className="dot"></span>Study 02
            </span>
            <div className="rs-stat-num">
              <span className="rs-sign">+</span>42<span className="rs-pct">%</span>
            </div>
            <figcaption>
              More likely to follow through on a written goal.<sup className="rs-ref">2</sup>
            </figcaption>
          </figure>
        </motion.div>

        <motion.p
          className="rs-kicker"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={{ ...REVEAL_TRANSITION, delay: 0.16 }}
        >
          Your brain treats a written commitment as a <em>promise.</em>
        </motion.p>

        <motion.ol
          className="rs-refs"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={{ ...REVEAL_TRANSITION, delay: 0.16 }}
        >
          <li>
            <span className="num">1</span>
            <span>
              Schippers, Morisano, Locke &amp; Latham — <em>Contemporary Educational Psychology</em>, n = 2,928, 2020
            </span>
          </li>
          <li>
            <span className="num">2</span>
            <span>
              Matthews, PhD — <em>Dominican University of California</em>, n = 267, 2015
            </span>
          </li>
        </motion.ol>
      </div>
    </section>
  );
}
