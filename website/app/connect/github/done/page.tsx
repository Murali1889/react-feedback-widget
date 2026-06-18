/**
 * /connect/github/done — server-side reads the one-shot handoff cookie,
 * renders the env-var copy block, then clears the cookie.
 *
 * Hand-off cookie is httpOnly + 60s max-age so it can't be read from JS
 * and can't be replayed.
 */
import { cookies } from 'next/headers';
import { CopyEnvBlock } from './CopyEnvBlock';

type Handoff = {
  access_token: string;
  refresh_token: string;
  login: string;
  issued_at: number;
};

export const dynamic = 'force-dynamic';

export default async function Done() {
  const jar = cookies();
  const raw = jar.get('rvf_token_handoff')?.value;
  let handoff: Handoff | null = null;
  if (raw) {
    try { handoff = JSON.parse(raw); } catch { handoff = null; }
  }

  if (!handoff) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>No handoff in progress</h1>
        <p style={{ color: '#94a3b8' }}>
          Restart from <a href="/connect/github">/connect/github</a>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <a href="/" style={{ color: '#94a3b8', fontSize: 13 }}>← All destinations</a>

      <h1 style={{ fontSize: 28, margin: '20px 0 8px' }}>
        ✓ Connected as {handoff.login || 'you'}
      </h1>
      <p style={{ color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>
        Paste the block below into your project's <code>.env.local</code>.
        That's it — your server will start filing GitHub issues on submit.
      </p>

      <CopyEnvBlock
        text={[
          `GITHUB_TOKEN=${handoff.access_token}`,
          handoff.refresh_token ? `GITHUB_REFRESH_TOKEN=${handoff.refresh_token}` : '',
          handoff.login ? `GITHUB_LOGIN=${handoff.login}` : '',
        ].filter(Boolean).join('\n')}
      />

      <p style={{ marginTop: 28, color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
        We won't show these again — they were handed to your browser in a
        one-shot cookie and are now gone from our side.
      </p>
    </div>
  );
}
