/**
 * GitHub Issues — server-proxied feedback destination.
 *
 * Pairs with the client adapter `githubIssue({ endpoint: '/api/feedback/github' })`
 * from 'react-visual-feedback/destinations'.
 *
 * The GH_TOKEN lives ONLY here (server env). It never ships in the
 * React bundle. If you accidentally pass a PAT into the client
 * githubIssue() factory, the safety check in safety.js will throw
 * a FeedbackCredentialLeakError at construction time.
 *
 * Required env:
 *   GH_TOKEN — fine-grained PAT with `Issues: Read & write` on the
 *              target repo, or a GitHub App installation token
 *   GH_REPO  — "owner/repo" (e.g. "acme/web")
 *
 * Optional:
 *   FEEDBACK_ALLOWED_ORIGINS — comma-separated origin allow-list
 *                              read by withSecureDefaults
 */

import {
  withSecureDefaults,
  createGithubHandler,
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
})(createGithubHandler({}))
