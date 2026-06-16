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
export { linearIssue, githubIssue, notionDb } from './adapters/issue-trackers.js';
export { cloud } from './adapters/cloud.js';

export {
  assertNoPrivateCredentials,
  detectPrivateCredential,
  FeedbackCredentialLeakError,
} from './safety.js';

export {
  dispatchToDestinations,
  destinationsFromLegacyIntegrations,
} from './registry.js';
