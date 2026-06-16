/**
 * Credential safety — refuse known-private-key shapes at construction time.
 *
 * The product invariant: the browser bundle never holds a production
 * credential. Better to crash loudly during adapter setup than to ship
 * a key that ends up on a paste site three weeks later.
 *
 * Patterns below are sourced from the providers' own documentation /
 * public examples. Conservative: false positives here are recoverable
 * (user picks the server-proxied variant); false negatives are not.
 */

// Prefix patterns use \b word boundaries so they catch keys embedded
// inside larger strings too — e.g. an Authorization: "Bearer ghp_..."
// header value, or a curl example pasted into a webhook header. The
// JWT detector still operates on the whole value (it has to decode
// the payload).
const PRIVATE_KEY_PATTERNS = [
  {
    name: 'Supabase service-role JWT',
    test: (v) => typeof v === 'string' && v.startsWith('eyJ') && /"role"\s*:\s*"service_role"/.test(safeDecodeJwt(v) || ''),
    suggest: 'Use supabaseProxied() with the service-role key set on your server, OR supabasePublic() with the anon key + RLS policy. Never put the service-role key in the browser bundle.',
  },
  {
    name: 'GitHub Personal Access Token (classic)',
    test: (v) => typeof v === 'string' && /\bghp_[A-Za-z0-9]{20,}\b/.test(v),
    suggest: 'Use githubIssue() — it routes through your server; set the PAT in your server env, not the React bundle.',
  },
  {
    name: 'GitHub fine-grained PAT',
    test: (v) => typeof v === 'string' && /\bgithub_pat_[A-Za-z0-9_]{20,}\b/.test(v),
    suggest: 'Use githubIssue() — it routes through your server; set the token in your server env.',
  },
  {
    name: 'GitHub Actions / App token',
    test: (v) => typeof v === 'string' && /\b(ghs_|ghu_|gho_|ghr_)[A-Za-z0-9]{20,}\b/.test(v),
    suggest: 'These tokens are not for browser use. Configure githubIssue() server-side.',
  },
  {
    name: 'Linear API key',
    test: (v) => typeof v === 'string' && /\blin_api_[A-Za-z0-9]{20,}\b/.test(v),
    suggest: 'Use linearIssue() — it routes through your server; set the Linear API key in your server env.',
  },
  {
    name: 'Linear OAuth token',
    test: (v) => typeof v === 'string' && /\blin_oauth_[A-Za-z0-9]{20,}\b/.test(v),
    suggest: 'OAuth tokens are not for browser use. Configure linearIssue() server-side.',
  },
  {
    name: 'Notion integration token',
    test: (v) => typeof v === 'string' && /\b(secret_|ntn_)[A-Za-z0-9]{30,}\b/.test(v),
    suggest: 'Use notionDb() — it routes through your server; set the integration token in your server env.',
  },
  {
    name: 'Atlassian (Jira) API token',
    test: (v) => typeof v === 'string' && /\bATATT3[A-Za-z0-9_-]{20,}\b/.test(v),
    suggest: 'Use jira({ type: "server" }) and put the token on your server, never in the React bundle.',
  },
  {
    name: 'Slack token',
    test: (v) => typeof v === 'string' && /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/.test(v),
    suggest: 'Slack tokens are not for browser use. Route through your server.',
  },
  {
    name: 'AWS access key id',
    test: (v) => typeof v === 'string' && /\bAKIA[A-Z0-9]{16}\b/.test(v),
    suggest: 'AWS access keys must never appear in browser code. Use Cognito Identity / pre-signed URLs / your own server.',
  },
  {
    name: 'Google OAuth client secret',
    test: (v) => typeof v === 'string' && /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/.test(v),
    suggest: 'Client secrets must never appear in browser code.',
  },
  {
    name: 'Stripe secret key',
    test: (v) => typeof v === 'string' && /\bsk_(live|test)_[A-Za-z0-9]{20,}\b/.test(v),
    suggest: 'Stripe secret keys must never appear in browser code.',
  },
];

function safeDecodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = payload.length % 4 ? '='.repeat(4 - (payload.length % 4)) : '';
    if (typeof atob === 'function') return atob(payload + pad);
    if (typeof Buffer !== 'undefined') return Buffer.from(payload + pad, 'base64').toString('utf8');
    return null;
  } catch {
    return null;
  }
}

export class FeedbackCredentialLeakError extends Error {
  constructor(detectedAs, fieldName, suggestion) {
    super(
      `[react-visual-feedback] Refused to use ${detectedAs} as a client-side ${fieldName}. ` +
      `Putting this kind of credential in the browser bundle exposes it to every visitor. ` +
      suggestion
    );
    this.name = 'FeedbackCredentialLeakError';
    this.code = 'private_credential_in_bundle';
    this.detectedAs = detectedAs;
    this.fieldName = fieldName;
  }
}

/**
 * Throws if `value` matches a known-private-key shape. Use in adapter
 * constructors before any other validation:
 *
 *   export function supabasePublic({ url, anonKey }) {
 *     assertNoPrivateCredentials(anonKey, 'anonKey');
 *     ...
 *   }
 */
export function assertNoPrivateCredentials(value, fieldName) {
  if (!value || typeof value !== 'string') return;
  for (const pattern of PRIVATE_KEY_PATTERNS) {
    if (pattern.test(value)) {
      throw new FeedbackCredentialLeakError(pattern.name, fieldName, pattern.suggest);
    }
  }
}

/**
 * Lighter check that simply returns the pattern name (or null) without
 * throwing. Useful for warnings in dev mode.
 */
export function detectPrivateCredential(value) {
  if (!value || typeof value !== 'string') return null;
  for (const pattern of PRIVATE_KEY_PATTERNS) {
    if (pattern.test(value)) return pattern.name;
  }
  return null;
}
