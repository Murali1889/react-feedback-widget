import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { ConfirmButton } from '../ConfirmButton.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ConfirmButton', () => {
  it('first click switches to confirm label without firing', () => {
    const fn = vi.fn();
    const { getByRole } = render(<ConfirmButton onConfirm={fn} confirmLabel="Confirm delete">Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent('Confirm delete');
    expect(fn).not.toHaveBeenCalled();
  });

  it('second click within timeout fires onConfirm', () => {
    const fn = vi.fn();
    const { getByRole } = render(<ConfirmButton onConfirm={fn}>Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    fireEvent.click(getByRole('button'));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('reverts to initial label after timeout', () => {
    const { getByRole } = render(<ConfirmButton onConfirm={() => {}} timeoutMs={1000}>Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent(/confirm/i);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(getByRole('button')).toHaveTextContent('Delete');
  });

  it('reverts on blur', () => {
    const { getByRole } = render(<ConfirmButton onConfirm={() => {}}>Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    fireEvent.blur(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent('Delete');
  });
});
