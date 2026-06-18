/**
 * GET /api/oauth/github/callback — finish the GitHub OAuth dance.
 *
 * Exchanges the `code` for an access_token + refresh_token, then either:
 *
 *   · If state.callback is a loopback URL → render an HTML page that
 *     POSTs the credentials to the CLI's loopback server and then shows
 *     "✓ sent to CLI."  (CORS handled on the CLI side.)
 *
 *   · Otherwise → redirect to /connect/github/done with the credentials
 *     hand-carried via a short-lived (5s) httpOnly cookie, so they
 *     never sit in URLs / browser history.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  credentialsConfigured,
} from '@/lib/credentials/github';
import { decodeState, isAllowedLoopback } from '@/lib/state';
import { safeJsonForScript } from '@/lib/script-safe-json';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export async function GET(req: NextRequest) {
  const config = credentialsConfigured();
  if (!config.ok) {
    return errorPage('OAuth not configured — maintainer setup pending.');
  }

  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return errorPage(
      error === 'access_denied'
        ? 'You declined access. Close this tab to try again.'
        : `GitHub returned an error: ${error}`
    );
  }
  if (!code || !stateRaw) {
    return errorPage('Missing code or state from GitHub.');
  }

  const state = decodeState(stateRaw);
  if (!state) {
    return errorPage('Invalid state — possible CSRF. Restart from /connect/github.');
  }

  // Exchange code → tokens
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_OAUTH_CLIENT_ID,
      client_secret: GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: new URL('/api/oauth/github/callback', req.url).toString(),
    }),
  });

  if (!tokenRes.ok) {
    return errorPage(`Token exchange failed: GitHub ${tokenRes.status}`);
  }
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (tokens.error || !tokens.access_token) {
    return errorPage(tokens.error_description || tokens.error || 'No access token returned.');
  }

  // Pull the user's login so we can show "Connected as <user>"
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'User-Agent': 'rvf-website',
      Accept: 'application/vnd.github+json',
    },
  });
  const user = userRes.ok ? ((await userRes.json()) as { login?: string }) : {};

  // Loopback handoff — bounce token to CLI
  if (state.callback && isAllowedLoopback(state.callback)) {
    return loopbackBouncePage({
      callback: state.callback,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      login: user.login || '',
    });
  }

  // Browser handoff — short-lived cookie + redirect.
  // Force `secure` in production regardless of req.nextUrl.protocol —
  // TLS-terminating proxies in front of Next often forward as http.
  const res = NextResponse.redirect(new URL('/connect/github/done', req.url));
  const inProd = process.env.NODE_ENV === 'production';
  res.cookies.set('rvf_token_handoff', JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || '',
    login: user.login || '',
    issued_at: Date.now(),
  }), {
    httpOnly: true,
    secure: inProd || req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/connect/github',
    maxAge: 60,
  });
  return res;
}

function errorPage(message: string) {
  const html = `<!doctype html><html><head><title>Sign-in failed</title>
<meta charset="utf-8"></head>
<body style="font-family: system-ui; max-width: 480px; margin: 80px auto; text-align: center; color: #e2e8f0; background: #0b1220;">
<h2 style="color: #f87171">Couldn't complete sign-in</h2>
<p>${escapeHtml(message)}</p>
<p><a href="/connect/github" style="color: #60a5fa">Try again</a></p>
</body></html>`;
  return new Response(html, {
    status: 400,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function loopbackBouncePage(opts: {
  callback: string;
  accessToken: string;
  refreshToken: string;
  login: string;
}) {
  // Inline JS POSTs the credentials to the CLI's loopback. JSON.stringify
  // alone is NOT safe inside a <script> tag — `</script>` inside any value
  // would break out, and U+2028/U+2029 would terminate the statement.
  // safeJsonForScript escapes those.
  const payload = safeJsonForScript({
    GITHUB_TOKEN: opts.accessToken,
    GITHUB_REFRESH_TOKEN: opts.refreshToken,
    GITHUB_LOGIN: opts.login,
  });
  const callbackUrl = safeJsonForScript(opts.callback);
  const html = `<!doctype html><html><head><title>Connected</title>
<meta charset="utf-8"></head>
<body style="font-family: system-ui; max-width: 480px; margin: 80px auto; text-align: center; color: #e2e8f0; background: #0b1220;">
<h2 id="msg" style="color: #34d399">✓ Connected as ${escapeHtml(opts.login || 'you')}</h2>
<p id="sub" style="color: #94a3b8">Sending credentials back to your CLI…</p>
<script>
(async () => {
  try {
    const r = await fetch(${callbackUrl}, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(${payload}),
      mode: 'cors',
    });
    if (!r.ok) throw new Error('CLI returned ' + r.status);
    document.getElementById('sub').textContent = 'You can close this tab.';
  } catch (e) {
    document.getElementById('msg').style.color = '#f87171';
    document.getElementById('msg').textContent = "Couldn't reach the CLI loopback";
    document.getElementById('sub').textContent =
      'Open the terminal where you ran the command and paste the env vars manually. Error: ' + (e && e.message || e);
  }
})();
</script>
</body></html>`;
  // CSP: the inline script needs `unsafe-inline` (we ship one inline
  // bundle) but everything else is locked down. No external scripts,
  // no remote stylesheets, no images, no frames. Only the fetch to the
  // loopback (a `connect-src 'self' http://127.0.0.1:* http://localhost:*`)
  // is permitted.
  const csp = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "connect-src 'self' http://127.0.0.1:* http://localhost:*",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': csp,
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );
}


