/**
 * Web loopback tests — exercise the POST-handoff server that catches
 * credentials from the hosted OAuth website.
 */
import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { findFreePort } from '../google-oauth.mjs';
import { startWebLoopback } from '../web-loopback.mjs';

function secret() { return randomBytes(32).toString('hex'); }
function pathFor(s) { return `/handoff/${s}`; }

describe('startWebLoopback', () => {
  it('refuses construction without a /handoff/<secret> path', () => {
    expect(() => startWebLoopback({ port: 0, allowedOrigin: '*' })).toThrow();
    expect(() => startWebLoopback({ port: 0, allowedOrigin: '*', path: '/foo' })).toThrow();
    expect(() => startWebLoopback({ port: 0, allowedOrigin: '*', path: '/handoff/short' })).toThrow(/>= 32/);
  });

  it('resolves payloadPromise when a JSON POST arrives at the secret path', async () => {
    const port = await findFreePort();
    const s = secret();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev', path: pathFor(s) });

    const res = await fetch(`http://127.0.0.1:${port}${pathFor(s)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://rvf.dev' },
      body: JSON.stringify({ GITHUB_TOKEN: 'gho_xyz' }),
    });
    expect(res.status).toBe(200);

    const payload = await lb.payloadPromise;
    expect(payload).toEqual({ GITHUB_TOKEN: 'gho_xyz' });
    await lb.close();
  });

  it('returns 404 to POSTs on a different path even with the right origin', async () => {
    const port = await findFreePort();
    const s = secret();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev', path: pathFor(s) });

    const res = await fetch(`http://127.0.0.1:${port}/handoff/${secret()}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://rvf.dev' },
      body: JSON.stringify({ GITHUB_TOKEN: 'evil' }),
    });
    expect(res.status).toBe(404);
    await lb.close();
  });

  it('returns 404 to POSTs on a guessed-prefix path', async () => {
    const port = await findFreePort();
    const s = secret();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev', path: pathFor(s) });

    // Same prefix, wrong tail
    const res = await fetch(`http://127.0.0.1:${port}/handoff/${s.slice(0, -4)}abcd`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://rvf.dev' },
      body: JSON.stringify({ GITHUB_TOKEN: 'evil' }),
    });
    expect(res.status).toBe(404);
    await lb.close();
  });

  it('answers OPTIONS preflight with CORS + private-network headers on the secret path', async () => {
    const port = await findFreePort();
    const s = secret();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev', path: pathFor(s) });

    const res = await fetch(`http://127.0.0.1:${port}${pathFor(s)}`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://rvf.dev',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
        'access-control-request-private-network': 'true',
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://rvf.dev');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-private-network')).toBe('true');
    await lb.close();
  });

  it('refuses CORS for unknown origins (no Allow-Origin echoed)', async () => {
    const port = await findFreePort();
    const s = secret();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev', path: pathFor(s) });

    const res = await fetch(`http://127.0.0.1:${port}${pathFor(s)}`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example');
    await lb.close();
  });

  it('returns 403 to POST with a wrong origin (no body read)', async () => {
    const port = await findFreePort();
    const s = secret();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev', path: pathFor(s) });

    const res = await fetch(`http://127.0.0.1:${port}${pathFor(s)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify({ GITHUB_TOKEN: 'attacker' }),
    });
    expect(res.status).toBe(403);
    await lb.close();
  });

  it('rejects payloadPromise on invalid JSON', async () => {
    const port = await findFreePort();
    const s = secret();
    const lb = startWebLoopback({ port, allowedOrigin: '*', path: pathFor(s) });

    const rejection = expect(lb.payloadPromise).rejects.toBeTruthy();
    await fetch(`http://127.0.0.1:${port}${pathFor(s)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://rvf.dev' },
      body: 'not-json',
    });
    await rejection;
    await lb.close();
  });
});
