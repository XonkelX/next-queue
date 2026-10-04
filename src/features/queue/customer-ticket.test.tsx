import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CustomerTicket } from './customer-ticket';
import type { QueueEntry } from './types';

describe('terminal customer tickets', () => {
  for (const status of ['COMPLETED', 'SKIPPED'] as const) {
    it(`does not tell a ${status.toLowerCase()} customer to approach`, () => {
      const entry = {
        id: 'ticket',
        number: 1000,
        numberLabel: 'ABC-1000',
        status,
        joinedAt: '2026-10-04T12:00:00Z',
      } as QueueEntry;
      render(
        <CustomerTicket
          queueName="Venue"
          queueStatus="OPEN"
          prefix="ABC"
          ownEntry={entry}
          activeLabel="ABC-1001"
          position={0}
          waitingCount={0}
          connection="connected"
          joinContent={<button>Join again</button>}
        />,
      );
      expect(screen.getByText('Ticket ended')).toBeInTheDocument();
      expect(screen.queryByText('It’s your turn.')).not.toBeInTheDocument();
      expect(screen.queryByText('You’re in line')).not.toBeInTheDocument();
      expect(
        screen.getByLabelText('Queue number ABC-1000'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Join again' })).toBeEnabled();
    });
  }
});
