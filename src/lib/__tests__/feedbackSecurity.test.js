import { describe, it, expect } from 'vitest';
import {
  redactFeedbackEvidence,
  redactNetworkEvent,
  redactConsoleEvent,
  redactStorageEvent,
  redactHandoffText,
  resolveRedactionConfig,
} from '../feedbackSecurity.js';

describe('resolveRedactionConfig', () => {
  it('returns default profile when called with "default"', () => {
    const cfg = resolveRedactionConfig('default');
    expect(cfg.redactHeaders).toContain('authorization');
    expect(cfg.allowRequestBodies).toBe(false);
    expect(cfg.stripUrlQuery).toBe(false);
  });

  it('strict profile strips URL query and drops storage values', () => {
    const cfg = resolveRedactionConfig('strict');
    expect(cfg.stripUrlQuery).toBe(true);
    expect(cfg.dropStorageValues).toBe(true);
  });

  it('"off" returns empty redaction lists', () => {
    expect(resolveRedactionConfig('off').redactHeaders).toEqual([]);
  });

  it('custom object merges on top of default', () => {
    const cfg = resolveRedactionConfig({
      redactHeaders: ['x-org-secret'],
      allowRequestBodies: true,
    });
    expect(cfg.redactHeaders).toContain('authorization');
    expect(cfg.redactHeaders).toContain('x-org-secret');
    expect(cfg.allowRequestBodies).toBe(true);
  });
});

describe('redactNetworkEvent', () => {
  const cfg = resolveRedactionConfig('default');

  it('redacts known sensitive headers case-insensitively', () => {
    const out = redactNetworkEvent({
      type: 'network',
      url: 'https://api.example.com/x',
      method: 'GET',
      headers: { Authorization: 'Bearer abc', 'X-API-KEY': 'k', 'Content-Type': 'application/json' },
    }, cfg);
    expect(out.headers.Authorization).toBe('<redacted>');
    expect(out.headers['X-API-KEY']).toBe('<redacted>');
    expect(out.headers['Content-Type']).toBe('application/json');
  });

  it('redacts headers by prefix match (x-amz-security-*)', () => {
    const out = redactNetworkEvent({
      type: 'network',
      headers: { 'X-Amz-Security-Token': 'aws', 'X-Goog-Auth': 'g' },
    }, cfg);
    expect(out.headers['X-Amz-Security-Token']).toBe('<redacted>');
    expect(out.headers['X-Goog-Auth']).toBe('<redacted>');
  });

  it('drops request and response bodies by default', () => {
    const out = redactNetworkEvent({
      type: 'network',
      request: { body: 'secret=abc' },
      response: { body: 'token=xyz' },
    }, cfg);
    expect(out.request.body).toBeUndefined();
    expect(out.response.body).toBeUndefined();
    expect(out.bodyRedacted).toBe('dropped-by-default');
  });

  it('redacts sensitive query params in place', () => {
    const out = redactNetworkEvent({
      type: 'network',
      url: 'https://api.example.com/x?token=secret&page=2',
    }, cfg);
    expect(out.url).toContain('token=%3Credacted%3E');
    expect(out.url).toContain('page=2');
  });

  it('strict profile strips entire query', () => {
    const out = redactNetworkEvent({
      type: 'network',
      url: 'https://api.example.com/x?token=secret&page=2',
    }, resolveRedactionConfig('strict'));
    expect(out.url).toBe('https://api.example.com/x');
  });

  it('allows bodies when allowRequestBodies/allowResponseBodies set', () => {
    const cfg2 = resolveRedactionConfig({ allowRequestBodies: true, allowResponseBodies: true });
    const out = redactNetworkEvent({
      type: 'network',
      request: { body: JSON.stringify({ password: 'p', name: 'a' }) },
      response: { body: JSON.stringify({ access_token: 't', id: 1 }) },
    }, cfg2);
    expect(out.request.body).toContain('"password":"<redacted>"');
    expect(out.request.body).toContain('"name":"a"');
    expect(out.response.body).toContain('"access_token":"<redacted>"');
  });
});

describe('redactConsoleEvent', () => {
  const cfg = resolveRedactionConfig('default');

  it('truncates long messages', () => {
    const out = redactConsoleEvent({
      type: 'console', level: 'log', message: 'x'.repeat(3000),
    }, cfg);
    expect(out.message.length).toBeLessThanOrEqual(cfg.maxLogMessageLength + 20);
    expect(out.message).toMatch(/truncated/);
  });

  it('redacts inline key=value secrets', () => {
    const out = redactConsoleEvent({
      type: 'console', level: 'log',
      message: 'request token=abc.def.ghi started',
    }, cfg);
    expect(out.message).not.toContain('abc.def.ghi');
    expect(out.message).toContain('token=<redacted>');
  });
});

describe('redactStorageEvent', () => {
  const cfg = resolveRedactionConfig('default');

  it('redacts value for known sensitive keys', () => {
    const out = redactStorageEvent({
      type: 'storage', storageType: 'localStorage',
      action: 'setItem', key: 'access_token', value: 'real-token',
    }, cfg);
    expect(out.value).toBe('<redacted>');
  });

  it('truncates long values for non-sensitive keys', () => {
    const out = redactStorageEvent({
      type: 'storage', storageType: 'localStorage',
      action: 'setItem', key: 'prefs', value: 'x'.repeat(500),
    }, cfg);
    expect(out.value.length).toBeLessThanOrEqual(220);
  });

  it('strict profile drops values entirely', () => {
    const out = redactStorageEvent({
      type: 'storage', action: 'setItem', key: 'prefs', value: 'data',
    }, resolveRedactionConfig('strict'));
    expect(out.value).toBe('<dropped: storage value>');
  });
});

describe('redactFeedbackEvidence', () => {
  it('returns { data, appliedRules } and never mutates input', () => {
    const item = {
      feedback: 'hi',
      eventLogs: [
        { type: 'network', headers: { Authorization: 'x' } },
        { type: 'console', message: 'token=abc' },
      ],
    };
    const before = JSON.stringify(item);
    const out = redactFeedbackEvidence(item, resolveRedactionConfig('default'));
    expect(JSON.stringify(item)).toBe(before);
    expect(out.data.eventLogs[0].headers.Authorization).toBe('<redacted>');
    expect(out.appliedRules).toContain('headers');
    expect(out.appliedRules).toContain('console');
  });
});

describe('redactHandoffText', () => {
  it('redacts inline secrets in free text', () => {
    const cfg = resolveRedactionConfig('default');
    expect(redactHandoffText('curl -H "Authorization: Bearer abc.def"', cfg))
      .toMatch(/<redacted>/);
  });
});
