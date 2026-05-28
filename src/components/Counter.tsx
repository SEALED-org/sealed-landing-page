import { useEffect, useRef } from 'react';

interface CounterProps {
  target: number;
}

const DIGITS = 5;
const STAGGER_MS = 40;
const FLIP_MS = 500;

export default function Counter({ target }: CounterProps) {
  const digitRefs = useRef<(HTMLDivElement | null)[]>([]);
  const curRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const nextRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prevCharsRef = useRef<string[]>(['0', '0', '0', '0', '0']);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    const newChars = String(target).padStart(DIGITS, '0').slice(-DIGITS).split('');

    newChars.forEach((ch, i) => {
      if (prevCharsRef.current[i] === ch) return;

      const stagger = i * STAGGER_MS;
      const t1 = window.setTimeout(() => {
        const d = digitRefs.current[i];
        const cur = curRefs.current[i];
        const next = nextRefs.current[i];
        if (!d || !cur || !next) return;

        next.textContent = ch;
        d.classList.remove('flip');
        void d.offsetWidth;
        d.classList.add('flip');

        const t2 = window.setTimeout(() => {
          cur.textContent = ch;
          d.classList.remove('flip');
        }, FLIP_MS);
        timersRef.current.push(t2);
      }, stagger);
      timersRef.current.push(t1);
    });

    prevCharsRef.current = newChars;

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      newChars.forEach((ch, i) => {
        const d = digitRefs.current[i];
        const cur = curRefs.current[i];
        const next = nextRefs.current[i];
        if (!d || !cur || !next) return;
        cur.textContent = ch;
        next.textContent = ch;
        d.classList.remove('flip');
      });
    };
  }, [target]);

  return (
    <div className="counter">
      <div className="digit-row" id="count" aria-label="Sign ups so far">
        {Array.from({ length: DIGITS }, (_, i) => (
          <div
            key={i}
            className="digit"
            ref={(el) => {
              digitRefs.current[i] = el;
            }}
          >
            <span
              className="d-cur"
              ref={(el) => {
                curRefs.current[i] = el;
              }}
            >
              0
            </span>
            <span
              className="d-next"
              ref={(el) => {
                nextRefs.current[i] = el;
              }}
            >
              0
            </span>
          </div>
        ))}
      </div>
      <div className="counter-label">
        <span className="dot" aria-hidden="true"></span>
        <span>Sign ups so far</span>
      </div>
    </div>
  );
}
