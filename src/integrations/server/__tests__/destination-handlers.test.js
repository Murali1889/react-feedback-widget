import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGithubHandler } from '../github.js';
import { createLinearHandler } from '../linear.js';
import { createNotionHandler } from '../notion.js';
import { createSupabaseHandler } from '../supabase.js';
import { createWebhookHandler } from '../webhook.js';

/**
 * Each handler can be invoked two ways:
 *
 *   1. wrapped path: withSecureDefaults passes (feedbackData, { authContext })
 *      and expects { data } in return.
 *   2. raw path: invoked with a Web Request, expects a Response back.
 *
 * These tests exercise the wrapped path (the recommended one) — that's
 * where withSecureDefaults already enforced origin / CSRF / authorize /
 * rate-limit / redaction. The raw path is covered indirectly via the
 * "missing env" failure cases.
 */

const FEEDBACK = {
  feedback: 'Pay button does nothing on /checkout',
  type: 'bug',
  severity: 'P1',
  labels: ['ui', 'critical-path'],
  url: 'https://shop.example.com/checkout',
  userName: 'alice',
  aiTicket: { markdown: '# Bug\n\n## Where\n- `src/Checkout.jsx:42`' },
};
const AUTH_CTX = { authContext: { userId: 'u1', projectId: 'p1', origin: 'https://shop.example.com' } };

let origFetch;
beforeEach(() => { origFetch = global.fetch; });
afterEach(() => { global.fetch = origFetch; });

describe('createGithubHandler', () => {
  it('POSTs to /repos/:repo/issues with title, body and labels', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ number: 42, html_url: 'https://github.com/acme/web/issues/42' }),
    });
    global.fetch = fetchMock;
    const handler = createGithubHandler({ token: 't', repo: 'acme/web' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('42');
    expect(result.data.url).toBe('https://github.com/acme/web/issues/42');
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://api.github.com/repos/acme/web/issues');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer t');
    const body = JSON.parse(init.body);
    expect(body.title).toContain('Pay button');
    expect(body.body).toContain('Where');
    expect(body.labels).toContain('ui');
    expect(body.labels).toContain('severity:P1');
    expect(body.labels).toContain('type:bug');
  });

  it('throws when GITHUB_TOKEN missing', async () => {
    const handler = createGithubHandler({});
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/GITHUB_TOKEN/);
  });

  it('surfaces a github error with status and body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 422,
      text: async () => 'validation failed',
    });
    const handler = createGithubHandler({ token: 't', repo: 'acme/web' });
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/github 422/);
  });
});

describe('createLinearHandler', () => {
  it('POSTs an issueCreate GraphQL mutation with priority mapped from severity', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { issueCreate: { success: true, issue: { id: 'L-1', identifier: 'WEB-42', url: 'https://linear.app/x/issue/WEB-42' } } } }),
    });
    global.fetch = fetchMock;
    const handler = createLinearHandler({ token: 'lk', teamId: 'team-1' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('WEB-42');
    expect(result.data.url).toContain('linear.app');
    const init = fetchMock.mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.variables.input.teamId).toBe('team-1');
    expect(body.variables.input.priority).toBe(2); // P1 -> 2
    expect(body.variables.input.title).toContain('Pay button');
  });

  it('throws when graphql returns errors[]', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'team not found' }] }),
    });
    const handler = createLinearHandler({ token: 'lk', teamId: 'team-1' });
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/team not found/);
  });

  it('defaults priority to P2/medium (3) when severity missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { issueCreate: { success: true, issue: { id: 'L-1', identifier: 'WEB-2', url: 'u' } } } }),
    });
    global.fetch = fetchMock;
    const handler = createLinearHandler({ token: 'lk', teamId: 'team-1' });
    await handler({ ...FEEDBACK, severity: undefined }, AUTH_CTX);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables.input.priority).toBe(3);
  });
});

