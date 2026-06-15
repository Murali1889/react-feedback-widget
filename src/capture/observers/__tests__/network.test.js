import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountNetworkObserver } from '../network.js';
import { createRingBuffer } from '../../ringBuffer.js';

describe('mountNetworkObserver', () => {
  let buffer;
  let originalFetch;

  beforeEach(() => {
    buffer = createRingBuffer(8);
    originalFetch = window.fetch;
  });

  it('captures successful fetch requests', async () => {
    window.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true });
    const unmount = mountNetworkObserver(buffer);
    await window.fetch('https://api.example.com/users', { method: 'GET' });
    unmount();
    const entries = buffer.snapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: 'fetch',
      method: 'GET',
      url: 'https://api.example.com/users',
      status: 200,
      ok: true,
    });
    expect(entries[0].duration).toBeTypeOf('number');
    window.fetch = originalFetch;
  });

  it('captures failed fetch with error message', async () => {
    window.fetch = vi.fn().mockRejectedValue(new Error('boom'));
    const unmount = mountNetworkObserver(buffer);
    await expect(window.fetch('https://api.example.com/x')).rejects.toThrow('boom');
    unmount();
    const entries = buffer.snapshot();
    expect(entries[0]).toMatchObject({ ok: false, error: 'boom' });
    window.fetch = originalFetch;
  });

  it('skips excluded patterns (analytics by default)', async () => {
    window.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true });
    const unmount = mountNetworkObserver(buffer);
    await window.fetch('https://api.segment.io/v1/track');
    await window.fetch('https://api.example.com/real');
    unmount();
    const entries = buffer.snapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe('https://api.example.com/real');
    window.fetch = originalFetch;
  });

  it('honors custom exclude patterns', async () => {
    window.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true });
    const unmount = mountNetworkObserver(buffer, { excludePatterns: ['/health'] });
    await window.fetch('https://api.example.com/health');
    await window.fetch('https://api.example.com/users');
    unmount();
    expect(buffer.snapshot()).toHaveLength(1);
    window.fetch = originalFetch;
  });

  it('unmount restores original fetch', () => {
    const wrapped = window.fetch;
    const unmount = mountNetworkObserver(buffer);
    expect(window.fetch).not.toBe(wrapped);
    unmount();
    expect(window.fetch).toBe(wrapped);
  });
});
