import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { Tooltip } from '../primitives/Tooltip.jsx';
import { IconButton } from '../primitives/IconButton.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Tooltip', () => {
  it('does not render content initially', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    expect(screen.queryByText('More info')).not.toBeInTheDocument();
  });

  it('shows after hover + delay', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getByRole('tooltip')).toHaveTextContent('More info');
  });

  it('hides on mouseleave', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    fireEvent.mouseLeave(screen.getByText('Hover me'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on focus', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.focus(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides on Escape', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.focus(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    fireEvent.keyDown(screen.getByText('Hover me'), { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('IconButton tooltip prop', () => {
  it('wraps in Tooltip and shows on hover', () => {
    render(<IconButton aria-label="More" tooltip="More options" icon={<span>⋯</span>} />);
    fireEvent.mouseEnter(screen.getByRole('button'));
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getByRole('tooltip')).toHaveTextContent('More options');
  });
});
