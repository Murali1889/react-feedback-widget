/**
 * Single source of truth for the feedback widget.
 *
 * Both the browser (`<FeedbackProvider {...feedbackConfig} />`) and
 * the server (`createFeedbackRouter(feedbackConfig)`) import this
 * file. Adapter constructors carry only public metadata (repo names,
 * team ids, endpoint paths); private tokens live in server env and
 * are only ever read inside the createXHandler factories the router
 * pairs them with.
 *
 * To add a destination:
 *   1. Import the client adapter from 'react-visual-feedback/destinations'
 *   2. Add it to the destinations array below
 *   3. Set the server env var(s) listed in that adapter's JSDoc
 *
 * That's it — no route file to add. The catch-all router at
 * app/api/feedback/[...rest]/route.ts dispatches automatically.
 */
import { defineConfig } from 'react-visual-feedback/config'
import {
  local,
  githubIssue,
  linearIssue,
  notionDb,
  supabaseProxied,
} from 'react-visual-feedback/destinations'

const feedbackConfig = defineConfig({
  destinations: [
    // Browser-only — always safe, always included for offline + speed.
    local(),

    // Server-proxied. Tokens live in server env, never in browser.
    // Comment in / out depending on which destinations your project uses.
    githubIssue(),    // env: GH_TOKEN, GH_REPO
    linearIssue(),    // env: LINEAR_API_KEY, LINEAR_TEAM_ID
    notionDb(),       // env: NOTION_TOKEN, NOTION_DB_ID
    supabaseProxied(),// env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  ],
  auth:   { mode: 'session' },
  redact: 'default',
  ui:     { variant: 'two-column' },
})

export default feedbackConfig
