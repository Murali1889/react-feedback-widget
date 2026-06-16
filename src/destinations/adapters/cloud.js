import { timed } from '../contract.js';
import { assertNoPrivateCredentials } from '../safety.js';

/**
 * cloud({ projectId, ingestToken, region? }) — our hosted destination.
 *
 * SECURITY MODEL — Sentry/Datadog-style write-only ingest:
 *
 * - `ingestToken` is identity, NOT auth. It tells the server which
 *   project the feedback is for; it does NOT grant data access.
 * - Endpoint is INGEST-ONLY: server accepts POST writes, refuses any
 *   read operations from clients carrying this token.
 * - Server enforces an origin allow-list per project. The token only
 *   works from origins the host has configured in the cloud dashboard.
 * - Server enforces a per-project rate limit and payload size cap.
 *
 * Worst case if the token leaks: an attacker with knowledge of an
 * approved origin can submit garbage feedback to your project until
 * you rotate the token. No data exfiltration is possible because the
 * endpoint is write-only.
 *
 * The adapter still refuses known-private-key shapes for the
 * ingestToken at construction time, as a belt-and-braces guard
 * against someone pasting a service-role / PAT / API key by mistake.
 *
 * NOTE: The backing cloud service is not yet shipped. This adapter
 * encodes the client-side contract so the server, when it lands,
 * is a drop-in. Until then this adapter throws at send-time with a
 * clear "cloud not yet available" message.
 */
const CLOUD_DEFAULT_INGEST = 'https://ingest.feedback-widget.dev/v1/feedback';

export function cloud({ projectId, ingestToken, ingestUrl = CLOUD_DEFAULT_INGEST } = {}) {
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('cloud(): { projectId } is required');
  }
  if (!ingestToken || typeof ingestToken !== 'string') {
    throw new Error('cloud(): { ingestToken } is required');
  }
  // Belt-and-braces: even though ingestToken is *meant* to be public,
  // refuse if someone accidentally pasted a known private credential.
  assertNoPrivateCredentials(ingestToken, 'ingestToken');

  return {
    name: 'cloud',
    mode: 'public-token',
    describe: () => `cloud · ${projectId}`,
    send: (feedback) => timed(async () => {
      const res = await fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-feedback-project': projectId,
          'x-feedback-ingest-token': ingestToken,
        },
        body: JSON.stringify(feedback),
      }).catch((e) => {
        // Distinguish "service not deployed yet" from "network error".
        // Until the cloud backend ships, the default ingest URL won't resolve.
        throw new Error(
          `cloud destination is not yet available. ` +
          `Until the hosted backend ships, use server-proxied adapters ` +
          `(linearIssue, githubIssue, supabaseProxied, jira). ` +
          `Underlying error: ${e?.message || e}`
        );
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`cloud ingest returned ${res.status}: ${text.slice(0, 200)}`);
      }
      const body = await res.json().catch(() => null);
      return { id: body?.id || null, url: body?.url || null };
    }),
  };
}
