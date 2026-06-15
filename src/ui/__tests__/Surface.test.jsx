import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Surface } from '../primitives/Surface.jsx';

describe('Surface', () => {
  it('renders children', () => {
    const { getByText } = render(<Surface>hello</Surface>);
    expect(getByText('hello')).toBeInTheDocument();
  });

  it('default padding maps to 18px', () => {
    const { container } = render(<Surface>x</Surface>);
    expect(container.firstChild).toHaveStyle({ padding: '18px' });
  });

  it('padding="none" produces no padding', () => {
    const { container } = render(<Surface padding="none">x</Surface>);
    expect(container.firstChild).toHaveStyle({ padding: '0px' });
  });

  it('tone="canvas" applies a data attribute marker', () => {
    const { container } = render(<Surface tone="canvas">x</Surface>);
    expect(container.firstChild).toHaveAttribute('data-tone', 'canvas');
  });

  it('interactive=true makes element role="button" and keyboard-focusable', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Surface interactive onClick={onClick}>x</Surface>);
    const btn = getByRole('button');
    expect(btn).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  it('interactive=true activates onClick via Space too', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Surface interactive onClick={onClick}>x</Surface>);
    fireEvent.keyDown(getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalled();
  });

  it('selected adds the accent outline marker', () => {
    const { container } = render(<Surface selected>x</Surface>);
    expect(container.firstChild).toHaveAttribute('data-selected', 'true');
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<Surface ref={ref}>x</Surface>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
