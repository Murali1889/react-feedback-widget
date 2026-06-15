import { describe, it, expect } from 'vitest';
import {
  getFeedbackAuthHeaders,
  resolveCsrfToken,
  isInsecureWebhookMode,
} from '../feedbackSecurity.js';

describe('getFeedbackAuthHeaders', () => {
  it('mode "none" returns empty headers', async () => {
    expect(await getFeedbackAuthHeaders({ mode: 'none' })).toEqual({});
  });

  it('mode "bearer" calls getToken and returns Authorization', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 'tok-abc',
    });
    expect(headers.Authorization).toBe('Bearer tok-abc');
  });

  it('mode "bearer" supports async getToken', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: async () => 'async-tok',
    });
    expect(headers.Authorization).toBe('Bearer async-tok');
  });

  it('mode "signed" uses same Bearer scheme', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'signed',
      getToken: () => 'signed-tok',
    });
    expect(headers.Authorization).toBe('Bearer signed-tok');
  });

  it('mode "session" returns CSRF header when explicit token provided', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'session',
      csrfToken: 'csrf-x',
    });
    expect(headers['X-CSRF-Token']).toBe('csrf-x');
  });

  it('merges custom getHeaders result', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 't',
      getHeaders: () => ({ 'X-Tenant': 'acme' }),
    });
    expect(headers.Authorization).toBe('Bearer t');
    expect(headers['X-Tenant']).toBe('acme');
  });

  it('does not persist tokens (no side effects beyond return)', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 'one-shot',
    });
    expect(headers.Authorization).toBe('Bearer one-shot');
    const h2 = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 'two-shot',
    });
    expect(h2.Authorization).toBe('Bearer two-shot');
  });
});

describe('resolveCsrfToken', () => {
  it('returns explicit string token first', async () => {
    expect(await resolveCsrfToken({ csrfToken: 'explicit' })).toBe('explicit');
  });

  it('calls a function csrfToken', async () => {
    expect(await resolveCsrfToken({ csrfToken: () => 'fn-token' })).toBe('fn-token');
  });

  it('returns null when nothing found', async () => {
    expect(await resolveCsrfToken({})).toBe(null);
  });
});

describe('isInsecureWebhookMode', () => {
  it('returns true for known insecure modes', () => {
    expect(isInsecureWebhookMode('jira-automation')).toBe(true);
    expect(isInsecureWebhookMode('appsScript')).toBe(true);
    expect(isInsecureWebhookMode('zapier')).toBe(true);
  });
  it('returns false for server-mediated modes', () => {
    expect(isInsecureWebhookMode('server')).toBe(false);
    expect(isInsecureWebhookMode('oauth')).toBe(false);
  });
});
