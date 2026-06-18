'use client';

import { useState } from 'react';

export function CopyEnvBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '14px 16px',
        position: 'relative',
        fontFamily: '"SF Mono", Menlo, monospace',
        fontSize: 13,
      }}
    >
      <pre
        style={{
          margin: 0,
          color: '#e2e8f0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {text}
      </pre>
      <button
        onClick={copy}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: copied ? '#10b981' : 'rgba(255,255,255,0.08)',
          color: copied ? '#0b1220' : '#e2e8f0',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        {copied ? '✓ copied' : 'copy'}
      </button>
    </div>
  );
}
