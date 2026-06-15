# Production Security Checklist

Use this before deploying `react-visual-feedback` to production. Every item links to the specific config that fixes it.

## Required

- [ ] **Wrap your server handler in `withSecureDefaults`.** Direct use of `createJiraHandler` / `createSheetsHandler` without the wrapper logs a one-time warning and skips origin, CSRF, rate-limit, validate, and authorize checks.
  ```js
  import { withSecureDefaults, createJiraHandler, FeedbackAuthError } from 'react-visual-feedback/server';
  export const POST = withSecureDefaults({ authorize })(createJiraHandler({ projectKey: 'BUG' }));
  ```
- [ ] **Provide `authorize`.** Without it, every request is rejected as `unauthorized` in production. The callback receives the normalized request and must return an `AuthorizedFeedbackContext` (`{ userId, projectId?, tenantId?, role? }`) or throw `FeedbackAuthError` / `FeedbackForbiddenError`.
- [ ] **Set `FEEDBACK_ALLOWED_ORIGINS`** (comma-separated) when your widget is loaded from a different origin than the API. Same-origin and localhost-in-development are always allowed.
- [ ] **Keep provider secrets server-side.** `JIRA_API_TOKEN`, `GOOGLE_SERVICE_ACCOUNT`, OAuth refresh tokens, and webhook signing secrets must live in env vars or a secret manager. Never in `FeedbackProvider` props, `IntegrationClient` config, or browser-visible env vars (no `NEXT_PUBLIC_*`).
- [ ] **Pick a `redact` profile.** Defaults to `'default'` (safe for production). Use `'strict'` for high-sensitivity hosts. Never ship `'off'` to production.

## Recommended

- [ ] **Configure `rateLimit` for production scale.** The default in-memory limiter is single-instance only. Multi-instance deployments need a Redis-backed limiter passed via `withSecureDefaults({ rateLimit })`.
- [ ] **Choose your auth mode** on `FeedbackProvider`:
  - `auth={{ mode: 'session' }}` — same-site cookies + auto CSRF (most React apps).
  - `auth={{ mode: 'bearer', getToken }}` — token-based apps.
  - `auth={{ mode: 'signed', getToken }}` — anonymous public capture with host-signed short-lived tokens.
- [ ] **Don't expose dashboard reads to non-admin roles.** Gate read endpoints in your `authorize` callback by `role`. Hiding UI controls is not authorization — the server is authoritative.
- [ ] **Migrate off direct browser webhook modes.** `jira-automation`, `appsScript`, and `zapier` ship the provider URL to the browser; the URL acts as a secret. Use the server-mediated handler instead. Insecure modes emit a one-time runtime warning naming the mode.
- [ ] **Anonymous capture flow.** Issue 5-minute HMAC-signed tokens from a rate-limited public endpoint; the browser uses them as Bearer auth against an `anonymous` route. See `example-nextjs/app/api/feedback/token/route.ts`.

## Verification

These four checks confirm the security pipeline is wired correctly:

1. **Authorized path works.** Submit a feedback while signed in → `200`.
2. **Authorized check enforced.** Submit while signed out → `401 unauthorized`.
3. **Redaction is happening.** Plant a request log with `Authorization: Bearer leaked-secret` on the page, submit feedback. Verify the saved/uploaded log shows `<redacted>` not `leaked-secret`. (You can also verify in `localStorage` that the saved item is already redacted on the client.)
4. **Rate limit triggers.** Submit 35 feedbacks within a minute → `429 rate_limited` with a `Retry-After` header.

## Threat model and what's out of scope

- **In scope:** unauthorized data access via the feedback endpoint, secret leakage through captured logs, CSRF on cookie-authed apps, basic DoS via large payloads, prototype pollution via crafted bodies, reflected XSS via error messages.
- **Out of scope for the library:** anti-bot on anonymous endpoints (use your edge WAF / CAPTCHA), provider-side authorization in Jira/Sheets (the wrapper authorizes the *call*; the provider still applies its own permissions), screenshot or video PII redaction (technically infeasible without ML — disable media capture for sensitive workspaces).

## What this checklist replaces

Previous versions of this library encouraged direct browser-to-Jira / browser-to-Apps-Script / browser-to-Zapier integrations. Those modes still work (for backward compatibility) but they ship the provider URL or token to every visitor's browser. Treat them as **demo or low-trust only**. For any production deployment, use the server-mediated path described above.
