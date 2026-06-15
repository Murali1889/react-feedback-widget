# Feedback Command Center — Phase B2: Command Center Workspace

Date: 2026-06-15
Status: Approved direction; written spec pending user review
Repository: `react-visual-feedback`
Parent spec: `docs/superpowers/specs/2026-06-15-feedback-command-center-design.md`
Predecessors: Phase A (foundation), Phase B1 (visual system + primitives).

## Summary

Phase B2 replaces the current 1068-line `FeedbackDashboard.jsx` slide-out with a wider three-pane Command Center workspace built on the design tokens and primitives shipped in B1 and the data helpers shipped in A. Strictly additive: the public `FeedbackDashboard` named export survives as a thin wrapper around the new shell, so existing consumers (`<FeedbackProvider dashboard={true}>`) upgrade with zero code changes.

The redesign organises the captured feedback into one coherent workspace: a left **Triage List** (card-with-thumbnail rows, search, filters), a center **Evidence Stack** (collapsible sections for user signal, visual, logs, source), and a right **Workflow Panel** (status, severity, owner, customer, integrations, copy/handoff, danger zone). A **Summary Bar** along the top exposes status counts and "needs attention" shortcuts as one-click filters.

`StatusBadge` and `StatusDropdown` keep their existing byte-compatible public APIs (the lesson recorded from the B1 attempt). The Workflow Panel uses a new internal `<WorkflowStatusControl>` built on `Chip` + `Select` from B1.

## Decisions

Resolved in brainstorming; not reopened.

1. **Shell shape:** wider slide-out from the right (~`min(1280px, 92vw)`) with a dimmed backdrop. Evolves the current pattern; the host app remains visually present behind.
2. **Triage list density:** card with thumbnail (~84px rows) — title + 2-line preview + chips + 64×44 thumbnail of screenshot/video (type icon when no media).
3. **Evidence Stack layout:** collapsible sections, all expanded by default. **Every collapsed header shows a one-line summary** so users can scan many items without expanding. State persists in `localStorage`.
4. **Workflow Panel scope:** Status, Severity, Owner, Customer value, Integrations, Copy/Handoff (short/full/Jira/Slack), Danger zone (Delete). Owner/Integrations/Delete gated by `isDeveloper`.
5. **Summary Bar:** status counts (New / Open / In Progress / Resolved / Closed) + "needs attention" shortcuts (with replay, has errors, needs owner). Each clickable as a filter.
6. **StatusBadge / StatusDropdown:** untouched. New internal `<WorkflowStatusControl>` on top of `Chip` + `Select`.
7. **Data source:** `data` prop (current behaviour) by default; optional `dataSource={{ load, save, subscribe }}` for async hosts; falls back to existing `react-feedback-data` localStorage when neither is provided and `dashboard={true}`.
8. **Mobile responsive collapse:** deferred to Phase C. B2 is desktop-only.
9. **Capture modal rebuild:** stays in Phase B3.
10. **Feedback dots + Session replay surface alignment:** Phase C.
11. **No new dependencies** in B2 (B1 already brought in RTL + jsdom + axe-core).

## Non-Goals

1. No rewrite of `FeedbackModal.jsx`, `FeedbackDots.jsx`, `SessionReplay.jsx`, `RecordingOverlay.jsx`, `MobileTrigger.jsx`, `UpdatesModal.jsx`, `ErrorToast.jsx`, `CanvasOverlay.jsx`.
2. No changes to `StatusBadge.jsx` or `StatusDropdown.jsx` source. Their public exports (component + four helpers + `StatusBadgeStyled`) stay byte-compatible.
3. No new public required props on `FeedbackProvider`. New props (`dataSource`, `onOwnerChange`, `onSeverityChange`, `onDelete`, `onIntegrationRetry`) are optional.
4. No mobile/touch optimisations. Desktop layout only.
5. No virtual list library — a small windowed renderer suffices for the expected scale (≤ 5000 items per workspace).
6. No keyboard remapping API.
7. No undo/redo for destructive actions; the inline confirm pattern is sufficient.
8. No analytics events emitted; hosts wire their own.

