import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from '../primitives/Button.jsx';

describe('Button', () => {
  it('renders children', () => {
    const { getByText } = render(<Button>Send</Button>);
    expect(getByText('Send')).toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    const { getByRole } = render(<Button>x</Button>);
    expect(getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('clicks fire onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('disabled blocks onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button disabled onClick={onClick}>x</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading sets aria-busy and renders a spinner', () => {
    const { getByRole, container } = render(<Button loading>Submit</Button>);
    expect(getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('[role="status"], [aria-hidden="true"]')).toBeInTheDocument();
  });

  it('loading is also disabled', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button loading onClick={onClick}>x</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders leftIcon and rightIcon slots', () => {
    const { getByText } = render(
      <Button leftIcon={<span>L</span>} rightIcon={<span>R</span>}>Mid</Button>
    );
    expect(getByText('L')).toBeInTheDocument();
    expect(getByText('Mid')).toBeInTheDocument();
    expect(getByText('R')).toBeInTheDocument();
  });

  it('variant=primary is the default and applies a data attribute', () => {
    const { getByRole } = render(<Button>x</Button>);
    expect(getByRole('button')).toHaveAttribute('data-variant', 'primary');
  });

  it('variant=danger applies the danger data attribute', () => {
    const { getByRole } = render(<Button variant="danger">Delete</Button>);
    expect(getByRole('button')).toHaveAttribute('data-variant', 'danger');
  });

  it('size=lg applies the size data attribute', () => {
    const { getByRole } = render(<Button size="lg">x</Button>);
    expect(getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('fullWidth adds width:100%', () => {
    const { getByRole } = render(<Button fullWidth>x</Button>);
    expect(getByRole('button')).toHaveStyle({ width: '100%' });
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
