/**
 * Catch-all feedback route — Pages Router shape.
 *
 * Same idea as the App Router example: one route auto-dispatches to
 * every destination in feedback.config.ts based on the URL's last
 * path segment.
 *
 *   POST /api/feedback/github    →  GitHub Issues
 *   POST /api/feedback/linear    →  Linear
 *   POST /api/feedback/hubspot   →  HubSpot ticket
 *   POST /api/feedback/slack     →  Slack message
 *
 * devSessionAuth() works in dev; refuses in production with a clear
 * error pointing to the real-auth alternatives.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createFeedbackHandler, devSessionAuth } from 'react-visual-feedback/server'
import feedbackConfig from '../../../../feedback.config'

const handler = createFeedbackHandler({
  ...feedbackConfig,
  authorize: devSessionAuth(),
  // Production: swap to your real auth, OR
  //   authorize: devSessionAuth({ secret: process.env.FEEDBACK_SECRET })
})

export default async function feedback(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res)
}
