# Changelog

## [2.3.2] — 2026-06-18

Driven by a live end-to-end Chrome test pass (47 cases, see test.csv).

### Fixed
- **Attachments lost in localStorage.** Before: `File` objects went through `JSON.stringify` and became `{}` — the dashboard had no idea what was attached. Now: `feedbackStorage` extracts `{name, size, type, persistedAt}` before persisting, matching what already happens for `videoBlob`. Same for `audioBlob` voice memos.
- **Dashboard attachment chip + audio chip render.** `EvidenceStack` header now shows `📎 invoice.pdf 14B` and `voice memo` inline next to the other chips.

### Changed — dashboard is 2-column
The 3rd "Workflow" column wasted ~30-40% of viewport on text-only feedback. Merged into the detail panel:
- Status / Severity / Owner are inline chips at the **top** of the detail header (clickable to edit when the host wires `onStatusChange` etc.).
- `Copy as…` + `Delete` moved to a sticky **footer** of the detail panel.
- Title gets full panel width; long descriptions don't wrap awkwardly anymore.
- Two breakpoints: 1024px stays 2-col with narrower list; 768px collapses to single-col scroll.

### CLI
- `npx rvf auth supabase` now offers to **auto-run the `CREATE TABLE` migration** through Supabase's Management API right after we fetch the project keys. Idempotent (`create table if not exists`). If the API call fails, the env vars still get written and we surface the SQL inline so users can run it manually — `docs/SUPABASE_SETUP.md` stays as the canonical fallback.

### Live-tested
47/47 categories exercised in a real Chrome session against the example Next.js app — see `test.csv` at repo root for per-test results. Notable confirmation: CSRF fix from 2.3.1 verified live (server destinations went from `403 csrf_failed` → `502 integration_failed` once cookies + matching header round-trip).

## [2.3.1] — 2026-06-18

Same-day fix. Live Chrome end-to-end test of 2.3.0 caught a CSRF bug
that made every server destination return 403 from the browser.

### Fixed
- **`proxyPost` now sends the `x-csrf-token` header.** Before this fix,
  the client read the `csrf-token` cookie (set by withSecureDefaults
  on the first GET) but never forwarded it as the matching header — so
  every state-changing POST to `/api/feedback/<name>` failed the
  double-submit check with `403 csrf_failed`. Tested in Chrome against
  github/linear/notion/supabase/hubspot/slack — all now reach their
  destination handlers (and surface real provider errors if creds are
  missing, instead of failing at the wrapper layer).

### Documentation
- README now has a per-destination CLI matrix (10 rows: local, github,
  linear, slack, discord, notion, hubspot, sheets, supabase, jira) with
  exact env vars + setup time + what the CLI handles automatically.
  The AI-agent block lists every supported destination by name.

## [2.3.0] — 2026-06-18

Three-minute integration. `npx rvf init --auth <name>` does the whole
thing in one command: framework auto-detect, scaffold, real-provider
auth flow, env-var write. Nine destinations end-to-end. Plus a security
audit pass + dashboard cleanup.

### Added — CLI (`npx rvf`)
- `npx rvf init --auth <name>` chain: scaffold + auth in one command.
- `npx rvf <destination>` shortcut (1-arg, no verb) and `rvf c <destination>` alias.
- `npx rvf` (no args) opens an interactive menu (init/auth/add/doctor/list).
- `npx rvf doctor` — diagnoses `.env.local` per-destination; flags missing keys + suggests the next command.
- `npx rvf auth <name>` — paste-flow for github/jira/linear/supabase/discord/slack, polling flow for notion, scope-coached flow for hubspot, OAuth-loopback + auto-create-spreadsheet for sheets.
- `npx rvf auth github --web` — routes through our hosted OAuth website (lives in `website/`), CLI loopback handoff with a per-flow handoff secret + Private Network Access CORS.

### Added — evidence intake
- **Paste** (Cmd+V in the description textarea) — extracts image clipboard items and routes them to the screenshot slot.
- **Drag-drop** — full-modal dropzone with a "Drop to attach" overlay; ingests any file type.
- **Voice memo** — `useVoiceRecorder` hook, mic-only `MediaRecorder` with best-MIME pick, 90s auto-stop. Releases the mic track on stop + unmount.
- **Arbitrary files** — `accept="image/*,video/*"` removed from every modal variant. PDFs, logs, HAR, zip selectable through the file picker.
- New `audioBlob` payload field threads through the multipart pipeline (`audio` part) and server-side `parseWebRequestBody`.

