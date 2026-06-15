import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState.jsx';
import { ErrorState } from '../ErrorState.jsx';

describe('EmptyState', () => {
  it('no-data variant shows the collect-feedback hint', () => {
    const { getByText } = render(<EmptyState variant="no-data" />);
    expect(getByText(/no feedback yet/i)).toBeInTheDocument();
  });

  it('filtered-empty variant renders Clear filters action', () => {
    const fn = vi.fn();
    const { getByRole } = render(<EmptyState variant="filtered-empty" onClearFilters={fn} />);
    fireEvent.click(getByRole('button', { name: /clear filters/i }));
    expect(fn).toHaveBeenCalled();
  });
});

describe('ErrorState', () => {
  it('renders message and retry', () => {
    const fn = vi.fn();
    const { getByRole, getByText } = render(<ErrorState message="Failed to load" onRetry={fn} />);
    expect(getByText('Failed to load')).toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: /try again/i }));
    expect(fn).toHaveBeenCalled();
  });

  it('omits retry button when no callback', () => {
    const { queryByRole } = render(<ErrorState message="x" />);
    expect(queryByRole('button')).not.toBeInTheDocument();
  });
});
