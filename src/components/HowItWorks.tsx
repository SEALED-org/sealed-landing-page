import { motion } from 'motion/react';

const REVEAL_VIEWPORT = { once: true, amount: 0.12 } as const;
const REVEAL_INITIAL = { opacity: 0, y: 20 } as const;
const REVEAL_ANIMATE = { opacity: 1, y: 0 } as const;
const REVEAL_TRANSITION = { duration: 0.9, ease: 'easeOut' } as const;

export default function HowItWorks() {
  return (
    <section className="how">
      <div className="how-inner">
        <motion.div
          className="how-eyebrow"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={REVEAL_TRANSITION}
        >
          <span className="rule"></span>
          <span>How it works</span>
          <span className="rule"></span>
        </motion.div>

        <motion.h2
          className="how-h"
          initial={REVEAL_INITIAL}
          whileInView={REVEAL_ANIMATE}
          viewport={REVEAL_VIEWPORT}
          transition={REVEAL_TRANSITION}
        >
          Three steps. <em>One letter.</em>
        </motion.h2>

        <div className="steps-row">
          <motion.div
            className="step-card"
            initial={REVEAL_INITIAL}
            whileInView={REVEAL_ANIMATE}
            viewport={REVEAL_VIEWPORT}
            transition={REVEAL_TRANSITION}
          >
            <div className="step-screenshot">
              <img src="/assets/step-write.png" alt="Writing a letter to your future self" />
            </div>
            <div className="step-meta">
              <h3>
                <span style={{ opacity: 0.38 }}>01</span>
                {' '}Write a letter to your future self.
              </h3>
              <p>A hope, a fear, a prediction, a promise. Photos and voice notes welcome.</p>
            </div>
          </motion.div>

          <motion.div
            className="step-card"
            initial={REVEAL_INITIAL}
            whileInView={REVEAL_ANIMATE}
            viewport={REVEAL_VIEWPORT}
            transition={{ ...REVEAL_TRANSITION, delay: 0.08 }}
          >
            <div className="step-screenshot">
              <img
                src="/assets/step-seal.png"
                alt="A sealed letter with a wax seal and countdown until delivery"
              />
            </div>
            <div className="step-meta">
              <h3>
                <span style={{ opacity: 0.38 }}>02</span>
                {' '}Seal it.
              </h3>
              <p>Pick the date it opens — six months, a year, a decade. Locked until then.</p>
            </div>
          </motion.div>

          <motion.div
            className="step-card"
            initial={REVEAL_INITIAL}
            whileInView={REVEAL_ANIMATE}
            viewport={REVEAL_VIEWPORT}
            transition={{ ...REVEAL_TRANSITION, delay: 0.16 }}
          >
            <div className="step-screenshot">
              <img
                src="/assets/step-open.png"
                alt="A mailbox of letters waiting to be opened on their delivery date"
              />
            </div>
            <div className="step-meta">
              <h3>
                <span style={{ opacity: 0.38 }}>03</span>
                {' '}Open it <em>when the time comes.</em>
              </h3>
              <p>Meet your past self. Reflect on who you were when you wrote it.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
