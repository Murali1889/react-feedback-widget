# Feedback Command Center — Phase A: Security & Data Foundation

Date: 2026-06-15
Status: Approved direction; written spec pending user review
Repository: `react-visual-feedback`
Parent spec: `docs/superpowers/specs/2026-06-15-feedback-command-center-design.md`

## Summary

Phase A of the Feedback Command Center redesign. Adds the security, data, and developer-experience foundation the rest of the work depends on. No UI changes in this phase. Strictly additive: existing host applications upgrade with zero config changes and keep working.

The phase delivers:

- Pure helpers for evidence derivation, priority scoring, and handoff text generation.
- Pure helpers for redaction (network, console, storage, IndexedDB, URLs, handoff text), auth header resolution, and destination policy checks.
- A `validateFeedbackSubmission` helper enforcing the trust model from the parent spec.
- An additive server-adapter security layer: a one-import preset (`withSecureDefaults`) that composes origin checks, CSRF, rate limiting, host-supplied authorization, validation, redaction, and error normalization in a fixed order.
- Client-side auth wiring: `auth` prop on `FeedbackProvider` supporting `none | session | bearer | signed`, with automatic CSRF discovery and one-retry token refresh.
- A Vitest test suite covering every helper, the composition order of `withSecureDefaults`, and backward compatibility.
- Working examples: secure Next.js handler, minimal Express handler, anonymous capture flow.
- A Production Security Checklist in the README.

Backward compatibility: all current props, exports, and stored data shapes keep working. New surface area is opt-in. Known-insecure modes (`jiraAutomation`, `appsScript`, `zapier` webhook calls from the browser) keep working but emit one-time runtime warnings pointing at the checklist.

The guiding constraint, captured from the user: **security must come with great DX**. A correct setup must be writable in under fifteen lines. Insecure-but-easy beats secure-but-confusing; therefore the secure path is also the easy path.

## Decisions

These were resolved in brainstorming and are not reopened by Phase A implementation.

1. **Phase scope:** Phase A is foundation only. No UI components are touched. Phases B (Command Center UI) and C (surrounding surfaces + polished examples) are deferred to their own specs.
2. **Server-adapter strategy:** Additive hooks. Existing `createJiraHandler` and `createSheetsHandler` stay exported and behaviour-compatible. Security is a wrapper layer (`withSecureDefaults`) plus an optional `security` config on the existing handlers.
3. **Client auth modes supported:** All four — `none`, `session`, `bearer`, `signed`. One helper (`getFeedbackAuthHeaders`) covers them.
4. **Test runner:** Vitest. Node environment for pure helpers, jsdom deferred to Phase B.
5. **Webhook policy:** Direct browser webhooks (`jiraAutomation`, `appsScript`, `zapier`) keep working; one-time runtime `console.warn` per mode points to the security checklist.
6. **Network body redaction:** Bodies dropped entirely by default; opt-in via `allowRequestBodies` / `allowResponseBodies`. Other defaults match parent spec.
7. **Field authority:** Client may submit display/intent fields (`severity`, `owner`, `customerValue`); server validates enums and shape. `statusHistory`, `securityContext`, and provider-write fields (`integrationState.jira.issueKey`, etc.) are server-write-only — silently stripped if present on a client submission.
8. **Examples:** Phase A ships working Next.js + Express + anonymous-capture examples wired against the new security surface.
9. **Error taxonomy:** Granular codes (`csrf_failed`, `origin_blocked`, `rate_limited`, etc.) rather than collapsed to `forbidden`. Easier telemetry, marginal complexity cost.
10. **Version bump:** 2.2.14 → 2.3.0. Nothing breaks; security features are additive.

## Non-Goals

1. No UI component changes (Command Center, Evidence Stack, capture modal rebuild are Phase B).
2. No replacement of `createJiraHandler` / `createSheetsHandler` — they keep their current signatures.
3. No hosted backend, billing, or analytics service.
4. No screenshot/video automatic redaction (technically infeasible without ML; surfaced as a UI indicator only).
5. No new third-party provider integrations beyond Jira/Sheets in this phase.
6. No conversion of the codebase to TypeScript. Types live in a single `src/types.d.ts` for consumer-facing surface area only.
7. No breaking changes. Anything that would force existing 2.2.x users to update code is rejected.