## Architecture

### New file layout (under `src/dashboard/`)

```
src/dashboard/
├── FeedbackCommandCenter.jsx         # shell: overlay + 3-pane CSS grid
├── CommandCenterContext.jsx          # context: items, filters, selection, sectionState, dispatch
├── useFeedbackStore.js               # data source abstraction
├── useSectionState.js                # per-section collapse persistence
├── useKeyboardShortcuts.js           # scoped keyboard handler
├── filtering.js                      # pure: getFilteredItems, getStatusCounts, getAttentionCounts
├── SummaryBar.jsx                    # status counts + needs-attention chips
├── TriageList.jsx                    # left pane container
├── TriageListRow.jsx                 # card-with-thumbnail row
├── EvidenceStack.jsx                 # center pane container + sticky header
├── sections/
│   ├── UserSignalSection.jsx
│   ├── VisualSection.jsx
│   ├── LogsSection.jsx
│   └── SourceSection.jsx
├── WorkflowPanel.jsx                 # right pane container
├── workflow/
│   ├── WorkflowStatusControl.jsx     # status row (Chip+Select on top of StatusBadge data)
│   ├── SeverityRow.jsx
│   ├── OwnerRow.jsx
│   ├── CustomerRow.jsx
│   ├── IntegrationsRow.jsx
│   ├── HandoffRow.jsx
│   └── DangerRow.jsx
├── EmptyState.jsx
├── ErrorState.jsx
├── ConfirmButton.jsx                 # inline second-tap confirm pattern
└── __tests__/...
```

All modules in `src/dashboard/` may import from `src/ui/primitives/`, `src/ui/tokens.js`, `src/ui/ThemeContext.jsx`, `src/lib/`, and `src/theme.js`. They MUST NOT import from `src/integrations/server/**` (server-only) or `src/FeedbackProvider.jsx` (parent).

### Modified files (additive only)

- `src/FeedbackProvider.jsx` — internally swaps `<FeedbackDashboard ... />` to `<FeedbackCommandCenter ... />`. The change is one import + one rename; props passed through verbatim.
- `src/FeedbackDashboard.jsx` — kept as a thin re-export wrapper around `<FeedbackCommandCenter>` so direct imports of `FeedbackDashboard` from `react-visual-feedback` still work. The internal 1068-line implementation is moved to `dashboard/legacy/FeedbackDashboardLegacy.jsx` (still exported from this module under a different name) to preserve `saveFeedbackToLocalStorage` and `DEFAULT_STATUSES`.
- `src/index.js` — adds `FeedbackCommandCenter` to the public export surface alongside existing exports. Existing exports unchanged.
- `src/__tests__/FeedbackFeatures.test.js` — the previously-skipped suite un-skips; assertions adapted to the new shell where necessary.
- `rollup.config.js` — adds a `src/dashboard/index.js` entry → `dist/dashboard/index.{js,esm.js}`.
- `package.json` — adds `./dashboard` to the `exports` block so hosts can import directly: `import { FeedbackCommandCenter } from 'react-visual-feedback/dashboard'`.

### What does NOT change

- `FeedbackModal.jsx`, `FeedbackDots.jsx`, `SessionReplay.jsx`, `RecordingOverlay.jsx`, `MobileTrigger.jsx`, `UpdatesModal.jsx`, `SubmissionQueue.jsx`, `ErrorToast.jsx`, `CanvasOverlay.jsx`, `recorder.js`, `utils.js`, `FeedbackTrigger.jsx`.
- `src/components/StatusBadge.jsx`, `src/components/StatusDropdown.jsx`.
- `src/integrations/**`, `src/lib/**`, `src/ui/**`, `src/theme.js`.
- Public props of `FeedbackProvider`, `IntegrationClient`, server adapter, type declarations.
- The `react-feedback-data` localStorage schema; existing stored data renders without migration.

