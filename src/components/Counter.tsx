import { useEffect, useRef } from 'react';

interface CounterProps {
  target: number;
}

const DIGITS = 4;
const SWEEP_MS = 1400; // full 0 -> N count-up duration; short hops finish quicker

export default function Counter({ target }: CounterProps) {
  const curRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const valueRef = useRef(0); // last value actually painted
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = valueRef.current;
    const to = target;
    if (from === to) return;

    // Count UP through every value between from and to (not a per-digit flip).
    // Ease-out decelerates onto the final number. The initial 0 -> N sweep gets
    // the full duration; a +1 on signup is a quick hop. App holds target at 0
    // until the fetch resolves, so the sweep lands directly on the real count.
    const distance = Math.abs(to - from);
    const duration = Math.min(SWEEP_MS, Math.max(280, distance * 11));
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const paint = (v: number) => {
      const chars = String(v).padStart(DIGITS, '0').slice(-DIGITS).split('');
      for (let i = 0; i < DIGITS; i++) {
        const el = curRefs.current[i];
        if (el && el.textContent !== chars[i]) el.textContent = chars[i];
      }
    };

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (to - from) * easeOut(t));
      paint(v);
      valueRef.current = v;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        valueRef.current = to;
        paint(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return (
    <div className="counter">
      <div className="digit-row" id="count" aria-label="Sign ups so far">
        {Array.from({ length: DIGITS }, (_, i) => (
          <div key={i} className="digit">
            <span
              className="d-cur"
              ref={(el) => {
                curRefs.current[i] = el;
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
