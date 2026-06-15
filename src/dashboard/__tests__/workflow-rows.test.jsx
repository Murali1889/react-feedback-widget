import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SeverityRow } from '../workflow/SeverityRow.jsx';
import { OwnerRow } from '../workflow/OwnerRow.jsx';
import { CustomerRow } from '../workflow/CustomerRow.jsx';
import { IntegrationsRow } from '../workflow/IntegrationsRow.jsx';
import { HandoffRow } from '../workflow/HandoffRow.jsx';
import { DangerRow } from '../workflow/DangerRow.jsx';

const baseItem = { id: '1', feedback: 'x', severity: 'high', userName: 'M' };

describe('SeverityRow', () => {
  it('selects a new severity', () => {
    const fn = vi.fn();
    render(<SeverityRow item={baseItem} onChange={fn} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Critical'));
    expect(fn).toHaveBeenCalledWith('1', 'critical');
  });
});

describe('OwnerRow', () => {
  it('hidden when isDeveloper is false', () => {
    const { container } = render(<OwnerRow item={baseItem} isDeveloper={false} onChange={() => {}} />);
    expect(container.textContent).toBe('');
  });

  it('shows "Unassigned" when no owner', () => {
    render(<OwnerRow item={baseItem} isDeveloper={true} onChange={() => {}} />);
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  it('renders the owner name when set', () => {
    render(<OwnerRow item={{ ...baseItem, owner: { name: 'Alex' } }} isDeveloper={true} onChange={() => {}} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
  });
});

describe('CustomerRow', () => {
  it('hidden when isDeveloper is false', () => {
    const { container } = render(<CustomerRow item={baseItem} isDeveloper={false} onChange={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('renders existing customerValue chip', () => {
    render(<CustomerRow item={{ ...baseItem, customerValue: 'Acme' }} isDeveloper={true} onChange={() => {}} />);
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});

describe('IntegrationsRow', () => {
  it('hidden when no integrationState set', () => {
    const { container } = render(<IntegrationsRow item={baseItem} isDeveloper={true} onRetry={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('hidden when isDeveloper is false', () => {
    const item = { ...baseItem, integrationState: { jira: { status: 'created', issueKey: 'X-1' } } };
    const { container } = render(<IntegrationsRow item={item} isDeveloper={false} onRetry={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('renders the jira issue key when present', () => {
    const item = { ...baseItem, integrationState: { jira: { status: 'created', issueKey: 'X-1' } } };
    render(<IntegrationsRow item={item} isDeveloper={true} onRetry={() => {}} />);
    expect(screen.getByText('X-1')).toBeInTheDocument();
  });
  it('shows retry icon when state is error', () => {
    const item = { ...baseItem, integrationState: { jira: { status: 'error', error: 'boom' } } };
    const fn = vi.fn();
    render(<IntegrationsRow item={item} isDeveloper={true} onRetry={fn} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(fn).toHaveBeenCalledWith('1', 'jira');
  });
});

describe('HandoffRow', () => {
  it('copies short handoff text to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<HandoffRow item={baseItem} />);
    fireEvent.click(screen.getByRole('button', { name: /copy as/i }));
    fireEvent.click(screen.getByText(/short/i));
    expect(writeText).toHaveBeenCalled();
  });
});

describe('DangerRow', () => {
  it('hidden when isDeveloper is false', () => {
    const { container } = render(<DangerRow item={baseItem} isDeveloper={false} onDelete={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('confirms before deleting', () => {
    const fn = vi.fn();
    render(<DangerRow item={baseItem} isDeveloper={true} onDelete={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledWith('1');
  });
});