describe('createNotionHandler', () => {
  it('POSTs a page with title + severity select + chunked body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'page-1', url: 'https://notion.so/page-1' }),
    });
    global.fetch = fetchMock;
    const handler = createNotionHandler({ token: 'nt', databaseId: 'db-1' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('page-1');
    const init = fetchMock.mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.parent.database_id).toBe('db-1');
    expect(body.properties.Name.title[0].text.content).toContain('Pay button');
    expect(body.properties.Severity.select.name).toBe('P1');
    expect(body.properties.Type.select.name).toBe('bug');
    expect(init.headers['notion-version']).toBe('2022-06-28');
  });

  it('honors a custom titleProperty', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ id: 'p', url: 'u' }),
    });
    global.fetch = fetchMock;
    const handler = createNotionHandler({ token: 'nt', databaseId: 'db-1', titleProperty: 'Issue' });
    await handler(FEEDBACK, AUTH_CTX);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.properties.Issue).toBeTruthy();
    expect(body.properties.Name).toBeUndefined();
  });

  it('chunks oversized markdown into multiple paragraph blocks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ id: 'p', url: 'u' }),
    });
    global.fetch = fetchMock;
    const longMd = 'A'.repeat(4000);
    const handler = createNotionHandler({ token: 'nt', databaseId: 'db-1' });
    await handler({ ...FEEDBACK, aiTicket: { markdown: longMd } }, AUTH_CTX);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.children.length).toBeGreaterThan(1);
    expect(body.children[0].paragraph.rich_text[0].text.content.length).toBeLessThanOrEqual(1800);
  });
});

describe('createSupabaseHandler', () => {
  it('POSTs to /rest/v1/feedback with payload + origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([{ id: 'row-1' }]),
    });
    global.fetch = fetchMock;
    const handler = createSupabaseHandler({
      url: 'https://abc.supabase.co',
      serviceKey: 'service-key',
    });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('row-1');
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://abc.supabase.co/rest/v1/feedback');
    expect(init.headers.apikey).toBe('service-key');
    expect(init.headers.authorization).toBe('Bearer service-key');
    const body = JSON.parse(init.body);
    expect(body[0].payload.feedback).toContain('Pay button');
    expect(body[0].origin).toBe('https://shop.example.com');
  });

  it('throws when SUPABASE_URL missing', async () => {
    const handler = createSupabaseHandler({});
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/SUPABASE_URL/);
  });

  it('honors a custom table', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ([{ id: 'r' }]),
    });
    global.fetch = fetchMock;
    const handler = createSupabaseHandler({
      url: 'https://abc.supabase.co', serviceKey: 'k', table: 'bug_reports',
    });
    await handler(FEEDBACK, AUTH_CTX);
    expect(fetchMock.mock.calls[0][0]).toContain('/rest/v1/bug_reports');
  });
});

describe('createWebhookHandler', () => {
  it('forwards the feedback JSON to the configured URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'whk-1', url: 'https://hook/whk-1' }),
    });
    global.fetch = fetchMock;
    const handler = createWebhookHandler({ url: 'https://hook.example.com/x' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('whk-1');
    expect(fetchMock.mock.calls[0][0]).toBe('https://hook.example.com/x');
  });

  it('adds an x-feedback-signature when hmacSecret is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    global.fetch = fetchMock;
    const handler = createWebhookHandler({
      url: 'https://hook.example.com/x',
      hmacSecret: 'shared-secret',
    });
    await handler(FEEDBACK, AUTH_CTX);
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers['x-feedback-signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('throws when WEBHOOK_URL missing', async () => {
    const handler = createWebhookHandler({});
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/WEBHOOK_URL/);
  });

  it('forwards custom headers when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    global.fetch = fetchMock;
    const handler = createWebhookHandler({
      url: 'https://hook.example.com/x',
      headers: { 'x-custom': 'v', 'x-team': 'feedback' },
    });
    await handler(FEEDBACK, AUTH_CTX);
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers['x-custom']).toBe('v');
    expect(init.headers['x-team']).toBe('feedback');
  });
});
