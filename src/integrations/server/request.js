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
    return req.formData();
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
