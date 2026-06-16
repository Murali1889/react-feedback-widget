/**
 * defineConfig — single source of truth for both browser and server.
 *
 *   // feedback.config.ts
 *   import { defineConfig } from 'react-visual-feedback/config'
 *   import { local, githubIssue, linearIssue } from 'react-visual-feedback/destinations'
 *
 *   export default defineConfig({
 *     destinations: [
 *       local(),
 *       githubIssue({ repo: 'acme/web' }),
 *       linearIssue({ teamId: process.env.LINEAR_TEAM_ID }),
 *     ],
 *     auth:   { mode: 'session' },
 *     redact: 'default',
 *     ui:     { variant: 'two-column', accent: '#6366f1' },
 *   })
 *
 * Browser:
 *
 *   import feedbackConfig from '@/feedback.config'
 *   import { FeedbackProvider } from 'react-visual-feedback'
 *   <FeedbackProvider {...feedbackConfig} />
 *
 * Server (Next.js catch-all):
 *
 *   import { createFeedbackRouter } from 'react-visual-feedback/server'
 *   import feedbackConfig from '@/feedback.config'
 *   export const POST = createFeedbackRouter(feedbackConfig)
 *
 * SECURITY INVARIANT — same as Phase E: client adapters carry ONLY
 * metadata (repo names, team ids, endpoint paths). Tokens live in
 * server env. If an adapter is passed a known-private credential at
 * construction, FeedbackCredentialLeakError fires at build/import time
 * BEFORE either side ships.
 */
export function defineConfig(config) {
  // Pure pass-through; the value of this function is in the TS overload
  // (defined in src/types.d.ts) which gives consumers autocomplete and
  // structural validation, and in being a stable named entry point so
  // the codemod / CLI can detect and update it.
  return config;
}

export default defineConfig;