## Component design

### `FeedbackCommandCenter`

```ts
interface FeedbackCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  data?: FeedbackItem[];                    // controlled mode
  dataSource?: {
    load: () => Promise<FeedbackItem[]>;
    save?: (item: FeedbackItem) => Promise<void>;
    subscribe?: (cb: (items: FeedbackItem[]) => void) => () => void;
  };
  isDeveloper?: boolean;
  isUser?: boolean;
  mode?: 'light' | 'dark';
  // Status workflow (preserves StatusDropdown's contract)
  statuses?: Record<string, StatusDef>;
  customStatuses?: Record<string, StatusDef>;
  acceptableStatuses?: string[];
  onStatusChange?: (id: string, nextStatus: string) => void | Promise<void>;
  // New Phase A fields
  onSeverityChange?: (id: string, nextSeverity: FeedbackSeverity) => void | Promise<void>;
  onOwnerChange?: (id: string, owner: FeedbackOwner | null) => void | Promise<void>;
  onCustomerValueChange?: (id: string, customerValue: string | number | null) => void | Promise<void>;
  onIntegrationRetry?: (id: string, destination: 'jira' | 'sheets') => void | Promise<void>;
  // Destructive
  onDelete?: (id: string) => void | Promise<void>;
  onClearAll?: () => void | Promise<void>;
}
```

Layout: fixed-position overlay anchored to the right edge.
- Backdrop: full-viewport `rgba(0,0,0,0.35)` with 2px backdrop blur. Click closes (`onClose`).
- Panel: `width: min(1280px, 92vw)`, `height: 100vh`, `background: tokens.color.bg`, border-radius `14px 0 0 14px`, left border `1px solid tokens.color.border`, shadow `-20px 0 50px rgba(28,25,23,0.18)`.
- Internal CSS grid:
  ```
  grid-template-rows:    [header] 56px [summary] 60px [body] 1fr [footer] 36px
  grid-template-columns: [list] 320px [evidence] minmax(360px,1fr) [workflow] 320px
  ```
- Header (spans 3 cols): title "Feedback", item count chip, refresh IconButton (when dataSource defined), close IconButton.
- Summary bar (spans 3 cols).
- Body (3 cols): each column independently scrollable. List/workflow columns have 1px hairline borders; evidence column has `tone="canvas"` background.
- Footer (spans 3 cols): storage source indicator on the left ("Local · 18 items" or "Server · synced 2m ago"), keyboard hints on the right (`/` `j/k` `Esc` `?`).
- Focus trap: when open, focus is trapped within the panel until close. First focused element is the search input.
- Esc closes; Tab cycles within the panel.

### `TriageList`

- Top: `<Field>` search with placeholder "Search feedback…". 200ms debounce. `/` focus shortcut.
- Below search: horizontal scrollable filter chip row with the active filters. Each filter chip exposes `onRemove`.
- Body: virtualised list. For ≤ 200 items, render all rows. Above 200, render visible + 10 rows above + 10 below based on a measured row height of 84px. Reuses the scroll container's `scrollTop`.
- Each row: `<TriageListRow>`.
- Empty state: when items.length === 0 → `EmptyState variant="no-data"`. When items.length > 0 but filtered.length === 0 → `EmptyState variant="filtered-empty"` with "Clear filters" CTA.

### `TriageListRow`

- Layout: 84px tall, padding `12px 14px`.
- Left: `Surface`-style 64×44 thumbnail. Render order: video first-frame poster (if `item.video`) → screenshot (`item.screenshot`) → type-icon background (lucide icon for `bug`/`idea`/`praise`/`question`).
- Right: vertical Stack.
  - Title: derived from first 70 chars of `item.feedback`, single-line truncated.
  - Preview: full feedback text, 2-line clamp.
  - Sub row: priority `Chip` (uses `getFeedbackPriority(item).band` from Phase A), type `Chip`, age, user avatar + name.
