# Feedback Command Center Design

Date: 2026-06-15
Status: Approved direction, written spec pending user review
Repository: `react-visual-feedback`

## Summary

Redesign the current React feedback widget into a more beautiful, simpler, higher-productivity feedback triage product. The core product becomes a developer-first Feedback Command Center: a focused workspace where teams can understand a user report, inspect the evidence, assign ownership, route it to Jira or Sheets, and close the loop faster.

The work should preserve the current library shape and public value: embeddable React components, styled-components, light and dark modes, screenshot capture, screen recording, session replay, feedback dots, local dashboard storage, and Jira/Sheets integrations. The redesign should organize these capabilities into one coherent workflow rather than adding visual polish in isolated files.

## Current State

The repository already contains strong technical capability:

- `FeedbackProvider.jsx` owns activation, capture, recording, dashboard, submission queue, dots, and integrations.
- `FeedbackModal.jsx` captures user feedback, category, media, user context, click position, and selected integrations.
- `FeedbackDashboard.jsx` shows feedback items, status, search, screenshots/videos, developer details, and fullscreen replay mode.
- `FeedbackDots.jsx` shows in-context markers on the page with hover previews and detail popovers.
- `SessionReplay.jsx` syncs video playback with console, network, storage, and IndexedDB logs.
- `integrations/` supports Jira, Google Sheets, Apps Script, Zapier, status sync, field mapping, and server handlers.
- `theme.js` provides basic light/dark tokens, but many components still make their own visual decisions.

The main product problem is not missing raw capability. The problem is that evidence and workflow are scattered across modal, dashboard cards, replay, dots, queue, and integration state. This makes the product feel less premium than the underlying features deserve.

## Goals

1. Make the UI more beautiful, simple, and professional without turning it into a marketing page.
2. Increase productivity for developers, founders, PMs, and support teams reviewing feedback.
3. Show details properly by grouping evidence into a clear hierarchy.
4. Add monetizable product surface area: severity, owner, customer value, integration handoff, status history hooks, and share/export actions.
5. Create a unified visual system across modal, dashboard, replay, dots, queue, updates, and toasts.
6. Keep the library usable by existing customers with backward-compatible props wherever possible.
7. Improve the code structure around UI primitives and derived feedback metadata so future features do not require rewriting large components.
8. Treat this as a library with strict browser/server security boundaries: no provider secrets, API keys, OAuth refresh tokens, service-account credentials, or private webhook secrets may be exposed to the browser bundle.
9. Add authentication and authorization patterns that work for embedded apps without requiring this package to become a hosted SaaS.

## Non-Goals

1. Do not build a hosted SaaS backend in this phase.
2. Do not remove existing dashboard, dots, replay, Jira, Sheets, localStorage, or recording capability.
3. Do not require Tailwind or a new UI framework for this library.
4. Do not replace styled-components unless a separate migration is approved.
5. Do not invent a full billing system in the widget package.
6. Do not ship decorative visuals that reduce clarity or slow the host application.
7. Do not store long-lived secrets in props, localStorage, IndexedDB, bundled source, README examples, or browser-visible configuration.
8. Do not make the client package responsible for authenticating directly to Jira, Google Sheets, or other private third-party APIs.

## Product Domain Exploration

Domain concepts:

- Feedback pin
- Evidence trail
- Session replay
- Console and network timeline
- React component/source mapping
- Status workflow
- Triage queue
- Customer/account signal
- Jira handoff
- Release loop

Color world:

- Browser chrome gray for structure
- Screenshot paper white for evidence surfaces
- Terminal ink for logs and source details
- Jira blue for primary action and integration handoff
- Resolved green for completed work
- Warning amber for important or blocked issues
- Muted slate for low-priority metadata

Signature element:

- Evidence Stack: a selected feedback item is shown as a layered stack of user message, screenshot/video, logs, component/source, environment, customer value, and routing state. This element should be recognizable across the dashboard, dot popovers, replay view, and exports.

