/**
 * GET /api/oauth/github/start — kick off the GitHub OAuth dance.
 *
 *   Query params:
 *     callback — (optional) http://127.0.0.1:NNNN URL to POST the token
 *                back to. CLI loopback mode uses this.
 *
 * We bundle that callback URL into a signed `state` string that round-
 * trips through GitHub and lands on our /callback handler. No server-
 * side session storage involved.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_SCOPE,
  credentialsConfigured,
} from '@/lib/credentials/github';
import { encodeState, isAllowedLoopback } from '@/lib/state';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';

export async function GET(req: NextRequest) {
  const config = credentialsConfigured();
  if (!config.ok) {
    return NextResponse.json(
      { error: 'oauth_unconfigured', missing: config.missing },
      { status: 500 }
    );
  }

  const callback = req.nextUrl.searchParams.get('callback') || undefined;
  if (callback && !isAllowedLoopback(callback)) {
    return NextResponse.json(
      { error: 'callback_must_be_loopback' },
      { status: 400 }
    );
  }

  const state = encodeState({ callback });
  const redirectUri = new URL('/api/oauth/github/callback', req.url).toString();

  const params = new URLSearchParams({
    client_id: GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: GITHUB_OAUTH_SCOPE,
    state,
    allow_signup: 'true',
  });

  return NextResponse.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`);
}
