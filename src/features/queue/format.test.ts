import { describe, expect, it } from 'vitest';
import { formatQueueNumber } from './format';

describe('formatQueueNumber', () => {
  it('formats stable three-digit queue numbers', () => {
    expect(formatQueueNumber(1, 'a')).toBe('A-001');
    expect(formatQueueNumber(24, 'B')).toBe('B-024');
    expect(formatQueueNumber(1000, 'A')).toBe('A-1000');
  });

  it('rejects invalid numbers and prefixes', () => {
    expect(() => formatQueueNumber(0)).toThrow(RangeError);
    expect(() => formatQueueNumber(1.5)).toThrow(RangeError);
    expect(() => formatQueueNumber(1, 'A1')).toThrow(/prefix/i);
  });
});
