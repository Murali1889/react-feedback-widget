# Feedback Command Center — Phase C: AI-Actionable Capture

Date: 2026-06-15
Status: Approved direction; written spec pending user review
Repository: `react-visual-feedback`
Parent spec: `docs/superpowers/specs/2026-06-15-feedback-command-center-design.md`
Predecessors: Phase A (security + data), Phase B1 (visual system), Phase B2 (Command Center).

## Summary

Phase C turns every captured feedback into a ticket an AI agent can act on directly: the source file and line number where the bug originates, ±10 lines of the actual source code, the React component state at click time, an auto-generated reproduction recipe with the last interactions and errors, build metadata pinning the report to a known artifact, and an active feature-flag snapshot. The ticket is emitted as both human-readable Markdown and structured JSON. It is consumable from the Workflow Panel's "Copy as…" handoff, attached to Jira issues as a file, and appended to Sheets rows as a URL.

The hard constraint, captured from the user and stored as durable memory: **the user-facing capture path feels instantaneous**. Every byte of enrichment work — source-map parsing, fiber serialization, ticket assembly, redaction — runs off the main thread (Web Worker) or off the device (server-side fallback). The modal opens with whatever's available; enrichment streams in concurrently; submit returns immediately. The host app never feels slower because the widget is present.

Phase C is strictly additive. With `captureConfig` omitted the widget behaves exactly as it does after Phase B2.

## Decisions

Resolved in brainstorming; not reopened.

1. **Scope:** all of C1–C8 in one phase. C1 source-map deminify, C2 code context, C3 React state, C4 interaction trail + repro, C5 error capture, C6 build metadata, C7 feature flags, C8 ticket export. (The "old Phase B3 modal rebuild" remains a separate, smaller follow-up.)
2. **Source-map deminification: hybrid.** Worker tries first (parses `.map` via `source-map-js`, caches in IndexedDB). Server `withSecureDefaults` falls back when the worker cannot fetch (404 / CORS / privacy). Maps never need to be public for the system to work.
3. **Ticket format: both.** Markdown AND structured JSON, generated from the same source-of-truth record in the worker.
4. **Interaction-trail privacy: full values with three layers of defence.** Layer 1: HTML-hint auto-drop (`type=password`, `autocomplete=cc-*`, `inputmode=numeric` + sensitive name regex, `data-feedback-redact`). Layer 2: host-configurable `sensitiveSelectors`. Layer 3: Phase A regex redaction pass at worker AND server.
5. **Error capture: window-level always, ErrorBoundary HOC optional.** `window.onerror` + `unhandledrejection` are mounted automatically (zero host change). `<FeedbackErrorBoundary>` ships as an opt-in HOC for richer component-stack capture.
6. **Build metadata: three-tier resolver.** Explicit prop → `window.__feedbackBuildInfo` → `<meta name="feedback-build">` → minimal fallback (`{ environment }` only).
7. **Feature flags: pluggable adapter.** Host supplies `captureConfig.flagsSnapshot: () => object`, called once at modal open. Generic; no library awareness of LaunchDarkly / GrowthBook / etc.
8. **Execution split:** main thread does only event capture and the cheap fiber walk; Web Worker owns source-map parsing, code-context extraction, fiber serialization, redaction, ticket assembly; server `withSecureDefaults` owns the source-map fallback + a final redaction pass.
9. **Lazy worker spawn:** worker is created on first capture event (not at provider mount), idle-killed after 30 s of no work.
10. **Memory bounds, ring-buffered:** interaction 128 events, errors 20, route history 20, fiber serialization depth 6 / 64 keys / 2KB per string, code snippet 30 lines × 200 chars.
11. **Performance gate:** every new main-thread observer must measure < 1ms p99 per event. Main bundle size delta < 12KB gzipped. Lazy worker chunk < 35KB gzipped.
12. **No version bump alone.** Lands as a minor on 2.3.x; a 2.4.0 release goes out when the capture-modal refresh ships too.

## Non-Goals

