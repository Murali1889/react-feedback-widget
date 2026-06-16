/**
 * Notion — server-proxied feedback destination.
 *
 * Pairs with the client adapter `notionDb({ endpoint: '/api/feedback/notion' })`
 * from 'react-visual-feedback/destinations'.
 *
 * Required env:
 *   NOTION_TOKEN — internal integration token from
 *                  https://www.notion.so/my-integrations
 *                  (then share the target database with the integration)
 *   NOTION_DB_ID — UUID of the database. Find by opening the database,
 *                  Share → Copy link → the chunk after the last `/`.
 *
 * Database must have a `Name` (title) property; optional `Severity`
 * and `Type` select properties get populated automatically.
 */

import {
  withSecureDefaults,
  createNotionHandler,
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
})(createNotionHandler({}))
