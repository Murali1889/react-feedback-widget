import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withSecureDefaults } from '../withSecureDefaults.js';
import { FeedbackAuthError, FeedbackForbiddenError } from '../../../lib/feedbackErrors.js';

function mockReq({
  method = 'POST',
  origin = 'https://app.example.com',
  host = 'app.example.com',
  cookies = '',
  csrf = '',
  body = { feedback: 'hi' },
  auth = '',
} = {}) {
  const headers = {
    origin,
    host,
    'content-type': 'application/json',
    ...(cookies ? { cookie: cookies } : {}),
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
    ...(auth ? { authorization: auth } : {}),
    'x-forwarded-for': '9.9.9.9',
  };
  return new Request('https://app.example.com/api/feedback', {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

const okInner = () => vi.fn(async () => ({ ok: true, data: { id: 'srv-1' } }));

beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.FEEDBACK_ALLOWED_ORIGINS = 'https://app.example.com';
});

describe('withSecureDefaults composition order', () => {
  it('1. blocks bad origin before anything else', async () => {
    const authorize = vi.fn();
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ origin: 'https://evil.com', host: 'app.example.com' }));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe('origin_blocked');
    expect(authorize).not.toHaveBeenCalled();
  });

  it('2. requires CSRF when cookies present', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ cookies: 'session=abc' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('csrf_failed');
    expect(authorize).not.toHaveBeenCalled();
  });

  it('2b. skips CSRF for bearer-only requests', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(200);
    expect(authorize).toHaveBeenCalled();
  });

  it('4. authorize FeedbackAuthError -> 401', async () => {
    const authorize = vi.fn().mockRejectedValue(new FeedbackAuthError());
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });

  it('4b. authorize FeedbackForbiddenError -> 403', async () => {
    const authorize = vi.fn().mockRejectedValue(new FeedbackForbiddenError());
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden');
  });

  it('3. rate-limits after authorize', async () => {
    const err = Object.assign(new Error('x'), { code: 'rate_limited', retryAfter: 30 });
    const rateLimit = vi.fn().mockRejectedValue(err);
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize, rateLimit })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('5. validation_failed -> 400 with fields, no echoed values', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok', body: { feedback: '   ' } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('validation_failed');
    expect(body.fields.feedback).toBeTruthy();
  });

  it('6. stamps redactionApplied and forwards to inner handler', async () => {
    const inner = vi.fn().mockResolvedValue({ ok: true, data: { id: 'srv-1' } });
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1', projectId: 'p1' });
    const handler = withSecureDefaults({ authorize })(inner);
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.securityContext.redactionApplied).toBe(true);
    expect(body.securityContext.submittedBy.id).toBe('u1');
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('7. provider error becomes opaque integration_failed', async () => {
    const inner = vi.fn().mockRejectedValue(new Error('Jira: 401 invalid API token'));
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(inner);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('integration_failed');
    expect(JSON.stringify(body)).not.toContain('API token');
    expect(JSON.stringify(body)).not.toContain('Jira');
    errSpy.mockRestore();
  });

  it('8. missing authorize in production fails closed with warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = withSecureDefaults({})(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(401);
    warn.mockRestore();
  });
});
