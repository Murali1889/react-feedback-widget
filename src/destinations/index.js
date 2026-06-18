/**
 * Public destinations API.
 *
 *   import {
 *     local, webhook, webhookProxied,
 *     supabasePublic, supabaseProxied,
 *     linearIssue, githubIssue, notionDb,
 *     cloud,
 *   } from 'react-visual-feedback/destinations';
 *
 * Use:
 *
 *   <FeedbackProvider
 *     destinations={[
 *       local(),
 *       githubIssue(),                       // server-proxied, default safe
 *       supabasePublic({ url, anonKey }),    // anon + RLS (read the warning!)
 *     ]}
 *   />
 */

export { local } from './adapters/local.js';
export { webhook, webhookProxied } from './adapters/webhook.js';
export { supabasePublic, supabaseProxied } from './adapters/supabase.js';
export { linearIssue, githubIssue, githubAction, notionDb, hubspot, slack, discord } from './adapters/issue-trackers.js';
export { cloud } from './adapters/cloud.js';

// `connect` namespace — also re-exported from the root entry, but importing
// from /destinations is server-safe (no React, no html2canvas).
export { connect } from './connect.js';

export {
  assertNoPrivateCredentials,
  detectPrivateCredential,
  FeedbackCredentialLeakError,
} from './safety.js';

export {
  dispatchToDestinations,
  destinationsFromLegacyIntegrations,
} from './registry.js';

// Signed-URL upload strategy (tier 3) — browser PUTs binaries directly
// to object storage (S3/R2/Supabase) via short-lived signed URLs.
// Falls back to multipart if the upload-URL request fails.
export { uploadViaSignedUrl } from './signedUrlUpload.js';
