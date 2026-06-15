import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { WorkflowStatusControl } from '../workflow/WorkflowStatusControl.jsx';

const statuses = {
  new: { label: 'New', color: '#888', bgColor: '#eee', textColor: '#000' },
  open: { label: 'Open', color: '#888', bgColor: '#eee', textColor: '#000' },
  resolved: { label: 'Resolved', color: '#16a34a', bgColor: '#d1fae5', textColor: '#047857' },
};

describe('WorkflowStatusControl', () => {
  it('renders the current status label', () => {
    render(<WorkflowStatusControl status="new" statuses={statuses} onChange={() => {}} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('opens the popover and selects a new status', () => {
    const fn = vi.fn();
    render(<WorkflowStatusControl status="new" statuses={statuses} onChange={fn} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Resolved'));
    expect(fn).toHaveBeenCalledWith('resolved');
  });
});
