import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CustomerPrototype } from './customer-prototype';
import { createInitialQueueSnapshot } from './mock-data';

describe('CustomerPrototype', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('joins with an optional name and shows the assigned number', async () => {
    const user = userEvent.setup();
    render(<CustomerPrototype />);
    await user.type(screen.getByLabelText(/first name/i), 'Ari');
    await user.click(screen.getByRole('button', { name: 'Join the queue' }));
    expect(screen.getByLabelText('Queue number A-029')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /in the queue/i }),
    ).toBeDisabled();
  });

  it.each(['PAUSED', 'CLOSED'] as const)(
    'presents an intentional %s state',
    (status) => {
      const snapshot = createInitialQueueSnapshot();
      snapshot.queue.status = status;
      render(<CustomerPrototype initialSnapshot={snapshot} />);
      expect(screen.getByRole('status')).toHaveTextContent(
        status === 'PAUSED' ? /paused/i : /closed/i,
      );
      expect(
        screen.queryByRole('button', { name: /join/i }),
      ).not.toBeInTheDocument();
    },
  );
});
