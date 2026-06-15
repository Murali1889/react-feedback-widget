/**
 * Double-submit cookie CSRF helpers.
 */

export function isStateChanging(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase());
}

export function csrfRequired(reqLike) {
  if (!isStateChanging(reqLike.method)) return false;
  // Skip CSRF for bearer-only requests (no cookies)
  if (reqLike.headers['authorization'] && !reqLike.headers['cookie']) return false;
  return !!reqLike.headers['cookie'];
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