## Architecture

Phase A adds files in three categories. Existing files gain only additive props/options.

### New library modules (`src/lib/`)

All modules in `src/lib/` are pure: no React, no DOM, no fetch, no Node-only APIs. They are isomorphic — usable from both the browser bundle and the server adapter.

- `src/lib/feedbackEvidence.js`
  - `getFeedbackEvidenceSummary(item)`
  - `getFeedbackPriority(item)`
  - `createFeedbackHandoffText(item, opts)`
  - `getDerivedFeedbackMeta(item)`
- `src/lib/feedbackSecurity.js`
  - `redactFeedbackEvidence(item, config)`
  - `redactNetworkEvent(event, config)`
  - `redactConsoleEvent(event, config)`
  - `redactStorageEvent(event, config)`
  - `redactHandoffText(text, config)`
  - `getFeedbackAuthHeaders(authConfig)`
  - `resolveCsrfToken(authConfig)`
  - `isInsecureWebhookMode(integrationType)`
  - `getDestinationPolicy(authContext, destination)`
  - `getSubmissionState(item)`
  - `getAuthState({ auth, lastError })`
- `src/lib/feedbackValidation.js`
  - `validateFeedbackSubmission(input, { authContext })`
  - Internal helpers for each field group, not exported.
- `src/lib/feedbackErrors.js`
  - `FeedbackAuthError`, `FeedbackForbiddenError`, `FeedbackValidationError`, `FeedbackRateLimitError`, `FeedbackPayloadTooLargeError`. Plain `Error` subclasses; isomorphic.
- `src/types.d.ts`
  - Ambient TypeScript declarations for the public surface. JSDoc in `.js` files references these types.

### Client-side touchpoints (minimal)

- `src/FeedbackProvider.jsx`
  - New optional `auth` prop (`FeedbackAuthConfig`).
  - New optional `redact` prop (`'default' | 'strict' | 'off' | FeedbackRedactionConfig`).
  - Internal hook `useFeedbackAuth(auth)` resolves headers per-submission, retries once on `unauthorized`, never persists tokens.
- `src/integrations/index.js` (`IntegrationClient`)
  - New optional `getAuthHeaders(action)` callback on constructor config.
  - One-time `console.warn` per insecure webhook mode on first send.

### Server adapter additions (`src/integrations/server/`)

- `src/integrations/server/withSecureDefaults.js` — the centerpiece preset wrapper.
- `src/integrations/server/defaults.js` — `defaultRedactionConfig`, `defaultOriginValidator`, `defaultRateLimiter`, `defaultErrorNormalizer`.
- `src/integrations/server/csrf.js` — double-submit CSRF helpers, isomorphic where possible.
- `src/integrations/server/request.js` — adapter to normalize Next.js (App/Pages Router), Express, and Web standard `Request` objects into a single internal `RequestLike` shape.
- `src/integrations/jira.js` and `src/integrations/sheets.js` — accept an optional `security` field on their config. When the wrapper has already enforced security, the inner handler trusts the resolved `authContext` and the redacted body.

### Tests

- `src/lib/__tests__/feedbackEvidence.test.js`
- `src/lib/__tests__/feedbackSecurity.test.js`
- `src/lib/__tests__/feedbackValidation.test.js`
- `src/lib/__tests__/auth.test.js`
- `src/integrations/server/__tests__/withSecureDefaults.test.js`
- `src/integrations/server/__tests__/defaults.test.js`
- `src/integrations/__tests__/webhook-warning.test.js`

The existing `src/__tests__/FeedbackFeatures.test.js` is converted to the Vitest API; behavioural assertions remain.

### Examples

- `example-nextjs/app/api/feedback/jira/route.js` — secure session-auth handler.
- `example-nextjs/app/api/feedback/anonymous/route.js` and `app/api/feedback/token/route.js` — anonymous capture with short-lived signed tokens.
- `example-nextjs/app/layout.jsx` — `<FeedbackProvider auth={{ mode: 'session' }} ... />`.
- `example-express/server.js` — ~40-line minimal app demonstrating cookie-session, `withSecureDefaults`, and a Redis stub for `rateLimit`.

