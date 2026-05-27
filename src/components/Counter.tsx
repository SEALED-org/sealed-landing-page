import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

interface CounterProps {
  target: number;
}

// Width is keyed off TARGET, not the current animating value, so during the
// 000 → 115 animation the padded width stays stable in its destination tier
// (prevents layout shift mid-animation — decision D-09).
function formatCounter(current: number, target: number): string {
  const width = target >= 10000 ? 5 : target >= 1000 ? 4 : 3;
  return Math.floor(current).toString().padStart(width, '0');
}

export default function Counter({ target }: CounterProps) {
  const motionCount = useMotionValue(0);
  const display = useTransform(motionCount, (latest) => formatCounter(latest, target));

  useEffect(() => {
    const controls = animate(motionCount, target, {
      duration: 1.2,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [target, motionCount]);

  return <motion.span>{display}</motion.span>;
}
