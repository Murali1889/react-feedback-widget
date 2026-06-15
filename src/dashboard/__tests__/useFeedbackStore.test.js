import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeedbackStore, LS_KEY } from '../useFeedbackStore.js';

const A = { id: 'a', feedback: 'one', status: 'new' };
const B = { id: 'b', feedback: 'two', status: 'open' };

describe('useFeedbackStore — prop mode', () => {
  it('reflects data prop', () => {
    const { result } = renderHook(() => useFeedbackStore({ mode: 'prop', data: [A, B] }));
    expect(result.current.items).toEqual([A, B]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reacts to data prop change', () => {
    const { result, rerender } = renderHook(({ d }) => useFeedbackStore({ mode: 'prop', data: d }), { initialProps: { d: [A] } });
    expect(result.current.items).toEqual([A]);
    rerender({ d: [A, B] });
    expect(result.current.items).toEqual([A, B]);
  });
});

describe('useFeedbackStore — localStorage mode', () => {
  beforeEach(() => localStorage.clear());

  it('loads from default key', () => {
    localStorage.setItem(LS_KEY, JSON.stringify([A, B]));
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    expect(result.current.items).toEqual([A, B]);
  });

  it('archives corrupt data and returns empty', () => {
    localStorage.setItem(LS_KEY, '{not json');
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(LS_KEY + '.bak')).toBe('{not json');
  });

  it('save merges by id and writes back', async () => {
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    await act(async () => { await result.current.save(A); });
    await act(async () => { await result.current.save({ ...A, status: 'resolved' }); });
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([{ ...A, status: 'resolved' }]);
  });

  it('remove deletes by id', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify([A, B]));
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    await act(async () => { await result.current.remove('a'); });
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([B]);
  });
});

describe('useFeedbackStore — source mode', () => {
  it('calls load() on mount and exposes items', async () => {
    const source = { load: vi.fn().mockResolvedValue([A, B]) };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items.length).toBe(2));
    expect(source.load).toHaveBeenCalled();
  });

  it('surfaces load error', async () => {
    const source = { load: vi.fn().mockRejectedValue(new Error('boom')) };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.items).toEqual([]);
  });

  it('subscribe updates items live', async () => {
    let cb;
    const source = {
      load: vi.fn().mockResolvedValue([A]),
      subscribe: vi.fn((fn) => { cb = fn; return () => {}; }),
    };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items).toEqual([A]));
    act(() => cb([A, B]));
    expect(result.current.items).toEqual([A, B]);
  });

  it('refresh re-fires load', async () => {
    const source = { load: vi.fn().mockResolvedValueOnce([A]).mockResolvedValueOnce([A, B]) };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => expect(result.current.items.length).toBe(2));
  });

  it('save delegates to source.save', async () => {
    const source = { load: vi.fn().mockResolvedValue([A]), save: vi.fn().mockResolvedValue() };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    await act(async () => { await result.current.save({ ...A, status: 'resolved' }); });
    expect(source.save).toHaveBeenCalled();
  });
});
