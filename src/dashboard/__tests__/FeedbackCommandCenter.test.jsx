import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { FeedbackCommandCenter } from '../FeedbackCommandCenter.jsx';

const items = [
  { id: '1', feedback: 'one', status: 'new', timestamp: new Date(Date.now() - 5000).toISOString() },
  { id: '2', feedback: 'two', status: 'open', timestamp: new Date().toISOString() },
];

describe('FeedbackCommandCenter', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(<FeedbackCommandCenter isOpen={false} onClose={() => {}} data={items} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders shell when open', () => {
    render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    expect(screen.getAllByText(/Feedback/).length).toBeGreaterThan(0);
  });

  it('Esc fires onClose', () => {
    const fn = vi.fn();
    render(<FeedbackCommandCenter isOpen onClose={fn} data={items} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fn).toHaveBeenCalled();
  });

  it('clicking the backdrop fires onClose', () => {
    const fn = vi.fn();
    const { container } = render(<FeedbackCommandCenter isOpen onClose={fn} data={items} />);
    const backdrop = container.querySelector('[data-role="backdrop"]');
    fireEvent.click(backdrop);
    expect(fn).toHaveBeenCalled();
  });

  it('shows item count chip', () => {
    render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it('defaults selection to the newest unresolved item', () => {
    render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    expect(screen.getAllByText('two').length).toBeGreaterThan(0);
  });
});
