import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { CreateQueuePanel } from './create-queue-panel';

vi.mock('@/lib/realtime/supabase-adapter', () => ({
  SupabaseQueueAdapter: class {
    async createQueue() {
      return { snapshot: { queue: { slug: 'recovered-queue' } } };
    }
  },
}));

it('recovers a successful create replay without a one-time code', async () => {
  const user = userEvent.setup();
  render(<CreateQueuePanel />);
  await user.type(screen.getByLabelText('Venue or queue name'), 'Venue');
  await user.click(screen.getByRole('button', { name: 'Create my queue' }));
  expect(await screen.findByText('Your queue is ready.')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Open your staff board' }),
  ).toHaveAttribute('href', '/q/recovered-queue/staff');
  expect(
    screen.queryByRole('button', { name: 'Create my queue' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/Queue created. Open the staff board/),
  ).toHaveAttribute('role', 'status');
});
