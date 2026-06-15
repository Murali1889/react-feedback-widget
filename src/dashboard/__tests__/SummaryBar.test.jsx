import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SummaryBar } from '../SummaryBar.jsx';
import { CommandCenterProvider, useCommandCenter } from '../CommandCenterContext.jsx';

const items = [
  { id: '1', status: 'new', eventLogs: [{ type: 'console', level: 'error' }] },
  { id: '2', status: 'new', screenshot: 'x' },
  { id: '3', status: 'resolved', owner: { name: 'A' } },
];

function ReadFilters() {
  const { filters } = useCommandCenter();
  return <span data-testid="state">{JSON.stringify({ statuses: [...filters.statuses], flags: [...filters.flags] })}</span>;
}

describe('SummaryBar', () => {
  it('renders status counts', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /></CommandCenterProvider>);
    expect(screen.getByText(/^New ·/)).toBeInTheDocument();
  });

  it('renders needs-attention counts', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /></CommandCenterProvider>);
    expect(screen.getByText(/needs owner/i)).toBeInTheDocument();
  });

  it('clicking a status chip toggles the filter', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /><ReadFilters /></CommandCenterProvider>);
    fireEvent.click(screen.getByText(/^New ·/));
    expect(screen.getByTestId('state').textContent).toContain('"statuses":["new"]');
    fireEvent.click(screen.getByText(/^New ·/));
    expect(screen.getByTestId('state').textContent).toContain('"statuses":[]');
  });

  it('clicking a needs-attention chip toggles flag filter', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /><ReadFilters /></CommandCenterProvider>);
    fireEvent.click(screen.getByText(/has errors/i));
    expect(screen.getByTestId('state').textContent).toContain('"flags":["hasErrors"]');
  });
});
