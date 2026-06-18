/**
 * connect — friendly one-line API for every destination.
 *
 *   import { connect } from 'react-visual-feedback'
 *
 *   destinations: [
 *     connect.local(),
 *     connect.github({ repo: 'acme/web' }),
 *     connect.jira({ project: 'BUG' }),
 *     connect.notion({ database: 'feedback' }),
 *     connect.sheets({ spreadsheet: '...' }),
 *     connect.hubspot(),
 *     connect.slack({ channel: '#bugs' }),
 *     connect.linear({ team: '...' }),
 *     connect.supabase(),
 *     connect.webhook({ url: '...' }),
 *     connect.cloud({ projectId, ingestToken }),
 *   ]
 *
 * Each function returns a destination adapter that:
 *   - Points to /api/feedback/<name> by convention
 *   - Carries ONLY public metadata (repo name, project key, etc.) — never tokens
 *   - Is consumed by both the client (browser shows it in destinations[])
 *     AND the server router (auto-dispatches to the matching createXHandler)
 *
 * Tokens stay in server env. The server handler reads them by convention.
 * If the host accidentally passes a private credential, the safety guard
 * throws FeedbackCredentialLeakError at construction time.
 *
 * This module is a thin alias surface — every function here just calls
 * an existing adapter factory. The point is a single import that makes
 * the API discoverable: `connect.<TAB>` in any editor shows the menu.
 */

import { local } from './adapters/local.js';
import { webhook, webhookProxied } from './adapters/webhook.js';
import { supabasePublic, supabaseProxied } from './adapters/supabase.js';
import { linearIssue, githubIssue, githubAction, notionDb, hubspot, slack, discord } from './adapters/issue-trackers.js';
import { cloud } from './adapters/cloud.js';

export const connect = {
  /** Browser localStorage. Always include — works offline, no setup. */
  local,

  /** GitHub Issues. Server env: GITHUB_TOKEN, GITHUB_REPO. */
  github: githubIssue,

  /** Trigger a GitHub Actions workflow via repository_dispatch. */
  githubAction,

  /** Linear. Server env: LINEAR_API_KEY, LINEAR_TEAM_ID. */
  linear: linearIssue,

  /** Notion database. Server env: NOTION_TOKEN, NOTION_DB_ID. */
  notion: notionDb,

  /** HubSpot ticket. Server env: HUBSPOT_TOKEN. */
  hubspot,

  /** Slack message. Server env: SLACK_WEBHOOK_URL OR (SLACK_BOT_TOKEN + SLACK_CHANNEL). */
  slack,

  /** Discord channel webhook. Server env: DISCORD_WEBHOOK_URL. */
  discord,

  /** Jira ticket. Server env: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY. */
  jira: () => ({
    name: 'jira',
    mode: 'server-proxied',
    describe: () => 'jira',
    // Reuses the legacy proxyPost surface via the catch-all router
    send: (feedback) => {
      // Dynamic import keeps the legacy bundle out of the main client when not used
      return import('./proxyPost.js').then(({ proxyPost }) =>
        proxyPost('/api/feedback/jira', feedback)
      );
    },
  }),

  /** Google Sheets. Server env: GOOGLE_SHEETS_ID + service account. */
  sheets: () => ({
    name: 'sheets',
    mode: 'server-proxied',
    describe: () => 'sheets',
    send: (feedback) => import('./proxyPost.js').then(({ proxyPost }) =>
      proxyPost('/api/feedback/sheets', feedback)
    ),
  }),

  /** Supabase via your server (service-role key never touches the browser). */
  supabase: supabaseProxied,

  /** Supabase direct from browser with anon + RLS. Read the RLS warning in JSDoc. */
  supabasePublic,

  /** POST to any URL via your server (signs HMAC if secret is set). */
  webhook: webhookProxied,

  /** POST to any URL DIRECTLY from the browser (no credential). */
  webhookDirect: webhook,

  /** Our hosted cloud SKU (backend not yet live). */
  cloud,
};

export default connect;
