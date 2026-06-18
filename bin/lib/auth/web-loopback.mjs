/**
 * Web-driven OAuth loopback — receives a POST handoff from our hosted
 * connect website after the user finishes the OAuth dance there.
 *
 * Defense in depth:
 *   1. Path is `/handoff/<secret>` — caller mints a 256-bit random secret
 *      and embeds it in the path. Any other request (path mismatch, no
 *      secret) gets a 404. This is the load-bearing barrier against
 *      local malware or another tab racing the legitimate browser.
 *   2. Origin allowlist — even on the secret path, OPTIONS preflight and
 *      POST both check that `Origin` matches the configured website.
 *   3. PNA — `access-control-allow-private-network: true` so a public
 *      origin (e.g. https://rvf.dev) can fetch into http://127.0.0.1
 *      under Chrome's Private Network Access checks.
 *   4. Method allowlist — only OPTIONS + POST accepted; nothing else.
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

export function startWebLoopback({ port, allowedOrigin, path }) {
  if (!path || !path.startsWith('/handoff/')) {
    throw new Error('startWebLoopback: path must be /handoff/<secret>');
  }
  const expectedSecret = path.slice('/handoff/'.length);
  if (expectedSecret.length < 32) {
    throw new Error('startWebLoopback: secret must be >= 32 chars (use crypto.randomBytes(32).toString("hex"))');
  }

  let resolvePayload;
  let rejectPayload;
  const payloadPromise = new Promise((res, rej) => {
    resolvePayload = res;
    rejectPayload = rej;
  });

  const server = createServer((req, res) => {
    const origin = req.headers.origin || '';
    const originOk = matchOrigin(origin, allowedOrigin);
    const corsHeaders = {
      'access-control-allow-origin':           originOk ? origin : '',
      'access-control-allow-methods':          originOk ? 'POST, OPTIONS' : '',
      'access-control-allow-headers':          originOk ? 'content-type' : '',
      'access-control-allow-private-network':  originOk ? 'true' : '',
      'access-control-max-age':                originOk ? '60' : '0',
    };

    // Path check — constant-time comparison of the secret segment so we
    // don't leak timing info that could let an attacker brute-force it.
    if (!pathMatches(req.url, path, expectedSecret)) {
      res.writeHead(404, corsHeaders);
      res.end('Not found');
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, corsHeaders);
      res.end('Method not allowed');
      return;
    }

    if (!originOk) {
      // Don't even read the body — refuse before anything sensitive happens.
      res.writeHead(403, corsHeaders);
      res.end('Origin not allowed');
      return;
    }

    let body = '';
    let aborted = false;
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 64 * 1024) {            // 64KB cap on handoff payload
        aborted = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) {
        rejectPayload(new Error('handoff body too large'));
        return;
      }
      try {
        const parsed = JSON.parse(body);
        res.writeHead(200, { ...corsHeaders, 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        resolvePayload(parsed);
      } catch (e) {
        res.writeHead(400, corsHeaders);
        res.end('Invalid JSON');
        rejectPayload(e);
      }
    });
  });

  server.listen(port, '127.0.0.1');

  return {
    payloadPromise,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

function pathMatches(url, expectedPath, expectedSecret) {
  if (!url) return false;
  let path;
  try {
    path = new URL(url, 'http://127.0.0.1').pathname;
  } catch {
    return false;
  }
  if (!path.startsWith('/handoff/')) return false;
  const got = path.slice('/handoff/'.length);
  if (got.length !== expectedSecret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expectedSecret));
  } catch {
    return false;
  }
}

function matchOrigin(actual, allowed) {
  if (!actual) return false;
  if (allowed === '*') return true;
  if (Array.isArray(allowed)) return allowed.includes(actual);
  return actual === allowed;
}
