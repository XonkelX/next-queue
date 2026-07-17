import { describe, expect, it } from 'vitest';
import { getMotionDistance, getMotionDuration } from './motion';

describe('reduced-motion helpers', () => {
  it('removes spatial movement and nearly eliminates duration', () => {
    expect(getMotionDistance(true, 48)).toBe(0);
    expect(getMotionDuration(true, 0.5)).toBe(0.01);
  });

  it('preserves normal motion values', () => {
    expect(getMotionDistance(false, 48)).toBe(48);
    expect(getMotionDuration(false, 0.5)).toBe(0.5);
  });
});
