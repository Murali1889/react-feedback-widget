/**
 * Double-submit cookie CSRF helpers.
 *
 * CSRF is a confused-deputy attack against credentials the *browser
 * attaches automatically* — i.e. cookies. Bearer tokens in
 * `Authorization` headers are never attached automatically (the JS
 * making the request must add them), so a request with NO cookie cannot
 * be a CSRF.
 *
 * Therefore:
 *   - state-changing + cookie present  → require CSRF (defense)
 *   - state-changing + bearer-only     → skip (no implicit credential)
 *   - state-changing + no auth at all  → skip (authorize will reject)
 *   - safe method                      → skip
 */

export function isStateChanging(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase());
}

export function csrfRequired(reqLike) {
  if (!isStateChanging(reqLike.method)) return false;
  const hasCookie = !!reqLike.headers['cookie'];
  // Require whenever the browser may be implicitly attaching a cookie
  // session. Bearer-only requests and unauthenticated requests do not
  // involve implicit credentials — CSRF doesn't apply.
  return hasCookie;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function checkCsrf(reqLike) {
  const cookieToken = reqLike.cookies['csrf-token'] || reqLike.cookies['XSRF-TOKEN'];
  const headerToken = reqLike.headers['x-csrf-token'] || reqLike.headers['x-xsrf-token'];
  if (!cookieToken || !headerToken) return false;
  return safeEqual(cookieToken, headerToken);
}
