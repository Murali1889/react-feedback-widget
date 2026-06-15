/**
 * Sheets Integration API Route — secure variant.
 * See ./jira/route.ts for what withSecureDefaults enforces.
 */

import {
  withSecureDefaults,
  createSheetsHandler,
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
})(createSheetsHandler())
