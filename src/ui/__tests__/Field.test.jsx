import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Field } from '../primitives/Field.jsx';

describe('Field', () => {
  it('renders an input with the given label', () => {
    const { getByLabelText } = render(<Field label="Email" />);
    expect(getByLabelText('Email')).toBeInTheDocument();
  });

  it('wires the label to the input via id', () => {
    const { getByLabelText } = render(<Field label="Email" />);
    const input = getByLabelText('Email');
    expect(input.id).toBeTruthy();
  });

  it('renders helperText when no error', () => {
    const { getByText } = render(<Field label="Email" helperText="we wont spam you" />);
    expect(getByText('we wont spam you')).toBeInTheDocument();
  });

  it('error replaces helperText and sets aria-invalid', () => {
    const { getByLabelText, getByText, queryByText } = render(
      <Field label="Email" helperText="ok" error="invalid" />
    );
    expect(queryByText('ok')).not.toBeInTheDocument();
    expect(getByText('invalid')).toBeInTheDocument();
    expect(getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('required shows an asterisk', () => {
    const { getByText } = render(<Field label="Email" required />);
    expect(getByText('*')).toBeInTheDocument();
  });

  it('forwards refs to the input', () => {
    const ref = React.createRef();
    render(<Field label="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('multiline renders a textarea and forwards ref to it', () => {
    const ref = React.createRef();
    const { getByLabelText } = render(<Field label="Notes" multiline ref={ref} />);
    expect(getByLabelText('Notes').tagName).toBe('TEXTAREA');
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('onChange fires', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<Field label="x" onChange={onChange} />);
    fireEvent.change(getByLabelText('x'), { target: { value: 'hi' } });
    expect(onChange).toHaveBeenCalled();
  });
});
