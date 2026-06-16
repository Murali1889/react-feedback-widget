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

export async function proxyPost(endpoint, payload) {
  const fd = buildMultipartFromPayload(payload);
  let res;
  if (fd) {
    // Don't set content-type — the browser adds the proper
    // multipart/form-data; boundary=... automatically when body is FormData.
    res = await fetch(endpoint, {
      method: 'POST',
      body: fd,
      credentials: 'same-origin',
    });
  } else {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
