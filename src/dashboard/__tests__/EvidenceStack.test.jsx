import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { EvidenceStack } from '../EvidenceStack.jsx';

const item = {
  id: '1', feedback: 'thing broken', type: 'bug', severity: 'high',
  userName: 'M', url: '/x', timestamp: new Date().toISOString(),
  screenshot: 'data:image/png;base64,abc',
  eventLogs: [{ type: 'console', level: 'error', message: 'X' }],
  elementInfo: { selector: 'a.b', componentStack: ['App'], sourceFile: 'src/X.jsx:1' },
};

describe('EvidenceStack', () => {
  beforeEach(() => localStorage.clear());

  it('renders sticky header with title and chips', () => {
    render(<EvidenceStack item={item} />);
    expect(screen.getAllByText('thing broken').length).toBeGreaterThan(0);
  });

  it('renders all four sections when applicable', () => {
    render(<EvidenceStack item={item} />);
    expect(screen.getByRole('button', { name: /what the user said/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /visual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /source/i })).toBeInTheDocument();
  });

  it('clicking a section header collapses its body', () => {
    render(<EvidenceStack item={item} />);
    const logsHeader = screen.getByRole('button', { name: /logs/i });
    fireEvent.click(logsHeader);
    expect(screen.queryByText('[ERROR] X')).not.toBeInTheDocument();
  });

  it('renders nothing when item is null', () => {
    const { container } = render(<EvidenceStack item={null} />);
    expect(container.textContent).toMatch(/select a feedback/i);
  });
});