Defaults to reject:

- Narrow slide-out dashboard -> full command workspace with list, evidence, and workflow areas.
- Generic card list -> triage list with severity, status, media, source, customer, and integration signals.
- Scattered technical chips -> grouped Evidence Stack with readable sections and copy actions.
- Native select filters -> crafted segmented filters and dropdown menus consistent with existing `StatusDropdown`.
- Pretty but generic metrics -> operational summaries that answer "what needs attention now?"

## Recommended Approach

Build a developer-first product suite in phases.

Phase 1 should focus on the Feedback Command Center and capture flow because that is where the repo already has the most unique value. PM/customer-success features should be included as lightweight metadata and workflow fields, not as a separate product yet.

The first implementation should make the existing library feel paid-worthy even before a hosted backend exists. Paid value comes from reducing the time between "a user reported something" and "the team knows exactly what happened and where to act."

## Library Constraints and Trust Boundaries

This package is a library embedded into someone else's React application. That creates hard limits:

- The browser bundle runs in an untrusted environment. Users can inspect props, source maps, localStorage, IndexedDB, network calls, and bundled code.
- Any value passed to `FeedbackProvider` or `IntegrationClient` in the browser must be treated as public.
- The library cannot safely own account-level secrets unless it is running in a host-controlled server route.
- The library should not assume the host app has a specific auth stack. It must support cookies, bearer tokens, short-lived signed tokens, and anonymous capture.
- The host application is the authority for user identity, tenant/project access, rate limits, abuse controls, and third-party provider credentials.

Trust boundaries:

- Browser SDK boundary: collects feedback, evidence, user-supplied text, screenshots, replay logs, and optional public config.
- Host app backend boundary: authenticates the current user, validates tenant/project access, redacts evidence, stores records, applies rate limits, and calls third-party APIs.
- Integration provider boundary: Jira, Google Sheets, Zapier, Apps Script, or future providers. These should receive requests from trusted server handlers, not from the browser with private credentials.
- Local storage boundary: localStorage and IndexedDB are convenience storage only. They are not secure storage and must not be used for secrets.
- Clipboard/export boundary: generated handoff text can leave the product. It must be redacted by default.

Primary security invariants:

- No private integration credential is ever included in the client bundle or browser-visible props.
- A client-provided `projectId`, `tenantId`, `userEmail`, `owner`, `severity`, or `integrationState` is display/input data, not authorization proof.
- Server adapters must authorize every write, read, status update, export, and integration sync.
- Evidence capture must be minimized, redacted, and controllable because screenshots and replay logs may include personal data, tokens, or confidential UI.
- Direct browser-to-provider integration modes are not recommended for production unless the destination is intentionally public and scoped for anonymous input.

## Authentication and Secret Handling

Authentication should be added as a library pattern, not as hard-coded auth.

Client-side API:

```ts
interface FeedbackAuthConfig {
  mode?: 'none' | 'session' | 'bearer' | 'signed';
  getToken?: () => Promise<string | null> | string | null;
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  csrfToken?: string | (() => string | Promise<string | null>);
}

interface FeedbackProviderSecurityConfig {
  auth?: FeedbackAuthConfig;
  endpoint?: string;
  projectId?: string;
  redact?: FeedbackRedactionConfig;
  captureConsent?: 'implicit' | 'explicit';
}
```

Rules:

- `mode: 'session'` sends feedback to the host endpoint using same-site cookies. The server must validate session auth and CSRF protection.
- `mode: 'bearer'` uses a short-lived access token returned by `getToken`. The token must be scoped to feedback submission or dashboard access, not broad application administration.
- `mode: 'signed'` uses a short-lived signed submission token created by the host backend. This is useful for anonymous or public feedback capture with rate limits and expiry.
- `mode: 'none'` is allowed only for local demos or intentionally public anonymous endpoints.
- `getHeaders` may add app-specific headers, but docs must warn not to return provider secrets or long-lived API keys.
- Tokens must not be persisted by the library. Keep them in memory only and request them when needed.