- Hover: `tokens.color.canvas` background. Selected: `canvas` background + 3px left border in `tokens.color.accent`, padding-left reduced by 3px.
- Keyboard: `Enter` selects when row has focus. From the shell, `j`/`k` move focus and selection between rows.
- `aria-selected` reflects selection.

### `EvidenceStack`

Center pane. `Surface tone="canvas"` background; sections rendered inside a vertical Stack.

Sticky header on top of the scroll container:
- Title: full feedback text, single-line truncated for the header (full text is visible in the User Signal section below).
- Sub line: user name + avatar, time-ago, URL (link to open in new tab — `rel="noopener noreferrer"`).
- Chip row: priority band, type, evidence summary (`getFeedbackEvidenceSummary(item)` formatted to "1 video · 1 error · 14 events").
- Right side: small IconButton row — copy link, open replay (only when video exists).

Below: four collapsible sections in this exact order. Each section component owns its summary string when collapsed.

1. **UserSignalSection**
   - Body: full feedback text in a quote-styled block (left border in `accent`, `canvas` background, 13.5px text).
   - Collapsed summary: char count and (when meaningful) `N lines`.

2. **VisualSection**
   - Body: render `<img>` of screenshot (max-height 360, click → fullscreen lightbox using existing patterns), and/or video player. For replay video, defer to existing `SessionReplay` for full-replay UI via "Open in replay" link. Inline preview is a simple `<video controls>` if blob available; image poster otherwise.
   - Collapsed summary: media inventory (`1 video · 0:14` or `1 screenshot 1920×1080`).
   - When no visual evidence: hide the section header entirely.

3. **LogsSection**
   - Body: a `<Stack>` of monospace rows from `item.eventLogs`. Render first 20 events; errors highlighted (background `successBg` equivalent for warnings/danger). Below: "+N more events · open in replay" CTA. Reuses the Phase A helpers to count errors / failed network requests.
   - Collapsed summary: "N errors · M failed reqs · K events" derived from `getFeedbackEvidenceSummary`.
   - When `eventLogs` is empty: hide the section header entirely.

4. **SourceSection**
   - Body: meta-rows for Component (breadcrumb of `componentStack`), File (monospace + copy IconButton), Selector (monospace + copy IconButton), Viewport (`WxH`), Browser/OS (when available).
   - Collapsed summary: shortened path (e.g., `src/Checkout.jsx:42`) or `selector` if no source file.
   - When neither source nor selector available: hide the section header entirely.

### `WorkflowPanel`

Right pane. `Surface tone="default"`. Vertical Stack of rows; each row is a small Surface + Stack of label + control.

Order:
1. **WorkflowStatusControl** — reads `statuses` map and current `status`; uses `Chip` for the trigger via `Select.renderTrigger` so it mirrors the existing badge appearance but with token-driven palette. Calls `onStatusChange(id, next)`.
2. **SeverityRow** — `Select` with options `low / medium / high / critical`. Calls `onSeverityChange(id, next)`.
3. **OwnerRow** — `Avatar` + name display. Click opens a `Select`-style popover with a text input (no async search in B2). Hidden when `isDeveloper === false`; read-only when `onOwnerChange` is undefined. Calls `onOwnerChange(id, owner)`.
4. **CustomerRow** — `Chip variant="accent"` showing the value. Click opens an inline editor with a Field. Calls `onCustomerValueChange(id, value)`. Hidden when `isDeveloper === false`.
5. **IntegrationsRow** — only renders when at least one integration is enabled on the host (gleaned from `item.integrationState`). For each provider: icon + state chip (`success` / `warning` / `danger` per `integrationState.X.status`) + issue key/link + retry IconButton when state is `error`. Calls `onIntegrationRetry(id, 'jira' | 'sheets')`. Hidden entirely when `isDeveloper === false`.
6. **HandoffRow** — `Button variant="secondary"` labelled "Copy as…". Click opens a `Select` with four options: Short, Full, Jira-ready, Slack-ready. Selecting calls `navigator.clipboard.writeText(createFeedbackHandoffText(item, { format }))` and shows an ephemeral "Copied" pill on the button for 1.2s.
7. **DangerRow** — `Button variant="danger"` Delete using `<ConfirmButton>` for the inline confirm pattern. Calls `onDelete(id)`. Hidden when `isDeveloper === false` or `onDelete` not provided.

