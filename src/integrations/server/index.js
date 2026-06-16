/**
 * React Visual Feedback - Server Integrations
 *
 * Import from 'react-visual-feedback/server' in your API routes.
 *
 * Recommended setup (Next.js App Router):
 *   import { withSecureDefaults, createJiraHandler, FeedbackAuthError }
 *     from 'react-visual-feedback/server';
 *   import { getServerSession } from '@/lib/auth';
 *
 *   export const POST = withSecureDefaults({
 *     authorize: async (req) => {
 *       const session = await getServerSession(req);
 *       if (!session) throw new FeedbackAuthError();
 *       return { userId: session.userId, projectId: session.projectId };
 *     },
 *   })(createJiraHandler({ projectKey: 'BUG' }));
 *
 * See docs/production-security-checklist.md for the full setup guide.
 */

// ============================================
// SECURITY WRAPPER + HELPERS
// ============================================

export { withSecureDefaults } from './withSecureDefaults.js';
export {
  defaultOriginValidator,
  defaultRateLimiter,
  defaultErrorNormalizer,
} from './defaults.js';
export { toRequestLike } from './request.js';
export { csrfRequired, checkCsrf } from './csrf.js';

// Error classes hosts throw inside `authorize`
export {
  FeedbackAuthError,
  FeedbackForbiddenError,
  FeedbackValidationError,
  FeedbackRateLimitError,
  FeedbackPayloadTooLargeError,
} from '../../lib/feedbackErrors.js';

// ============================================
// JIRA EXPORTS
// ============================================

export {
  default as createJiraHandler,
  createNextAppHandler as createJiraNextAppHandler,
  createNextPagesHandler as createJiraNextPagesHandler,
  createExpressMiddleware as createJiraMiddleware,
  createGenericHandler as createJiraGenericHandler,
  formatForJiraAutomation,
  formatForZapier as formatJiraForZapier
} from '../jira.js';

// ============================================
// GOOGLE SHEETS EXPORTS
// ============================================

export {
  default as createSheetsHandler,
  createNextAppHandler as createSheetsNextAppHandler,
  createNextPagesHandler as createSheetsNextPagesHandler,
  createExpressMiddleware as createSheetsMiddleware,
  getAppsScriptTemplate,
  formatForZapier as formatSheetsForZapier
} from '../sheets.js';

// ============================================
// PHASE E DESTINATION HANDLERS
// ============================================
//
// Server-side counterparts to the client adapters in
// react-visual-feedback/destinations. Each pairs with one client
// adapter:
//
//   client adapter (browser)        server handler (api route)
//   ─────────────────────────       ─────────────────────────────
//   githubIssue({ endpoint })   ⇄   createGithubHandler({})
//   linearIssue({ endpoint })   ⇄   createLinearHandler({})
//   notionDb({ endpoint })      ⇄   createNotionHandler({})
//   supabaseProxied({ endpoint })⇄  createSupabaseHandler({})
//   webhookProxied({ endpoint })⇄   createWebhookHandler({})
//
// Always wrap with withSecureDefaults({ authorize }).

export { createGithubHandler } from './github.js';
export { createGithubActionHandler } from './github-action.js';
export { createLinearHandler } from './linear.js';
export { createNotionHandler } from './notion.js';
export { createSupabaseHandler } from './supabase.js';
export { createWebhookHandler } from './webhook.js';
export { createUploadUrlHandler } from './upload-url.js';
export { createHubspotHandler } from './hubspot.js';
export { createSlackHandler } from './slack.js';

// ============================================
// PHASE F: SINGLE-CONFIG CATCH-ALL ROUTER
// ============================================
//
// One catch-all route, one config file, both ends auto-paired.
//
//   // feedback.config.ts
//   import { defineConfig } from 'react-visual-feedback/config'
//   import { local, githubIssue } from 'react-visual-feedback/destinations'
//   export default defineConfig({ destinations: [local(), githubIssue({ repo })] })
//
//   // app/api/feedback/[...rest]/route.ts
//   import { createFeedbackRouter } from 'react-visual-feedback/server'
//   import feedbackConfig from '@/feedback.config'
//   export const POST = createFeedbackRouter({
//     ...feedbackConfig,
//     authorize: async (req) => { ... },
//   })

export { createFeedbackRouter } from './router.js';
export { createFeedbackHandler } from './createFeedbackHandler.js';
export {
  devSessionAuth,
  signSession,
  setSessionCookieAppRouter,
  setSessionCookieExpress,
} from './devSessionAuth.js';
export { defineConfig } from '../../config.js';

// ============================================
// CONFIG EXPORTS
// ============================================

export {
  // Sheet column configuration
  DEFAULT_SHEET_COLUMNS,
  DEFAULT_SHEET_COLUMN_ORDER,
  mergeSheetColumns,
  feedbackToSheetRow,
  getSheetHeaders,

  // Jira field configuration
  DEFAULT_JIRA_FIELDS,
  DEFAULT_JIRA_STATUS_MAPPING,
  mergeJiraFields,
  feedbackToJiraIssue,
  mapJiraStatusToLocal,
  mapLocalStatusToJira,

  // Integration types
  INTEGRATION_TYPES
} from '../config.js';

// ============================================
// CONVENIENCE HANDLERS
// ============================================

/**
 * Create both Jira and Sheets handlers with shared config
 */
export async function createIntegrationHandlers(config = {}) {
  const handlers = {};

  if (config.jira) {
    const { default: createJiraHandler } = await import('../jira.js');
    handlers.jira = createJiraHandler(config.jira);
  }

  if (config.sheets) {
    const { default: createSheetsHandler } = await import('../sheets.js');
    handlers.sheets = createSheetsHandler(config.sheets);
  }

  return handlers;
}

/**
 * Create a combined handler that routes to Jira or Sheets based on request
 */
export function createCombinedHandler(config = {}) {
  const handlers = createIntegrationHandlers(config);

  return async (req, res) => {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { integration } = body;

    if (!integration || !handlers[integration]) {
      const error = { success: false, error: `Unknown integration: ${integration}` };
      if (res?.json) {
        return res.status(400).json(error);
      }
      return new Response(JSON.stringify(error), { status: 400 });
    }

    return handlers[integration](req, res);
  };
}