1. No rewrite of `recorder.js`. New observers mount alongside it; the existing event stream keeps its shape.
2. No rewrite of `FeedbackModal`, `FeedbackProvider`, `FeedbackDashboard`, `FeedbackCommandCenter`, Workflow Panel, `IntegrationClient`, server handlers. All adopt new fields, none change signature.
3. No new icon library, theme, primitive, or UI surface beyond the HandoffRow's new "AI ticket" format.
4. No on-device LLM. The widget produces tickets; it doesn't summarize, classify, or answer with them.
5. No replacement of Phase A redaction. Extended via three new helpers, not rewritten.
6. No `<meta name="feedback-build">` injection helper. Hosts emit their own from their build pipeline; examples cover Vite, Next.js, CRA.
7. No automatic adapter for any specific feature-flag SDK. Hosts wire one with three lines of code.
8. No mobile-specific optimisations beyond what works on the existing capture pipeline.
9. No mandatory `<FeedbackErrorBoundary>` wrap. It's an opt-in HOC; everything works without it.
10. No PR for the existing Workflow Panel beyond adding a fifth format to HandoffRow.

## Architecture

### Execution contexts

| Context | Owns |
|---|---|
| **Main thread** (host React app) | Event capture (passive listeners), fiber walk on click target, modal lifecycle, ring buffer reads, IntegrationClient submission. |
| **Web Worker** (`feedback-capture-worker.js`, lazy-loaded) | Source-map parsing + cache, code-context extraction, fiber serializer, full redaction pass, ticket assembly (Markdown + JSON). |
| **Server adapter** (`withSecureDefaults`) | Optional source-map fallback (when worker couldn't resolve), final redaction pass (Phase A defense in depth), enrichment of stored record. |

### New library modules

```
src/capture/
├── index.js                          # barrel for ./capture subpath
├── CaptureProvider.jsx               # context + observer mount + worker lifecycle
├── CaptureContext.jsx                # context shape (buffers, snapshot APIs)
├── ringBuffer.js                     # bounded buffer
├── buildInfo.js                      # three-tier resolver
├── FeedbackErrorBoundary.jsx         # optional HOC
├── observers/
│   ├── interaction.js                # click/pointer/focus/input/key/scroll/submit
│   ├── route.js                      # pushState/replaceState/popstate/hashchange
│   ├── error.js                      # window.onerror + unhandledrejection
│   └── flags.js                      # one-shot host adapter call
├── snapshot/
│   ├── fiberWalk.js                  # main-thread cheap walk; produces serializable tree
│   └── selectorPath.js               # reuse + extend existing utility
├── worker/
│   ├── feedback-capture-worker.js    # entry (postMessage protocol)
│   ├── sourcemaps.js                 # source-map-js wrapper + IndexedDB cache
│   ├── codeContext.js                # snippet extraction
│   ├── fiberSerializer.js            # depth-capped, cycle-safe
│   ├── ticketAssembler.js            # markdown + json
│   └── redactorAdapter.js            # imports Phase A redactor (isomorphic)
└── publicTypes.d.ts                  # exported types
```

### Server additions

- `src/integrations/server/sourcemap-resolver.js` — new optional hook on `withSecureDefaults({ resolveSourceMap })`. Wrapper inspects every `needsServerResolution: true` entry in the submitted record, calls `resolveSourceMap({ bundleHash, scriptUrl })`, walks via `source-map-js`, fills in the resolved positions and code context, then runs the redactor again.
- `src/integrations/server/codeContextLoader.js` — companion: when `resolveSourceFile(path)` callback is provided, reads from filesystem instead of `sourcesContent`. Path must be host-controlled (no client-supplied paths trusted).

### Modified library files (additive)

- `src/FeedbackProvider.jsx` — gains a `captureConfig` prop; mounts `CaptureProvider` when set.
- `src/lib/feedbackSecurity.js` — three new exports: `redactInteractionTrail`, `redactFiberSnapshot`, `redactBuildInfo`. Reuse existing redaction primitives.
- `src/dashboard/workflow/HandoffRow.jsx` — fifth format option: "AI ticket" (Markdown). Selecting it copies the worker-built Markdown for the current item.
- `src/dashboard/sections/SourceSection.jsx` — if `item.aiTicket?.json.where` is populated, render the code snippet inline (using the existing `Mono` styled-component).
- `src/integrations/server/withSecureDefaults.js` — receives the new `resolveSourceMap` hook; runs it after redaction step 6, before forwarding step 7.
- `src/integrations/jira.js` — when ticket present, attaches `feedback-ai.md` and `feedback-ai.json` alongside screenshot and video.
- `src/integrations/sheets.js` — appends two columns: `aiTicketMarkdown`, `aiTicketJson` (URLs to attached files or inline truncated payload).
- `src/index.js` — exports `<FeedbackErrorBoundary>`, capture types.
- `rollup.config.js` — adds `src/capture/index.js` → `dist/capture/index.{js,esm.js}` and `src/capture/worker/feedback-capture-worker.js` → `dist/capture/worker.js` (self-contained worker bundle).
- `package.json` — `./capture` subpath export; adds `source-map-js` runtime dependency (~25KB, lazy-loaded only inside the worker).

### What does NOT change

- `recorder.js` — preserved unchanged.
- `FeedbackModal.jsx`, `FeedbackDashboard.jsx`, `FeedbackCommandCenter.jsx`, `FeedbackDots.jsx`, `SessionReplay.jsx`, `IntegrationClient`, `StatusBadge.jsx`, `StatusDropdown.jsx`, `src/ui/**`, every test fixture from Phases A / B1 / B2.
- `react-feedback-data` localStorage schema (new field `aiTicket` is optional).
- The eventLogs event shape (new entries `interaction`, `error`, `route` ride the existing array).
- All existing tests (296 currently) continue to pass.

## Capture systems in detail

### C1 — Source-map deminification (hybrid)

**Worker path** (`worker/sourcemaps.js`):
1. Worker receives `{ stack, scriptUrls }` from main thread.
2. For each script URL, fetches `script.map` URL extracted from the `//# sourceMappingURL=` comment or via `captureConfig.sourceMapUrl(scriptUrl)` host callback.
3. Parses once with `source-map-js`, caches the parsed map in IndexedDB keyed by `bundleHash` (SHA-256 of the script's URL + last-modified). Cache eviction: keep last 3 builds.
4. Walks each `{ file, line, column }` to `{ source, line, column, name }`.
5. On any failure (fetch error, parse error, missing CORS), returns the raw positions to the main thread with `needsServerResolution: true`.

**Server fallback** (`integrations/server/sourcemap-resolver.js`):
```ts
interface ResolveSourceMapHook {
  (req: { bundleHash: string; scriptUrl: string }): Promise<string | null>;
}
withSecureDefaults({ resolveSourceMap?: ResolveSourceMapHook })
```
- Runs only on entries marked `needsServerResolution: true`.
- Host reads from S3 / filesystem / secret manager and returns the raw map JSON.
- Wrapper parses with the same `source-map-js` (server-side import), walks, fills in the resolved positions plus `sourcesContent` for the code-context step.
- Returns `{ ok: true, resolved: { source, line, column, name, snippet } }` per entry.

### C2 — Code-context bundle

In the worker once a map is parsed:
- For each resolved `{ source, line }`, read `sourcesContent[sourceIndex]`.
- Extract `[line - 10, line + 10]` (clamped to file bounds).
- Build a tagged snippet: each line prefixed with `   N` (right-aligned 4-char), the resolved line prefixed with `>>> N` and highlighted with `<-- error originates here` in Markdown form.
- Hard caps: 30 lines, 200 chars per line; truncation marker `…` appended when exceeded.
- Server fallback variant: when `sourcesContent` is empty (older builds), and `resolveSourceFile(path)` callback is supplied, reads from filesystem with a path safelist enforced by `withSecureDefaults`. No client-supplied paths trusted.

### C3 — React state snapshot

`src/capture/snapshot/fiberWalk.js` (main thread, called from existing `getComponentSourceInfo` site in `utils.js`):
```js
function snapshotFiberTree(rootFiber, { depth = 6, maxKeys = 64, maxStr = 2000 } = {}) {
  // Walk fiber.return up to `depth`. For each node capture:
  //   { name, props: serializableSubset(memoizedProps), state: serializableSubset(memoizedState) }
  // serializableSubset:
  //   - functions → "[Function: name]"
  //   - DOM nodes → "[DOMNode: tagName#id]"
  //   - React elements → "[ReactElement: typeName]"
  //   - cycles → "[Circular]"
  //   - strings truncated at maxStr, with "…(N more)" suffix
  //   - arrays/objects truncated at maxKeys, with "…(N more)" key
}
```
- Main-thread cost budget: < 2ms p99 for 6-deep / 64-key trees. Measured via `performance.mark`/`measure` during dev.
- Worker takes the serialized tree and runs the Phase A redactor (`redactObjectByKeys`) over it. Existing key list (password / token / accessToken / etc.) catches the common cases; host extends via `captureConfig.redactBodyKeys`.

### C4 — Interaction trail

`src/capture/observers/interaction.js`:
- Listeners on `document` in **capture phase** with `{ passive: true, capture: true }`:
  - `pointerdown`, `click`, `submit`, `focusin`, `focusout`, `input` (with `composedPath` for shadow DOM), `change`, `keydown` (filtered), `scroll` (throttled 200ms).
- Each event becomes `{ type, target: { selector, label, role, name }, value?, ts }`.
- Selector path via existing `utils.js` selector builder + new "label" derivation (uses `aria-label`, associated `<label>`, button text, image alt).
- Ring buffer of 128 events (`ringBuffer.js`). Configurable via `captureConfig.interactionBufferSize`.

**Sensitive-field auto-drop (Layer 1):**
- Before storing any input value, check the target element:
  - `tagName === 'INPUT' && type === 'password'` → drop value, mark `redacted: 'password-field'`.
  - `autocomplete` starts with `cc-` → drop value.
  - `inputmode === 'numeric'` AND `name` matches `/ssn|cvv|cvc|card|secret|otp/i` → drop value.
  - Any ancestor with `data-feedback-redact="true"` → drop value.
- Worker receives values that survived Layer 1, runs Phase A inline-secret regex pass (Layer 3) on each.
- Host-side `captureConfig.sensitiveSelectors: string[]` (Layer 2) is consulted at event time: matching elements never have values stored.

### C4b — Repro recipe

`worker/ticketAssembler.js` builds the Markdown repro list:
1. Reads the interaction ring buffer + the error buffer in chronological order.
2. Coalesces consecutive `input`/`change` on the same target into one "Typed `…` into <X>" line.
3. Resolves selectors to human labels using the captured `label` field.
4. Inserts errors inline at their timestamp position.
5. Caps at 30 steps; older steps elided with `…`.
6. Mirror structure available as `repro: { steps: [...], format: 'v1' }` in the JSON twin.

### C5 — Error and rejection capture

`src/capture/observers/error.js`:
- `window.addEventListener('error', handler, true)` and `window.addEventListener('unhandledrejection', handler, true)`. Both use capture-phase + `{ passive: true }` so they don't interfere with host handlers.
- Each error becomes `{ type: 'error', message, name, stack, source, fileName?, lineNumber?, columnNumber?, ts }`.
- Ring buffer of 20 errors.

`src/capture/FeedbackErrorBoundary.jsx`:
- React class component. `componentDidCatch(error, info)` pushes `{ type: 'error', message, name, stack, componentStack: info.componentStack, ts }` into the same buffer.
- Optional fallback UI via `fallback` prop; defaults to passing children through (no recovery — host decides).

### C6 — Build metadata

`src/capture/buildInfo.js` runs once at `CaptureProvider` mount:
```ts
interface BuildInfo {
  commit?: string;
  branch?: string;
  tag?: string;
  builtAt?: string;        // ISO
  packageVersion?: string;
  environment?: string;    // 'development' | 'production' | host-defined
  bundleHash?: string;     // joins to source-map cache
}
```
Resolution order:
1. `captureConfig.buildInfo` prop.
2. `globalThis.__feedbackBuildInfo` if it's an object.
3. `<meta name="feedback-build" content="commit=abc&branch=main&…">` parsed as form-encoded.
4. `{ environment: process.env.NODE_ENV || 'production' }`.

### C7 — Feature flag snapshot

`src/capture/observers/flags.js`:
```js
captureConfig.flagsSnapshot: () => Record<string, JsonValue>
```
- Called once when the modal opens (not at every event).
- Result attached to the ticket under `flags`.
- Phase A redactor runs on the snapshot (in case a flag value contains a secret).
- Examples in README cover LaunchDarkly, GrowthBook, Statsig wiring.

### C8 — Ticket assembly + export

`worker/ticketAssembler.js`:
```ts
interface AITicket {
  markdown: string;
  json: {
    summary: { type, severity, userName, userEmail, page, timestamp, feedback };
    where:   { file, line, column, name, component, selector, codeSnippet };
    state:   Record<string, { props: object; state: object }>;
    repro:   { steps: Array<{ kind, target, value?, ts }>; };
    logs:    Array<{ type, level?, message, ts }>;
    environment: { build: BuildInfo; viewport; browser; flags };
    evidence:    { hasScreenshot, hasVideo, eventCount };
  };
  generatedAt: string;
  schemaVersion: '1.0';
}
```
- Both formats generated from one record; Markdown is a deterministic serializer of the JSON.
- Stored on the feedback item as `item.aiTicket`. Legacy items render fine without it.
- Exposed in:
  - **HandoffRow** (Workflow Panel): fifth format "AI ticket" copies Markdown.
  - **EvidenceStack SourceSection**: renders the code snippet inline.
  - **Jira handler**: attaches `feedback-ai.md` + `feedback-ai.json`.
  - **Sheets handler**: appends `aiTicketMarkdown` + `aiTicketJson` columns (truncated for cells; full payload in attached file URL).

## Backward compatibility

- `<FeedbackProvider>` with no `captureConfig` → byte-identical behaviour to post-B2. No worker spawn, no new observers, no eventLogs entries beyond today's set. The dashboard renders without any `aiTicket` field.
- `IntegrationClient` accepts unchanged input. If `item.aiTicket` is absent, the Jira/Sheets handlers behave as today.
- `withSecureDefaults` without `resolveSourceMap` hook → unchanged behaviour; submissions with `needsServerResolution: true` entries are forwarded as-is with the flag stripped (so Jira doesn't see internal markers).
- Existing host examples (`example-nextjs`, `example-express`) continue to work without changes. New examples for `captureConfig` are additive.
- `recorder.js` exported singleton — unchanged behaviour, unchanged API.

## Redaction extensions

Three new helpers added to `src/lib/feedbackSecurity.js`, reusing existing primitives:

- `redactInteractionTrail(trail, config)` — applies Phase A regex pass on each event's `value`, marks redactions; HTML-hint and host-selector drops happen at observer time, not in this helper.
- `redactFiberSnapshot(tree, config)` — recursively applies `redactObjectByKeys` to every node's `props` and `state`.
- `redactBuildInfo(buildInfo, config)` — strips any field matching token / apiKey / secret regex.

All three are pure, isomorphic (worker + Node), and tested. The Phase A defense-in-depth model is preserved: redaction runs in the worker AND again at `withSecureDefaults`.

## Error handling and states

| Failure | Surface | Recovery |
|---|---|---|
| Worker spawn fails (CSP / no worker support) | Fallback to main-thread synchronous assembly with a single setTimeout to yield. Mark ticket `assembledOn: 'main'`. | Worker disabled for the session; observers keep capturing. |
| Source-map fetch 404 / CORS | Mark entries `needsServerResolution: true`. | Server hook resolves; if unavailable, raw stack shown verbatim. |
| Source-map parse error | Same as fetch failure. | Same. |
| `resolveSourceMap` host hook throws | Phase A error normalizer; server logs full detail; ticket has raw stack. | None — opaque integration_failed not raised; ticket still ships. |
| Fiber walk throws (rare; host has unusual React internals) | Skip state section; ticket includes `state: { unavailable: true }`. | None. |
| Interaction observer error | Caught with try/catch around handler body; observer keeps running. | Logged once per session. |
| IndexedDB cache write fails | In-memory cache only for the session. | Cache miss on next session. |
| Worker idle-killed mid-submit | Re-spawned automatically; submit retried once. | None — invisible. |
| `flagsSnapshot()` throws | Ticket has `flags: { error: 'snapshot_failed' }`. | None. |

No `window.confirm`, no blocking error UI, no host-app interruption. Failures degrade the ticket gracefully; the submission always succeeds.

## Performance gates

Documented in `docs/capture-performance.md` (new); enforced via test budgets in `src/capture/__tests__/perf.test.js`.

- **Main-thread budget per observer event:** < 1ms p99.
- **Modal open path** (snapshot fiber tree + read buffers + spawn worker): < 8ms p99.
- **Main bundle size delta:** < 12KB gzipped (excluding the worker chunk, which is loaded lazily after first capture).
- **Worker chunk size:** < 35KB gzipped including `source-map-js`.
- **Memory ceiling:** every buffer is ring-bounded; default config peaks at ~150KB resident.
- **Bundle size CI:** `npm run build:check-size` (new script) reads `dist/` sizes and fails if budgets are exceeded.

## Testing

Vitest + jsdom; web-worker tests use the existing `worker_threads` adapter pattern. Adds two devDependencies (`source-map-js` is runtime; `@vitest/web-worker` is dev) and an `idb-keyval-mock` for IndexedDB cache tests.

### New test files

- `src/capture/__tests__/interaction.test.js` — 12 cases (capture phase, sensitive-field drop, host-selector drop, value redaction, ring buffer eviction, scroll throttle, key filter, label derivation, no main-thread regression).
- `src/capture/__tests__/route.test.js` — 4 cases (pushState patch, replaceState patch, popstate, hashchange).
- `src/capture/__tests__/error.test.js` — 8 cases (window.onerror chain, unhandledrejection, FeedbackErrorBoundary catches React errors, buffer FIFO, source/file fields).
- `src/capture/__tests__/buildInfo.test.js` — 5 cases (resolver priority, meta parse, global fallback, malformed input, environment default).
- `src/capture/__tests__/flags.test.js` — 4 cases (one-shot call, error path, redaction, async resolver).
- `src/capture/snapshot/__tests__/fiberWalk.test.js` — 9 cases (depth cap, cycle detection, function/DOM/element placeholders, string truncation, key truncation, performance budget assertion).
- `src/capture/worker/__tests__/sourcemaps.test.js` — 7 cases (parse, walk, IndexedDB cache hit/miss, fetch failure → needsServerResolution, CORS failure).
- `src/capture/worker/__tests__/codeContext.test.js` — 6 cases (snippet extraction, edge bounds, line/char caps, missing sourcesContent, truncation marker).
- `src/capture/worker/__tests__/fiberSerializer.test.js` — 8 cases (depth, cycles, placeholder kinds, redaction integration).
- `src/capture/worker/__tests__/ticketAssembler.test.js` — 12 cases (Markdown snapshot, JSON schema, all sections present, missing-field handling, redaction visible in both formats, repro coalescing, error inline placement).
- `src/integrations/server/__tests__/sourcemap-resolver.test.js` — 6 cases (resolution, redaction reruns, missing hook → strip flag and forward, host hook throw → opaque error, path safelist enforced for filesystem read).
- `src/lib/__tests__/redactionExtensions.test.js` — 8 cases (interaction trail, fiber snapshot, build info; reuses Phase A redactor primitives).
- `src/capture/__tests__/perf.test.js` — main-thread budget assertions per observer using `performance.now()` baselines, gated to fail CI when exceeded.
- `src/capture/__tests__/backward-compat.test.jsx` — 4 cases (provider without captureConfig produces byte-identical state to Phase B2, no worker spawn, no new eventLogs entries, no `aiTicket` field on stored items).
- `src/capture/__tests__/security-hardening.test.js` — 12 adversarial cases (forged interaction trail injecting sensitive values, prototype pollution on fiber serialization, server-side path traversal in `resolveSourceFile`, CSP no-worker fallback, source-map containing malicious sourcesContent, flag value containing token, build info containing secret).

### Coverage targets

- `src/capture/**`: ≥ 92% line, 88% branch.
- `src/integrations/server/sourcemap-resolver.js`: ≥ 90% line, 85% branch.
- Phase A and B test suites must keep their existing thresholds.

### Verification commands

- `npm test` — full suite (Phase A + B1 + B2 + C + adversarial security).
- `npm run build` — produces `dist/capture/` and `dist/capture/worker.js`.
- `npm run build:check-size` (new) — reads built sizes and fails if budgets exceeded.

## Documentation

- `README.md` — gains an "AI-actionable capture" section linking to a new `docs/ai-capture-setup.md` and an example showing minimal `captureConfig`.
- `docs/ai-capture-setup.md` (new) — host setup for build metadata injection (Vite, Next.js, CRA), feature-flag adapter wiring (LaunchDarkly / GrowthBook / Statsig examples), server source-map hook setup (S3, filesystem), and the redaction policy reference.
- `docs/capture-performance.md` (new) — the documented budgets + how to run the perf tests locally.
- `CHANGELOG.md` — new Unreleased entries under the existing block.

## Scope for first implementation plan

Suggested ordering (writing-plans will refine):

1. New branch (created).
2. `ringBuffer.js` + tests.
3. `buildInfo.js` + tests.
4. `snapshot/fiberWalk.js` + tests (main-thread budget).
5. `observers/route.js` + tests.
6. `observers/error.js` + `FeedbackErrorBoundary.jsx` + tests.
7. `observers/interaction.js` + tests (HTML-hint drop, label derivation).
8. `observers/flags.js` + tests.
9. `CaptureContext.jsx` + `CaptureProvider.jsx` (mount + worker lifecycle).
10. `redactionExtensions.test.js` driving the three new helpers in `feedbackSecurity.js`.
11. `worker/sourcemaps.js` + tests (source-map-js wrapper, IndexedDB cache).
12. `worker/codeContext.js` + tests.
13. `worker/fiberSerializer.js` + tests.
14. `worker/ticketAssembler.js` + tests.
15. `worker/feedback-capture-worker.js` entry + postMessage protocol + tests.
16. Server: `sourcemap-resolver.js` + integration with `withSecureDefaults` + tests.
17. Wire `CaptureProvider` into `FeedbackProvider`; opt-in via `captureConfig` prop.
18. Adapter changes: HandoffRow new format; SourceSection inline snippet; Jira attach; Sheets columns.
19. Adversarial security tests + perf tests + backward-compat suite.
20. Bundle / package.json / rollup / size-check script.
21. README + docs/ai-capture-setup.md + docs/capture-performance.md + CHANGELOG + final manual verify.

## Self-Review Notes

- No placeholders.
- Phase C is strictly additive; the post-B2 surface continues to work without `captureConfig`.
- The execution-context split (main thread / worker / server) is documented at the architecture level and reasserted in every subsystem.
- All decisions from brainstorming are recorded as Decision items.
- Privacy posture (interaction trail) has three independent layers and is restated in the redaction section.
- Failure modes degrade gracefully; the ticket is always produced (with whatever signal is available) and the submission always succeeds.
- Performance budgets are documented AND enforceable via test scripts.
- StatusBadge / StatusDropdown remain byte-compatible (the lesson from B1).