Status history strip (read-only): when `item.statusHistory` is a non-empty array, render below DangerRow with the last 5 entries — collapsed surface, expandable to show all.

### `ConfirmButton`

Single-button inline confirm:
- First click: label switches to "Confirm delete" / "Confirm" with a warning tint; 3-second timeout; aria-live region announces.
- Second click within the timeout: fires the supplied `onConfirm`.
- Click outside the button, blur, or timeout expiry: reverts to first state.
- Props: `confirmLabel`, `timeoutMs`, `onConfirm`, plus standard Button props.

### `SummaryBar`

Horizontal flex row, 60px tall, padding `0 18px`. Divider in the middle.

Left segment — status counts:
- One `Chip` per status (New / Open / In Progress / Resolved / Closed) showing the count. Active filter chip has `variant="accent"`; inactive `variant="neutral"`. Click toggles the filter in context.
- When `statuses` prop omitted, falls back to the default status set used by today's dashboard.

Right segment — "needs attention" shortcuts:
- Three `Chip`s with leading icons:
  - "With replay" — count of items where `item.video || (eventLogs has logs)`.
  - "Has errors" — count where `getFeedbackEvidenceSummary(item).errorCount > 0`.
  - "Needs owner" — count where `!item.owner`.
- Click toggles a flag filter in context.

All counts are memoised on `items`. Helpers (`getStatusCounts`, `getAttentionCounts`) live in `filtering.js` and are unit-tested.

### `useFeedbackStore`

```ts
type StoreOptions =
  | { mode: 'prop'; data: FeedbackItem[] }
  | { mode: 'source'; source: DataSource }
  | { mode: 'localStorage' };

function useFeedbackStore(options: StoreOptions): {
  items: FeedbackItem[];
  isLoading: boolean;
  error: Error | null;
  save: (item: FeedbackItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

Mode selection:
- If `data` prop is defined → `prop`. `items` reflects the prop; `save`/`remove` are no-ops that emit an internal callback chain the shell uses to drive `onStatusChange` / `onDelete` etc.
- Else if `dataSource` defined → `source`. On mount calls `load()`. Subscribes via `subscribe` when provided. `save`/`remove` call dataSource methods.
- Else (dashboard mode with no host data) → `localStorage`. Reads `react-feedback-data`; on save merges and writes back; on remove filters and writes back. Catches JSON.parse failures, archives bad data to `react-feedback-data.bak`, returns empty list.

Race-condition guard: each load/subscribe response carries a `tick` counter; stale responses are ignored.

### `useSectionState`

```ts
function useSectionState(): {
  isOpen: (sectionId: string) => boolean;
  toggle: (sectionId: string) => void;
  setOpen: (sectionId: string, open: boolean) => void;
}
```

State persists to `localStorage.react-feedback-dashboard-section-state` as `{ [sectionId]: 'open' | 'closed' }`. Default open for every section. Writes are debounced 200ms.

### `useKeyboardShortcuts`

Scoped to the open shell. Mounts a `keydown` listener on `document`; handlers fire only when:
- The shell is open (caller passes `enabled: isOpen`).
- The active element is not an `<input>`, `<textarea>`, or has `contentEditable`.
- The key matches the shortcut map and no modifier conflicts.

Shortcuts as listed in Section 3 of the brainstorm presentation. Each handler can be overridden via prop; defaults documented inline.

## Data flow + state

```
host props ─┬─▶ data | dataSource
            │
            ▼
       useFeedbackStore (items, isLoading, error)
            │
            ▼
       CommandCenterContext
       { items, isLoading, error,
         filters, selectedId, sectionState,
         dispatch }
            │
            ├──▶ SummaryBar           (counts derive from items + filters)
            ├──▶ TriageList           (subscribes to filters + selectedId)
            ├──▶ EvidenceStack        (reads selected item + sectionState)
            └──▶ WorkflowPanel        (reads selected item)
                       │
                       ▼
                 callbacks bubble up (onStatusChange, onSeverityChange,
                                      onOwnerChange, onDelete, ...)
                       │
                       ▼
                 host updates state → flows back through data prop
