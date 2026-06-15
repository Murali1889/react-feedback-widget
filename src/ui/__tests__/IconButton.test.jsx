import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { IconButton } from '../primitives/IconButton.jsx';

describe('IconButton', () => {
  it('renders the icon node', () => {
    const { getByText } = render(<IconButton aria-label="Close" icon={<span>X</span>} />);
    expect(getByText('X')).toBeInTheDocument();
  });

  it('uses aria-label for accessible name', () => {
    const { getByRole } = render(<IconButton aria-label="Close" icon={<span>X</span>} />);
    expect(getByRole('button')).toHaveAccessibleName('Close');
  });

  it('errors in dev when aria-label is missing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<IconButton icon={<span>X</span>} />);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('size=sm sets a smaller box', () => {
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} size="sm" />);
    expect(getByRole('button')).toHaveStyle({ width: '28px', height: '28px' });
  });

  it('size=md default is 32x32', () => {
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} />);
    expect(getByRole('button')).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('clicks fire onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} onClick={onClick} />);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<IconButton aria-label="x" icon={<span>X</span>} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('active=true adds data-active', () => {
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} active />);
    expect(getByRole('button')).toHaveAttribute('data-active', 'true');
  });
});