### Documentation

- `docs/production-security-checklist.md` — scannable one-pager, every item links to the specific config that fixes it.
- `README.md` — gains a "Secure setup in 10 lines" example and links to the checklist.
- `CHANGELOG.md` — `[2.3.0]` section describing the additive security surface and the deprecation warnings.

## Data Model

All fields in the parent spec are accepted. Phase A formalizes which are client-trusted and which are server-authoritative.

```ts
type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';
type FeedbackType = 'bug' | 'idea' | 'praise' | 'question' | 'other';

interface FeedbackOwner {
  id?: string;
  name: string;
  email?: string;
  avatar?: string; // https URL only
}

interface FeedbackIntegrationState {
  local?:  { status: 'saved' | 'pending' | 'error'; error?: string };
  jira?:   { status: 'not_sent' | 'pending' | 'created' | 'synced' | 'error';
             issueKey?: string; issueUrl?: string; error?: string };
  sheets?: { status: 'not_sent' | 'pending' | 'appended' | 'synced' | 'error';
             rowId?: string; error?: string };
}

interface FeedbackStatusHistoryItem {
  from?: string;
  to: string;
  changedBy?: string;
  changedAt: string; // ISO
  comment?: string;
}

interface FeedbackSecurityContext {
  projectId?: string;
  tenantId?: string;
  submittedBy?: { id?: string; role?: string };
  authMode?: 'none' | 'session' | 'bearer' | 'signed';
  redactionApplied?: boolean;
  captureConsent?: 'implicit' | 'explicit';
}
```

### Trust matrix

| Field | Client may submit? | Server treatment |
|---|---|---|
| `feedback`, `type`, `severity`, `owner`, `customerValue` | Yes | Validate enums, shape, length; reject malformed; default `severity = 'medium'` if missing |
| `integrationState.jira.issueKey` / `issueUrl` | No (silently stripped) | Server fills after successful create |
| `integrationState.sheets.rowId` | No (silently stripped) | Server fills after successful append |
| `integrationState.*.status` | Yes, for `'not_sent'` only | Other status values overwritten by server result |
| `statusHistory` | No (silently stripped) | Server appends one entry per state-changing action; `changedBy` from auth context |
| `securityContext` | No (overwritten) | Server sets entirely from `authorizeRequest` result + applied redaction flag |
| `projectId`, `tenantId` (top-level) | Display-only | Server uses values from auth context for authorization decisions |

### Validation rules

`validateFeedbackSubmission(input, { authContext })` returns either:
- `{ ok: true, data }` — sanitized object with stripped fields removed.
- `{ ok: false, errors: Record<fieldPath, humanReason> }` — field paths only, no submitted values echoed.

Caps:
- `feedback`: 1–5000 chars after trim.
- `type`: must be in `FeedbackType` enum; otherwise coerced to `'other'`.
- `severity`: must be in `FeedbackSeverity` enum; default `'medium'`.
- `owner.name` ≤ 120, `owner.email` matches light RFC regex, `owner.avatar` must be `https://...`.
- `customerValue`: number clamped 0..1e9, or string ≤ 40 chars.
- `userName` ≤ 120, `userEmail` ≤ 320, `url` ≤ 2048.
- `elementInfo.selector`, `sourceFile` ≤ 1024 each; `componentStack` ≤ 50 entries.
- `eventLogs` ≤ 5000 events; events failing shape are dropped, not rejected.
- Screenshot ≤ 5 MB, video ≤ 50 MB (configurable on server). Mime sniffed by magic bytes server-side.

Validation runs before redaction so large/malformed payloads are rejected before expensive walks.

## Client DX

### Minimum secure setup

```jsx
<FeedbackProvider
  endpoint="/api/feedback/jira"
  auth={{ mode: 'session' }}
  redact="default"
/>
```

### `FeedbackAuthConfig`

```ts
interface FeedbackAuthConfig {
  mode: 'none' | 'session' | 'bearer' | 'signed';
  getToken?: () => string | null | Promise<string | null>;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  csrfToken?: string | (() => string | null | Promise<string | null>);
  retryOnUnauthorized?: boolean; // default true; one retry only
}
```

