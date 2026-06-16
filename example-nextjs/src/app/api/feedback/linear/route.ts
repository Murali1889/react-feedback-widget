/**
 * Linear — server-proxied feedback destination.
 *
 * Pairs with the client adapter `linearIssue({ endpoint: '/api/feedback/linear' })`
 * from 'react-visual-feedback/destinations'.
 *
 * Required env:
 *   LINEAR_API_KEY — from https://linear.app/your-workspace/settings/api
 *                    OR LINEAR_OAUTH_TOKEN if you use OAuth
 *   LINEAR_TEAM_ID — UUID of the team to create issues in. Find via
 *                    https://linear.app/your-workspace/settings/api →
 *                    "Personal" → "GraphQL playground":
 *                    `query { teams { nodes { id name } } }`
 *
 * Severity maps to Linear priority (1=Urgent, 2=High, 3=Medium, 4=Low).
 */

import {
  withSecureDefaults,
  createLinearHandler,
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
})(createLinearHandler({}))