Server adapter API:

```ts
interface FeedbackServerSecurityHooks {
  authorizeRequest?: (req: RequestLike, action: FeedbackAction) => Promise<AuthorizedFeedbackContext>;
  validateOrigin?: (req: RequestLike, context: AuthorizedFeedbackContext) => Promise<void>;
  rateLimit?: (req: RequestLike, context: AuthorizedFeedbackContext) => Promise<void>;
  redactFeedback?: (feedback: FeedbackData, context: AuthorizedFeedbackContext) => Promise<FeedbackData>;
  resolveIntegrationSecrets?: (context: AuthorizedFeedbackContext) => Promise<FeedbackIntegrationSecrets>;
}
```

Server rules:

- Server handlers must accept secrets from environment variables, secret managers, or host-provided callbacks only.
- Jira API tokens, Google service-account credentials, OAuth client secrets, OAuth refresh tokens, webhook signing secrets, and private Zapier/Apps Script URLs must stay server-side.
- Server handlers must validate allowed origins for browser requests when cookies or bearer tokens are used.
- Server handlers must validate tenant/project access from trusted auth context, not from client-submitted IDs.
- Server handlers should expose minimal error details to the browser while logging full provider errors server-side.
- Server handlers should support disabling local dashboard reads for non-developer users.

Integration modes:

- Recommended production mode: browser -> host `/api/feedback` endpoint -> server adapter -> Jira/Sheets/provider.
- Acceptable internal mode: browser -> host endpoint with session cookie or short-lived token -> host storage only.
- Demo-only mode: browser localStorage/IndexedDB without provider sync.
- Discouraged production mode: browser directly calls Jira, Sheets, Zapier, Apps Script, or any webhook URL that functions as a secret.

Migration note:

- Existing client-side webhook options should remain for backward compatibility, but documentation and UI should label them as public/demo or low-trust modes. New examples should prefer server proxy endpoints.

## 10-Pass Optimization Frame

The design should be evaluated as if it went through 10 improvement passes, each targeting at least a meaningful 40% improvement over the previous rough concept in one dimension:

1. Clarity: remove duplicate labels, vague sections, and hidden details.
2. Evidence hierarchy: prioritize comment, media, logs, component/source, and environment in that order.
3. Speed: reduce clicks to inspect, route, copy, or resolve a report.
4. Visual system: unify tokens, borders, radius, typography, and spacing.
5. Density: show more useful data without turning the UI into a wall of text.
6. Monetization: add fields that teams pay for, such as owner, severity, customer value, and handoff.
7. Trust: make success, error, loading, offline, missing-media, and integration states obvious.
8. Accessibility: improve keyboard navigation, labels, focus states, and readable contrast.
9. Responsiveness: make modal and dashboard usable from mobile to large desktop.
10. Security and maintainability: verify every auth mode, secret boundary, redaction rule, integration path, shared primitive, and helper boundary before calling the library production-ready.

This frame is a design discipline, not a literal mathematical claim.

## UX Architecture

### 1. Feedback Command Center

Replace the current narrow dashboard with a wider command workspace. It may still open as an overlay, but it should use the viewport more effectively.

Layout:

- Header: product title, item count, active filters, refresh, close, and optional export/share.
- Summary strip: counts for new/open/in-progress/resolved plus evidence-rich items such as "with replay" and "needs owner."
- Left rail/list: compact triage list with search, filters, media badges, status, severity, timestamp, user, and component/page hints.
- Center evidence panel: the selected feedback item and the Evidence Stack.
- Right workflow panel: status, severity, owner, customer value, integrations, copy/export, delete, and status history hooks.

Default behavior:

