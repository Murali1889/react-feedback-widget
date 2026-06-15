import { toRequestLike } from './request.js';
import { csrfRequired, checkCsrf } from './csrf.js';
import {
  defaultOriginValidator,
  defaultRateLimiter,
  defaultErrorNormalizer,
} from './defaults.js';
import { validateFeedbackSubmission } from '../../lib/feedbackValidation.js';
import { redactFeedbackEvidence, resolveRedactionConfig } from '../../lib/feedbackSecurity.js';
import {
  FeedbackAuthError, FeedbackForbiddenError, FeedbackValidationError,
} from '../../lib/feedbackErrors.js';

let _missingAuthorizeWarned = false;

function warnMissingAuthorize() {
  if (_missingAuthorizeWarned) return;
  _missingAuthorizeWarned = true;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    console.warn('[react-visual-feedback] withSecureDefaults: no `authorize` provided — all requests will be rejected as unauthorized. See docs/production-security-checklist.md');
  }
}

function buildResponse(normalized) {
  return new Response(JSON.stringify(normalized.body), {
    status: normalized.status,
    headers: { 'Content-Type': 'application/json', ...normalized.headers },
  });
}

function detectAuthMode(reqLike) {
  if (reqLike.headers?.authorization) return 'bearer';
  if (reqLike.headers?.cookie) return 'session';
  return 'none';
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export function withSecureDefaults(hooks = {}) {
  const authorize = typeof hooks.authorize === 'function'
    ? hooks.authorize
    : async () => { warnMissingAuthorize(); throw new FeedbackAuthError(); };

  const validateOrigin = hooks.validateOrigin || defaultOriginValidator;
  const rateLimit = hooks.rateLimit || defaultRateLimiter;
  const redactConfig = resolveRedactionConfig(hooks.redact || 'default');
  const customRedact = hooks.redactFeedback;
  const errorNormalizer = hooks.errorNormalizer || defaultErrorNormalizer;

  return function wrap(innerHandler) {
    return async function secureHandler(req) {
      let reqLike;
      try {
        reqLike = await toRequestLike(req);

        // 1. Origin
        if (!(await validateOrigin(reqLike))) {
          return buildResponse(errorNormalizer({ code: 'origin_blocked' }));
        }

        // 2. CSRF
        if (csrfRequired(reqLike) && !checkCsrf(reqLike)) {
          return buildResponse(errorNormalizer({ code: 'csrf_failed' }));
        }

        // 4. Authorize (so rate limiter can key by user)
        let authContext;
        try {
          authContext = await authorize(reqLike);
        } catch (err) {
          const code = err instanceof FeedbackForbiddenError ? 'forbidden' : 'unauthorized';
          return buildResponse(errorNormalizer({ code, message: err.message }));
        }

        // 3. Rate limit (after auth so we can key per-user)
        try {
          await rateLimit(reqLike, authContext);
        } catch (err) {
          return buildResponse(errorNormalizer(err));
        }

        // 5. Read + validate body
        const raw = await reqLike.readBody();
        const parsed = typeof raw === 'string' ? safeJson(raw) : raw;
        const v = validateFeedbackSubmission(parsed, { authContext });
        if (!v.ok) {
          return buildResponse(errorNormalizer(new FeedbackValidationError('validation_failed', v.errors)));
        }

        // 6. Redact
        const redacted = customRedact
          ? await customRedact(v.data, authContext)
          : redactFeedbackEvidence(v.data, redactConfig).data;

        const securityContext = {
          projectId: authContext.projectId,
          tenantId: authContext.tenantId,
          submittedBy: { id: authContext.userId, role: authContext.role },
          authMode: detectAuthMode(reqLike),
          redactionApplied: true,
        };

        // 7. Forward to inner
        let innerResult;
        try {
          innerResult = await innerHandler(redacted, { reqLike, authContext, securityContext });
        } catch (err) {
          console.error('[react-visual-feedback] integration error:', err);
          return buildResponse(errorNormalizer({ code: 'integration_failed' }));
        }

        // 8. Normalize success
        return new Response(JSON.stringify({
          ok: true,
          data: innerResult?.data ?? innerResult,
          securityContext,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      } catch (err) {
        const normalized = errorNormalizer(err);
        if (normalized.body._logId) console.error('[react-visual-feedback] request error', normalized.body._logId, err);
        return buildResponse(normalized);
      }
    };
  };
}
