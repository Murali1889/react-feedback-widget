/**
 * Single source of truth for the feedback widget.
 *
 * Both the browser (`<FeedbackProvider {...feedbackConfig} />`) and
 * the server (`createFeedbackHandler(feedbackConfig)`) import this file.
 *
 * IMPORTANT: imports come from `/config` and `/destinations` subpaths,
 * NOT `react-visual-feedback` root. Root pulls in the full client UI
 * bundle (modal, dashboard, html2canvas) which blows up on Node and
 * causes the catch-all API route to 500.
 *
 * Private tokens live in server env (see .env.local). Adapter
 * constructors carry only public metadata.
 */
import { defineConfig } from 'react-visual-feedback/config'
import { connect } from 'react-visual-feedback/destinations'

const feedbackConfig = defineConfig({
  destinations: [
    // Browser-only — always safe, always included.
    connect.local(),

    // Server-proxied. Tokens live in server env, never in browser.
    connect.github({ repo: 'acme/web' }),  // env: GITHUB_TOKEN, GITHUB_REPO
    connect.linear({ team: 'team-id' }),   // env: LINEAR_API_KEY, LINEAR_TEAM_ID
    connect.notion({ database: 'db-id' }), // env: NOTION_TOKEN, NOTION_DB_ID
    connect.supabase(),                    // env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    connect.hubspot(),                     // env: HUBSPOT_TOKEN
    connect.slack({ channel: '#bugs' }),   // env: SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN+SLACK_CHANNEL
  ],
  auth:   { mode: 'session' },
  redact: 'default',
  ui:     { variant: 'two-column' },
})

export default feedbackConfig
