/**
 * Web-driven OAuth loopback — receives a POST handoff from our hosted
 * connect website after the user finishes the OAuth dance there.
 *
 * Differs from google-oauth.mjs's loopback in two ways:
 *   1. Accepts POST (not GET) — credentials live in the body, not query.
 *   2. Sends CORS + Private Network Access headers so a public-origin
 *      page (e.g. https://rvf.dev) can fetch into http://127.0.0.1.
 */
import { createServer } from 'node:http';

export function startWebLoopback({ port, allowedOrigin }) {
  let resolvePayload;
  let rejectPayload;
  const payloadPromise = new Promise((res, rej) => {
    resolvePayload = res;
    rejectPayload = rej;
  });

  const server = createServer((req, res) => {
    const origin = req.headers.origin || '';
    const corsHeaders = {
      'access-control-allow-origin': matchOrigin(origin, allowedOrigin) ? origin : '',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-private-network': 'true',
      'access-control-max-age': '60',
    };

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

    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
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

function matchOrigin(actual, allowed) {
  if (!actual) return false;
  if (allowed === '*') return true;
  if (Array.isArray(allowed)) return allowed.includes(actual);
  return actual === allowed;
}