Mode behaviour:
- `'none'`: no auth headers. Warns once in production (`NODE_ENV === 'production'`). For local dashboards and demos.
- `'session'`: relies on the browser sending same-site cookies. Library auto-discovers CSRF token (cookie → `<meta name="csrf-token">` → explicit `csrfToken`) and sends as `X-CSRF-Token`.
- `'bearer'`: library calls `getToken` per submission and sends `Authorization: Bearer <token>`. Tokens are kept in memory only.
- `'signed'`: same as bearer but documented for short-lived host-signed submission tokens. The token is sent as `Authorization: Bearer <token>` and the host server verifies the signature.

`getHeaders` (optional) is for non-standard headers the host needs. Documented warning: must not return long-lived provider secrets.

Retry-once: when the server responds `unauthorized`, if `mode` is `'bearer'` or `'signed'` and `retryOnUnauthorized !== false`, the library calls `getToken` again (giving the host a refresh opportunity) and retries once. A second `unauthorized` is surfaced.

### `redact` prop

Accepts:
- `'default'` (implicit if omitted): the parent-spec default profile. Bodies dropped, headers redacted by pattern, console truncated/redacted, storage values redacted by key name.
- `'strict'`: as default plus URL query-string strip, storage value drop, IndexedDB event drop.
- `'off'`: no redaction. Warns once in production.
- `FeedbackRedactionConfig` object: merged on top of `'default'`. `preset: 'strict'` selects strict as the base instead.

`FeedbackRedactionConfig` shape matches parent spec; Phase A additions:
```ts
interface FeedbackRedactionConfig {
  preset?: 'default' | 'strict';
  redactHeaders?: string[];      // appended to defaults
  redactQueryParams?: string[];  // appended
  redactBodyKeys?: string[];     // appended
  maxBodyLength?: number;        // default 0 (bodies dropped)
  maxLogMessageLength?: number;  // default 2000
  allowRequestBodies?: boolean;  // default false
  allowResponseBodies?: boolean; // default false
  stripUrlQuery?: boolean;       // default false; true under 'strict'
}
```

Defense-in-depth: when `auth.mode === 'none'` (local-only flow), redaction also runs **client-side before localStorage write** so on-disk data never contains raw secrets. Server runs redaction again on submission.

### Stable client surface

```ts
import { FeedbackProvider, IntegrationClient } from 'react-visual-feedback';
import {
  getFeedbackEvidenceSummary,
  getFeedbackPriority,
  createFeedbackHandoffText,
  getDerivedFeedbackMeta,
} from 'react-visual-feedback/lib';
```

The `react-visual-feedback/lib` export is new; it re-exports the pure helpers for hosts who want to render evidence summaries outside the bundled UI.

## Server DX

### Minimum secure handler (Next.js App Router)

```js
import { withSecureDefaults, createJiraHandler, FeedbackAuthError }
  from 'react-visual-feedback/server';
import { getServerSession } from '@/lib/auth';

export const POST = withSecureDefaults({
  authorize: async (req) => {
    const session = await getServerSession(req);
    if (!session) throw new FeedbackAuthError();
    return { userId: session.userId, projectId: session.projectId, role: session.role };
  },
})(createJiraHandler({ projectKey: 'BUG' }));
```

### `withSecureDefaults` composition order

Fixed; not reorderable. Each step short-circuits with a normalized error response if it rejects.

1. **Origin check** — same-origin or allowlist from `FEEDBACK_ALLOWED_ORIGINS` env (comma-separated). `localhost` and `127.0.0.1` auto-allowed when `NODE_ENV !== 'production'`. Overridable via `validateOrigin`.
2. **CSRF check** — required if the request carries a cookie auth header. Double-submit token validated against `X-CSRF-Token`. Skipped if the request is bearer-only (no cookies). Overridable via custom check inside `authorize`.
3. **Rate limit** — in-memory token bucket keyed by IP plus authenticated user id when available. Defaults: 30 submissions/hour, 120 reads/hour. Documented as single-instance only; production-scale hosts plug in a Redis-backed limiter via `rateLimit`.
4. **Authorize** — host-supplied callback. Result becomes `AuthorizedFeedbackContext`. Throwing `FeedbackAuthError` → 401, `FeedbackForbiddenError` → 403, anything else → 500 with opaque message.
5. **Validate** — runs `validateFeedbackSubmission` on the parsed body. Field-level errors returned as 400 with field paths only.
6. **Redact** — runs `redactFeedbackEvidence` with the server-side redaction config (defaults match the client). Stamps `securityContext.redactionApplied = true`.
7. **Forward to provider handler** — calls the wrapped `createJiraHandler` / `createSheetsHandler` with the redacted body and the auth context.
8. **Normalize errors** — any provider error is server-logged with a request id and returned to the browser as `{ ok: false, error: 'integration_failed', message: 'integration_failed (req=...)' }`.

