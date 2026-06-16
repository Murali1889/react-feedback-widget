/**
 * Generic webhook — server-proxied feedback destination.
 *
 * Pairs with the client adapter `webhookProxied({ endpoint: '/api/feedback/webhook' })`
 * from 'react-visual-feedback/destinations'.
 *
 * Use this for Slack incoming webhooks, Zapier hooks, Discord, n8n,
 * or any other URL — the credential and (optionally) an HMAC secret
 * live ONLY on the server.
 *
 * Required env:
 *   WEBHOOK_URL          — full URL to POST to
 *
 * Optional env:
 *   WEBHOOK_HEADERS      — JSON object of extra headers, e.g.
 *                          {"x-zapier-source":"feedback-widget"}
 *   WEBHOOK_HMAC_SECRET  — when set, adds an
 *                          X-Feedback-Signature: sha256=<hex> header
 *                          so the receiver can verify the payload
 *                          actually came from your server.
 */

import {
  withSecureDefaults,
  createWebhookHandler,
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
})(createWebhookHandler({}))
