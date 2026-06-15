import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { TriageList } from '../TriageList.jsx';
import { CommandCenterProvider } from '../CommandCenterContext.jsx';

const items = [
  { id: '1', feedback: 'one', status: 'new', severity: 'high', timestamp: new Date().toISOString() },
  { id: '2', feedback: 'two', status: 'open', severity: 'low', timestamp: new Date().toISOString() },
];

function wrap(ui) {
  return <CommandCenterProvider>{ui}</CommandCenterProvider>;
}

describe('TriageList', () => {
  it('renders one row per item', () => {
    render(wrap(<TriageList items={items} />));
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('search filters items', async () => {
    vi.useFakeTimers();
    render(wrap(<TriageList items={items} />));
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'two' } });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.queryByText('one')).not.toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows empty-state when no items', () => {
    render(wrap(<TriageList items={[]} />));
    expect(screen.getByText(/no feedback yet/i)).toBeInTheDocument();
  });

  it('shows filtered-empty when filters exclude everything', async () => {
    vi.useFakeTimers();
    render(wrap(<TriageList items={items} />));
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'noresults' } });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getByText(/no feedback matches/i)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
