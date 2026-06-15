import React from 'react';
import { FeedbackProvider } from './FeedbackProvider';

/**
 * SimpleFeedbackButton
 *
 * Zero-config feedback widget. The "amazing setup" surface:
 *
 *   <SimpleFeedbackButton onSubmit={async (payload) => { await fetch('/api/feedback', { method: 'POST', body: JSON.stringify(payload) }); }} />
 *
 * Wraps FeedbackProvider with sensible defaults — local dashboard,
 * default redaction, secure-by-default auth (session mode), capture
 * pipeline mounted with network + interaction + error + route
 * observers, AI ticket assembled on submit.
 *
 * Hosts who need finer control (custom integrations, controlled
 * auth, theme, dashboard toggling) should use <FeedbackProvider />
 * directly — every prop here is just a sensible default that maps
 * to a FeedbackProvider prop.
 */
export function SimpleFeedbackButton({
  onSubmit,
  userName = 'Anonymous',
  userEmail = null,
  position = 'bottom-right',
  buildInfo,
  flagsSnapshot,
  children,
}) {
  return (
    <FeedbackProvider
      onSubmit={onSubmit}
      userName={userName}
      userEmail={userEmail}
      dashboard
      mode="light"
      auth={{ mode: 'session' }}
      redact="default"
      captureConfig={{
        buildInfo: buildInfo || undefined,
        flagsSnapshot: flagsSnapshot || undefined,
      }}
      triggerPosition={position}
    >
      {children}
    </FeedbackProvider>
  );
}

export default SimpleFeedbackButton;