### Added — destinations
- New `connect.discord()` destination + `createDiscordHandler` — multipart upload bundles screenshot + video + audio + arbitrary file as `files[0..N]` (Discord allows up to 10).
- Other destinations (github, linear, notion, hubspot, slack) append a `📎 Evidence captured: …` note to the body so the receiver sees what was attached even when the API can't carry binaries.

### Security (closed all HIGH + MEDIUM audit findings)
- **CLI web-loopback handoff secret.** Server only resolves on `/handoff/<32-byte-hex>`; timing-safe compare; OPTIONS+POST only; body capped at 64KB. Closes the window where any local process could race the legitimate browser to POST a fabricated token.
- **Pinned production website URL.** CLI defaults to `https://rvf.dev` instead of `http://localhost:3009`; dev users opt in to localhost via `RVF_WEBSITE_URL`.
- **OAUTH_STATE_SECRET length floor (≥32 chars).** `encodeState`/`decodeState` throw on short secrets. State payload now carries `iat`; `decodeState` rejects > 10 min.
- **`createSheetsHandler` refuses unwrapped calls in production.** Closes the unauthenticated `getAuthUrl`/`exchangeCode` action path.
- **Screenshot PII masking.** `html2canvas` `onclone` hook strips `input[type=password]`, every `cc-*` autocomplete shape, `one-time-code`, name-matched card/cvv/cvc, and explicit `[data-feedback-redact]` elements.
- **CSRF rule clarified** — required when a cookie session is in play; skipped for bearer-only and unauthenticated requests (browsers can't implicitly attach non-cookie credentials).
- **Serverless runtime detection** — `defaultRateLimiter` emits a one-shot warning on Vercel/Lambda/Cloud Run/Functions/Netlify/Workers/Pages/Deno so hosts don't silently assume 30/hour is enforced on cold-start environments.
- **Cookie `secure` flag forced** in production regardless of `req.protocol` (TLS-terminating-proxy fix).
- **Inline-script credential injection hardened** — `safeJsonForScript` escapes `</script>` / U+2028 / U+2029 / `<!--`. Callback page adds CSP + Referrer-Policy + X-Content-Type-Options.

### Dashboard cleanup
- Replaced `window.prompt()` in `OwnerRow` + `CustomerRow` with inline theme-styled inputs (Enter commits, Esc cancels, datalist for recent names).
- Responsive layout — three @media breakpoints. Below 1024px the workflow column collapses into a 40vh bottom sheet; below 768px it hides and the body becomes a single scrolling column.
- Severity filter chips (P0/P1/P2/P3) in `SummaryBar` — the reducer + filter logic existed but no UI dispatched to it.
- `TriageListRow` no longer renders `item.feedback` twice (title + preview).
- Sort dropdown — Newest / Oldest / Priority / Status.
- Footer shows "X of Y items" when filters narrow the list.
- Deleted `dashboard/legacy/FeedbackDashboardLegacy.jsx` (1068 LOC). Extracted `DEFAULT_STATUSES` + `saveFeedbackToLocalStorage` + IndexedDB video helpers into the focused `src/lib/feedbackStorage.js`.

### Fixed
- **Server route no longer drags the 4.4 MB UI bundle into Node.** `connect` is now re-exported from `react-visual-feedback/destinations` (27 KB pure JS, no React/html2canvas). The CLI's generated `feedback.config.ts` and the catch-all route imports use `react-visual-feedback/config` + `react-visual-feedback/destinations` instead of the root entry, which closes the "all `/api/feedback/*` return 500" path some hosts saw on Next.js.

### Breaking
- Server reads only `GITHUB_TOKEN` / `GITHUB_REPO`. The previous `GH_TOKEN` / `GH_REPO` fallback is removed — run `npx rvf auth github` to migrate, or rename the env vars manually.

### Default modal variant changed
- `npx rvf init` now scaffolds `ui: { variant: 'centered' }` (the classic centered modal) instead of `two-column`. Hosts who want the new paste/drop/voice-memo UX can explicitly opt in with `--variant=two-column`.

### Tests
- 693 tests pass (was 615 before this batch).

## [Unreleased]

### Added
- **Design tokens** — semantic profiles (`light`, `dark`) under `src/ui/tokens.js`. Roles for color (`accent`, `surface`, `textMuted`, …), space, radius, font, shadow, motion.
- **Ten UI primitives** under `react-visual-feedback/ui`: `Button`, `IconButton`, `Field`, `Select`, `Chip`, `Surface`, `Stack`, `Tooltip`, `Spinner`, `Avatar` (+ `AvatarStack`).
- `UIThemeProvider`, `useUITokens()` hook, `pickToken()` styled-components helper.
- 93 new tests (Vitest + jsdom + @testing-library/react + jest-axe). Every primitive's default render is gated by `axe-core` for zero a11y violations.

### Changed
- `theme.js` exports `lightTheme` and `darkTheme` with the same key shape; values are now derived from the new tokens (warm stone / warm charcoal / warm teal). Every consumer (FeedbackProvider, modal, dashboard, dots, replay) inherits the new palette without code changes.

### Compatibility
- No breaking changes. The legacy color key list is enforced by a backcompat test snapshot.
- `StatusBadge` and `StatusDropdown` keep their existing implementation and `{status, statuses}` API; the Command Center introduces a separate internal `WorkflowStatusControl` rather than touching them.

### Added — Phase C (AI-actionable capture)
- New `react-visual-feedback/capture` subpath with `CaptureProvider`, `FeedbackErrorBoundary`, `runViaWorker`, `resolveBuildInfo`.
- Optional `captureConfig` prop on `FeedbackProvider` opting into interaction/route/error capture, fiber snapshot, build-info, feature-flag snapshot. Without it, behaviour is byte-identical to post-B2.
- Lazy Web Worker bundle (`dist/capture/worker.js`) for source-map deminification, code-context extraction, redaction, and ticket assembly. Idle-killed after 30s.
- Optional `resolveSourceMap` hook on `withSecureDefaults` for server-side source-map fallback. Maps stay off the public bundle.
- Three new redaction helpers in `feedbackSecurity`: `redactInteractionTrail`, `redactFiberSnapshot`, `redactBuildInfo`.
- HandoffRow gains an "AI ticket (Markdown)" format. SourceSection inlines the resolved code snippet.
- Jira handler attaches `feedback-ai.md` + `feedback-ai.json`. Sheets appends two truncated columns.
- **Standalone HTML viewer** (`dist/viewer.html`) — open in any browser; reads `localStorage` and renders the Command Center. Zero install, zero config.
- New `source-map-js` runtime dependency, loaded only inside the worker chunk.
- New docs: `docs/zero-effort-integration.md`, `docs/ai-capture-setup.md`, `docs/capture-performance.md`.

### Compatibility
- No breaking changes. Default behaviour (no `captureConfig`, no `dataSource`, no `withSecureDefaults`) is byte-identical to post-B2.

### Added — Phase B2 (Command Center)
- **Command Center workspace.** Wider three-pane shell (Triage list · Evidence Stack · Workflow Panel) replaces the internals of `FeedbackDashboard` while keeping every public export byte-compatible. Card-with-thumbnail triage rows, collapsible Evidence Stack with always-visible section summaries, full Workflow Panel (status, severity, owner, customer, integrations, copy-as handoff, danger zone with inline confirm), Summary Bar with status counts + needs-attention shortcuts as one-click filters.
- New `react-visual-feedback/dashboard` subpath export with `FeedbackCommandCenter`, hooks (`useFeedbackStore`, `useSectionState`, `useKeyboardShortcuts`, `useSelection`, `useCommandCenter`), and pure helpers (`getFilteredItems`, `getStatusCounts`, `getAttentionCounts`).
- Optional `dataSource={{ load, save, remove, subscribe }}` prop for async / server-driven data sources alongside the existing `data` and localStorage modes.
- Keyboard shortcuts: `Esc` close, `/` focus search, `j`/`k` next/prev item.
- 94 additional tests including a Command-Center-level axe-core gate.

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