- Select the newest unresolved feedback item when the dashboard opens.
- Keep empty states actionable: if no feedback exists, show one primary action such as "Collect feedback with Alt+Q."
- Keep user mode simpler: hide source, logs, owner, delete, and deep integration controls unless `isDeveloper` is true.

### 2. Evidence Stack

The Evidence Stack is the key repeated pattern.

Sections:

- User signal: feedback text, type, user name/email/avatar, timestamp, page URL.
- Visual evidence: screenshot thumbnail, full screenshot viewer, video replay if available.
- Replay evidence: event log summary, error count, network failure count, storage events, and button to inspect full replay.
- Source evidence: React component, component stack, selector, source file, viewport, browser.
- Workflow evidence: current status, severity, owner, customer/account value, Jira issue, Sheets row, last sync state.

Every technical item that can be copied should have a copy affordance. The copy output should be useful for handoff: component path, selector, URL, short report, or full evidence summary.

### 3. Capture Modal

The capture modal should become simpler and more confident.

Structure:

- Header: "Send feedback" with close.
- Primary text area: focused automatically, clear placeholder, visible validation near the field.
- Evidence preview: screenshot, video, or attachment state with remove/replace when allowed.
- Classification row: type and severity.
- Destination row: local, Jira, Sheets toggles with clear enabled/disabled state.
- Footer: submit button, queue/submission state, and a small privacy/evidence note when replay/logs are attached.
- Security disclosure: when replay/logs are attached, show a compact note that technical evidence may include page data and is sent to the configured workspace.

Expected improvements:

- Do not make users hunt for category controls.
- Do not hide failed integration state away from the submit action.
- Preserve manual uploads and existing `onAsyncSubmit`.
- Do not show integration toggles for destinations the authenticated user cannot use.
- Do not ask users for provider keys or tokens inside the modal.

### 4. Feedback Dots

Feedback dots should continue to exist as an in-context overlay, but their mini card and popover should use the same Evidence Stack language.

Changes:

- Dot hover shows user, type, severity, status, and a short feedback preview.
- Dot click opens a compact evidence card with screenshot, component/source, and status.
- Toolbar filters should match dashboard taxonomy.
- Developer mode should add "Open in Command Center" or equivalent selection handoff.

### 5. Session Replay

Replay should feel like part of the evidence system, not a separate player.

Changes:

- Keep playback controls, download video, and download logs.
- Add log summary counts near the controls.
- Prioritize errors and failed network requests visually.
- Preserve full-screen/video mode but make it visually consistent with dashboard tokens.

### 6. Submission Queue, Toasts, Updates

These supporting surfaces should share the same token system and language.

Changes:

- Queue states should show where the submission is going: local, Jira, Sheets.
- Toasts should use the same semantic tokens as the rest of the UI.
- Updates modal should follow the same surface, border, radius, and typography rules.

## Monetizable Features

Add these fields and UI hooks in a backward-compatible way:

- Severity: `low`, `medium`, `high`, `critical`.
- Owner: string or object with id/name/email/avatar.
- Customer/account value: numeric or label, displayed as business impact.
- Priority score: derived from type, severity, customer value, replay/log evidence, and status.
- Integration state: local saved, Jira created/synced/error, Sheets appended/synced/error.
- Status history hook: optional list of changes, initially display-only if supplied.
- Copy/share report: generate a compact evidence summary for Slack/Jira/Linear/manual handoff.
- Auth-aware workspace mode: dashboard and integration controls can be limited to authenticated developers or admins.
- Security controls: redaction rules, capture consent, destination policy, and audit/status history become part of paid team readiness.

These do not require hosted billing. They create paid-tier product value because teams need triage, ownership, impact, and handoff to justify adopting the widget.

## Data Model

Existing feedback data should remain accepted. New optional fields:

