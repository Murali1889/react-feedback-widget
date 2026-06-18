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

/**
 * Heuristic detection of cold-start-every-request hosting (Vercel
 * functions, AWS Lambda, Cloudflare Workers, Netlify Functions, GCP
 * Cloud Run / Cloud Functions). On these platforms a module-singleton
 * in-memory Map resets at each cold start, so the default limiter
 * silently degrades to "essentially unlimited" — worse than no limiter
 * because hosts believe they're protected.
 */
export function isServerlessRuntime() {
  if (typeof process === 'undefined' || !process.env) return false;
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.NETLIFY ||
    process.env.K_SERVICE ||                    // Cloud Run / Cloud Functions Gen2
    process.env.FUNCTION_TARGET ||              // Cloud Functions Gen1
    process.env.CF_PAGES ||                     // Cloudflare Pages
    process.env.CF_WORKER ||                    // Workers (custom marker)
    process.env.DENO_DEPLOYMENT_ID              // Deno Deploy
  );
}

let _serverlessWarned = false;
function warnServerlessLimiter() {
  if (_serverlessWarned) return;
  _serverlessWarned = true;
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      '[react-visual-feedback] defaultRateLimiter is in-memory and ' +
      'resets on every cold start. Detected a serverless runtime — ' +
      'pass an external limiter (Upstash / Redis / Durable Object) ' +
      'via `withSecureDefaults({ rateLimit })` to actually enforce limits.'
    );
  }
}

function buildSharedLimiter() {
  const limiter = createInMemoryRateLimiter();
  if (isServerlessRuntime()) {
    const original = limiter;
    const fn = async (reqLike, ctx) => {
      warnServerlessLimiter();
      return original(reqLike, ctx);
    };
    fn.reset = original.reset;
    fn.create = (opts) => createInMemoryRateLimiter(opts);
    return fn;
  }
  limiter.create = (opts) => createInMemoryRateLimiter(opts);
  return limiter;
}

export const defaultRateLimiter = buildSharedLimiter();

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
