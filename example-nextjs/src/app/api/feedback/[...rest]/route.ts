/**
 * Catch-all route — single entry point for every destination.
 *
 * This route handles POST /api/feedback/* automatically, routing to
 * the correct server handler based on the URL's last path segment.
 * Adding a new destination means editing `feedback.config.ts` — no
 * new route file needed.
 *
 * Per-destination files (./github/route.ts, ./linear/route.ts, …)
 * still exist as standalone "explicit-style" examples for hosts who
 * prefer fine-grained route-per-destination control. Next.js routes
 * more specific paths before catch-all, so they take precedence.
 *
 * Required server env (per destination — see feedback.config.ts):
 *   GH_TOKEN, GH_REPO
 *   LINEAR_API_KEY, LINEAR_TEAM_ID
 *   NOTION_TOKEN, NOTION_DB_ID
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WEBHOOK_URL (and optionally WEBHOOK_HMAC_SECRET)
 */
import { createFeedbackRouter, FeedbackAuthError } from 'react-visual-feedback/server'
import feedbackConfig from '../../../../../feedback.config'
import { getDemoSession } from '@/lib/feedback-auth'

export const POST = createFeedbackRouter({
  ...feedbackConfig,
  authorize: async (req: any) => {
    const session = await getDemoSession(req)
    if (!session) throw new FeedbackAuthError()
    return {
      userId: session.userId,
      projectId: session.projectId,
      role: session.role,
    }
  },
})
