/**
 * Jira Integration API Route — secure variant.
 *
 * Wraps createJiraHandler in withSecureDefaults which enforces:
 *   - origin allowlist (FEEDBACK_ALLOWED_ORIGINS env var or same-origin)
 *   - CSRF check (when cookies present)
 *   - rate limit (defaults: 30/hour per IP+user)
 *   - your `authorize` callback (see below — replace getDemoSession with real auth)
 *   - validation + redaction of sensitive headers/keys before reaching Jira
 *
 * Required env vars: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
 */

import {
  withSecureDefaults,
  createJiraHandler,
  FeedbackAuthError,
} from 'react-visual-feedback/server'
import { getDemoSession } from '@/lib/feedback-auth'

export const POST = withSecureDefaults({
  authorize: async (req: any) => {
    const session = await getDemoSession(req)
    if (!session) throw new FeedbackAuthError()
    return {
      userId: session.userId,
      projectId: session.projectId,
      role: session.role,
    }
  },
})(createJiraHandler({ projectKey: process.env.JIRA_PROJECT_KEY || 'BUG' }))