### Hooks

```ts
interface FeedbackServerSecurityHooks {
  authorize: (req: RequestLike) => Promise<AuthorizedFeedbackContext>;
  validateOrigin?: (req: RequestLike) => boolean | Promise<boolean>;
  rateLimit?: (req: RequestLike, ctx: AuthorizedFeedbackContext) => Promise<void>;
  redactFeedback?: (feedback: FeedbackData, ctx: AuthorizedFeedbackContext) => Promise<FeedbackData>;
  resolveIntegrationSecrets?: (ctx: AuthorizedFeedbackContext) => Promise<FeedbackIntegrationSecrets>;
  errorNormalizer?: (err: unknown, ctx?: AuthorizedFeedbackContext) => FeedbackServerErrorResponse;
}
```

Only `authorize` is required. Missing `authorize` in production logs a `console.warn` on first request and rejects with `unauthorized` to fail closed.

### Provider secret resolution

`resolveIntegrationSecrets(ctx)` lets the host return per-tenant Jira/Sheets credentials. When provided, `createJiraHandler` reads its credentials from this callback instead of process env. Single-tenant hosts can ignore it; multi-tenant hosts wire it to their secret store.

### Trusting the wrapper

When a request is processed by `withSecureDefaults`, the inner `createJiraHandler` / `createSheetsHandler` skips re-validation and trusts the body. When the inner handler is invoked directly (no wrapper), it runs its own basic validation and logs the same one-time production warning.

## Error Model

Single response shape for every server response, success or failure:

```ts
type FeedbackServerResponse<T> =
  | { ok: true;  data: T;   securityContext: FeedbackSecurityContext }
  | { ok: false; error: FeedbackErrorCode; message?: string; fields?: Record<string, string> };

type FeedbackErrorCode =
  | 'unauthorized'         // 401
  | 'forbidden'            // 403
  | 'csrf_failed'          // 403
  | 'origin_blocked'       // 403
  | 'rate_limited'         // 429 + Retry-After header
  | 'validation_failed'    // 400 — fields populated
  | 'payload_too_large'    // 413
  | 'integration_failed'   // 502 — provider call failed; details server-logged only
  | 'integration_unavailable' // 503 — provider not configured
  | 'redacted_blocked'     // 422 — host policy rejected after redaction
  | 'server_error';        // 500 — opaque
```

Rules:
- `message` is always safe. Never contains provider error text, stack traces, validated values, or auth context.
- Internal server errors generate a request id (UUID) logged at full detail; `message` includes the id for support correlation.
- `fields` only present for `validation_failed`. Values are human reasons, not the offending input.

### Client surfacing

```ts
interface FeedbackError {
  code: FeedbackErrorCode;
  message?: string;
  fields?: Record<string, string>;
  retryable: boolean; // true for rate_limited, server_error, integration_failed
}
```

`FeedbackProvider` accepts `onError={(err: FeedbackError) => void}`. Default behaviour displays a toast with `err.message` if present, otherwise a generic "Couldn't submit feedback" message.

Auto-retry: on first `unauthorized` for `bearer` / `signed` modes, the library calls `getToken()` again and retries once. Tokens stay in memory only.

### Internal state derivations

Pure helpers that the UI consumes in later phases; defined now so naming is locked.

```ts
getSubmissionState(item) // 'idle' | 'queued' | 'submitting' | 'retrying' | 'failed' | 'submitted' | 'partial'
getAuthState({ auth, lastError }) // 'anonymous' | 'authenticated' | 'token_expired' | 'unauthenticated' | 'misconfigured'
```

