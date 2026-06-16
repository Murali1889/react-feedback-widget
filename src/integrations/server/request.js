/**
 * Normalize Next.js (App + Pages Router), Express, and standard Request
 * into a single internal RequestLike shape.
 */

function parseCookieHeader(s) {
  const out = {};
  if (!s) return out;
  for (const piece of s.split(';')) {
    const [k, ...rest] = piece.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

async function parseWebRequestBody(req, headers) {
  const ct = headers['content-type'] || '';
  if (ct.includes('application/json')) {
    try { return await req.json(); } catch { return null; }
  }
  if (ct.includes('multipart/form-data') && typeof req.formData === 'function') {
    // The client adapter (proxyPost) sends a known FormData shape:
    //   feedback (JSON Blob), screenshot (Blob), video (Blob), attachment (Blob)
    // Reconstruct the original payload so downstream handlers see the same
    // object shape regardless of how the wire format was negotiated.
    try {
      const fd = await req.formData();
      const out = {};
      const feedbackField = fd.get('feedback');
      if (feedbackField) {
        let json;
        if (typeof feedbackField === 'string') json = feedbackField;
        else if (typeof feedbackField.text === 'function') json = await feedbackField.text();
        else json = await new Response(feedbackField).text();
        try { Object.assign(out, JSON.parse(json)); } catch { /* malformed metadata */ }
      }
      // Re-attach binaries on the same keys the original payload used.
      const ss = fd.get('screenshot');
      if (ss && typeof ss !== 'string') out.screenshot = ss;
      const vid = fd.get('video');
      if (vid && typeof vid !== 'string') out.videoBlob = vid;
      const att = fd.get('attachment');
      if (att && typeof att !== 'string') out.attachment = att;
      return out;
    } catch {
      return null;
    }
  }
  try { return await req.text(); } catch { return null; }
}

export async function toRequestLike(req) {
  // Web Request (Next App Router / fetch)
  if (req && typeof req.headers?.get === 'function') {
    const headers = {};
    req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return {
      method: req.method,
      url: req.url,
      origin: headers.origin || null,
      headers,
      cookies: parseCookieHeader(headers.cookie || ''),
      ip: (headers['x-forwarded-for']?.split(',')[0] || headers['x-real-ip'] || '').trim() || null,
      raw: req,
      readBody: async () => parseWebRequestBody(req, headers),
    };
  }
  // Express / Next Pages Router
  if (req && req.headers && typeof req.headers === 'object') {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      headers[k.toLowerCase()] = Array.isArray(v) ? v.join(',') : v;
    }
    return {
      method: req.method,
      url: req.url,
      origin: headers.origin || null,
      headers,
      cookies: req.cookies || parseCookieHeader(headers.cookie || ''),
      ip: req.ip || (headers['x-forwarded-for']?.split(',')[0] || headers['x-real-ip'] || '').trim() || null,
      raw: req,
      readBody: async () => req.body !== undefined ? req.body : null,
    };
  }
  throw new Error('Unsupported request shape');
}
