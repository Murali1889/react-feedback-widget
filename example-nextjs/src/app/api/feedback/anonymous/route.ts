/**
 * Anonymous capture route.
 * Requires a valid short-lived signed token issued by /api/feedback/token.
 * No login required, but every submission is scoped to a fixed public tenant
 * and rate-limited per IP by withSecureDefaults.
 */

import {
  withSecureDefaults,
  createJiraHandler,
  FeedbackAuthError,
} from 'react-visual-feedback/server'
import { verifySubmissionToken } from '@/lib/feedback-auth'

export const POST = withSecureDefaults({
  authorize: async (req: any) => {
    const auth = (req.headers?.authorization as string) || ''
    const token = auth.replace(/^Bearer\s+/i, '')
    const payload = verifySubmissionToken(token)
    if (!payload) throw new FeedbackAuthError('invalid_token')
    return {
      userId: 'anonymous',
      tenantId: payload.tenantId,
      role: 'anonymous',
    }
  },
})(createJiraHandler({ projectKey: process.env.JIRA_PROJECT_KEY || 'PUB' }))
