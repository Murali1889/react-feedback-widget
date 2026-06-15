import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionState, SECTION_LS_KEY } from '../useSectionState.js';

describe('useSectionState', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to open for any section', () => {
    const { result } = renderHook(() => useSectionState());
    expect(result.current.isOpen('user-signal')).toBe(true);
    expect(result.current.isOpen('logs')).toBe(true);
  });

  it('toggle flips open <-> closed', () => {
    const { result } = renderHook(() => useSectionState());
    act(() => result.current.toggle('logs'));
    expect(result.current.isOpen('logs')).toBe(false);
    act(() => result.current.toggle('logs'));
    expect(result.current.isOpen('logs')).toBe(true);
  });

  it('setOpen sets exact value', () => {
    const { result } = renderHook(() => useSectionState());
    act(() => result.current.setOpen('source', false));
    expect(result.current.isOpen('source')).toBe(false);
  });

  it('persists to localStorage (debounced)', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSectionState());
    act(() => result.current.toggle('logs'));
    act(() => { vi.advanceTimersByTime(250); });
    expect(JSON.parse(localStorage.getItem(SECTION_LS_KEY))).toEqual({ logs: 'closed' });
    vi.useRealTimers();
  });

  it('restores from localStorage on mount', () => {
    localStorage.setItem(SECTION_LS_KEY, JSON.stringify({ logs: 'closed' }));
    const { result } = renderHook(() => useSectionState());
    expect(result.current.isOpen('logs')).toBe(false);
    expect(result.current.isOpen('source')).toBe(true);
  });
});
