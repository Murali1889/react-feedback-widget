/**
 * Adversarial security tests.
 *
 * Each test names a specific attack class and asserts the library's
 * behaviour holds under it. When any of these fail, *do not ship*.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withSecureDefaults } from '../integrations/server/withSecureDefaults.js';
import { validateFeedbackSubmission } from '../lib/feedbackValidation.js';
import { redactFeedbackEvidence, resolveRedactionConfig, redactHandoffText, getFeedbackAuthHeaders } from '../lib/feedbackSecurity.js';
import { FeedbackAuthError } from '../lib/feedbackErrors.js';

function reqWith(body, opts = {}) {
  const headers = {
    origin: 'https://app.example.com',
    host: 'app.example.com',
    'content-type': 'application/json',
    authorization: 'Bearer demo',
    ...(opts.headers || {}),
  };
  return new Request('https://app.example.com/api/feedback', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const okInner = () => vi.fn(async () => ({ ok: true, data: { id: 'srv-1' } }));
const authorize = vi.fn(async () => ({ userId: 'u1', projectId: 'p1' }));

beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.FEEDBACK_ALLOWED_ORIGINS = 'https://app.example.com';
  authorize.mockClear();
});

describe('Attack: client tries to forge securityContext', () => {
  it('client-submitted securityContext is overwritten by server', async () => {
    const inner = vi.fn(async (data) => ({ ok: true, data: { id: 'srv-1', received: data } }));
    const handler = withSecureDefaults({ authorize })(inner);
    const res = await handler(reqWith({
      feedback: 'hi',
      securityContext: {
        tenantId: 'attacker-tenant',
        submittedBy: { id: 'root', role: 'admin' },
        redactionApplied: false,
      },
    }));
    const body = await res.json();
    expect(body.securityContext.tenantId).toBeUndefined();
    expect(body.securityContext.submittedBy.id).toBe('u1');
    expect(body.securityContext.submittedBy.role).toBeUndefined();
    expect(body.securityContext.redactionApplied).toBe(true);
    // The submitted securityContext key never makes it to the inner handler.
    const receivedData = inner.mock.calls[0][0];
    expect(receivedData.securityContext).toBeUndefined();
  });
});

describe('Attack: client tries to forge statusHistory', () => {
  it('statusHistory in client submission is silently stripped', async () => {
    const inner = vi.fn(async (data) => ({ ok: true, data: { received: data } }));
    const handler = withSecureDefaults({ authorize })(inner);
    await handler(reqWith({
      feedback: 'hi',
      statusHistory: [
        { from: 'new', to: 'resolved', changedBy: 'attacker', changedAt: new Date().toISOString() },
      ],
    }));
    const received = inner.mock.calls[0][0];
    expect(received.statusHistory).toBeUndefined();
  });
});

describe('Attack: client tries to forge integrationState issueKey/issueUrl/rowId', () => {
  it('provider-write fields are stripped before inner handler sees them', async () => {
    const inner = vi.fn(async (data) => ({ ok: true, data: { received: data } }));
    const handler = withSecureDefaults({ authorize })(inner);
    await handler(reqWith({
      feedback: 'hi',
      integrationState: {
        jira: { status: 'created', issueKey: 'EVIL-1', issueUrl: 'https://evil.com' },
        sheets: { status: 'appended', rowId: '999' },
      },
    }));
    const received = inner.mock.calls[0][0];
    expect(received.integrationState?.jira?.issueKey).toBeUndefined();
    expect(received.integrationState?.jira?.issueUrl).toBeUndefined();
    expect(received.integrationState?.sheets?.rowId).toBeUndefined();
  });
});

describe('Attack: prototype pollution via __proto__ / constructor in body', () => {
  it('does not pollute Object.prototype', () => {
    validateFeedbackSubmission({
      feedback: 'hi',
      // eslint-disable-next-line no-proto
      __proto__: { polluted: true },
      constructor: { prototype: { polluted: true } },
    });
    expect({}.polluted).toBeUndefined();
  });

  it('redactor does not pollute Object.prototype via crafted body keys', () => {
    redactFeedbackEvidence({
      eventLogs: [{
        type: 'network',
        request: { body: JSON.stringify({ __proto__: { polluted: true }, password: 'x' }) },
      }],
    }, resolveRedactionConfig({ allowRequestBodies: true }));
    expect({}.polluted).toBeUndefined();
  });
});

describe('Attack: HTTP header injection via feedback text (CRLF)', () => {
  it('error response does not echo CRLF-laced submitted values', async () => {
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(reqWith({
      feedback: '',  // triggers validation_failed
      owner: { name: 'attacker', email: 'evil\r\nSet-Cookie: hax=1\r\n@example.com' },
    }));
    const body = await res.text();
    // Status line + CRLF appears as part of HTTP, but the body must not echo input.
    expect(body).not.toContain('Set-Cookie: hax=1');
    expect(body).not.toContain('attacker');
  });
});

describe('Attack: SSRF-shaped URLs in submitted url field', () => {
  it('library does not auto-fetch submitted urls', () => {
    // Sanity: validation accepts any https URL up to cap; the library has no
    // server-side fetch of submitted urls. This test documents that
    // assumption. If a future feature wants to render or preview submitted
    // urls server-side, you must reject internal IPs, link-local, etc.
    const r = validateFeedbackSubmission({
      feedback: 'hi',
      url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    });
    expect(r.ok).toBe(true); // accepted as display data only
  });
});

describe('Attack: very large payload (DoS)', () => {
  it('rejects feedback over 5000 chars without invoking inner handler', async () => {
    const inner = okInner();
    const handler = withSecureDefaults({ authorize })(inner);
    const res = await handler(reqWith({ feedback: 'x'.repeat(5001) }));
    expect(res.status).toBe(400);
    expect(inner).not.toHaveBeenCalled();
  });

  it('eventLogs over the cap are truncated, not rejected', async () => {
    const inner = vi.fn(async (data) => ({ ok: true, data: { count: data.eventLogs.length } }));
    const handler = withSecureDefaults({ authorize })(inner);
    const res = await handler(reqWith({
      feedback: 'hi',
      eventLogs: Array.from({ length: 6000 }, (_, i) => ({ type: 'console', message: String(i) })),
    }));
    expect(res.status).toBe(200);
    const received = inner.mock.calls[0][0];
    expect(received.eventLogs.length).toBe(5000);
  });
});

describe('Attack: redaction bypass attempts', () => {
  it('Authorization header with weird casing is still redacted', () => {
    const cfg = resolveRedactionConfig('default');
    const out = redactFeedbackEvidence({
      eventLogs: [{
        type: 'network',
        headers: { 'AuThOrIzAtIoN': 'Bearer leaked', 'X-Goog-Authuser': '1', 'x-amz-security-token': 't' },
      }],
    }, cfg);
    const h = out.data.eventLogs[0].headers;
    expect(h.AuThOrIzAtIoN).toBe('<redacted>');
    expect(h['X-Goog-Authuser']).toBe('<redacted>');
    expect(h['x-amz-security-token']).toBe('<redacted>');
  });

  it('nested body keys (deep) are still redacted when bodies allowed', () => {
    const cfg = resolveRedactionConfig({ allowRequestBodies: true });
    const body = JSON.stringify({
      level1: { level2: { level3: { access_token: 'leaked', okay: 'fine' } } },
    });
    const out = redactFeedbackEvidence({
      eventLogs: [{ type: 'network', request: { body } }],
    }, cfg);
    const parsed = JSON.parse(out.data.eventLogs[0].request.body);
    expect(parsed.level1.level2.level3.access_token).toBe('<redacted>');
    expect(parsed.level1.level2.level3.okay).toBe('fine');
  });

  it('handoff text scrubs Authorization headers in pasted curl examples', () => {
    const cfg = resolveRedactionConfig('default');
    const out = redactHandoffText(
      'curl https://api.x.com -H "Authorization: Bearer secret-abc"',
      cfg
    );
    expect(out).not.toContain('secret-abc');
  });

  it('sensitive query params redacted even with case mismatch', () => {
    const cfg = resolveRedactionConfig('default');
    const out = redactFeedbackEvidence({
      eventLogs: [{ type: 'network', url: 'https://x.com/?Access_Token=leaked&PASSWORD=p' }],
    }, cfg);
    expect(out.data.eventLogs[0].url).not.toContain('leaked');
    expect(out.data.eventLogs[0].url).not.toContain('=p&');
    expect(out.data.eventLogs[0].url).not.toMatch(/PASSWORD=p$/);
  });

  it('storage event with sensitive key gets value redacted regardless of case', () => {
    const cfg = resolveRedactionConfig('default');
    const out = redactFeedbackEvidence({
      eventLogs: [
        { type: 'storage', action: 'setItem', key: 'AccessToken', value: 'leaked' },
      ],
    }, cfg);
    expect(out.data.eventLogs[0].value).toBe('<redacted>');
  });
});

describe('Attack: auth token persistence', () => {
  it('getFeedbackAuthHeaders does not write to localStorage', async () => {
    const writeSpy = { calls: 0 };
    const fakeLs = { setItem: () => { writeSpy.calls += 1; }, getItem: () => null };
    const origLs = globalThis.localStorage;
    globalThis.localStorage = fakeLs;
    try {
      await getFeedbackAuthHeaders({ mode: 'bearer', getToken: () => 'tok' });
      expect(writeSpy.calls).toBe(0);
    } finally {
      globalThis.localStorage = origLs;
    }
  });
});

describe('Attack: rate limit bypass via different users', () => {
  it('per-(IP+user) keying means one user cannot block another', async () => {
    const { defaultRateLimiter } = await import('../integrations/server/defaults.js');
    const limiter = defaultRateLimiter.create({ limit: 1, windowMs: 60_000 });
    await limiter({ ip: '8.8.8.8', headers: {} }, { userId: 'u-a' });
    // Same IP, different user — should not be rate-limited.
    await expect(
      limiter({ ip: '8.8.8.8', headers: {} }, { userId: 'u-b' })
    ).resolves.toBeUndefined();
  });

  it('but anonymous-IP-only requests share the bucket per IP', async () => {
    const { defaultRateLimiter } = await import('../integrations/server/defaults.js');
    const limiter = defaultRateLimiter.create({ limit: 1, windowMs: 60_000 });
    await limiter({ ip: '7.7.7.7', headers: {} }, {});
    await expect(
      limiter({ ip: '7.7.7.7', headers: {} }, {})
    ).rejects.toMatchObject({ code: 'rate_limited' });
  });
});

describe('Attack: CSRF on cookie-auth requests', () => {
  it('cookie present without X-CSRF-Token is rejected', async () => {
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(new Request('https://app.example.com/api/feedback', {
      method: 'POST',
      headers: { origin: 'https://app.example.com', host: 'app.example.com', cookie: 'session=abc', 'content-type': 'application/json' },
      body: JSON.stringify({ feedback: 'hi' }),
    }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('csrf_failed');
    expect(authorize).not.toHaveBeenCalled();
  });

  it('cookie + mismatched X-CSRF-Token is rejected', async () => {
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(new Request('https://app.example.com/api/feedback', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        host: 'app.example.com',
        cookie: 'csrf-token=expected',
        'x-csrf-token': 'mismatched',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ feedback: 'hi' }),
    }));
    expect(res.status).toBe(403);
  });

  it('cookie + matching X-CSRF-Token passes', async () => {
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(new Request('https://app.example.com/api/feedback', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        host: 'app.example.com',
        cookie: 'csrf-token=matched',
        'x-csrf-token': 'matched',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ feedback: 'hi' }),
    }));
    expect(res.status).toBe(200);
  });
});

describe('Attack: provider error leaking via response', () => {
  it('inner handler error text never reaches the browser response', async () => {
    const innerErr = vi.fn(async () => {
      throw new Error('Jira API token "secret-tok-123" was rejected with: SELECT * FROM users');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = withSecureDefaults({ authorize })(innerErr);
    const res = await handler(reqWith({ feedback: 'hi' }));
    const text = await res.text();
    expect(text).not.toContain('secret-tok-123');
    expect(text).not.toContain('SELECT');
    expect(text).not.toContain('users');
    expect(text).toContain('integration_failed');
    errSpy.mockRestore();
  });
});

describe('Attack: malformed / huge JSON body', () => {
  it('malformed JSON body produces a clean validation_failed response (no parser stack)', async () => {
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(new Request('https://app.example.com/api/feedback', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        host: 'app.example.com',
        authorization: 'Bearer x',
        'content-type': 'application/json',
      },
      body: '{not json',
    }));
    expect([400]).toContain(res.status);
    const txt = await res.text();
    expect(txt).not.toMatch(/SyntaxError|Unexpected token/);
  });
});

describe('Attack: redact:"off" without explicit opt-in', () => {
  it('default redact still drops bodies even when host forgets to set it', () => {
    // No config at all should give the safe default profile.
    const cfg = resolveRedactionConfig();
    expect(cfg.allowRequestBodies).toBe(false);
    expect(cfg.allowResponseBodies).toBe(false);
    expect(cfg.maxBodyLength).toBe(0);
  });
});
