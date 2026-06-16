/**
 * createFeedbackHandler — strict-defaults sugar over createFeedbackRouter.
 *
 * Use this when you want the library to do the right thing without
 * making you think about security:
 *
 *   // app/api/feedback/[...path]/route.ts
 *   import { createFeedbackHandler } from 'react-visual-feedback/server'
 *   import feedbackConfig from '@/feedback.config'
 *   import { getSession } from '@/lib/auth'
 *
 *   export const POST = createFeedbackHandler({
 *     ...feedbackConfig,
 *     authorize: async (req) => {
 *       const s = await getSession(req)
 *       return s ? { userId: s.userId, projectId: s.projectId } : null
 *     },
 *   })
 *
 * What this gives you on top of createFeedbackRouter:
 *
 *   ✓ Production refusal — if NODE_ENV === 'production' and no `authorize`
 *     is provided AND `auth.mode` isn't explicitly set to 'none', the
 *     handler throws at construction so you don't accidentally ship an
 *     open endpoint.
 *
 *   ✓ Friendly null contract — your authorize() can return null/undefined
 *     instead of throwing FeedbackAuthError. The handler converts that
 *     to a 401.
 *
 *   ✓ Origin + CSRF + rate-limit + redaction ALL ON BY DEFAULT.
 *     You only opt-out, never opt-in.
 *
 * If you want fine-grained control, fall back to createFeedbackRouter
 * directly — it accepts the same shape minus the strict-mode checks.
 */

import { createFeedbackRouter } from './router.js';
import { FeedbackAuthError } from '../../lib/feedbackErrors.js';

function isProd() {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
}

export function createFeedbackHandler(config = {}) {
  if (!config || typeof config !== 'object') {
    throw new Error('createFeedbackHandler: expected a config object');
  }

  const hasAuthorize = typeof config.authorize === 'function'
                    || typeof config.auth?.authorize === 'function';
  const explicitlyNoAuth = config.auth?.mode === 'none';

  if (isProd() && !hasAuthorize && !explicitlyNoAuth) {
    throw new Error(
      'createFeedbackHandler: production refusal — no `authorize` callback ' +
      'was provided. This would expose the feedback endpoint to anyone. ' +
      'Either pass `authorize: async (req) => { … }` that returns the user ' +
      'context, or set `auth: { mode: \'none\' }` to opt-in to an open ' +
      'endpoint (dev only — origin + rate-limit still apply).'
    );
  }

  // Wrap authorize to allow null/undefined returns (friendlier than throwing).
  const userAuthorize = config.authorize || config.auth?.authorize;
  const friendly = userAuthorize
    ? async (req) => {
        const result = await userAuthorize(req);
        if (result == null) throw new FeedbackAuthError();
        return result;
      }
    : undefined;

  return createFeedbackRouter({
    ...config,
    authorize: friendly,
  });
}
