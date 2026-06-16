import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFeedbackRouter } from '../router.js';

/**
 * The router unifies the per-destination handlers behind a single
 * /api/feedback/[...rest] route. These tests cover:
 *  - URL-based dispatch to the right handler
 *  - 404 for unknown destinations
 *  - Skipping browser-only and public-token destinations
 *  - The authorize callback being wired into withSecureDefaults
 *  - The routes: override
 */

const FEEDBACK = { feedback: 'pay button broken' };

let origFetch;
beforeEach(() => {
  origFetch = global.fetch;
  process.env.GH_TOKEN = 'srv-tok';
  process.env.GH_REPO  = 'acme/web';
  process.env.LINEAR_API_KEY = 'lk';
  process.env.LINEAR_TEAM_ID = 'team-1';
});
afterEach(() => {
  global.fetch = origFetch;
  delete process.env.GH_TOKEN;
  delete process.env.GH_REPO;
  delete process.env.LINEAR_API_KEY;
  delete process.env.LINEAR_TEAM_ID;
});

function makeRequest(path, body = FEEDBACK) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost',
    },
    body: JSON.stringify(body),
  });
}

const passingAuthorize = async () => ({ userId: 'u1', projectId: 'p1', role: 'developer' });

describe('createFeedbackRouter — dispatch', () => {
  it('routes /api/feedback/github to createGithubHandler', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ number: 42, html_url: 'https://github.com/acme/web/issues/42' }),
    });
    global.fetch = fetchMock;

    const router = createFeedbackRouter({
      destinations: [
        { name: 'github', mode: 'server-proxied' },
      ],
      authorize: passingAuthorize,
    });

    const res = await router(makeRequest('/api/feedback/github'));
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe('42');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/acme/web/issues',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('routes /api/feedback/linear to createLinearHandler', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { issueCreate: { issue: { id: 'L-1', identifier: 'WEB-7', url: 'https://linear.app/x' } } } }),
    });
    global.fetch = fetchMock;

    const router = createFeedbackRouter({
      destinations: [
        { name: 'linear', mode: 'server-proxied' },
      ],
      authorize: passingAuthorize,
    });

    const res = await router(makeRequest('/api/feedback/linear'));
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.data.id).toBe('WEB-7');
  });

  it('returns 404 for a destination not in destinations[]', async () => {
    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: passingAuthorize,
    });
    const res = await router(makeRequest('/api/feedback/notion'));
    expect(res.status).toBe(404);
    const body = JSON.parse(await res.text());
    expect(body.error).toBe('unknown_destination');
    expect(body.destination).toBe('notion');
  });

  it('returns 400 when destination name cannot be parsed from the URL', async () => {
    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: passingAuthorize,
    });
    const res = await router({}); // no req.url at all
    expect(res.status).toBe(400);
  });

  it('skips browser-only adapters (mode: "local") — no server route registered', async () => {
    const router = createFeedbackRouter({
      destinations: [{ name: 'local', mode: 'local' }],
      authorize: passingAuthorize,
    });
    const res = await router(makeRequest('/api/feedback/local'));
    expect(res.status).toBe(404);
  });

  it('skips public-token adapters (supabasePublic, webhook, cloud) — they go browser→destination directly', async () => {
    const router = createFeedbackRouter({
      destinations: [
        { name: 'supabasePublic', mode: 'public-token' },
        { name: 'webhook',        mode: 'public-token' },
        { name: 'cloud',          mode: 'public-token' },
      ],
      authorize: passingAuthorize,
    });
    for (const name of ['supabasePublic', 'webhook', 'cloud']) {
      const res = await router(makeRequest(`/api/feedback/${name}`));
      expect(res.status).toBe(404);
    }
  });
});

describe('createFeedbackRouter — authorize wiring', () => {
  it('refuses requests when authorize throws FeedbackAuthError', async () => {
    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: async () => {
        const e = new Error('no session');
        e.name = 'FeedbackAuthError';
        e.code = 'unauthorized';
        e.statusCode = 401;
        throw e;
      },
    });
    const res = await router(makeRequest('/api/feedback/github'));
    expect(res.status).toBe(401);
  });

  it('refuses to invoke the handler when origin is not allowed', async () => {
    // withSecureDefaults runs the default origin validator — requests
    // without a matching origin/referer are rejected.
    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: passingAuthorize,
    });
    const req = new Request('http://localhost/api/feedback/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://evil.example' },
      body: JSON.stringify(FEEDBACK),
    });
    const res = await router(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('createFeedbackRouter — routes: override', () => {
  it('lets a host wire a custom handler at a named destination', async () => {
    const customHandler = vi.fn().mockResolvedValue({
      data: { id: 'custom-42', url: 'https://custom/42' },
    });
    const router = createFeedbackRouter({
      destinations: [{ name: 'mycustom', mode: 'server-proxied' }],
      routes: { mycustom: customHandler },
      authorize: passingAuthorize,
    });
    const res = await router(makeRequest('/api/feedback/mycustom'));
    expect(res.status).toBe(200);
    expect(customHandler).toHaveBeenCalled();
  });
});

describe('createFeedbackRouter — request shapes', () => {
  it('parses destination from req.nextUrl.pathname (Next.js Pages)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ number: 1, html_url: 'u' }),
    });
    global.fetch = fetchMock;
    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: passingAuthorize,
    });
    // Synthesize a request that exposes nextUrl.pathname instead of url.
    const req = {
      nextUrl: { pathname: '/api/feedback/github' },
      method: 'POST',
      headers: new Headers({ 'content-type': 'application/json', origin: 'http://localhost' }),
      json: async () => FEEDBACK,
      url: 'http://localhost/api/feedback/github',
    };
    const res = await router(req);
    expect(res.status).toBe(200);
  });

  it('honours x-feedback-destination header override', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ number: 1, html_url: 'u' }),
    });
    global.fetch = fetchMock;
    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: passingAuthorize,
    });
    const req = new Request('http://localhost/some/unrelated/path', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
        'x-feedback-destination': 'github',
      },
      body: JSON.stringify(FEEDBACK),
    });
    const res = await router(req);
    expect(res.status).toBe(200);
  });
});

describe('createFeedbackRouter — config validation', () => {
  it('throws when called with no config', () => {
    expect(() => createFeedbackRouter(null)).toThrow();
  });

  it('emits a console warning when no authorize() is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createFeedbackRouter({ destinations: [{ name: 'github', mode: 'server-proxied' }] });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/authorize/));
    warn.mockRestore();
  });
});
