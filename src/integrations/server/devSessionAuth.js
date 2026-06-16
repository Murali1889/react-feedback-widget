/**
 * devSessionAuth — zero-config authorize() for beginners.
 *
 * Use this when you want createFeedbackHandler to "just work" while you
 * decide what auth library to bolt on later:
 *
 *   import { createFeedbackHandler, devSessionAuth } from 'react-visual-feedback/server'
 *   import feedbackConfig from '@/feedback.config'
 *
 *   export const POST = createFeedbackHandler({
 *     ...feedbackConfig,
 *     authorize: devSessionAuth(),
 *   })
 *
 * Behavior:
 *
 *   • NODE_ENV !== 'production'  → passes through with a stub session
 *                                  { userId: 'dev-user', role: 'developer' }
 *                                  Console warns once so you don't forget.
 *
 *   • NODE_ENV === 'production'  → REFUSES at first request with a clear
 *                                  error and a pointer to real auth options.
 *                                  You can't accidentally ship dev auth
 *                                  to production.
 *
 *   • With { secret }            → opt into a simple cookie-based session
 *                                  that DOES work in production. Reads
 *                                  a signed cookie; if present + valid,
 *                                  returns the session; else refuses.
 *                                  Helper utilities for issuing the cookie
 *                                  are below.
 *
 * For real auth (recommended for production), swap to NextAuth / Clerk /
 * Lucia / your existing session check. devSessionAuth is the safety net
 * that keeps the integration working WHILE you figure that out.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

let warned = false;

function warnOnce(msg) {
  if (warned || typeof console === 'undefined') return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(`[react-visual-feedback] ${msg}`);
}

function isProd() {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
}

function readCookie(req, name) {
  // Web Request — req.headers.get('cookie')
  if (typeof req?.headers?.get === 'function') {
    const raw = req.headers.get('cookie') || '';
    return parseCookie(raw, name);
  }
  // Express / Pages — req.cookies (parsed) or req.headers.cookie (string)
  if (req?.cookies && typeof req.cookies === 'object') return req.cookies[name] || null;
  if (req?.headers?.cookie) return parseCookie(req.headers.cookie, name);
  return null;
}

function parseCookie(raw, name) {
  if (!raw) return null;
  for (const piece of raw.split(';')) {
    const [k, ...rest] = piece.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=') || '');
  }
  return null;
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(s) {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

const COOKIE_NAME = 'rvf_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Issue a session cookie value. Pair with `signSession()` then set:
 *
 *   Set-Cookie: rvf_session=<cookieValue>; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=604800
 *
 * Helpers below give you a one-liner for Next App Router and Express.
 */
export function signSession(session, secret) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('signSession: secret is required');
  }
  const payload = b64url(JSON.stringify({
    ...session,
    iat: Math.floor(Date.now() / 1000),
  }));
  const sig = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

function verifySession(value, secret, maxAgeSeconds = COOKIE_MAX_AGE) {
  if (!value || typeof value !== 'string') return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  let expectedSig;
  try {
    expectedSig = b64url(createHmac('sha256', secret).update(payload).digest());
  } catch { return null; }
  // Constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(payload).toString('utf8'));
    if (typeof parsed?.iat !== 'number') return null;
    if ((Date.now() / 1000) - parsed.iat > maxAgeSeconds) return null;
    const { iat, ...session } = parsed;
    return session;
  } catch { return null; }
}

/**
 * devSessionAuth — the friendly-default authorize() function.
 *
 * @param {object} [opts]
 * @param {string} [opts.secret]    — when set, switch to cookie-based prod auth
 * @param {string} [opts.cookieName] — defaults to 'rvf_session'
 * @param {number} [opts.maxAgeSeconds] — defaults to 7 days
 * @param {boolean} [opts.allowProductionStub] — opt-in to dev-stub in prod (NOT recommended)
 */
export function devSessionAuth(opts = {}) {
  const { secret, cookieName = COOKIE_NAME, maxAgeSeconds = COOKIE_MAX_AGE, allowProductionStub = false } = opts;

  return async function authorize(req) {
    // Production + signed cookie mode
    if (secret) {
      const value = readCookie(req, cookieName);
      const session = value ? verifySession(value, secret, maxAgeSeconds) : null;
      if (session) return session;
      // No cookie → not authenticated
      return null;
    }

    // Production without secret + no opt-out → REFUSE
    if (isProd() && !allowProductionStub) {
      throw new Error(
        '[react-visual-feedback] devSessionAuth() was reached in NODE_ENV=production ' +
        'WITHOUT a `secret` configured. devSessionAuth is for development only — ' +
        'in production you need to either:\n' +
        '  1. Pass `devSessionAuth({ secret: process.env.FEEDBACK_SECRET })` to opt in ' +
        'to the built-in signed-cookie session (use the bundled signSession() helper ' +
        'to issue cookies at your /login route), OR\n' +
        '  2. Replace `authorize: devSessionAuth()` with a real check against your ' +
        'session library (NextAuth / Clerk / Lucia / your existing cookie or JWT verifier).\n' +
        '\n' +
        'To explicitly opt in to the dev stub in production (NOT recommended), pass ' +
        '`devSessionAuth({ allowProductionStub: true })`.'
      );
    }

    // Dev mode — stub session
    warnOnce(
      'devSessionAuth(): returning a stub session in dev. Swap to a real ' +
      '`authorize` before deploying — see the devSessionAuth() JSDoc for ' +
      'NextAuth / Clerk / signed-cookie options.'
    );
    return { userId: 'dev-user', projectId: 'dev', role: 'developer' };
  };
}

/**
 * Helper for Next.js App Router login routes:
 *
 *   import { setSessionCookieAppRouter } from 'react-visual-feedback/server'
 *
 *   export async function POST(req) {
 *     // 1. Verify the user (password, OAuth, magic link, whatever)
 *     // 2. Issue the cookie:
 *     return setSessionCookieAppRouter({
 *       session: { userId, projectId, role },
 *       secret:  process.env.FEEDBACK_SECRET!,
 *       redirect: '/dashboard',
 *     })
 *   }
 */
export function setSessionCookieAppRouter({
  session,
  secret,
  redirect = '/',
  cookieName = COOKIE_NAME,
  maxAgeSeconds = COOKIE_MAX_AGE,
  sameSite = 'Lax',
}) {
  const value = signSession(session, secret);
  const secure = isProd();
  const cookie = [
    `${cookieName}=${encodeURIComponent(value)}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    secure ? 'Secure' : null,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ].filter(Boolean).join('; ');
  return new Response(null, {
    status: 302,
    headers: { 'Set-Cookie': cookie, Location: redirect },
  });
}

/**
 * Helper for Express:
 *
 *   import { setSessionCookieExpress } from 'react-visual-feedback/server'
 *
 *   app.post('/login', (req, res) => {
 *     // ... verify user ...
 *     setSessionCookieExpress(res, {
 *       session: { userId, role },
 *       secret:  process.env.FEEDBACK_SECRET,
 *     })
 *     res.redirect('/dashboard')
 *   })
 */
export function setSessionCookieExpress(res, {
  session,
  secret,
  cookieName = COOKIE_NAME,
  maxAgeSeconds = COOKIE_MAX_AGE,
  sameSite = 'Lax',
}) {
  const value = signSession(session, secret);
  res.setHeader('Set-Cookie', [
    `${cookieName}=${encodeURIComponent(value)}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    isProd() ? 'Secure' : null,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ].filter(Boolean).join('; '));
}
