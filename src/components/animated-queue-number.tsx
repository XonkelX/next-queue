'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { formatQueueNumber } from '@/features/queue/format';
import {
  getMotionDistance,
  getMotionDuration,
  motionTokens,
} from '@/lib/motion';

export function AnimatedQueueNumber({
  number,
  prefix,
  className = '',
}: {
  number: number | undefined;
  prefix: string;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const label = number ? formatQueueNumber(number, prefix) : '—';
  const distance = getMotionDistance(reduced, 54);

  return (
    <span
      className={`queue-number ${className}`}
      aria-label={number ? `Queue number ${label}` : 'No active number'}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          style={{ display: 'inline-block' }}
          initial={{ y: distance, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -distance, opacity: 0 }}
          transition={{
            duration: getMotionDuration(
              reduced,
              motionTokens.duration.deliberate,
            ),
            ease: motionTokens.easing,
          }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
