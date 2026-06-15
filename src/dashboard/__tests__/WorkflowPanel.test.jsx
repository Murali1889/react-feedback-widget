import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { WorkflowPanel } from '../WorkflowPanel.jsx';

const item = { id: '1', feedback: 'x', status: 'new', severity: 'high' };
const statuses = { new: { label: 'New' }, resolved: { label: 'Resolved' } };

describe('WorkflowPanel', () => {
  it('renders status, severity, handoff when not developer', () => {
    render(<WorkflowPanel item={item} statuses={statuses} onStatusChange={() => {}} isDeveloper={false} />);
    expect(screen.getByText(/New/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /copy as/i }).length).toBeGreaterThan(0);
  });

  it('shows owner/customer/integrations/delete when developer', () => {
    const fullItem = { ...item, integrationState: { jira: { status: 'created', issueKey: 'A-1' } }, owner: { name: 'Alex' } };
    render(<WorkflowPanel item={fullItem} statuses={statuses} onStatusChange={() => {}} onOwnerChange={() => {}} onDelete={() => {}} onIntegrationRetry={() => {}} isDeveloper={true} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('A-1')).toBeInTheDocument();
    expect(screen.getByText(/delete/i)).toBeInTheDocument();
  });

  it('returns the empty placeholder when no item selected', () => {
    const { container } = render(<WorkflowPanel item={null} statuses={statuses} />);
    expect(container.textContent).toMatch(/select/i);
  });

  it('status change fires callback', () => {
    const fn = vi.fn();
    render(<WorkflowPanel item={item} statuses={statuses} onStatusChange={fn} isDeveloper={false} />);
    fireEvent.click(screen.getByText('New'));
    fireEvent.click(screen.getByText('Resolved'));
    expect(fn).toHaveBeenCalledWith('1', 'resolved');
  });
});
