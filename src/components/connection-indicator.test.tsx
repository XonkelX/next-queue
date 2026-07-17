import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectionIndicator } from './connection-indicator';

describe('ConnectionIndicator', () => {
  it.each(['connected', 'reconnecting', 'offline'] as const)(
    'labels the %s state in a live status region',
    (state) => {
      render(<ConnectionIndicator state={state} />);
      expect(screen.getByRole('status')).toHaveTextContent(
        new RegExp(state, 'i'),
      );
    },
  );
});
