import { describe, it, expect, vi } from 'vitest';
import { dispatchToDestinations } from '../registry.js';
import { local } from '../adapters/local.js';
import { webhook } from '../adapters/webhook.js';

describe('dispatchToDestinations', () => {
  it('returns no-op result when destinations is empty', async () => {
    const r = await dispatchToDestinations([], { feedback: 'hi' });
    expect(r.results).toEqual([]);
    expect(r.anySucceeded).toBe(false);
    expect(r.anyFailed).toBe(false);
  });

  it('fans out in parallel and collects per-destination results', async () => {
    const a = { name: 'a', send: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }) };
    const b = { name: 'b', send: vi.fn().mockResolvedValue({ ok: true, durationMs: 7 }) };
    const r = await dispatchToDestinations([a, b], { feedback: 'hi' });
    expect(a.send).toHaveBeenCalled();
    expect(b.send).toHaveBeenCalled();
    expect(r.results.map((x) => x.name)).toEqual(['a', 'b']);
    expect(r.anySucceeded).toBe(true);
    expect(r.anyFailed).toBe(false);
  });

  it('one adapter failing does not block the others', async () => {
    const fast = { name: 'fast', send: vi.fn().mockResolvedValue({ ok: true, durationMs: 3 }) };
    const slow = { name: 'slow', send: vi.fn().mockResolvedValue({ ok: false, error: 'boom', durationMs: 20 }) };
    const r = await dispatchToDestinations([fast, slow], { feedback: 'hi' });
    expect(r.results[0].ok).toBe(true);
    expect(r.results[1].ok).toBe(false);
    expect(r.results[1].error).toBe('boom');
    expect(r.anySucceeded).toBe(true);
    expect(r.anyFailed).toBe(true);
  });

  it('a thrown promise (not a returned fail result) is normalized to a fail entry', async () => {
    const bad = { name: 'bad', send: vi.fn().mockRejectedValue(new Error('threw')) };
    const r = await dispatchToDestinations([bad], { feedback: 'hi' });
    expect(r.results[0].ok).toBe(false);
    expect(r.results[0].error).toBe('threw');
    expect(r.results[0].code).toBe('destination_threw');
  });
});

describe('local() adapter', () => {
  it('saves to localStorage and returns an id', async () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
    const dest = local({ namespace: 'test-fb' });
    const r = await dest.send({ feedback: 'hello' });
    expect(r.ok).toBe(true);
    expect(r.id).toMatch(/^local-/);
    const stored = JSON.parse(localStorage.getItem('test-fb') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].feedback).toBe('hello');
  });

  it('caps stored entries at 500', async () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
    const dest = local({ namespace: 'test-cap' });
    for (let i = 0; i < 510; i += 1) await dest.send({ feedback: `n${i}` });
    const stored = JSON.parse(localStorage.getItem('test-cap') || '[]');
    expect(stored.length).toBeLessThanOrEqual(500);
  });
});

describe('webhook() adapter', () => {
  it('throws if url is missing or not http(s)', () => {
    expect(() => webhook({})).toThrow(/url/);
    expect(() => webhook({ url: 'file:///etc/passwd' })).toThrow();
  });

  it('refuses leaked private credentials in headers at construction', () => {
    expect(() => webhook({
      url: 'https://hooks.example.com/x',
      headers: { authorization: 'Bearer ghp_abcdefghijklmnopqrstuv' },
    })).toThrow(/GitHub/);
  });

  it('POSTs feedback to the URL and resolves with body fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'srv-1', url: 'https://srv/1' }),
    });
    const origFetch = global.fetch;
    global.fetch = fetchMock;
    const dest = webhook({ url: 'https://hooks.example.com/x' });
    const r = await dest.send({ feedback: 'hi' });
    expect(r.ok).toBe(true);
    expect(r.id).toBe('srv-1');
    expect(r.url).toBe('https://srv/1');
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.example.com/x', expect.objectContaining({ method: 'POST' }));
    global.fetch = origFetch;
  });

  it('surfaces non-2xx as a fail result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false, status: 500, statusText: 'boom',
      text: async () => 'server kaput',
    });
    const origFetch = global.fetch;
    global.fetch = fetchMock;
    const dest = webhook({ url: 'https://hooks.example.com/x' });
    const r = await dest.send({ feedback: 'hi' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/500/);
    global.fetch = origFetch;
  });
});
