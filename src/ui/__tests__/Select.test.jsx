import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../primitives/Select.jsx';

const OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function Controlled({ multiple = false, onChangeMock }) {
  const [v, setV] = useState(multiple ? [] : '');
  return (
    <Select
      options={OPTIONS}
      value={v}
      onChange={(next) => { setV(next); onChangeMock?.(next); }}
      multiple={multiple}
      placeholder="Pick one"
    />
  );
}

describe('Select', () => {
  it('renders the trigger with placeholder', () => {
    render(<Controlled />);
    expect(screen.getByRole('button')).toHaveTextContent('Pick one');
  });

  it('opens the popover and lists options', () => {
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('selects an option on click and closes', () => {
    const onChange = vi.fn();
    render(<Controlled onChangeMock={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Medium'));
    expect(onChange).toHaveBeenCalledWith('med');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('arrow keys navigate and Enter selects', () => {
    const onChange = vi.fn();
    render(<Controlled onChangeMock={onChange} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('med');
  });

  it('Escape closes', () => {
    render(<Controlled />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('multiple keeps popover open and toggles values', () => {
    const onChange = vi.fn();
    render(<Controlled multiple onChangeMock={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Low'));
    expect(onChange).toHaveBeenCalledWith(['low']);
    fireEvent.click(screen.getByText('High'));
    expect(onChange).toHaveBeenLastCalledWith(['low', 'high']);
    fireEvent.click(screen.getByText('Low'));
    expect(onChange).toHaveBeenLastCalledWith(['high']);
  });

  it('renderTrigger overrides trigger UI', () => {
    render(
      <Select
        options={OPTIONS}
        value="low"
        onChange={() => {}}
        renderTrigger={() => <span data-testid="custom-trigger">Custom</span>}
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });
});
