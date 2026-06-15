import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '../primitives/Spinner.jsx';

describe('Spinner', () => {
  it('renders with a default aria-label', () => {
    const { getByRole } = render(<Spinner />);
    expect(getByRole('status')).toHaveAccessibleName('Loading');
  });

  it('honours a custom label', () => {
    const { getByRole } = render(<Spinner label="Submitting feedback" />);
    expect(getByRole('status')).toHaveAccessibleName('Submitting feedback');
  });

  it('size prop changes box size', () => {
    const { container, rerender } = render(<Spinner size="xs" />);
    expect(container.firstChild).toHaveStyle({ width: '12px', height: '12px' });
    rerender(<Spinner size="lg" />);
    expect(container.firstChild).toHaveStyle({ width: '28px', height: '28px' });
  });

  it('aria-hidden hides from a11y tree', () => {
    const { container } = render(<Spinner aria-hidden="true" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
