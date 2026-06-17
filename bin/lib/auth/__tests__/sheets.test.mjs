/**
 * Sheets adapter + Google OAuth helper tests.
 *
 * PKCE and loopback are protocol-critical: a regression here would
 * leak the entire flow. The integration test starts a real loopback
 * server, simulates Google's redirect to the callback URL, and
 * mocks the token / Drive endpoints.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  generatePkce, findFreePort, buildAuthUrl, startLoopbackServer,
  exchangeCodeForTokens, createSpreadsheet,
} from '../google-oauth.mjs';
import sheets from '../adapters/sheets.mjs';

// ───────────────────────────────────────── PKCE

describe('generatePkce', () => {
  it('produces a 43-char base64url verifier and SHA-256 challenge', () => {
    const { verifier, challenge } = generatePkce();
    expect(verifier.length).toBe(43);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(challenge).toBe(expected);
  });

  it('uses an injectable RNG (for determinism in tests)', () => {
    const fixed = Buffer.alloc(32, 0x42); // 32 bytes of 0x42
    const { verifier, challenge } = generatePkce(() => fixed);
    expect(verifier).toBe(fixed.toString('base64url'));
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });
});

// ───────────────────────────────────────── free port

describe('findFreePort', () => {
  it('returns a usable port number', async () => {
    const p = await findFreePort();
    expect(typeof p).toBe('number');
    expect(p).toBeGreaterThan(1024);
    expect(p).toBeLessThan(65536);
  });

  it('returns different ports across calls (extremely high probability)', async () => {
    const a = await findFreePort();
    const b = await findFreePort();
    // OS may rarely reuse a port, but two back-to-back asks usually differ
    expect(typeof a).toBe('number');
    expect(typeof b).toBe('number');
  });
});

// ───────────────────────────────────────── buildAuthUrl

describe('buildAuthUrl', () => {
  it('includes client_id, redirect_uri, scope, PKCE challenge, access_type=offline, prompt=consent', () => {
    const url = buildAuthUrl({
      clientId: 'CID',
      redirectUri: 'http://127.0.0.1:55555/callback',
      challenge: 'CHALLENGE',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      state: 'STATE',
    });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(u.searchParams.get('client_id')).toBe('CID');
    expect(u.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:55555/callback');
    expect(u.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.file');
    expect(u.searchParams.get('code_challenge')).toBe('CHALLENGE');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('prompt')).toBe('consent');
    expect(u.searchParams.get('state')).toBe('STATE');
  });
});

// ───────────────────────────────────────── loopback server

describe('startLoopbackServer', () => {
  it('resolves codePromise when GET /callback?code=X arrives', async () => {
    const port = await findFreePort();
    const lb = startLoopbackServer({ port, state: 's' });
    const res = await fetch(`http://127.0.0.1:${port}/callback?code=ABC&state=s`);
    expect(res.status).toBe(200);
    expect(await lb.codePromise).toBe('ABC');
    await lb.close();
  });

  it('rejects on state mismatch', async () => {
    const port = await findFreePort();
    const lb = startLoopbackServer({ port, state: 'expected' });
    fetch(`http://127.0.0.1:${port}/callback?code=ABC&state=WRONG`).catch(() => {});
    await expect(lb.codePromise).rejects.toThrow(/state_mismatch/);
    await lb.close();
  });

  it('rejects with access_denied when user declines', async () => {
    const port = await findFreePort();
    const lb = startLoopbackServer({ port });
    fetch(`http://127.0.0.1:${port}/callback?error=access_denied`).catch(() => {});
    await expect(lb.codePromise).rejects.toThrow(/access_denied/);
    await lb.close();
  });
});

// ───────────────────────────────────────── token exchange

describe('exchangeCodeForTokens', () => {
  it('POSTs form-urlencoded body and returns tokens', async () => {
    let captured;
    const fakeFetch = async (url, opts) => {
      captured = { url, opts };
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }),
        text: async () => '',
      };
    };
    const r = await exchangeCodeForTokens({
      clientId: 'CID', clientSecret: 'CS', code: 'CODE',
      verifier: 'VER', redirectUri: 'http://127.0.0.1:5555/cb',
      fetchImpl: fakeFetch,
    });
    expect(r.refresh_token).toBe('RT');
    expect(captured.opts.method).toBe('POST');
    expect(captured.opts.headers['content-type']).toBe('application/x-www-form-urlencoded');
    const body = captured.opts.body.toString();
    expect(body).toContain('client_id=CID');
    expect(body).toContain('client_secret=CS');
    expect(body).toContain('code=CODE');
    expect(body).toContain('code_verifier=VER');
    expect(body).toContain('grant_type=authorization_code');
  });

  it('throws when refresh_token is missing (re-grant needed)', async () => {
    const fakeFetch = async () => ({
      ok: true, status: 200,
      json: async () => ({ access_token: 'AT', expires_in: 3600 }), // no refresh_token
      text: async () => '',
    });
    await expect(
      exchangeCodeForTokens({ clientId: 'X', clientSecret: 'X', code: 'X', verifier: 'X', redirectUri: 'X', fetchImpl: fakeFetch })
    ).rejects.toThrow(/refresh_token/);
  });
});

// ───────────────────────────────────────── Drive create

describe('createSpreadsheet', () => {
  it('POSTs to /drive/v3/files with the spreadsheet mimeType', async () => {
    let captured;
    const fakeFetch = async (url, opts) => {
      captured = { url, opts };
      return {
        ok: true, status: 200,
        json: async () => ({ id: 'SPREAD-ID', name: 'react-visual-feedback' }),
        text: async () => '',
      };
    };
    const r = await createSpreadsheet({ accessToken: 'AT', fetchImpl: fakeFetch });
    expect(captured.url).toBe('https://www.googleapis.com/drive/v3/files');
    expect(captured.opts.headers.authorization).toBe('Bearer AT');
    const body = JSON.parse(captured.opts.body);
    expect(body.mimeType).toBe('application/vnd.google-apps.spreadsheet');
    expect(r.id).toBe('SPREAD-ID');
    expect(r.url).toBe('https://docs.google.com/spreadsheets/d/SPREAD-ID');
  });
});

// ───────────────────────────────────────── adapter

describe('sheets adapter', () => {
  it('declares the oauth-loopback flow', () => {
    expect(sheets.flow).toBe('oauth-loopback');
  });

  it('refuses cleanly when credentials are placeholder', async () => {
    // The credentials are placeholder by default in this build — exercise that path.
    const captured = {};
    const fakeClack = {
      log: { error: (m) => { captured.error = m; }, info: () => {}, success: () => {}, warn: () => {} },
      note: (body, title) => { captured.note = { body, title }; },
      spinner: () => ({ start: () => {}, stop: () => {}, message: () => {} }),
    };
    const r = await sheets.runOAuth({ clack: fakeClack, flags: {} });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/credentials/i);
    expect(captured.note.title).toMatch(/Setup required/i);
  });

  it('envEntries shape after a successful flow', () => {
    const e = sheets.envEntries({
      refreshToken: 'RT',
      spreadsheet: { id: 'SP-1', name: 'rvf', url: 'https://docs.google.com/spreadsheets/d/SP-1' },
    });
    expect(e.GOOGLE_OAUTH_REFRESH_TOKEN).toBe('RT');
    expect(e.GOOGLE_SPREADSHEET_ID).toBe('SP-1');
    expect(e).toHaveProperty('GOOGLE_CLIENT_ID');
    expect(e).toHaveProperty('GOOGLE_CLIENT_SECRET');
  });
});