`'partial'` = saved locally and one of Jira/Sheets succeeded while the other failed.

## Redaction Detail

### `'default'` profile (production-safe)

Headers redacted (case-insensitive; exact and prefix match):
`authorization`, `cookie`, `set-cookie`, `proxy-authorization`, `x-api-key`, `x-auth-token`, `api-key`, `token`, `secret`, `x-amz-security-*`, `x-goog-*`, `x-firebase-*`. Value replaced with `'<redacted>'`.

Query and body keys redacted (case-insensitive deep walk):
`password`, `passcode`, `pin`, `token`, `secret`, `apikey`, `apiKey`, `api_key`, `authorization`, `refresh_token`, `access_token`, `id_token`, `session`, `cookie`, `otp`, `ssn`, `credit_card`, `cvv`, `card_number`. Value replaced with `'<redacted>'`; key preserved so devs see which fields existed.

Bodies dropped entirely. Event keeps `headers` plus `bodyRedacted: 'dropped-by-default'`.

Console messages truncated to `maxLogMessageLength` (default 2000), then a regex pass redacts inline `key: value` shaped secrets (`/(?:password|token|secret|api[-_]?key)\s*[:=]\s*\S+/gi`).

Storage values: redacted by key-name match against the same key list; otherwise truncated to 200 chars.

IndexedDB: keyPath kept, values replaced with `'<dropped: indexeddb value>'`.

URLs: kept; query params with sensitive keys redacted in place.

### `'strict'` profile

All `'default'` rules plus:
- URLs reduced to origin + path; query stripped entirely.
- IndexedDB events removed from the log; summary count kept (`{ type: 'indexedDB-summary', count }`).
- Storage values dropped; only key names retained.
- Maximum stored screenshot/video metadata size halved (display-only marker; bytes still received).

### `'off'` profile

No redaction. Server logs once: `[react-visual-feedback] redact:'off' is unsafe in production`.

### Stamping

Every redaction pass returns `{ data, appliedRules: ['headers', 'bodies', 'console', 'storage', 'idb', 'urls'] }`. `withSecureDefaults` sets `securityContext.redactionApplied = true` and an internal `securityContext._appliedRules` (UI display only; not authoritative).

## Backward Compatibility

Preserved:
- All current `FeedbackProvider` props.
- `IntegrationClient` constructor signature.
- `createJiraHandler` / `createSheetsHandler` exports (direct + framework factories).
- Stored feedback item shape; existing localStorage data remains readable.
- The existing test file under `src/__tests__/` (assertions preserved; API translated to Vitest).

