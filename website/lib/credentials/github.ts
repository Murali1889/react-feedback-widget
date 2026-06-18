/**
 * GitHub OAuth App credentials.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  MAINTAINER: register one OAuth App per environment (dev + prod).
 * ─────────────────────────────────────────────────────────────────────
 *
 *   1. Visit https://github.com/settings/developers → "OAuth Apps" → New
 *   2. Application name:        react-visual-feedback
 *      Homepage URL:            https://rvf.dev   (or your localhost in dev)
 *      Authorization callback:  https://rvf.dev/api/oauth/github/callback
 *                               (or http://localhost:3009/... in dev)
 *   3. Click "Register application"
 *   4. Click "Generate a new client secret"
 *   5. Set in .env.local:
 *        GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
 *        GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *        OAUTH_STATE_SECRET=<32 random hex bytes>
 *
 * Scope: we request `repo` — overscoped relative to what we use
 * (Issues API only), but it's the smallest scope GitHub OAuth Apps offer
 * that includes write access to private repos. The consent screen tells
 * the user exactly what they're granting; we don't use the rest.
 */
export const GITHUB_OAUTH_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID || '';
export const GITHUB_OAUTH_CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET || '';
export const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || '';

export const GITHUB_OAUTH_SCOPE = 'repo';

const MIN_STATE_SECRET_LEN = 32;

export function credentialsConfigured(): { ok: boolean; missing: string[]; weak: string[] } {
  const missing: string[] = [];
  const weak: string[] = [];
  if (!GITHUB_OAUTH_CLIENT_ID) missing.push('GITHUB_OAUTH_CLIENT_ID');
  if (!GITHUB_OAUTH_CLIENT_SECRET) missing.push('GITHUB_OAUTH_CLIENT_SECRET');
  if (!OAUTH_STATE_SECRET) missing.push('OAUTH_STATE_SECRET');
  // A short HMAC secret produces a guess-able (or empty-key-deterministic)
  // signature. Require at least 32 chars — 16 random bytes hex-encoded.
  else if (OAUTH_STATE_SECRET.length < MIN_STATE_SECRET_LEN) weak.push('OAUTH_STATE_SECRET');
  return { ok: missing.length === 0 && weak.length === 0, missing, weak };
}