```ts
type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';

interface FeedbackOwner {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface FeedbackIntegrationState {
  local?: 'saved' | 'pending' | 'error';
  jira?: {
    status: 'not_sent' | 'pending' | 'created' | 'synced' | 'error';
    issueKey?: string;
    issueUrl?: string;
    error?: string;
  };
  sheets?: {
    status: 'not_sent' | 'pending' | 'appended' | 'synced' | 'error';
    rowId?: string;
    error?: string;
  };
}

interface FeedbackStatusHistoryItem {
  from?: string;
  to: string;
  changedBy?: string;
  changedAt: string;
  comment?: string;
}

interface FeedbackSecurityContext {
  projectId?: string;
  tenantId?: string;
  submittedBy?: {
    id?: string;
    role?: string;
  };
  authMode?: 'none' | 'session' | 'bearer' | 'signed';
  redactionApplied?: boolean;
  captureConsent?: 'implicit' | 'explicit';
}

interface FeedbackRedactionConfig {
  redactHeaders?: string[];
  redactQueryParams?: string[];
  redactBodyKeys?: string[];
  maxBodyLength?: number;
  maxLogMessageLength?: number;
  allowRequestBodies?: boolean;
  allowResponseBodies?: boolean;
}
```

Derived metadata helper:

- `getFeedbackEvidenceSummary(item)` should count screenshots, videos, logs, errors, failed network requests, component/source availability, and integration state.
- `getFeedbackPriority(item)` should derive a deterministic display score without mutating the item.
- `createFeedbackHandoffText(item)` should produce a compact human-readable summary.
- `redactFeedbackEvidence(item, config)` should remove or mask sensitive headers, query parameters, body fields, and overlong log payloads.
- `getFeedbackAuthHeaders(authConfig)` should resolve short-lived auth headers without persisting tokens.

Default redaction:

