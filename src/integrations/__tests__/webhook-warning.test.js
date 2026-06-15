import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationClient } from '../index.js';

describe('IntegrationClient insecure webhook warnings', () => {
  let warnSpy;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    IntegrationClient._warnedModes?.clear?.();
  });

  it('warns once for jira-automation mode', async () => {
    const client = new IntegrationClient({
      jira: { enabled: true, type: 'jira-automation', webhookUrl: 'https://hooks.example' },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await client.sendToJira({ feedback: 'hi' });
    await client.sendToJira({ feedback: 'hi again' });
    const insecureWarnings = warnSpy.mock.calls.filter((c) => /jira-automation|insecure/i.test(String(c[0])));
    expect(insecureWarnings.length).toBe(1);
  });

  it('does not warn for server mode', async () => {
    const client = new IntegrationClient({
      jira: { enabled: true, type: 'server', endpoint: '/api/feedback/jira' },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await client.sendToJira({ feedback: 'hi' });
    expect(warnSpy.mock.calls.filter((c) => /insecure/i.test(String(c[0])))).toHaveLength(0);
  });

  it('warns once for zapier mode', async () => {
    const client = new IntegrationClient({
      jira: { enabled: true, type: 'zapier', webhookUrl: 'https://hooks.zapier' },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await client.sendToJira({ feedback: 'hi' });
    const insecureWarnings = warnSpy.mock.calls.filter((c) => /zapier|insecure/i.test(String(c[0])));
    expect(insecureWarnings.length).toBe(1);
  });

  it('includes auth headers when getAuthHeaders provided (Sheets JSON path)', async () => {
    const client = new IntegrationClient({
      sheets: { enabled: true, type: 'server', endpoint: '/api/feedback/sheets' },
      getAuthHeaders: async () => ({ Authorization: 'Bearer tok', 'X-CSRF-Token': 'csrf' }),
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    globalThis.fetch = fetchMock;
    await client.sendToSheets({ feedback: 'hi' });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers?.Authorization).toBe('Bearer tok');
    expect(init.headers?.['X-CSRF-Token']).toBe('csrf');
  });
});