```

### Selection rules

- On open with non-empty items: select the newest item that is not in a "resolved" or "closed" state (matching parent spec). When all items are resolved/closed, select the newest item overall.
- When the selected item disappears from filtered items (user changes filters): keep the selection if the item still exists outside the filter; otherwise pick the first filtered item.
- When the selected item disappears from items entirely (deleted, host removed): pick the newest unresolved.

### Filter composition

`getFilteredItems(items, filters)`:
- `search`: matches against `item.feedback`, `item.userName`, `item.userEmail`, `item.url`, `item.elementInfo?.selector`, `item.elementInfo?.sourceFile`. Case-insensitive substring.
- `statuses`: set; item included if its status is in the set OR the set is empty.
- `severities`: set; item included if its severity is in the set OR set empty.
- `flags`: set of `'withMedia' | 'hasErrors' | 'needsOwner'`; item must match ALL active flags (AND).

## Error handling

Implementation matches Section 3 of the brainstorm presentation. Salient points:
- Inline error surfaces beat global error states.
- No `window.confirm`; `<ConfirmButton>` handles destructive confirmation.
- Optimistic UI for status / severity / owner changes; rollback on callback rejection with a Chip-formatted danger message inline next to the control.
- Auto-retry once on `unauthorized` only for `dataSource` reads (mirrors Phase A client auth retry).

## Backward compatibility

- `<FeedbackProvider dashboard={true}>` keeps working.
- `FeedbackDashboard` named export from `react-visual-feedback` keeps working with the same prop shape.
- `saveFeedbackToLocalStorage`, `DEFAULT_STATUSES` named exports from `react-visual-feedback` keep working.
- `StatusBadge`, `StatusDropdown`, `getIconComponent`, `normalizeStatusKey`, `getStatusData`, `StatusBadgeStyled` named exports unchanged.
- The `react-feedback-data` localStorage key shape unchanged.
- Existing test suite (Phase A + B1, 199 tests + 3 skipped) continues to pass.

## Testing

Vitest + jsdom + RTL (already configured in B1). New tests under `src/dashboard/__tests__/`:

1. `useFeedbackStore.test.js` — 12 cases covering all three modes, error states, refresh, race-condition guard.
2. `useSectionState.test.js` — 6 cases for persistence, toggle, default-open, debouncing.
3. `filtering.test.js` — 12 cases for search, status, severity, flag filters; AND/OR composition; status counts; attention counts.
4. `FeedbackCommandCenter.test.jsx` — 10 cases: open/close, Esc, backdrop click, focus trap, default selection, mode swap.
5. `TriageList.test.jsx` — 10 cases: renders rows, selection state, `j`/`k` navigation, search debounce, filter chips toggle, empty states, virtualisation threshold.
6. `EvidenceStack.test.jsx` — 9 cases: four-section render, collapse persistence, summary visible when collapsed, hidden sections when no data, sticky header.
7. `WorkflowPanel.test.jsx` — 14 cases: status change callback, severity, owner gated by `isDeveloper`, owner read-only when no callback, integrations row visibility, handoff copy, danger confirm pattern.
8. `SummaryBar.test.jsx` — 8 cases: counts derive correctly, click toggles filter, multiple filters, "needs attention" counts use Phase A helpers.
9. `ConfirmButton.test.jsx` — 5 cases: first-click label switch, second-click confirms, timeout reverts, blur reverts, aria-live announcement.
10. `command-center.a11y.test.jsx` — axe-core gate on default render.
11. `backward-compat.test.jsx` — `<FeedbackDashboard>` import path renders without prop warnings; `saveFeedbackToLocalStorage` and `DEFAULT_STATUSES` exports still work; existing localStorage data renders.

Coverage targets: `src/dashboard/**` ≥ 95% lines, 90% branches. Updates `vitest.config.js` thresholds.

## Manual verification

After implementation:

1. `npm run build` produces `dist/dashboard/index.{js,esm.js}`.
2. `cd example-nextjs && npm install && PORT=3005 npm run dev`.
3. Open `http://localhost:3005`, submit 3 feedback items (Alt+A), press Alt+Q.
4. Verify:
   1. Wider slide-out, ~88% viewport width.
   2. Card-with-thumbnail rows in the triage list.
   3. Selecting an item populates Evidence Stack with collapsible sections; collapsed headers show summaries.
   4. Workflow Panel shows status/severity/integrations.
   5. Summary bar counts match; clicking a chip filters; clicking again unfilters.
   6. Esc closes; backdrop click closes.
   7. `/`, `j`, `k`, `f`, `o`, `e`, `c`, `?` keyboard shortcuts behave per the matrix.
   8. `mode="dark"` produces warm-charcoal palette.
   9. Existing `<FeedbackDashboard>` import + `<FeedbackProvider dashboard={true}>` consumers see no required code change.

## Scope for First Implementation Plan

Suggested ordering (writing-plans will refine):

1. New branch `phase-b2-command-center` (created already).
2. `filtering.js` + tests (pure helpers).
3. `useFeedbackStore.js` + tests.
4. `useSectionState.js` + tests.
5. `useKeyboardShortcuts.js` + tests.
6. `CommandCenterContext.jsx`.
7. `ConfirmButton.jsx` + tests.
8. `EmptyState.jsx`, `ErrorState.jsx`.
9. `TriageListRow.jsx` + tests.
10. `TriageList.jsx` + tests.
11. `sections/UserSignalSection.jsx`, `VisualSection.jsx`, `LogsSection.jsx`, `SourceSection.jsx` + tests.
12. `EvidenceStack.jsx` + tests.
13. `workflow/WorkflowStatusControl.jsx`, `SeverityRow.jsx`, `OwnerRow.jsx`, `CustomerRow.jsx`, `IntegrationsRow.jsx`, `HandoffRow.jsx`, `DangerRow.jsx` + tests.
14. `WorkflowPanel.jsx` + tests.
15. `SummaryBar.jsx` + tests.
16. `FeedbackCommandCenter.jsx` + tests.
17. Wire `FeedbackDashboard.jsx` as a backward-compat wrapper.
18. Update `FeedbackProvider.jsx` to mount `FeedbackCommandCenter`.
19. Update `src/index.js` exports; `rollup.config.js` for `./dashboard` bundle; `package.json` exports.
20. Un-skip + adapt the legacy jsdom suite; `backward-compat.test.jsx`; `command-center.a11y.test.jsx`.
21. README + CHANGELOG; final build + manual verify checklist.

## Self-Review Notes

- No placeholders.
- Phase B2 strictly additive; no breaking change.
- Each new file has one clear responsibility; the largest (FeedbackCommandCenter.jsx) is the shell + layout, not the logic — context owns state.
- Backward compat guarantee documented and test-gated (`backward-compat.test.jsx`).
- StatusBadge / StatusDropdown lesson from B1 explicitly encoded: this spec doesn't touch them.
- All decisions from brainstorming are recorded as Decision items.
- A11y is built into every interactive primitive via B1's `axe-core` gate; this spec adds a Command-Center-level axe gate.
- Keyboard shortcuts respect typing context (`input`/`textarea`/`contentEditable` guard).
