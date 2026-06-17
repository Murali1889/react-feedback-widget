/**
 * Google OAuth helpers — PKCE generation, loopback HTTP server,
 * code-for-token exchange, Drive auto-create-spreadsheet.
 *
 * Used by the sheets adapter. Pulled out as a separate module so the
 * primitives stay testable without spinning up the full adapter UI.
 */
import { randomBytes, createHash } from 'node:crypto';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * Generate a PKCE verifier + S256 challenge.
 * verifier: 43-char URL-safe base64 of 32 random bytes.
 * challenge: base64url(SHA256(verifier)).
 */
export function generatePkce(rng = randomBytes) {
  const verifier = rng(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * Ask the OS for a free TCP port. Returns the port the OS handed us
 * right before we close the listener.
 */
export function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = createNetServer();
    s.unref();
    s.on('error', reject);
    s.listen({ port: 0, host: '127.0.0.1' }, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/**
 * Build a Google authorization URL with PKCE + drive.file scope.
 */
export function buildAuthUrl({ clientId, redirectUri, challenge, scopes, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });
  if (state) params.set('state', state);
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Start a loopback HTTP server that resolves with the OAuth code as
 * soon as Google redirects to it. Returns { close, codePromise }.
 *
 * The success/error pages tell the user to switch back to the CLI.
 */
export function startLoopbackServer({ port, state }) {
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = createHttpServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const code = url.searchParams.get('code');
    const err = url.searchParams.get('error');
    const gotState = url.searchParams.get('state');

    if (state && gotState !== state) {
      respond(res, 400, errorPage('State mismatch — refusing to continue.'));
      rejectCode(new Error('state_mismatch'));
      return;
    }
    if (err) {
      respond(res, 200, errorPage(err === 'access_denied'
        ? 'You declined access. Re-run `rvf auth sheets` to try again.'
        : `Google returned an error: ${err}`));
      rejectCode(new Error(err));
      return;
    }
    if (code) {
      respond(res, 200, successPage());
      resolveCode(code);
      return;
    }
    respond(res, 400, errorPage('Missing authorization code.'));
  });

  server.listen(port, '127.0.0.1');

  return {
    codePromise,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

function respond(res, status, html) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function successPage() {
  return `<!doctype html><html><body style="font-family: system-ui; max-width: 480px; margin: 80px auto; text-align: center;">
<h2 style="color: #16a34a">✓ Connected.</h2>
<p>You can close this tab and return to the CLI — we're auto-creating your spreadsheet now.</p>
</body></html>`;
}

function errorPage(message) {
  return `<!doctype html><html><body style="font-family: system-ui; max-width: 480px; margin: 80px auto; text-align: center;">
<h2 style="color: #dc2626">Couldn't complete sign-in</h2>
<p>${escapeHtml(message)}</p>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Exchange the authorization code for { access_token, refresh_token }.
 */
export async function exchangeCodeForTokens({ clientId, clientSecret, code, verifier, redirectUri, fetchImpl = fetch }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const r = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) {
    const text = await safeText(r);
    throw new Error(`Token exchange failed (${r.status}): ${text}`);
  }
  const json = await r.json();
  if (!json.refresh_token) {
    throw new Error('Google did not return a refresh_token. (access_type=offline was missing, or the user has already granted access — revoke at myaccount.google.com/permissions and retry.)');
  }
  return json;
}

/**
 * Create a new Google Sheets spreadsheet through Drive (so it falls
 * under the drive.file scope we just authorized). Returns { id, name, url }.
 */
export async function createSpreadsheet({ accessToken, name = 'react-visual-feedback', fetchImpl = fetch }) {
  const r = await fetchImpl(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    }),
  });
  if (!r.ok) {
    const text = await safeText(r);
    throw new Error(`Drive create failed (${r.status}): ${text}`);
  }
  const json = await r.json();
  return {
    id: json.id,
    name: json.name || name,
    url: `https://docs.google.com/spreadsheets/d/${json.id}`,
  };
}

async function safeText(r) {
  try { return await r.text(); } catch { return '<unreadable>'; }
}
