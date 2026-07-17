'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AnimatedQueueNumber } from './animated-queue-number';

export function LandingQueuePreview() {
  const reduced = useReducedMotion();
  const [number, setNumber] = useState(24);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(
      () => setNumber((current) => (current >= 26 ? 24 : current + 1)),
      3600,
    );
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <div className="queue-preview" aria-label="Animated public display preview">
      <div className="preview-topline">
        <span>North Star Coffee</span>
        <span>Queue open</span>
      </div>
      <div>
        <p className="eyebrow">Now serving</p>
        <AnimatedQueueNumber
          className="preview-number"
          number={number}
          prefix="A"
        />
      </div>
      <div className="preview-bottomline">
        <span>Up next</span>
        <span>
          A-{String(number + 1).padStart(3, '0')} · A-
          {String(number + 2).padStart(3, '0')}
        </span>
      </div>
    </div>
  );
}
