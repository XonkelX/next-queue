import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicDisplay } from './public-display';

describe('PublicDisplay', () => {
  it('shows the active number and next three numbers', () => {
    render(<PublicDisplay />);
    expect(screen.getByLabelText('Queue number A-024')).toBeInTheDocument();
    expect(screen.getByText('A-025')).toBeInTheDocument();
    expect(screen.getByText('A-027')).toBeInTheDocument();
    expect(screen.queryByText('A-028')).not.toBeInTheDocument();
  });
});
