import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Chip } from '../primitives/Chip.jsx';

describe('Chip', () => {
  it('renders children', () => {
    const { getByText } = render(<Chip>bug</Chip>);
    expect(getByText('bug')).toBeInTheDocument();
  });

  it('variant=success applies data-variant', () => {
    const { container } = render(<Chip variant="success">ok</Chip>);
    expect(container.firstChild).toHaveAttribute('data-variant', 'success');
  });

  it('dot prop adds a colored dot', () => {
    const { container } = render(<Chip variant="success" dot>ok</Chip>);
    expect(container.querySelector('[data-role="chip-dot"]')).toBeInTheDocument();
  });

  it('onRemove renders a close button with aria-label', () => {
    const onRemove = vi.fn();
    const { getByLabelText } = render(<Chip onRemove={onRemove}>filter-x</Chip>);
    const btn = getByLabelText(/remove filter-x/i);
    fireEvent.click(btn);
    expect(onRemove).toHaveBeenCalled();
  });

  it('onClick makes the chip a button', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Chip onClick={onClick}>clickable</Chip>);
    const el = getByRole('button');
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalled();
  });

  it('size=sm changes height', () => {
    const { container, rerender } = render(<Chip size="sm">x</Chip>);
    expect(container.firstChild).toHaveAttribute('data-size', 'sm');
    rerender(<Chip>x</Chip>);
    expect(container.firstChild).toHaveAttribute('data-size', 'md');
  });
});
