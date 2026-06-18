/**
 * Web loopback tests — exercise the POST-handoff server that catches
 * credentials from the hosted OAuth website.
 */
import { describe, it, expect } from 'vitest';
import { findFreePort } from '../google-oauth.mjs';
import { startWebLoopback } from '../web-loopback.mjs';

describe('startWebLoopback', () => {
  it('resolves payloadPromise when a JSON POST arrives', async () => {
    const port = await findFreePort();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev' });

    const res = await fetch(`http://127.0.0.1:${port}/handoff`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://rvf.dev' },
      body: JSON.stringify({ GITHUB_TOKEN: 'gho_xyz' }),
    });
    expect(res.status).toBe(200);

    const payload = await lb.payloadPromise;
    expect(payload).toEqual({ GITHUB_TOKEN: 'gho_xyz' });
    await lb.close();
  });

  it('answers OPTIONS preflight with CORS + private-network headers', async () => {
    const port = await findFreePort();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev' });

    const res = await fetch(`http://127.0.0.1:${port}/handoff`, {
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

  it('refuses CORS for unknown origins', async () => {
    const port = await findFreePort();
    const lb = startWebLoopback({ port, allowedOrigin: 'https://rvf.dev' });

    const res = await fetch(`http://127.0.0.1:${port}/handoff`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example');
    await lb.close();
  });

  it('rejects payloadPromise on invalid JSON', async () => {
    const port = await findFreePort();
    const lb = startWebLoopback({ port, allowedOrigin: '*' });

    // Attach the rejection handler *before* the POST so node doesn't
    // flag it as unhandled while the fetch is in flight.
    const rejection = expect(lb.payloadPromise).rejects.toBeTruthy();

    await fetch(`http://127.0.0.1:${port}/handoff`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    await rejection;
    await lb.close();
  });
});
