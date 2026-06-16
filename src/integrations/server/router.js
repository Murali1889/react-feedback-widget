/**
 * createFeedbackRouter — single catch-all handler that auto-dispatches
 * to the right createXHandler based on the URL path and the
 * `destinations[]` array in the shared config.
 *
 * Convention: adapter.name → /api/feedback/<adapter.name>
 *
 *   destinations: [
 *     local(),                       // browser-only — no route
 *     githubIssue({ repo }),         // → POST /api/feedback/github
 *     linearIssue({ teamId }),       // → POST /api/feedback/linear
 *     supabaseProxied({}),           // → POST /api/feedback/supabase
 *     supabasePublic({ url, anonKey }), // browser→supabase directly — no route
 *     cloud({ projectId, ingestToken }), // browser→our ingest — no route
 *   ]
 *
 * Anything NOT in the auto-map can be supplied via the `routes:`
 * override. The router still wraps it with withSecureDefaults so the
 * auth / origin / rate-limit guarantees hold uniformly.
 *
 * Usage (Next.js App Router catch-all at app/api/feedback/[...rest]/route.ts):
 *
 *   import { createFeedbackRouter } from 'react-visual-feedback/server'
 *   import feedbackConfig from '@/feedback.config'
 *   import { getSession } from '@/lib/auth'
 *
 *   export const POST = createFeedbackRouter({
 *     ...feedbackConfig,
 *     authorize: async (req) => {
 *       const s = await getSession(req)
 *       if (!s) throw new FeedbackAuthError()
 *       return { userId: s.userId, projectId: s.projectId }
 *     },
 *   })
 */

import { withSecureDefaults } from './withSecureDefaults.js';
import { FeedbackAuthError } from '../../lib/feedbackErrors.js';
import { createGithubHandler } from './github.js';
import { createLinearHandler } from './linear.js';
import { createNotionHandler } from './notion.js';
import { createSupabaseHandler } from './supabase.js';
import { createWebhookHandler } from './webhook.js';
import createJiraHandler from '../jira.js';
import createSheetsHandler from '../sheets.js';

/**
 * Default auto-mapping from adapter.name → server handler factory.
 *
 * Adapters NOT listed here are either:
 *  - browser-only (`local`)
 *  - public-token (`supabasePublic`, `webhook`, `cloud`) — no server route
 *  - Custom (`routes:` override below)
 */
const DEFAULT_HANDLER_MAP = {
  github:    createGithubHandler,
  linear:    createLinearHandler,
  notion:    createNotionHandler,
  supabase:  createSupabaseHandler,
  webhook:   createWebhookHandler,
  jira:      createJiraHandler,
  sheets:    createSheetsHandler,
};

/**
 * Extract the destination name from the request URL. Supports both
 * /api/feedback/<name> and /<custom>/<name> shapes — the LAST path
 * segment is the destination name.
 */
function destinationNameFromRequest(req) {
  try {
    // Explicit override wins — for hosts whose routing layer mangles
    // the URL or who multiplex the catch-all over a single path.
    if (typeof req?.headers?.get === 'function') {
      const hdr = req.headers.get('x-feedback-destination');
      if (hdr) return hdr;
    } else if (req?.headers && typeof req.headers === 'object') {
      const hdr = req.headers['x-feedback-destination'] || req.headers['X-Feedback-Destination'];
      if (hdr) return hdr;
    }

    let url;
    if (req?.nextUrl?.pathname) {
      url = req.nextUrl.pathname;
    } else if (typeof req?.url === 'string') {
      url = new URL(req.url, 'http://localhost').pathname;
    } else if (req?.path) {
      url = req.path;
    } else {
      return null;
    }
    const segments = url.replace(/\/+$/, '').split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
  } catch {
    return null;
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Build a Map<name, handler> from the config's destinations + overrides.
 */
function buildHandlerMap(config) {
  const out = new Map();
  const overrides = (config && config.routes) || {};

  const destinations = Array.isArray(config?.destinations) ? config.destinations : [];
  for (const d of destinations) {
    if (!d || !d.name) continue;
    // Skip adapters that don't have a server route (browser-only).
    // mode === 'local' or 'public-token' → no server pairing needed.
    if (d.mode === 'local' || d.mode === 'public-token') continue;

    const factory = DEFAULT_HANDLER_MAP[d.name];
    if (!factory) {
      // Unknown adapter with mode === 'server-proxied' but no built-in
      // handler — host must supply via routes:.
      if (!overrides[d.name]) {
        // eslint-disable-next-line no-console
        console.warn(`[react-visual-feedback] createFeedbackRouter: destination "${d.name}" has no built-in server handler and no entry in config.routes; requests to /api/feedback/${d.name} will 404.`);
      }
      continue;
    }
    out.set(d.name, factory({}));
  }

  // Apply explicit route overrides (factories or already-created handlers).
  for (const [name, value] of Object.entries(overrides)) {
    if (typeof value === 'function') {
      // could be a factory (returns a handler) or already a handler
      // — heuristic: handlers take (req, res), factories take ({}).
      // We treat both as handlers; if it's actually a factory, the host
      // called factory() themselves.
      out.set(name, value);
    } else if (value && typeof value.send === 'function') {
      // Pass a client-adapter-shaped object: not a server handler.
      // eslint-disable-next-line no-console
      console.warn(`[react-visual-feedback] config.routes["${name}"] looks like a CLIENT adapter, not a server handler. Use createXHandler() from react-visual-feedback/server instead.`);
    }
  }

  return out;
}

export function createFeedbackRouter(config = {}) {
  if (!config || typeof config !== 'object') {
    throw new Error('createFeedbackRouter: expected a config object');
  }
  const handlerMap = buildHandlerMap(config);

  // Resolve the host-supplied authorize function. Prefer top-level
  // `authorize` (matches createJiraHandler example); fall back to
  // `auth.authorize` if the host nested it.
  const authorize = config.authorize || config.auth?.authorize;
  if (!authorize) {
    // eslint-disable-next-line no-console
    console.warn('[react-visual-feedback] createFeedbackRouter created without an authorize() callback — every request will be allowed. Pass { authorize } so origin/CSRF/rate-limit/your-auth all run.');
  }

  // Wrap each handler with the same withSecureDefaults — auth + origin
  // + CSRF + rate-limit + redaction are applied uniformly so all routes
  // have the same guarantees regardless of which destination they hit.
  const wrapper = authorize
    ? withSecureDefaults({
        authorize,
        ...(config.security || {}),
      })
    : (h) => h; // no wrapper — emits the warning above but doesn't crash dev

  // Memo wrapped handlers so we don't re-wrap on every request.
  const wrappedMap = new Map();
  for (const [name, handler] of handlerMap) {
    wrappedMap.set(name, wrapper(handler));
  }

  return async function feedbackRouterHandler(req, res) {
    const name = destinationNameFromRequest(req);
    if (!name) {
      const body = { ok: false, error: 'no_destination_in_url' };
      if (res?.status) { res.status(400).json(body); return; }
      return jsonResponse(body, 400);
    }

    const handler = wrappedMap.get(name);
    if (!handler) {
      const body = { ok: false, error: 'unknown_destination', destination: name };
      if (res?.status) { res.status(404).json(body); return; }
      return jsonResponse(body, 404);
    }

    return handler(req, res);
  };
}

// Re-export the error so hosts can throw it inside authorize without
// pulling another import.
export { FeedbackAuthError };
