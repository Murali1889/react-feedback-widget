/**
 * proxyPost — shared "POST to host-owned route" helper used by every
 * server-proxied adapter. Auto-switches between JSON and multipart
 * based on whether the payload carries any binary fields.
 *
 *   await proxyPost('/api/feedback/github', payload)
 *
 *   - Pure JSON when payload has no Blob/data:image screenshot/videoBlob.
 *   - multipart/form-data otherwise — the binary parts are pulled out
 *     and uploaded as separate parts so the bandwidth + parse cost
 *     on the server drops significantly (no base64-in-JSON overhead).
 *
 * Returns { id, url } parsed from the server's JSON response.
 */

import { buildMultipartFromPayload } from './multipart.js';

/**
 * Read the double-submit CSRF token from the document cookie. The server's
 * withSecureDefaults wrapper requires a matching `x-csrf-token` header
 * on every state-changing POST when a cookie session is in play. Without
 * this, every server-proxied destination 403s with `csrf_failed`.
 */
function readCsrfFromCookie() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)(?:csrf-token|XSRF-TOKEN)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function proxyPost(endpoint, payload) {
  const fd = buildMultipartFromPayload(payload);
  const csrf = readCsrfFromCookie();
  let res;
  if (fd) {
    // Don't set content-type — the browser adds the proper
    // multipart/form-data; boundary=... automatically when body is FormData.
    const headers = {};
    if (csrf) headers['x-csrf-token'] = csrf;
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: fd,
      credentials: 'same-origin',
    });
  } else {
    const headers = { 'content-type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      credentials: 'same-origin',
    });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${endpoint} returned ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = await res.json().catch(() => null);
  return { id: body?.id || null, url: body?.url || null };
}
