import crypto from 'node:crypto';

const SECRET = process.env.FEEDBACK_SIGNING_SECRET || 'dev-only-do-not-use-in-prod';
const TOKEN_TTL_MS = 5 * 60 * 1000;

export function signSubmissionToken({ tenantId = 'public' }: { tenantId?: string } = {}) {
  const payload = { tenantId, exp: Date.now() + TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySubmissionToken(token: string) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload as { tenantId: string; exp: number };
  } catch {
    return null;
  }
}

/**
 * DEMO ONLY: replace with your real auth (Auth.js, Clerk, custom JWT, etc.).
 * Anyone with the `demo-session=ok` cookie is treated as logged in.
 *
 * Note: `authorize` callbacks receive the normalized request shape from
 * withSecureDefaults, NOT a raw Web Request. Use `req.cookies[name]`,
 * `req.headers[name]` (already lowercased), or `req.raw` for the original.
 */
type FeedbackReqLike = {
  cookies: Record<string, string>
  headers: Record<string, string>
  raw: Request
}

export async function getDemoSession(req: FeedbackReqLike) {
  if (req.cookies?.['demo-session'] === 'ok') {
    return { userId: 'demo-user', projectId: 'DEMO', role: 'developer' };
  }
  return null;
}
