import { describe, it, expect, vi } from 'vitest';
import { snapshotFlags } from '../observers/flags.js';

describe('snapshotFlags', () => {
  it('calls the host adapter and returns its result', async () => {
    const fn = vi.fn().mockReturnValue({ a: 1, b: 'two' });
    expect(await snapshotFlags(fn)).toEqual({ a: 1, b: 'two' });
    expect(fn).toHaveBeenCalledOnce();
  });
  it('supports async adapter', async () => {
    const fn = vi.fn().mockResolvedValue({ async: true });
    expect(await snapshotFlags(fn)).toEqual({ async: true });
  });
  it('catches adapter errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    expect(await snapshotFlags(fn)).toEqual({ error: 'snapshot_failed' });
  });
  it('returns empty when no adapter', async () => {
    expect(await snapshotFlags()).toEqual({});
  });
});
