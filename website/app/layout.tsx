import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'react-visual-feedback — Connect',
  description: 'One-click connect for feedback destinations',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: '#0b1220',
          color: '#e2e8f0',
          minHeight: '100vh',
        }}
      >
        <header
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            react-visual-feedback
          </span>
          <span style={{ color: '#64748b' }}>·</span>
          <span style={{ color: '#94a3b8' }}>Connect</span>
        </header>
        <main style={{ padding: '40px 24px', maxWidth: 960, margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
