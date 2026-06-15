# Changelog

## [2.3.0] — 2026-06-15

Foundation release for the Feedback Command Center. No breaking changes.

### Added

- **Security foundation.** New `withSecureDefaults` server wrapper composes origin allowlist, CSRF check, rate limit, host-supplied `authorize`, validation, redaction, and opaque error normalization in a fixed order. One import, one callback, every secure default applied.
- **Client auth.** `FeedbackProvider` accepts an `auth` prop with modes `none | session | bearer | signed`. Auto CSRF discovery (cookie → meta-tag → explicit), in-memory tokens only, one-retry on 401.
- **Pure helpers** exposed under `react-visual-feedback/lib`: `getFeedbackEvidenceSummary`, `getFeedbackPriority`, `createFeedbackHandoffText`, `getDerivedFeedbackMeta`, `redactFeedbackEvidence`, `getFeedbackAuthHeaders`, `validateFeedbackSubmission`, plus error classes.
- **Optional data-model fields**: `severity`, `owner`, `customerValue`, `integrationState`, `statusHistory`, `securityContext`. All optional; existing item shapes keep working.
- **Redaction**: three profiles (`default`, `strict`, `off`) plus a custom config object. Defaults drop request/response bodies entirely, redact sensitive headers/keys (case + underscore tolerant), and truncate console messages. Runs both client-side (before localStorage) and server-side (in `withSecureDefaults`) as defense-in-depth.
- **Vitest test suite** with 106 tests including 23 adversarial security-hardening tests (forged contexts, prototype pollution, CRLF injection, redaction bypass, CSRF, per-user rate limit, opaque provider errors).
- **Examples**: `example-nextjs/` updated with secure session-auth routes, signed-token issuance, and anonymous capture. New `example-express/` minimal app demonstrating the same pattern.
- **Production Security Checklist** at `docs/production-security-checklist.md`.
- **TypeScript declarations** for the public surface in `dist/types.d.ts`.

### Fixed

- Inline secret regex previously matched `Authorization: Bearer <tok>` as prefix + `Bearer`, leaving the token visible in handoff text. Now redacts the full scheme + token.
- Sensitive key matching was case-only; `AccessToken` did not match `access_token`. Normalized to lowercase + strip underscores/dashes/dots so all spelling variants collapse.
- `redactObjectByKeys` now skips `__proto__` / `constructor` / `prototype` keys to harden against prototype pollution.

### Deprecated (still working)

- Direct browser webhook modes (`jira-automation`, `appsScript`, `zapier`) emit a one-time `console.warn` per mode pointing to the production security checklist. They keep working for backward compatibility but should not be used in production.
- Calling `createJiraHandler` / `createSheetsHandler` without `withSecureDefaults` in production emits a one-time server-side warning.

### Compatibility

- All existing `FeedbackProvider` props, `IntegrationClient` config, server-handler signatures, and stored data shapes remain. Upgrading from 2.2.x requires zero code changes.
