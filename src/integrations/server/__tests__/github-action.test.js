import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGithubActionHandler } from '../github-action.js';

const FEEDBACK = {
  feedback: 'Pay button does nothing on /checkout',
  type: 'bug',
  severity: 'P1',
};
const AUTH_CTX = { authContext: { userId: 'u1', projectId: 'p1' } };

let origFetch;
beforeEach(() => { origFetch = global.fetch; });
afterEach(() => { global.fetch = origFetch; });

describe('createGithubActionHandler', () => {
  it('POSTs to /repos/:repo/dispatches with event_type + client_payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 204,
      text: async () => '',
    });
    global.fetch = fetchMock;
    const handler = createGithubActionHandler({ token: 't', repo: 'acme/web' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.dispatched).toBe(true);
    expect(result.data.url).toBe('https://github.com/acme/web/actions');
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://api.github.com/repos/acme/web/dispatches');
    expect(init.headers.authorization).toBe('Bearer t');
    const body = JSON.parse(init.body);
    expect(body.event_type).toBe('feedback'); // default
    expect(body.client_payload.feedback.feedback).toBe('Pay button does nothing on /checkout');
  });

  it('honors a custom eventType from config or env', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    global.fetch = fetchMock;
    const handler = createGithubActionHandler({ token: 't', repo: 'acme/web', eventType: 'bug-report' });
    await handler(FEEDBACK, AUTH_CTX);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event_type).toBe('bug-report');
  });

  it('throws when GH_TOKEN missing', async () => {
    const handler = createGithubActionHandler({});
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/GH_TOKEN/);
  });

  it('surfaces a github error with status + body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 422,
      text: async () => 'invalid event_type',
    });
    const handler = createGithubActionHandler({ token: 't', repo: 'acme/web' });
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/github 422/);
  });

  it('bundles the full feedback under client_payload.feedback (single key)', async () => {
    // GitHub caps client_payload at 10 top-level keys — we never use more than 1.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    global.fetch = fetchMock;
    const handler = createGithubActionHandler({ token: 't', repo: 'acme/web' });
    await handler({ ...FEEDBACK, a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 }, AUTH_CTX);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body.client_payload)).toEqual(['feedback']);
  });
});
