import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFeedbackRouter } from '../router.js';
import { buildMultipartFromPayload } from '../../../destinations/multipart.js';

const PAYLOAD = {
  feedback: 'pay button does nothing',
  type: 'bug',
  severity: 'P1',
  url: 'https://shop.example.com/checkout',
  userName: 'alice',
};
const screenshot = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });

let origFetch;
beforeEach(() => {
  origFetch = global.fetch;
  process.env.GITHUB_TOKEN = 'tok';
  process.env.GITHUB_REPO = 'acme/web';
});
afterEach(() => {
  global.fetch = origFetch;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_REPO;
});

describe('router + multipart', () => {
  it('parses a multipart request and dispatches to the right handler', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ number: 7, html_url: 'https://github.com/acme/web/issues/7' }),
    });
    global.fetch = fetchMock;

    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: async () => ({ userId: 'u1', projectId: 'p1', role: 'developer' }),
    });

    const fd = buildMultipartFromPayload({ ...PAYLOAD, screenshot });
    expect(fd).not.toBeNull();

    const req = new Request('http://localhost/api/feedback/github', {
      method: 'POST',
      headers: { origin: 'http://localhost' },
      body: fd,
    });
    const res = await router(req);
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe('7');

    // The github handler should still have received the metadata fields.
    const ghCall = fetchMock.mock.calls[0];
    expect(ghCall[0]).toBe('https://api.github.com/repos/acme/web/issues');
    const ghPayload = JSON.parse(ghCall[1].body);
    expect(ghPayload.title).toContain('pay button');
  });

  it('JSON requests still work — multipart is opt-in based on payload content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ number: 1, html_url: 'u' }),
    });
    global.fetch = fetchMock;
    const router = createFeedbackRouter({
      destinations: [{ name: 'github', mode: 'server-proxied' }],
      authorize: async () => ({ userId: 'u1', projectId: 'p1' }),
    });
    const req = new Request('http://localhost/api/feedback/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify(PAYLOAD),
    });
    const res = await router(req);
    expect(res.status).toBe(200);
  });
});