- Header names matching `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `proxy-authorization`, `api-key`, `token`, or `secret` must be redacted.
- Query/body keys matching `password`, `passcode`, `token`, `secret`, `apiKey`, `apikey`, `authorization`, `refresh_token`, `access_token`, `id_token`, `session`, `cookie`, `otp`, or `ssn` must be redacted.
- Request and response bodies should be disabled by default for production-oriented examples, or truncated and redacted if enabled.
- Screenshot and video redaction cannot be guaranteed automatically; the UI and docs must make capture scope clear and allow hosts to disable media/replay capture.

## Component Boundaries

The current `FeedbackDashboard.jsx` is too broad for the desired UX. Split the dashboard work into focused pieces:

- `FeedbackCommandCenter`: overlay shell and state orchestration.
- `FeedbackTriageList`: search, filters, counts, selected item.
- `FeedbackEvidenceStack`: reusable evidence sections.
- `FeedbackWorkflowPanel`: status, severity, owner, business impact, integrations, copy/export/delete.
- `FeedbackSummaryBar`: operational counts.
- `EvidencePreview`: screenshot/video/attachment preview shared by modal and dashboard.
- `EvidenceMetaRow` or similar: small copyable metadata rows.
- `feedbackEvidence.js`: pure helpers for derived metadata and handoff text.
- `feedbackSecurity.js`: pure helpers for redaction, auth header resolution, safe copy/export payloads, and destination policy checks.
- `FeedbackAuthBoundary`: optional wrapper/pattern that accepts auth state from the host app and passes allowed actions into the command center.
- `IntegrationSecurityNotice`: small reusable UI for showing whether a destination is server-secured, demo/local, or misconfigured.

Keep `FeedbackDashboard` exported for compatibility. It can render the new command center internally or accept a compatibility prop if needed.

## Security and Privacy Requirements

The implementation must treat feedback evidence as sensitive data.

Authentication and authorization:

- Dashboard read access should be gated by host-provided auth state or server authorization in production examples.
- Developer-only controls must remain hidden for `isDeveloper={false}`, but hiding controls is not authorization. Server handlers must still enforce permissions.
- Status updates, owner changes, integration sync, deletes, exports, and dashboard reads must be authorized server-side when using remote storage.
- Anonymous submission must use an intentionally public endpoint, short-lived signed token, captcha/rate-limit hook, or host-defined abuse prevention.

Secret handling:

- No README, example, fixture, test, or default prop may include real-looking provider secrets.
- Client examples must use server endpoints such as `/api/feedback/jira`, not raw Jira tokens or service-account JSON.
- Apps Script/Zapier URLs must be described as public receiver URLs unless proxied by the host server. Production docs should recommend proxying them.
- Source maps and bundled output must not contain provider secrets because secrets never enter build-time public config.

Replay and log privacy:

- Network capture must redact sensitive headers by default.
- Body capture should be opt-in and separately configurable for request and response bodies.
- Storage and IndexedDB capture should redact sensitive keys and truncate values.
- Console logs should be truncated and redacted by default.
- Hosts should be able to disable replay, network body capture, storage capture, screenshot capture, or source-path capture independently.
- Handoff/copy/export text must use redacted evidence, not raw captured logs.

Storage:

- localStorage is acceptable for demos and local dashboards, but docs must state that it is not secure storage.
- IndexedDB video storage is acceptable for local replay convenience, but videos may contain sensitive data. The dashboard must make deletion clear.
- Remote storage examples should send evidence to host-controlled endpoints with server-side authorization.

Transport:

- All production examples must assume HTTPS.
- Server adapters should reject non-HTTPS origins in production unless explicitly configured otherwise for localhost.
- CORS should be deny-by-default and configured by allowed origin.

Input handling:

- Feedback text, URLs, selectors, source paths, logs, and provider errors are untrusted strings.
- Render text through React text nodes, never `dangerouslySetInnerHTML`.
- If opening screenshot previews in a new window, avoid writing untrusted HTML around untrusted values. Prefer object URLs or safe image rendering.
- Generated filenames for downloads should be sanitized.

Provider integration security:

- Jira and Sheets server handlers must validate action names, status values, issue keys, row IDs, and project ownership.
- Status sync must map allowed local statuses to provider statuses server-side.
- Provider API errors must be normalized before returning to the browser.
- OAuth refresh tokens and service-account credentials must be stored by the host backend, not this browser library.

Documentation:

- Add a "Production Security Checklist" to README before promoting auth/integration features.
- Mark local/demo-only flows clearly.
- Include Next.js and Express examples that keep secrets in environment variables and authorize requests before creating Jira/Sheets records.

## Visual System

Intent:

- Human: developer, founder, PM, or support lead reviewing feedback between other tasks.
- Task: decide what happened, how important it is, who owns it, and where it goes next.
- Feel: calm, precise, evidence-rich, paid, and fast.

Palette:

- Canvas: light near-white and dark near-black/slate surfaces.
- Structure: neutral browser chrome gray.
- Primary action: Jira-like blue.
- Success: resolved green.
- Warning: amber.
- Danger: red.
- Metadata: muted slate.

Depth:

- Use border-first structure with subtle surface shifts.
- Avoid large shadows except for overlays and popovers.
- Avoid decorative gradients and glow effects.

Surfaces:

- Base canvas
- Raised panel
- Inset input/evidence well
- Popover/dropdown layer
- Modal/command overlay layer

Typography:

- Use system UI for host-app compatibility.
- Use monospace only for source paths, selectors, timestamps, IDs, and logs.
- Use stronger weight and spacing hierarchy rather than oversized headings.

Spacing:

- Base unit: 4px.
- Dense list rows should use compact but readable spacing.
- Evidence sections should use consistent padding and clear headers.

Accessibility:

- Icon-only buttons need `aria-label`.
- Clickable rows must be keyboard reachable.
- Destructive actions need a confirm pattern better than bare `window.confirm`.
- Focus rings must be visible in light and dark modes.
- Text inside controls must not overflow on mobile.

## Error Handling and States

Dashboard:

- Loading: show structural skeleton rows and evidence panels.
- Empty: show one clear next action.
- Error: show error near refresh/search area, with retry.
- Missing video: show a clear unavailable state with item id if helpful.
- Invalid localStorage data: recover to empty list and show non-blocking error.

Capture modal:

- Empty description: show inline validation next to the field.
- Screenshot capture failure: still allow submit, but mark evidence as missing.
- Integration disabled: show disabled toggle with title/label.
- Submit timeout: show failed queue state with retry hook if available.

Replay:

- Video load failure: show clear message and preserve logs download if logs exist.
- No logs yet: show neutral empty state.
- Failed network logs: visually prioritized.

Workflow:

- Delete should use a confirm dialog pattern.
- Status change failures should be displayed next to the status control.
- Integration sync failures should show the destination and failure reason.

Security/auth states:

- Unauthenticated dashboard: show a clear locked state with host-provided sign-in action if available.
- Unauthorized action: keep the current view, show inline permission error near the blocked control, and do not mutate local UI optimistically.
- Expired token: retry token resolution once, then show sign-in/refresh guidance.
- Misconfigured integration: show "Server endpoint required" or "Destination unavailable" rather than exposing provider details.
- Redaction active: show a small "redacted" indicator on logs and exports so users understand why details are hidden.

## Testing and Verification

Add or update tests before production behavior changes.

Required test coverage:

- Pure helper tests for evidence summary, priority score, and handoff text.
- Pure helper tests for default redaction of headers, query params, body keys, console logs, storage values, and handoff text.
- Auth helper tests for session, bearer, signed, and missing-token states.
- Dashboard behavior: search/filter selection, empty state, selected item details, developer/user mode differences.
- Capture modal behavior: severity/type selection, integration toggles, validation, submit payload.
- Status/integration workflow: status change callback and displayed error state.
- Backward compatibility: existing feedback data without new fields still renders.
- Security behavior: no provider secret props are required by production examples; unauthorized actions do not call mutation callbacks; integration controls are disabled when destination policy denies access.
- Server adapter tests, when adapters are changed: authorize hook is called before create/update/delete/sync; origin/rate-limit/redaction hooks run before provider calls; provider errors are normalized.

Verification commands:

- `npm run build`
- If a test runner is added, run the focused test suite and document the command in `package.json`.
- Run the example app locally and visually inspect the modal, dashboard, dots, replay, queue, and dark mode.

## Scope for First Implementation Plan

Implement in this order:

1. Add pure evidence helpers and tests.
2. Add security helpers for redaction, auth header resolution, destination policy, and safe handoff/export text.
3. Update server adapter design/API docs so production examples keep secrets server-side.
4. Expand theme tokens and shared UI primitives.
5. Rework `FeedbackModal` into the simpler capture flow.
6. Replace dashboard internals with the command center layout while preserving `FeedbackDashboard` export.
7. Add Evidence Stack and workflow panel.
8. Update dots, replay, queue, and toasts to use shared language and tokens where practical.
9. Update README examples, API docs, and production security checklist for new optional fields and auth modes.
10. Build and visually verify.

## Decisions

- Approved direction: developer-first product suite, starting with the Feedback Command Center.
- Keep styled-components and React component exports.
- Preserve existing integrations and local storage behavior.
- Add monetization features as optional metadata and workflow UI, not a hosted billing/backend layer.
- Use Evidence Stack as the signature interaction and visual pattern.
- Treat production integrations as server-mediated by default.
- Support authentication through host-provided sessions, bearer tokens, or short-lived signed submission tokens.
- Keep all provider secrets out of the browser library.

## Self-Review Notes

- No placeholders remain.
- The scope is one implementation plan: redesign and refactor the existing widget UI around the command center.
- Hosted SaaS, billing, and backend analytics are explicitly deferred.
- The design preserves existing APIs while adding optional fields.
- The spec covers architecture, components, data flow, error handling, visual system, monetization, authentication, security, privacy, and testing.