New, opt-in:
- `auth` prop on `FeedbackProvider` (omit → behaves as today).
- `redact` prop on `FeedbackProvider` (omit → `'default'` applied to new submissions only; existing data untouched).
- `security` config on `createJiraHandler({ security })` (omit → today's behaviour + one-time production warning).

Deprecated, still working:
- Browser-side `jiraAutomation`, `appsScript`, `zapier` modes — one-time `console.warn` per mode on first send, naming the mode and linking to the checklist.
- Direct `createJiraHandler` without `withSecureDefaults` in production — one-time server `console.warn` on first request.

Version: 2.2.14 → 2.3.0. Minor bump. CHANGELOG explicitly states no breaking changes.

## Testing

Vitest, configured via `vitest.config.js` with Node environment by default. Phase A test scripts in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"build": "rollup -c",
"prepublishOnly": "npm test && npm run build"
```

### Coverage requirements

- `src/lib/*.js`: 100% line, 95% branch. Pure code; no excuse.
- `src/integrations/server/*.js`: ≥ 90% line. Uses web-standard `Request` / `Response` mocks.
- Client integration: smoke test only (jsdom wired in Phase B).

### Required test cases

| File | Cases |
|---|---|
| `feedbackEvidence.test.js` | summary counts including zero/empty; priority bands for each severity; handoff in each format; derived meta is stable; helpers never mutate input; output is frozen |
| `feedbackSecurity.test.js` | each header pattern redacted (exact + prefix); each key pattern redacted at depth (arrays, nested objects, mixed); bodies dropped by default; `'strict'` strips URLs; `'off'` warns once; custom config merges; regex log redaction handles multiline and mixed delimiters; client and server passes produce identical output |
| `feedbackValidation.test.js` | each enum; length caps; malformed owner shapes; server-write-only fields silently stripped; `'other'` fallback for unknown types; no submitted value echoed in error response; `feedback` empty/whitespace rejected |
| `auth.test.js` | each mode resolves correct headers; CSRF discovery order (cookie → meta → explicit); retry-once on 401; tokens never written to storage; `'none'` warns once in production |
| `withSecureDefaults.test.js` | composition order verified end-to-end; each step's rejection produces correct status + code; CSRF skipped for bearer-only requests; rate limit keys by IP and user separately; error normalization never echoes provider text; `securityContext.redactionApplied` set on success |
| `defaults.test.js` | `defaultOriginValidator` allows same-origin and env allowlist; allows localhost in dev only; rejects everything else; `defaultRateLimiter` honours custom limits |
| `webhook-warning.test.js` | one-time warning per insecure mode; not emitted twice in the same client; suppressible via `silenceInsecureWarnings` for tests |

### Verification commands

- `npm test`
- `npm run build`
- Run `example-nextjs` locally, submit feedback, confirm: (a) submission succeeds when authorized, (b) submission is rejected with `unauthorized` when logged out, (c) redaction strips a planted `Authorization` header from the captured network log, (d) the anonymous capture flow accepts a valid signed token and rejects an expired one.
- Run `example-express` locally and run the same four checks.

## Documentation

- `README.md` gains:
  - A "Secure setup in 10 lines" block (the Next.js example above).
  - A short "Why this is safe by default" paragraph naming the four guarantees: origin + CSRF + rate limit + redaction + authorize.
  - A link to `docs/production-security-checklist.md`.
- `docs/production-security-checklist.md`: scannable one-pager. Each item linked to the specific config that fixes it.
  - Use server endpoints, not direct webhooks.
  - Set `FEEDBACK_ALLOWED_ORIGINS`.
  - Wrap handlers in `withSecureDefaults`.
  - Provide `authorize`.
  - Choose `redact` profile (`default` or `strict`).
  - Keep provider secrets in env vars or secret manager; never in client props.
  - Configure `rateLimit` for production scale (Redis-backed in multi-instance deployments).
  - Configure `getToken` if not using cookie auth.
  - Gate dashboard reads to non-admin roles server-side.
- `CHANGELOG.md` `[2.3.0]` block describing additive security surface and the deprecation warnings.

## Scope For First Implementation Plan

The writing-plans skill will break Phase A into ordered, independently-testable units. Suggested ordering (subject to the plan's refinement):

1. Set up Vitest, add scripts, convert existing test file.
2. `feedbackErrors.js` — error classes; no dependencies.
3. `feedbackValidation.js` + tests.
4. `feedbackSecurity.js` + tests (redaction, auth helpers, destination policy).
5. `feedbackEvidence.js` + tests.
6. `src/types.d.ts` and `src/lib/index.js` barrel; wire export from package.json.
7. Server defaults (`defaults.js`, `csrf.js`, `request.js`) + tests.
8. `withSecureDefaults.js` + composition-order tests.
9. Wire `security` option into existing `createJiraHandler` / `createSheetsHandler`; add one-time warnings.
10. `FeedbackProvider` `auth` and `redact` props; `useFeedbackAuth` hook.
11. `IntegrationClient` `getAuthHeaders` callback and webhook warnings.
12. Update `example-nextjs` to the secure pattern; add anonymous capture demo.
13. Build `example-express` minimal app.
14. README, CHANGELOG, production security checklist.
15. Final build + manual verification against all four example checks.

## Self-Review Notes

- No placeholders remain.
- Phase A is foundation only; UI rework is explicitly deferred.
- The design preserves all current public APIs and adds new behaviour as opt-in.
- The secure path is the easy path: one wrapper, one callback, one provider prop.
- Every spec security invariant from the parent doc is implemented by a named module here.
- Every decision from brainstorming is recorded as a Decision item, not buried in prose.
