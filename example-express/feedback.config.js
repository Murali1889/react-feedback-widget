// Single source of truth for both the browser (React app) and this Express server.
//
// Add a destination by adding one line. Set its env var in your environment.
// That's the whole integration.

import { defineConfig, connect } from 'react-visual-feedback';

export default defineConfig({
  destinations: [
    connect.local(),                                     // browser fallback — always include
    connect.github({ repo: 'acme/web' }),               // env: GITHUB_TOKEN
    // connect.linear({ team: 'team-id' }),             // env: LINEAR_API_KEY, LINEAR_TEAM_ID
    // connect.notion({ database: 'db-id' }),           // env: NOTION_TOKEN
    // connect.hubspot(),                                // env: HUBSPOT_TOKEN
    // connect.slack({ channel: '#bugs' }),             // env: SLACK_WEBHOOK_URL
  ],
  ui: { variant: 'two-column' },
});
