import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFeedbackHandler } from '../createFeedbackHandler.js';
import { FeedbackAuthError } from '../../../lib/feedbackErrors.js';

const FEEDBACK = { feedback: 'something broke' };
const PASS = async () => ({ userId: 'u1', projectId: 'p1', role: 'developer' });

let origEnv;
let origFetch;
beforeEach(() => {
  origEnv = process.env.NODE_ENV;
  origFetch = global.fetch;
});
afterEach(() => {
  process.env.NODE_ENV = origEnv;
  global.fetch = origFetch;
});

describe('createFeedbackHandler — strict-defaults sugar', () => {
  it('returns a working router when authorize is provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ number: 1, html_url: 'https://x' }),
    });
    process.env.GITHUB_TOKEN = 't';
    process.env.GITHUB_REPO  = 'acme/web';

    const handler = createFeedbackHandler({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: PASS,
    });

    const req = new Request('http://localhost/api/feedback/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify(FEEDBACK),
    });
    const res = await handler(req);
    expect(res.status).toBe(200);

    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
  });

  it('throws at construction when NODE_ENV=production AND no authorize given', () => {
    process.env.NODE_ENV = 'production';
    expect(() => createFeedbackHandler({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
    })).toThrow(/production refusal/);
  });

  it('allows production with explicit `auth: { mode: "none" }` (opt-in to open)', () => {
    process.env.NODE_ENV = 'production';
    const handler = createFeedbackHandler({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      auth: { mode: 'none' },
    });
    expect(typeof handler).toBe('function');
  });

  it('allows dev mode (NODE_ENV !== production) without authorize', () => {
    process.env.NODE_ENV = 'development';
    const handler = createFeedbackHandler({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
    });
    expect(typeof handler).toBe('function');
  });

  it('treats authorize returning null/undefined as a 401 (friendly contract)', async () => {
    const handler = createFeedbackHandler({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: async () => null, // not a real session
    });
    const req = new Request('http://localhost/api/feedback/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify(FEEDBACK),
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('throws on null config (defensive)', () => {
    expect(() => createFeedbackHandler(null)).toThrow();
  });
});
