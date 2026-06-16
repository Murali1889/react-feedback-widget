/**
 * Single source of truth for the feedback widget.
 *
 * Both the browser (`<FeedbackProvider {...feedbackConfig} />`) and
 * the server (`createFeedbackHandler(feedbackConfig)`) import this file.
 *
 * Adapter constructors carry only public metadata (repo names, team
 * IDs, endpoint paths). Private tokens live in server env and are
 * only read by the per-destination server handlers.
 *
 * To add a destination: add one line. The catch-all router at
 * app/api/feedback/[...rest]/route.ts dispatches automatically.
 */
import { defineConfig, connect } from 'react-visual-feedback'

const feedbackConfig = defineConfig({
  destinations: [
    // Browser-only — always safe, always included.
    connect.local(),

    // Server-proxied. Tokens live in server env, never in browser.
    connect.github({ repo: 'acme/web' }),  // env: GITHUB_TOKEN
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
