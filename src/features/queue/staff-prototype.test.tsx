import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StaffPrototype } from './staff-prototype';

describe('StaffPrototype', () => {
  it('completes the active customer and calls the next waiting number', async () => {
    const user = userEvent.setup();
    render(<StaffPrototype />);
    await user.click(screen.getByRole('button', { name: 'Complete' }));
    expect(screen.getByRole('button', { name: 'Call next' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Call next' }));
    expect(screen.getByLabelText('Queue number A-025')).toBeInTheDocument();
  });

  it('pauses and reopens the queue', async () => {
    const user = userEvent.setup();
    render(<StaffPrototype />);
    await user.click(screen.getByRole('button', { name: 'Pause queue' }));
    expect(screen.getByText('Queue paused')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open queue' }));
    expect(screen.getByText('Queue open')).toBeInTheDocument();
  });
});
