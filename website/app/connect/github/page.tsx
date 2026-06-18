/**
 * /connect/github — explainer + "Connect to GitHub" button.
 *
 * If the page is loaded with ?callback=<loopback-url>, the button
 * propagates that to the OAuth start endpoint so the post-OAuth
 * handler can deliver credentials back to the user's CLI.
 */
'use client';

import { useEffect, useState } from 'react';

export default function ConnectGitHubPage() {
  const [callback, setCallback] = useState<string | null>(null);

  useEffect(() => {
    const cb = new URLSearchParams(window.location.search).get('callback');
    setCallback(cb);
  }, []);

  const href = callback
    ? `/api/oauth/github/start?callback=${encodeURIComponent(callback)}`
    : `/api/oauth/github/start`;

  return (
    <div style={{ maxWidth: 580 }}>
      <a href="/" style={{ color: '#94a3b8', fontSize: 13 }}>← All destinations</a>

      <h1 style={{ fontSize: 28, margin: '20px 0 8px' }}>
        Connect to GitHub
      </h1>
      <p style={{ color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>
        We'll send you to GitHub's consent screen. After you grant access,
        we hand the credentials back to your stack — we never store them.
      </p>

      {callback && (
        <div
          style={{
            background: 'rgba(96,165,250,0.10)',
            border: '1px solid rgba(96,165,250,0.30)',
            color: '#bfdbfe',
            padding: '10px 14px',
            borderRadius: 8,
            margin: '0 0 24px',
            fontSize: 13,
          }}
        >
          CLI mode — credentials will be POSTed back to{' '}
          <code>{callback}</code> when you finish.
        </div>
      )}

      <a
        href={href}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: '#1f2937',
          color: '#f3f4f6',
          padding: '12px 20px',
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.71 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.12 3.04.74.81 1.18 1.84 1.18 3.1 0 4.44-2.7 5.41-5.27 5.7.42.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56C20.21 21.38 23.5 17.08 23.5 12c0-6.35-5.15-11.5-11.5-11.5z"/>
        </svg>
        Connect to GitHub
      </a>

      <p style={{ marginTop: 32, color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
        We request the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>repo</code> scope — the smallest scope GitHub OAuth Apps
        offer that can write to private repositories. We only call the
        Issues API; the consent screen shows you exactly what you're granting.
      </p>
    </div>
  );
}
