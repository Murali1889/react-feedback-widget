import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stack } from '../primitives/Stack.jsx';

describe('Stack', () => {
  it('renders children', () => {
    const { getByText } = render(<Stack><span>hi</span></Stack>);
    expect(getByText('hi')).toBeInTheDocument();
  });

  it('default direction is column', () => {
    const { container } = render(<Stack><span>a</span></Stack>);
    expect(container.firstChild).toHaveStyle({ flexDirection: 'column' });
  });

  it('direction="row" sets flex-direction', () => {
    const { container } = render(<Stack direction="row"><span>a</span></Stack>);
    expect(container.firstChild).toHaveStyle({ flexDirection: 'row' });
  });

  it('gap maps to the token scale', () => {
    const { container } = render(<Stack gap="5"><span>a</span></Stack>);
    expect(container.firstChild).toHaveStyle({ gap: '16px' });
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<Stack ref={ref}><span>a</span></Stack>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('supports the `as` prop', () => {
    const { container } = render(<Stack as="section"><span>a</span></Stack>);
    expect(container.firstChild.tagName).toBe('SECTION');
  });

  it('forwards className and style', () => {
    const { container } = render(<Stack className="x" style={{ padding: '8px' }}><span>a</span></Stack>);
    expect(container.firstChild).toHaveClass('x');
    expect(container.firstChild).toHaveStyle({ padding: '8px' });
  });
});
