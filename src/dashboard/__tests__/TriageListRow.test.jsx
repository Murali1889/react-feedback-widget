import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { TriageListRow } from '../TriageListRow.jsx';

const base = {
  id: '1', feedback: 'Submit button broken on checkout', type: 'bug',
  status: 'new', severity: 'high', userName: 'Murali', userEmail: 'm@x.com',
  url: '/checkout', timestamp: new Date().toISOString(),
};

describe('TriageListRow', () => {
  it('renders title and preview text', () => {
    render(<TriageListRow item={base} selected={false} onSelect={() => {}} />);
    expect(screen.getAllByText(/Submit button broken/).length).toBeGreaterThan(0);
  });

  it('click calls onSelect with id', () => {
    const fn = vi.fn();
    render(<TriageListRow item={base} selected={false} onSelect={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledWith('1');
  });

  it('Enter activates onSelect', () => {
    const fn = vi.fn();
    render(<TriageListRow item={base} selected={false} onSelect={fn} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(fn).toHaveBeenCalledWith('1');
  });

  it('aria-current reflects selected prop', () => {
    const { rerender } = render(<TriageListRow item={base} selected={false} onSelect={() => {}} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-current');
    rerender(<TriageListRow item={base} selected={true} onSelect={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true');
  });

  it('renders screenshot thumbnail when item has screenshot', () => {
    const item = { ...base, screenshot: 'data:image/png;base64,abc' };
    const { container } = render(<TriageListRow item={item} selected={false} onSelect={() => {}} />);
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});
