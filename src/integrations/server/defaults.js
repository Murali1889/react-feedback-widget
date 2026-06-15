import { FeedbackRateLimitError } from '../../lib/feedbackErrors.js';

export function defaultOriginValidator(reqLike) {
  const origin = reqLike?.origin || '';
  const host = reqLike?.headers?.host || '';
  if (!origin) return true; // same-origin form posts
  try {
    const o = new URL(origin);
    if (host && o.host === host) return true;
    if (process.env.NODE_ENV !== 'production') {
      if (o.hostname === 'localhost' || o.hostname === '127.0.0.1') return true;
    }
    const list = (process.env.FEEDBACK_ALLOWED_ORIGINS || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes(origin)) return true;
    return false;
  } catch {
    return false;
  }
}

function createInMemoryRateLimiter({ limit = 30, windowMs = 60 * 60 * 1000 } = {}) {
  const buckets = new Map();
  const fn = async (reqLike, ctx) => {
    const userId = ctx?.userId || '';
    const ip = reqLike?.ip || '';
    const key = `${ip}::${userId}`;
    const now = Date.now();
    const b = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > b.resetAt) {
      b.count = 0;
      b.resetAt = now + windowMs;
    }
    b.count += 1;
    buckets.set(key, b);
    if (b.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
      throw new FeedbackRateLimitError(retryAfter);
    }
  };
  fn.reset = () => buckets.clear();
  return fn;
}

const sharedLimiter = createInMemoryRateLimiter();
sharedLimiter.create = (opts) => createInMemoryRateLimiter(opts);
export const defaultRateLimiter = sharedLimiter;

const CODE_STATUS = {
  unauthorized: 401,
  forbidden: 403,
  csrf_failed: 403,
  origin_blocked: 403,
  rate_limited: 429,
  validation_failed: 400,
  payload_too_large: 413,
  integration_failed: 502,
  integration_unavailable: 503,
  redacted_blocked: 422,
  server_error: 500,
};

function newRequestId() {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultErrorNormalizer(err) {
  const code = err?.code && CODE_STATUS[err.code] ? err.code : 'server_error';
  const status = CODE_STATUS[code];
  const body = { ok: false, error: code };
  if (code === 'validation_failed' && err?.fields) body.fields = err.fields;
  if (code === 'rate_limited') body.message = 'rate_limited';
  if (code === 'server_error') {
    const id = newRequestId();
    body.message = `server_error (req=${id})`;
    body._logId = id;
  }
  const headers = {};
  if (code === 'rate_limited' && err?.retryAfter) {
    headers['Retry-After'] = String(err.retryAfter);
  }
  return { status, body, headers };
}
