# Feedback Command Center — Phase B2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase B2 Command Center: a wider three-pane workspace (Triage List · Evidence Stack · Workflow Panel) that replaces the internals of the 1068-line `FeedbackDashboard.jsx`. The existing `<FeedbackProvider dashboard={true}>` and `FeedbackDashboard` named export keep working without host code changes.

**Architecture:** New `src/dashboard/` tree splits responsibilities into ~30 small files. A single `CommandCenterContext` owns selection + filters + section state; pure helpers in `filtering.js` derive counts and filtered views; `useFeedbackStore` abstracts the data source (controlled `data`, async `dataSource`, or default `localStorage`). UI builds entirely on B1 primitives (`Button`, `IconButton`, `Field`, `Select`, `Chip`, `Surface`, `Stack`, `Tooltip`, `Spinner`, `Avatar`). `StatusBadge` and `StatusDropdown` are NOT touched — a new internal `<WorkflowStatusControl>` provides the new control without modifying them.

**Tech Stack:** React 18, styled-components, Vitest + jsdom + @testing-library/react + jest-axe (all configured in B1). No new runtime or test dependencies.

**Spec:** `docs/superpowers/specs/2026-06-15-feedback-phase-b2-command-center-design.md`

---

## File Map

### New files (under `src/dashboard/`)

```
src/dashboard/
├── index.js                          # barrel export for ./dashboard subpath
├── FeedbackCommandCenter.jsx
├── CommandCenterContext.jsx
├── useFeedbackStore.js
├── useSectionState.js
├── useKeyboardShortcuts.js
├── filtering.js
├── ConfirmButton.jsx
├── EmptyState.jsx
├── ErrorState.jsx
├── SummaryBar.jsx
├── TriageList.jsx
├── TriageListRow.jsx
├── EvidenceStack.jsx
├── sections/UserSignalSection.jsx
├── sections/VisualSection.jsx
├── sections/LogsSection.jsx
├── sections/SourceSection.jsx
├── WorkflowPanel.jsx
├── workflow/WorkflowStatusControl.jsx
├── workflow/SeverityRow.jsx
├── workflow/OwnerRow.jsx
├── workflow/CustomerRow.jsx
├── workflow/IntegrationsRow.jsx
├── workflow/HandoffRow.jsx
├── workflow/DangerRow.jsx
└── __tests__/                        # tests for each above
```

### Modified files

- `src/FeedbackProvider.jsx` — swap `FeedbackDashboard` mount for `FeedbackCommandCenter` (one import + one tag rename, props pass through verbatim).
- `src/FeedbackDashboard.jsx` — keep the named export, re-export `saveFeedbackToLocalStorage` and `DEFAULT_STATUSES` unchanged; the legacy 1068-line component body is replaced by a thin wrapper around `<FeedbackCommandCenter>`.
- `src/index.js` — add `FeedbackCommandCenter` to the public surface; existing exports preserved.
- `src/__tests__/FeedbackFeatures.test.js` — un-skip suites; replace `FeedbackModal` mock paths if needed.
- `rollup.config.js` — add `src/dashboard/index.js` → `dist/dashboard/index.{js,esm.js}`.
- `package.json` — add `./dashboard` to the `exports` block. Coverage threshold for `src/dashboard/**` added to `vitest.config.js`.
- `README.md`, `CHANGELOG.md`.

### Conventions

- Tests run in jsdom (vitest's `environmentMatchGlobs` already routes `src/ui/**` and `src/__tests__/**` to jsdom; **add `src/dashboard/**` to the same list** in Task 1).
- Every component uses `React.forwardRef` when ref-forwarding makes sense (rows, surfaces); other components don't.
- All imports from `react-visual-feedback/ui` use the **internal** path `../../ui/primitives/index.js` inside this branch's source (the published package's `react-visual-feedback/ui` is for consumers).
- All imports from Phase A helpers use the internal path `../lib/...`.
- New props (`onSeverityChange`, `onOwnerChange`, `onCustomerValueChange`, `onIntegrationRetry`, `onDelete`, `dataSource`) are forwarded by `FeedbackProvider` from its own props, unchanged.
- Test files use `.test.jsx` for components, `.test.js` for pure helpers/hooks.
- Each task ends with one commit using the Phase A/B1 style. End every message with the Co-Authored-By trailer.

---

## Task 1 — Vitest scope expansion + `vitest.config.js` thresholds

**Files:** `vitest.config.js`

- [ ] **Step 1.1: Update `vitest.config.js`**

Replace contents:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
      ['src/dashboard/**', 'jsdom'],
      ['src/__tests__/**', 'jsdom'],
    ],
    setupFiles: ['src/ui/__tests__/setup.js'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    exclude: ['node_modules', 'dist', 'example', 'example-nextjs', 'example-express'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/integrations/server/**', 'src/ui/primitives/**', 'src/dashboard/**'],
      thresholds: {
        'src/lib/**': { lines: 100, branches: 95, functions: 100, statements: 100 },
        'src/integrations/server/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/ui/primitives/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
        'src/dashboard/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
      },
    },
  },
});
```

- [ ] **Step 1.2: Verify**

Run: `npm test`
Expected: 199 passed | 3 skipped (unchanged from end of B1).

- [ ] **Step 1.3: Commit**

```bash
git add vitest.config.js
git commit -m "$(cat <<'EOF'
chore(test): include src/dashboard in jsdom + coverage thresholds

Routes any future src/dashboard/**.test.{js,jsx} through jsdom and
sets coverage thresholds (90/85/90/90) consistent with the server
adapter targets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — `filtering.js` pure helpers + tests

**Files:** `src/dashboard/filtering.js`, `src/dashboard/__tests__/filtering.test.js`

- [ ] **Step 2.1: Write the failing test**

```js
// src/dashboard/__tests__/filtering.test.js
import { describe, it, expect } from 'vitest';
import {
  getFilteredItems,
  getStatusCounts,
  getAttentionCounts,
  initialFilters,
} from '../filtering.js';

const items = [
  { id: '1', feedback: 'submit broken', status: 'new', severity: 'high', userName: 'Murali', userEmail: 'm@x.com', url: '/checkout', video: 'data:video/x', eventLogs: [{ type: 'console', level: 'error', message: 'TypeError' }] },
  { id: '2', feedback: 'sidebar typo', status: 'open', severity: 'low', userName: 'Jordan', userEmail: 'j@x.com', url: '/home', owner: { name: 'A' } },
  { id: '3', feedback: 'dark mode wanted', status: 'resolved', severity: 'medium', userName: 'Riya', userEmail: 'r@x.com', url: '/settings' },
  { id: '4', feedback: 'form jumps on focus', status: 'in_progress', severity: 'high', userName: 'Tomas', userEmail: 't@x.com', url: '/login', eventLogs: [{ type: 'network', status: 500 }] },
];

describe('initialFilters', () => {
  it('starts empty', () => {
    const f = initialFilters();
    expect(f.search).toBe('');
    expect(f.statuses).toEqual(new Set());
    expect(f.severities).toEqual(new Set());
    expect(f.flags).toEqual(new Set());
  });
});

describe('getFilteredItems', () => {
  it('returns all items when filters are empty', () => {
    expect(getFilteredItems(items, initialFilters()).length).toBe(4);
  });

  it('search is case-insensitive across feedback/user/url', () => {
    const f = { ...initialFilters(), search: 'TYPO' };
    expect(getFilteredItems(items, f).map(i => i.id)).toEqual(['2']);
  });

  it('search matches userName and userEmail', () => {
    expect(getFilteredItems(items, { ...initialFilters(), search: 'Riya' }).map(i => i.id)).toEqual(['3']);
    expect(getFilteredItems(items, { ...initialFilters(), search: 'j@x' }).map(i => i.id)).toEqual(['2']);
  });

  it('search matches url', () => {
    expect(getFilteredItems(items, { ...initialFilters(), search: '/checkout' }).map(i => i.id)).toEqual(['1']);
  });

  it('statuses filter is OR within category', () => {
    const f = { ...initialFilters(), statuses: new Set(['new', 'open']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','2']);
  });

  it('severities filter is OR within category', () => {
    const f = { ...initialFilters(), severities: new Set(['high']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','4']);
  });

  it('categories AND together', () => {
    const f = { ...initialFilters(), statuses: new Set(['new']), severities: new Set(['high']) };
    expect(getFilteredItems(items, f).map(i => i.id)).toEqual(['1']);
  });

  it('flag withMedia matches items with video or screenshot', () => {
    const f = { ...initialFilters(), flags: new Set(['withMedia']) };
    expect(getFilteredItems(items, f).map(i => i.id)).toEqual(['1']);
  });

  it('flag hasErrors matches items with console error or failed network', () => {
    const f = { ...initialFilters(), flags: new Set(['hasErrors']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','4']);
  });

  it('flag needsOwner matches items without owner', () => {
    const f = { ...initialFilters(), flags: new Set(['needsOwner']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','3','4']);
  });

  it('multiple flags AND together', () => {
    const f = { ...initialFilters(), flags: new Set(['hasErrors', 'needsOwner']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','4']);
  });
});

describe('getStatusCounts', () => {
  it('counts items by status', () => {
    expect(getStatusCounts(items)).toEqual({ new: 1, open: 1, in_progress: 1, resolved: 1 });
  });
});

describe('getAttentionCounts', () => {
  it('returns counts for withMedia, hasErrors, needsOwner', () => {
    expect(getAttentionCounts(items)).toEqual({ withMedia: 1, hasErrors: 2, needsOwner: 3 });
  });
});
```

- [ ] **Step 2.2: Run to confirm fail**

Run: `npm test -- filtering.test`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement `src/dashboard/filtering.js`**

```js
import { getFeedbackEvidenceSummary } from '../lib/feedbackEvidence.js';

export function initialFilters() {
  return { search: '', statuses: new Set(), severities: new Set(), flags: new Set() };
}

function matchesSearch(item, q) {
  if (!q) return true;
  const low = q.toLowerCase();
  const haystack = [
    item.feedback, item.userName, item.userEmail, item.url,
    item.elementInfo?.selector, item.elementInfo?.sourceFile,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(low);
}

function matchesFlags(item, flags) {
  if (!flags || flags.size === 0) return true;
  const summary = getFeedbackEvidenceSummary(item);
  for (const flag of flags) {
    if (flag === 'withMedia' && !(summary.hasVideo || summary.hasScreenshot)) return false;
    if (flag === 'hasErrors' && !(summary.errorCount > 0 || summary.failedNetworkCount > 0)) return false;
    if (flag === 'needsOwner' && item.owner) return false;
  }
  return true;
}

export function getFilteredItems(items, filters) {
  if (!Array.isArray(items)) return [];
  const f = filters || initialFilters();
  return items.filter((it) => {
    if (f.statuses?.size > 0 && !f.statuses.has(it.status)) return false;
    if (f.severities?.size > 0 && !f.severities.has(it.severity)) return false;
    if (!matchesSearch(it, f.search)) return false;
    if (!matchesFlags(it, f.flags)) return false;
    return true;
  });
}

export function getStatusCounts(items) {
  const out = {};
  for (const it of items || []) {
    const k = it.status || 'new';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function getAttentionCounts(items) {
  let withMedia = 0, hasErrors = 0, needsOwner = 0;
  for (const it of items || []) {
    const s = getFeedbackEvidenceSummary(it);
    if (s.hasVideo || s.hasScreenshot) withMedia += 1;
    if (s.errorCount > 0 || s.failedNetworkCount > 0) hasErrors += 1;
    if (!it.owner) needsOwner += 1;
  }
  return { withMedia, hasErrors, needsOwner };
}
```

- [ ] **Step 2.4: Run test to confirm pass**

Run: `npm test -- filtering.test`
Expected: PASS, all cases.

- [ ] **Step 2.5: Commit**

```bash
git add src/dashboard/filtering.js src/dashboard/__tests__/filtering.test.js
git commit -m "$(cat <<'EOF'
feat(dashboard): add pure filtering + count helpers

getFilteredItems composes search (across feedback/user/url/source),
status, severity, and flags (withMedia / hasErrors / needsOwner).
Categories AND together; values within a category OR. getStatusCounts
and getAttentionCounts derive the chips that drive the Summary Bar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — `useFeedbackStore` hook + tests

**Files:** `src/dashboard/useFeedbackStore.js`, `src/dashboard/__tests__/useFeedbackStore.test.js`

- [ ] **Step 3.1: Write the failing test**

```jsx
// src/dashboard/__tests__/useFeedbackStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeedbackStore, LS_KEY } from '../useFeedbackStore.js';

const A = { id: 'a', feedback: 'one', status: 'new' };
const B = { id: 'b', feedback: 'two', status: 'open' };

describe('useFeedbackStore — prop mode', () => {
  it('reflects data prop', () => {
    const { result } = renderHook(() => useFeedbackStore({ mode: 'prop', data: [A, B] }));
    expect(result.current.items).toEqual([A, B]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reacts to data prop change', () => {
    const { result, rerender } = renderHook(({ d }) => useFeedbackStore({ mode: 'prop', data: d }), { initialProps: { d: [A] } });
    expect(result.current.items).toEqual([A]);
    rerender({ d: [A, B] });
    expect(result.current.items).toEqual([A, B]);
  });
});

describe('useFeedbackStore — localStorage mode', () => {
  beforeEach(() => localStorage.clear());

  it('loads from default key', () => {
    localStorage.setItem(LS_KEY, JSON.stringify([A, B]));
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    expect(result.current.items).toEqual([A, B]);
  });

  it('archives corrupt data and returns empty', () => {
    localStorage.setItem(LS_KEY, '{not json');
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(LS_KEY + '.bak')).toBe('{not json');
  });

  it('save merges by id and writes back', async () => {
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    await act(async () => { await result.current.save(A); });
    await act(async () => { await result.current.save({ ...A, status: 'resolved' }); });
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([{ ...A, status: 'resolved' }]);
  });

  it('remove deletes by id', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify([A, B]));
    const { result } = renderHook(() => useFeedbackStore({ mode: 'localStorage' }));
    await act(async () => { await result.current.remove('a'); });
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([B]);
  });
});

describe('useFeedbackStore — source mode', () => {
  it('calls load() on mount and exposes items', async () => {
    const source = { load: vi.fn().mockResolvedValue([A, B]) };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items.length).toBe(2));
    expect(source.load).toHaveBeenCalled();
  });

  it('surfaces load error', async () => {
    const source = { load: vi.fn().mockRejectedValue(new Error('boom')) };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.items).toEqual([]);
  });

  it('subscribe updates items live', async () => {
    let cb;
    const source = {
      load: vi.fn().mockResolvedValue([A]),
      subscribe: vi.fn((fn) => { cb = fn; return () => {}; }),
    };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items).toEqual([A]));
    act(() => cb([A, B]));
    expect(result.current.items).toEqual([A, B]);
  });

  it('refresh re-fires load', async () => {
    const source = { load: vi.fn().mockResolvedValueOnce([A]).mockResolvedValueOnce([A, B]) };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => expect(result.current.items.length).toBe(2));
  });

  it('save delegates to source.save', async () => {
    const source = { load: vi.fn().mockResolvedValue([A]), save: vi.fn().mockResolvedValue() };
    const { result } = renderHook(() => useFeedbackStore({ mode: 'source', source }));
    await waitFor(() => expect(result.current.items.length).toBe(1));
    await act(async () => { await result.current.save({ ...A, status: 'resolved' }); });
    expect(source.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3.2: Run to confirm fail**

Run: `npm test -- useFeedbackStore`
Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement `src/dashboard/useFeedbackStore.js`**

```js
import { useCallback, useEffect, useRef, useState } from 'react';

export const LS_KEY = 'react-feedback-data';

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) localStorage.setItem(LS_KEY + '.bak', raw);
    localStorage.removeItem(LS_KEY);
    return [];
  }
}
function writeLocal(items) { localStorage.setItem(LS_KEY, JSON.stringify(items)); }

export function useFeedbackStore(opts) {
  const mode = opts?.mode || 'localStorage';
  const [items, setItems] = useState(() => mode === 'prop' ? (opts?.data || []) : (mode === 'localStorage' ? loadLocal() : []));
  const [isLoading, setLoading] = useState(mode === 'source');
  const [error, setError] = useState(null);
  const tickRef = useRef(0);

  // prop mode: sync with prop
  useEffect(() => {
    if (mode === 'prop') setItems(opts?.data || []);
  }, [mode, opts?.data]);

  const load = useCallback(async () => {
    if (mode !== 'source' || !opts?.source?.load) return;
    const myTick = ++tickRef.current;
    setLoading(true); setError(null);
    try {
      const next = await opts.source.load();
      if (myTick !== tickRef.current) return;
      setItems(Array.isArray(next) ? next : []);
    } catch (e) {
      if (myTick === tickRef.current) setError(e);
    } finally {
      if (myTick === tickRef.current) setLoading(false);
    }
  }, [mode, opts?.source]);

  // source mode: initial load + subscribe
  useEffect(() => {
    if (mode !== 'source') return;
    load();
    if (opts?.source?.subscribe) {
      return opts.source.subscribe((next) => {
        if (Array.isArray(next)) setItems(next);
      });
    }
  }, [mode, opts?.source, load]);

  const save = useCallback(async (item) => {
    if (mode === 'localStorage') {
      setItems((cur) => {
        const idx = cur.findIndex((x) => x.id === item.id);
        const next = idx >= 0 ? cur.map((x, i) => (i === idx ? item : x)) : [...cur, item];
        writeLocal(next);
        return next;
      });
      return;
    }
    if (mode === 'source' && opts?.source?.save) await opts.source.save(item);
  }, [mode, opts?.source]);

  const remove = useCallback(async (id) => {
    if (mode === 'localStorage') {
      setItems((cur) => {
        const next = cur.filter((x) => x.id !== id);
        writeLocal(next);
        return next;
      });
      return;
    }
    if (mode === 'source' && opts?.source?.remove) await opts.source.remove(id);
  }, [mode, opts?.source]);

  const refresh = useCallback(() => load(), [load]);

  return { items, isLoading, error, save, remove, refresh };
}
```

- [ ] **Step 3.4: Run test to confirm pass**

Run: `npm test -- useFeedbackStore`
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/dashboard/useFeedbackStore.js src/dashboard/__tests__/useFeedbackStore.test.js
git commit -m "$(cat <<'EOF'
feat(dashboard): add useFeedbackStore data hook

Three modes: 'prop' (controlled by host's data prop), 'source'
(async via {load, save, remove, subscribe}), and 'localStorage'
(default react-feedback-data key, archives corrupt JSON to .bak).
Race-condition guard via tick counter on async load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `useSectionState` + tests

**Files:** `src/dashboard/useSectionState.js`, `src/dashboard/__tests__/useSectionState.test.js`

- [ ] **Step 4.1: Write the failing test**

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionState, SECTION_LS_KEY } from '../useSectionState.js';

describe('useSectionState', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to open for any section', () => {
    const { result } = renderHook(() => useSectionState());
    expect(result.current.isOpen('user-signal')).toBe(true);
    expect(result.current.isOpen('logs')).toBe(true);
  });

  it('toggle flips open <-> closed', () => {
    const { result } = renderHook(() => useSectionState());
    act(() => result.current.toggle('logs'));
    expect(result.current.isOpen('logs')).toBe(false);
    act(() => result.current.toggle('logs'));
    expect(result.current.isOpen('logs')).toBe(true);
  });

  it('setOpen sets exact value', () => {
    const { result } = renderHook(() => useSectionState());
    act(() => result.current.setOpen('source', false));
    expect(result.current.isOpen('source')).toBe(false);
  });

  it('persists to localStorage (debounced)', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSectionState());
    act(() => result.current.toggle('logs'));
    act(() => { vi.advanceTimersByTime(250); });
    expect(JSON.parse(localStorage.getItem(SECTION_LS_KEY))).toEqual({ logs: 'closed' });
    vi.useRealTimers();
  });

  it('restores from localStorage on mount', () => {
    localStorage.setItem(SECTION_LS_KEY, JSON.stringify({ logs: 'closed' }));
    const { result } = renderHook(() => useSectionState());
    expect(result.current.isOpen('logs')).toBe(false);
    expect(result.current.isOpen('source')).toBe(true);
  });
});
```

- [ ] **Step 4.2: Run to confirm fail**

Run: `npm test -- useSectionState`
Expected: FAIL.

- [ ] **Step 4.3: Implement**

```js
// src/dashboard/useSectionState.js
import { useCallback, useEffect, useRef, useState } from 'react';

export const SECTION_LS_KEY = 'react-feedback-dashboard-section-state';

function loadState() {
  try {
    const raw = localStorage.getItem(SECTION_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function useSectionState() {
  const [state, setState] = useState(loadState);
  const timer = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const persist = useCallback((next) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(SECTION_LS_KEY, JSON.stringify(next)); } catch {}
    }, 200);
  }, []);

  const isOpen = useCallback((id) => state[id] !== 'closed', [state]);
  const setOpen = useCallback((id, open) => setState((cur) => {
    const next = { ...cur, [id]: open ? 'open' : 'closed' };
    persist(next);
    return next;
  }), [persist]);
  const toggle = useCallback((id) => setOpen(id, !(isOpen(id))), [isOpen, setOpen]);

  return { isOpen, toggle, setOpen };
}
```

- [ ] **Step 4.4: Run test to confirm pass**

Run: `npm test -- useSectionState`
Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/dashboard/useSectionState.js src/dashboard/__tests__/useSectionState.test.js
git commit -m "$(cat <<'EOF'
feat(dashboard): add useSectionState collapse-state hook

Per-section open/closed map persisted to localStorage
(react-feedback-dashboard-section-state). Default open for any
unseen section. 200ms debounce on writes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — `useKeyboardShortcuts` + tests

**Files:** `src/dashboard/useKeyboardShortcuts.js`, `src/dashboard/__tests__/useKeyboardShortcuts.test.js`

- [ ] **Step 5.1: Write the failing test**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts.js';

function fire(key) { document.dispatchEvent(new KeyboardEvent('keydown', { key })); }

describe('useKeyboardShortcuts', () => {
  it('fires the handler when enabled and key matches', () => {
    const fn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).toHaveBeenCalled();
  });

  it('does not fire when disabled', () => {
    const fn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ enabled: false, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).not.toHaveBeenCalled();
  });

  it('skips when active element is an input', () => {
    const fn = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('skips when active element is contentEditable', () => {
    const fn = vi.fn();
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();
    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });
});
```

- [ ] **Step 5.2: Run to confirm fail**

Run: `npm test -- useKeyboardShortcuts`
Expected: FAIL.

- [ ] **Step 5.3: Implement**

```js
// src/dashboard/useKeyboardShortcuts.js
import { useEffect, useRef } from 'react';

function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

export function useKeyboardShortcuts({ enabled, shortcuts }) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (isTypingTarget(document.activeElement)) return;
      const fn = ref.current?.[e.key];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled]);
}
```

- [ ] **Step 5.4: Run test to confirm pass**

Run: `npm test -- useKeyboardShortcuts`
Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/dashboard/useKeyboardShortcuts.js src/dashboard/__tests__/useKeyboardShortcuts.test.js
git commit -m "$(cat <<'EOF'
feat(dashboard): add scoped keyboard shortcut hook

Document keydown listener active only while enabled and only when
the focused element is not an input/textarea/select/contentEditable.
Caller supplies a key→handler map.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — `CommandCenterContext`

**Files:** `src/dashboard/CommandCenterContext.jsx`

No standalone test — exercised through the integration tests in later tasks.

- [ ] **Step 6.1: Implement**

```jsx
import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { initialFilters } from './filtering.js';

const Ctx = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SELECT': return { ...state, selectedId: action.id };
    case 'SET_SEARCH': return { ...state, filters: { ...state.filters, search: action.value } };
    case 'TOGGLE_STATUS_FILTER': {
      const next = new Set(state.filters.statuses);
      next.has(action.value) ? next.delete(action.value) : next.add(action.value);
      return { ...state, filters: { ...state.filters, statuses: next } };
    }
    case 'TOGGLE_SEVERITY_FILTER': {
      const next = new Set(state.filters.severities);
      next.has(action.value) ? next.delete(action.value) : next.add(action.value);
      return { ...state, filters: { ...state.filters, severities: next } };
    }
    case 'TOGGLE_FLAG_FILTER': {
      const next = new Set(state.filters.flags);
      next.has(action.value) ? next.delete(action.value) : next.add(action.value);
      return { ...state, filters: { ...state.filters, flags: next } };
    }
    case 'CLEAR_FILTERS': return { ...state, filters: initialFilters() };
    default: return state;
  }
}

export function CommandCenterProvider({ children, defaultSelectedId = null }) {
  const [state, dispatch] = useReducer(reducer, { selectedId: defaultSelectedId, filters: initialFilters() });
  const value = useMemo(() => ({ ...state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommandCenter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCommandCenter must be used inside <CommandCenterProvider>');
  return ctx;
}

export function useSelection() {
  const { selectedId, dispatch } = useCommandCenter();
  const select = useCallback((id) => dispatch({ type: 'SELECT', id }), [dispatch]);
  return { selectedId, select };
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/dashboard/CommandCenterContext.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add CommandCenterContext + reducer

Single context owns selection + filter state for the Command Center
workspace. Reducer handles SELECT, SET_SEARCH, TOGGLE_{STATUS,
SEVERITY,FLAG}_FILTER, CLEAR_FILTERS. useSelection() is a thin
read+set helper for child components.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — `ConfirmButton` + tests

**Files:** `src/dashboard/ConfirmButton.jsx`, `src/dashboard/__tests__/ConfirmButton.test.jsx`

- [ ] **Step 7.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { ConfirmButton } from '../ConfirmButton.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ConfirmButton', () => {
  it('first click switches to confirm label without firing', () => {
    const fn = vi.fn();
    const { getByRole } = render(<ConfirmButton onConfirm={fn} confirmLabel="Confirm delete">Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent('Confirm delete');
    expect(fn).not.toHaveBeenCalled();
  });

  it('second click within timeout fires onConfirm', () => {
    const fn = vi.fn();
    const { getByRole } = render(<ConfirmButton onConfirm={fn}>Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    fireEvent.click(getByRole('button'));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('reverts to initial label after timeout', () => {
    const { getByRole } = render(<ConfirmButton onConfirm={() => {}} timeoutMs={1000}>Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent(/confirm/i);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(getByRole('button')).toHaveTextContent('Delete');
  });

  it('reverts on blur', () => {
    const { getByRole } = render(<ConfirmButton onConfirm={() => {}}>Delete</ConfirmButton>);
    fireEvent.click(getByRole('button'));
    fireEvent.blur(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent('Delete');
  });
});
```

- [ ] **Step 7.2: Run to confirm fail**

Run: `npm test -- ConfirmButton`
Expected: FAIL.

- [ ] **Step 7.3: Implement**

```jsx
// src/dashboard/ConfirmButton.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/primitives/Button.jsx';

export function ConfirmButton({ onConfirm, confirmLabel = 'Confirm?', timeoutMs = 3000, children, ...rest }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setArmed(false);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleClick = useCallback((e) => {
    if (armed) {
      reset();
      onConfirm?.(e);
      return;
    }
    setArmed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(reset, timeoutMs);
  }, [armed, onConfirm, timeoutMs, reset]);

  return (
    <Button
      {...rest}
      variant={armed ? 'danger' : (rest.variant || 'secondary')}
      aria-live="polite"
      onClick={handleClick}
      onBlur={reset}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

export default ConfirmButton;
```

- [ ] **Step 7.4: Run test to confirm pass**

Run: `npm test -- ConfirmButton`
Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/dashboard/ConfirmButton.jsx src/dashboard/__tests__/ConfirmButton.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add ConfirmButton inline-confirm primitive

First click arms the button (label switches to confirmLabel,
variant switches to danger, aria-live announces). Second click
within timeoutMs fires onConfirm. Blur or timeout reverts.
Replaces window.confirm for destructive actions in the Workflow
Panel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — `EmptyState` + `ErrorState`

**Files:** `src/dashboard/EmptyState.jsx`, `src/dashboard/ErrorState.jsx`, `src/dashboard/__tests__/states.test.jsx`

- [ ] **Step 8.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState.jsx';
import { ErrorState } from '../ErrorState.jsx';

describe('EmptyState', () => {
  it('no-data variant shows the collect-feedback hint', () => {
    const { getByText } = render(<EmptyState variant="no-data" />);
    expect(getByText(/no feedback yet/i)).toBeInTheDocument();
  });

  it('filtered-empty variant renders Clear filters action', () => {
    const fn = vi.fn();
    const { getByRole } = render(<EmptyState variant="filtered-empty" onClearFilters={fn} />);
    fireEvent.click(getByRole('button', { name: /clear filters/i }));
    expect(fn).toHaveBeenCalled();
  });
});

describe('ErrorState', () => {
  it('renders message and retry', () => {
    const fn = vi.fn();
    const { getByRole, getByText } = render(<ErrorState message="Failed to load" onRetry={fn} />);
    expect(getByText('Failed to load')).toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: /try again/i }));
    expect(fn).toHaveBeenCalled();
  });

  it('omits retry button when no callback', () => {
    const { queryByRole } = render(<ErrorState message="x" />);
    expect(queryByRole('button')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2: Run to confirm fail**

Run: `npm test -- states.test`
Expected: FAIL.

- [ ] **Step 8.3: Implement `EmptyState.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { Button } from '../ui/primitives/Button.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';

const Wrap = styled.div`
  display: flex; align-items: center; justify-content: center;
  text-align: center; padding: 40px 24px;
  color: ${pickToken('color.textMuted')};
  font-family: ${pickToken('font.sans')};
`;
const Headline = styled.div`
  font-size: ${pickToken('font.size.md')};
  color: ${pickToken('color.text')};
  font-weight: 500;
  margin-bottom: 6px;
`;
const Sub = styled.div`
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.textMuted')};
  margin-bottom: 16px;
`;

export function EmptyState({ variant = 'no-data', onClearFilters }) {
  if (variant === 'filtered-empty') {
    return (
      <Wrap>
        <Stack direction="column" align="center" gap="3">
          <Headline>No feedback matches these filters.</Headline>
          <Sub>Try clearing one or more filters to see more results.</Sub>
          {onClearFilters && <Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>}
        </Stack>
      </Wrap>
    );
  }
  return (
    <Wrap>
      <Stack direction="column" align="center" gap="3">
        <Headline>No feedback yet.</Headline>
        <Sub>Press <kbd>Alt+Q</kbd> to collect feedback from the current page.</Sub>
      </Stack>
    </Wrap>
  );
}
export default EmptyState;
```

- [ ] **Step 8.4: Implement `ErrorState.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { Button } from '../ui/primitives/Button.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';

const Wrap = styled.div`
  background: ${pickToken('color.dangerBg')};
  border: 1px solid ${pickToken('color.danger')};
  border-radius: ${pickToken('radius.md')};
  padding: 14px 16px;
  color: ${pickToken('color.danger')};
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.sm')};
  margin: 12px;
`;
const Msg = styled.div`margin-bottom: 8px;`;

export function ErrorState({ message, onRetry }) {
  return (
    <Wrap role="alert">
      <Stack direction="column" gap="3">
        <Msg>{message}</Msg>
        {onRetry && <div><Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button></div>}
      </Stack>
    </Wrap>
  );
}
export default ErrorState;
```

- [ ] **Step 8.5: Run test to confirm pass**

Run: `npm test -- states.test`
Expected: PASS.

- [ ] **Step 8.6: Commit**

```bash
git add src/dashboard/EmptyState.jsx src/dashboard/ErrorState.jsx src/dashboard/__tests__/states.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add EmptyState + ErrorState surfaces

EmptyState has two variants (no-data with Alt+Q hint;
filtered-empty with Clear filters action). ErrorState is an
inline danger-tinted Surface used by the triage list when the
data source rejects; supports optional onRetry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — `TriageListRow` + tests

**Files:** `src/dashboard/TriageListRow.jsx`, `src/dashboard/__tests__/TriageListRow.test.jsx`

- [ ] **Step 9.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { TriageListRow } from '../TriageListRow.jsx';

const base = {
  id: '1', feedback: 'Submit button broken on checkout', type: 'bug',
  status: 'new', severity: 'high', userName: 'Murali', userEmail: 'm@x.com',
  url: '/checkout', timestamp: new Date().toISOString(),
};

describe('TriageListRow', () => {
  it('renders title and preview text', () => {
    render(<TriageListRow item={base} selected={false} onSelect={() => {}} />);
    expect(screen.getAllByText(/Submit button broken/).length).toBeGreaterThan(0);
  });

  it('click calls onSelect with id', () => {
    const fn = vi.fn();
    render(<TriageListRow item={base} selected={false} onSelect={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledWith('1');
  });

  it('Enter activates onSelect', () => {
    const fn = vi.fn();
    render(<TriageListRow item={base} selected={false} onSelect={fn} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(fn).toHaveBeenCalledWith('1');
  });

  it('aria-selected reflects prop', () => {
    const { rerender } = render(<TriageListRow item={base} selected={false} onSelect={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'false');
    rerender(<TriageListRow item={base} selected={true} onSelect={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'true');
  });

  it('renders screenshot thumbnail when item has screenshot', () => {
    const item = { ...base, screenshot: 'data:image/png;base64,abc' };
    const { container } = render(<TriageListRow item={item} selected={false} onSelect={() => {}} />);
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9.2: Run to confirm fail**

Run: `npm test -- TriageListRow`
Expected: FAIL.

- [ ] **Step 9.3: Implement**

```jsx
// src/dashboard/TriageListRow.jsx
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Stack } from '../ui/primitives/Stack.jsx';
import { Chip } from '../ui/primitives/Chip.jsx';
import { Avatar } from '../ui/primitives/Avatar.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { getFeedbackPriority } from '../lib/feedbackEvidence.js';

const Row = styled.button`
  appearance: none;
  display: flex;
  width: 100%;
  gap: 12px;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: ${pickToken('color.text')};
  font-family: ${pickToken('font.sans')};
  border-left: 3px solid transparent;
  border-bottom: 1px solid ${pickToken('color.border')};
  &:hover { background: ${pickToken('color.canvas')}; }
  &[aria-selected="true"] {
    background: ${pickToken('color.canvas')};
    border-left-color: ${pickToken('color.accent')};
  }
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: -3px;
  }
`;
const Thumb = styled.div`
  width: 64px; height: 44px;
  flex-shrink: 0;
  border-radius: 8px;
  background: ${pickToken('color.canvas')};
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  color: ${pickToken('color.textFaint')};
  font-size: 18px;
  position: relative;
`;
const ThumbImg = styled.img`width: 100%; height: 100%; object-fit: cover;`;
const Title = styled.div`
  font-size: ${pickToken('font.size.base')};
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const Preview = styled.div`
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.textMuted')};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const Sub = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textFaint')};
  flex-wrap: wrap;
`;

const PRIORITY_VARIANT = { urgent: 'danger', high: 'warning', normal: 'neutral', low: 'neutral' };

function ago(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`;
  return `${Math.floor(ms / 86400_000)}d`;
}

export function TriageListRow({ item, selected, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false);
  const priority = getFeedbackPriority(item);
  const fire = useCallback(() => onSelect?.(item.id), [item.id, onSelect]);
  const onKey = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
  }, [fire]);
  const titleText = (item.feedback || '').slice(0, 70);
  const hasImg = item.screenshot && !imgFailed;

  return (
    <Row role="button" tabIndex={0} aria-selected={selected} onClick={fire} onKeyDown={onKey} data-id={item.id}>
      <Thumb>
        {hasImg
          ? <ThumbImg src={item.screenshot} alt="" onError={() => setImgFailed(true)} />
          : (item.video ? '▶' : (item.type === 'idea' ? '💡' : item.type === 'praise' ? '⭐' : '🐞'))}
      </Thumb>
      <Stack direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
        <Title>{titleText || 'Untitled'}</Title>
        <Preview>{item.feedback}</Preview>
        <Sub>
          <Chip variant={PRIORITY_VARIANT[priority.band] || 'neutral'} dot size="sm">{priority.band}</Chip>
          {item.type && <Chip size="sm">{item.type}</Chip>}
          <span>· {ago(item.timestamp)} ·</span>
          {item.userName && <><Avatar name={item.userName} size="xs" /><span>{item.userName}</span></>}
        </Sub>
      </Stack>
    </Row>
  );
}
export default TriageListRow;
```

- [ ] **Step 9.4: Run test to confirm pass**

Run: `npm test -- TriageListRow`
Expected: PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/dashboard/TriageListRow.jsx src/dashboard/__tests__/TriageListRow.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add TriageListRow card

84px card-with-thumbnail: screenshot/video poster or type emoji,
title (truncated 70 chars), 2-line preview, priority chip + type
+ relative time + avatar. Keyboard activatable via Enter/Space;
aria-selected reflects selection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — `TriageList` + tests

**Files:** `src/dashboard/TriageList.jsx`, `src/dashboard/__tests__/TriageList.test.jsx`

- [ ] **Step 10.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { TriageList } from '../TriageList.jsx';
import { CommandCenterProvider } from '../CommandCenterContext.jsx';

const items = [
  { id: '1', feedback: 'one', status: 'new', severity: 'high', timestamp: new Date().toISOString() },
  { id: '2', feedback: 'two', status: 'open', severity: 'low', timestamp: new Date().toISOString() },
];

function wrap(ui) {
  return <CommandCenterProvider>{ui}</CommandCenterProvider>;
}

describe('TriageList', () => {
  it('renders one row per item', () => {
    render(wrap(<TriageList items={items} />));
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('search filters items', async () => {
    vi.useFakeTimers();
    render(wrap(<TriageList items={items} />));
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'two' } });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.queryByText('one')).not.toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows empty-state when no items', () => {
    render(wrap(<TriageList items={[]} />));
    expect(screen.getByText(/no feedback yet/i)).toBeInTheDocument();
  });

  it('shows filtered-empty when filters exclude everything', async () => {
    vi.useFakeTimers();
    render(wrap(<TriageList items={items} />));
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'noresults' } });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getByText(/no feedback matches/i)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 10.2: Run to confirm fail**

Run: `npm test -- TriageList.test`
Expected: FAIL.

- [ ] **Step 10.3: Implement**

```jsx
// src/dashboard/TriageList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Field } from '../ui/primitives/Field.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { TriageListRow } from './TriageListRow.jsx';
import { useCommandCenter, useSelection } from './CommandCenterContext.jsx';
import { getFilteredItems } from './filtering.js';
import { EmptyState } from './EmptyState.jsx';

const Wrap = styled.div`
  display: flex; flex-direction: column; height: 100%;
  font-family: ${pickToken('font.sans')};
`;
const Top = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${pickToken('color.border')};
  background: ${pickToken('color.bg')};
`;
const Body = styled.div`
  flex: 1; overflow-y: auto;
`;

function useDebouncedValue(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export function TriageList({ items = [] }) {
  const { filters, dispatch } = useCommandCenter();
  const { selectedId, select } = useSelection();
  const [search, setSearch] = useState(filters.search);
  const debounced = useDebouncedValue(search, 200);

  useEffect(() => { dispatch({ type: 'SET_SEARCH', value: debounced }); }, [debounced, dispatch]);

  const filtered = useMemo(() => getFilteredItems(items, { ...filters, search: debounced }), [items, filters, debounced]);

  if (!items.length) {
    return <Wrap><Top><Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} /></Top><EmptyState variant="no-data" /></Wrap>;
  }

  if (!filtered.length) {
    return (
      <Wrap>
        <Top><Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} /></Top>
        <EmptyState variant="filtered-empty" onClearFilters={() => { setSearch(''); dispatch({ type: 'CLEAR_FILTERS' }); }} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Top>
        <Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Top>
      <Body>
        <Stack direction="column" gap="0">
          {filtered.map((item) => (
            <TriageListRow key={item.id} item={item} selected={item.id === selectedId} onSelect={select} />
          ))}
        </Stack>
      </Body>
    </Wrap>
  );
}
export default TriageList;
```

- [ ] **Step 10.4: Run test to confirm pass**

Run: `npm test -- TriageList.test`
Expected: PASS.

- [ ] **Step 10.5: Commit**

```bash
git add src/dashboard/TriageList.jsx src/dashboard/__tests__/TriageList.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add TriageList container

Search field (debounced 200ms) + scrollable rows. Reads selection
and filters from CommandCenterContext. Shows the no-data empty
state when items is empty; the filtered-empty state with a Clear
filters CTA when filters exclude everything.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — Evidence Stack four sections + tests

**Files:** `src/dashboard/sections/{UserSignalSection,VisualSection,LogsSection,SourceSection}.jsx`, `src/dashboard/__tests__/sections.test.jsx`

- [ ] **Step 11.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserSignalSection } from '../sections/UserSignalSection.jsx';
import { VisualSection } from '../sections/VisualSection.jsx';
import { LogsSection } from '../sections/LogsSection.jsx';
import { SourceSection } from '../sections/SourceSection.jsx';

const baseItem = {
  feedback: 'thing broken',
  screenshot: 'data:image/png;base64,abc',
  eventLogs: [{ type: 'console', level: 'error', message: 'TypeError' }, { type: 'network', status: 500 }],
  elementInfo: { selector: 'button.x', componentStack: ['Form', 'App'], sourceFile: 'src/Form.jsx:14' },
};

describe('Evidence sections', () => {
  it('UserSignal renders the full feedback text and summary', () => {
    render(<UserSignalSection item={baseItem} />);
    expect(screen.getByText('thing broken')).toBeInTheDocument();
    const summary = UserSignalSection.summary(baseItem);
    expect(summary).toMatch(/12 chars/);
  });

  it('Visual renders the screenshot img tag', () => {
    const { container } = render(<VisualSection item={baseItem} />);
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('Visual.summary describes media inventory', () => {
    expect(VisualSection.summary({ video: 'x' })).toMatch(/video/);
    expect(VisualSection.summary({ screenshot: 'x' })).toMatch(/screenshot/);
    expect(VisualSection.summary({})).toBe('none');
  });

  it('Logs renders error and failed network rows', () => {
    render(<LogsSection item={baseItem} />);
    expect(screen.getByText(/TypeError/)).toBeInTheDocument();
  });

  it('Logs.summary counts errors and failed reqs', () => {
    expect(LogsSection.summary(baseItem)).toMatch(/1 error.*1 failed req/);
  });

  it('Source renders component breadcrumb and file path', () => {
    render(<SourceSection item={baseItem} />);
    expect(screen.getByText(/Form/)).toBeInTheDocument();
    expect(screen.getByText('src/Form.jsx:14')).toBeInTheDocument();
  });

  it('Source.summary returns shortened source path', () => {
    expect(SourceSection.summary(baseItem)).toBe('src/Form.jsx:14');
  });
});
```

- [ ] **Step 11.2: Run to confirm fail**

Run: `npm test -- sections.test`
Expected: FAIL.

- [ ] **Step 11.3: Implement `sections/UserSignalSection.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Quote = styled.div`
  background: ${pickToken('color.canvas')};
  border-left: 3px solid ${pickToken('color.accent')};
  padding: 10px 12px;
  border-radius: 0 6px 6px 0;
  font-size: ${pickToken('font.size.base')};
  line-height: 1.5;
  color: ${pickToken('color.text')};
  white-space: pre-wrap;
`;

export function UserSignalSection({ item }) {
  return <Quote>{item.feedback || ''}</Quote>;
}
UserSignalSection.summary = (item) => {
  const t = item.feedback || '';
  const lines = t.split(/\n/).length;
  return `${t.length} chars${lines > 1 ? ` · ${lines} lines` : ''}`;
};
UserSignalSection.title = 'What the user said';
UserSignalSection.id = 'user-signal';
export default UserSignalSection;
```

- [ ] **Step 11.4: Implement `sections/VisualSection.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Img = styled.img`
  max-width: 100%;
  max-height: 360px;
  border-radius: ${pickToken('radius.md')};
  border: 1px solid ${pickToken('color.border')};
  cursor: zoom-in;
`;
const Player = styled.video`
  width: 100%; max-height: 360px;
  border-radius: ${pickToken('radius.md')};
  border: 1px solid ${pickToken('color.border')};
`;

export function VisualSection({ item }) {
  const hasVideo = !!(item.video || item.videoBlob);
  const hasScreenshot = !!item.screenshot;
  if (!hasVideo && !hasScreenshot) return null;
  return (
    <>
      {hasScreenshot && <Img src={item.screenshot} alt="Screenshot" />}
      {hasVideo && <Player controls src={typeof item.video === 'string' ? item.video : undefined} />}
    </>
  );
}
VisualSection.summary = (item) => {
  if (item.video || item.videoBlob) return '1 video';
  if (item.screenshot) return '1 screenshot';
  return 'none';
};
VisualSection.title = 'Visual';
VisualSection.id = 'visual';
VisualSection.shouldRender = (item) => !!(item.video || item.videoBlob || item.screenshot);
export default VisualSection;
```

- [ ] **Step 11.5: Implement `sections/LogsSection.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';
import { getFeedbackEvidenceSummary } from '../../lib/feedbackEvidence.js';

const Wrap = styled.div`font-family: ${pickToken('font.mono')}; font-size: ${pickToken('font.size.xs')};`;
const Row = styled.div`
  padding: 6px 8px;
  border-radius: 4px;
  color: ${pickToken('color.text')};
  &[data-level="error"] { background: ${pickToken('color.dangerBg')}; color: ${pickToken('color.danger')}; }
  &[data-level="warn"] { color: ${pickToken('color.warning')}; }
`;
const More = styled.div`
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textFaint')};
  padding: 6px 8px;
`;

export function LogsSection({ item }) {
  const events = Array.isArray(item.eventLogs) ? item.eventLogs : [];
  const visible = events.slice(0, 20);
  const more = events.length - visible.length;
  return (
    <Wrap>
      {visible.map((e, i) => (
        <Row key={i} data-level={e.type === 'console' ? (e.level || 'log') : (e.status >= 400 ? 'error' : 'info')}>
          {e.type === 'console' && `[${(e.level || 'log').toUpperCase()}] ${e.message || ''}`}
          {e.type === 'network' && `${e.method || 'GET'} ${e.url || ''} — ${e.status || 'pending'}`}
          {e.type === 'storage' && `[STORAGE.${(e.storageType || '').toUpperCase()}] ${e.action || ''} ${e.key || ''}`}
          {e.type === 'indexedDB' && `[IDB] ${e.action || ''} ${e.dbName || ''}`}
        </Row>
      ))}
      {more > 0 && <More>+ {more} more events</More>}
    </Wrap>
  );
}
LogsSection.summary = (item) => {
  const s = getFeedbackEvidenceSummary(item);
  if (s.logCount === 0) return 'no logs';
  const parts = [];
  if (s.errorCount) parts.push(`${s.errorCount} error${s.errorCount === 1 ? '' : 's'}`);
  if (s.failedNetworkCount) parts.push(`${s.failedNetworkCount} failed req${s.failedNetworkCount === 1 ? '' : 's'}`);
  parts.push(`${s.logCount} events`);
  return parts.join(' · ');
};
LogsSection.title = 'Logs';
LogsSection.id = 'logs';
LogsSection.shouldRender = (item) => Array.isArray(item.eventLogs) && item.eventLogs.length > 0;
export default LogsSection;
```

- [ ] **Step 11.6: Implement `sections/SourceSection.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';
import { Stack } from '../../ui/primitives/Stack.jsx';

const Row = styled.div`
  display: flex; gap: 12px; align-items: baseline;
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.textMuted')};
`;
const Label = styled.span`width: 96px; flex-shrink: 0;`;
const Value = styled.span`color: ${pickToken('color.text')};`;
const Mono = styled.code`
  font-family: ${pickToken('font.mono')};
  background: ${pickToken('color.canvas')};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: ${pickToken('font.size.sm')};
`;

export function SourceSection({ item }) {
  const ei = item.elementInfo || {};
  return (
    <Stack direction="column" gap="2">
      {ei.componentStack?.length > 0 && <Row><Label>Component</Label><Value>{ei.componentStack.join(' › ')}</Value></Row>}
      {ei.sourceFile && <Row><Label>File</Label><Mono>{ei.sourceFile}</Mono></Row>}
      {ei.selector && <Row><Label>Selector</Label><Mono>{ei.selector}</Mono></Row>}
      {item.viewport && <Row><Label>Viewport</Label><Value>{`${item.viewport.width}×${item.viewport.height}`}</Value></Row>}
    </Stack>
  );
}
SourceSection.summary = (item) => {
  const ei = item.elementInfo || {};
  return ei.sourceFile || ei.selector || '—';
};
SourceSection.title = 'Source';
SourceSection.id = 'source';
SourceSection.shouldRender = (item) => {
  const ei = item.elementInfo || {};
  return !!(ei.componentStack?.length || ei.sourceFile || ei.selector || item.viewport);
};
export default SourceSection;
```

- [ ] **Step 11.7: Run test to confirm pass**

Run: `npm test -- sections.test`
Expected: PASS.

- [ ] **Step 11.8: Commit**

```bash
git add src/dashboard/sections src/dashboard/__tests__/sections.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add four Evidence Stack sections

UserSignal renders feedback text as a quote block. Visual renders
inline screenshot/video. Logs renders the first 20 events with
errors highlighted. Source shows component breadcrumb, file path,
selector, and viewport. Each section exports static summary(),
title, id, and shouldRender so the parent stack drives display
state and collapsed-header summaries.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — `EvidenceStack` container + tests

**Files:** `src/dashboard/EvidenceStack.jsx`, `src/dashboard/__tests__/EvidenceStack.test.jsx`

- [ ] **Step 12.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { EvidenceStack } from '../EvidenceStack.jsx';

const item = {
  id: '1', feedback: 'thing broken', type: 'bug', severity: 'high',
  userName: 'M', url: '/x', timestamp: new Date().toISOString(),
  screenshot: 'data:image/png;base64,abc',
  eventLogs: [{ type: 'console', level: 'error', message: 'X' }],
  elementInfo: { selector: 'a.b', componentStack: ['App'], sourceFile: 'src/X.jsx:1' },
};

describe('EvidenceStack', () => {
  beforeEach(() => localStorage.clear());

  it('renders sticky header with title and chips', () => {
    render(<EvidenceStack item={item} />);
    expect(screen.getByText('thing broken')).toBeInTheDocument();
  });

  it('renders all four sections when applicable', () => {
    render(<EvidenceStack item={item} />);
    expect(screen.getByRole('button', { name: /what the user said/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^visual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^logs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^source/i })).toBeInTheDocument();
  });

  it('clicking a section header collapses its body', () => {
    render(<EvidenceStack item={item} />);
    const logsHeader = screen.getByRole('button', { name: /^logs/i });
    fireEvent.click(logsHeader);
    expect(screen.queryByText('[ERROR] X')).not.toBeInTheDocument();
  });

  it('renders nothing when item is null', () => {
    const { container } = render(<EvidenceStack item={null} />);
    expect(container.textContent).toMatch(/select a feedback/i);
  });
});
```

- [ ] **Step 12.2: Run to confirm fail**

Run: `npm test -- EvidenceStack`
Expected: FAIL.

- [ ] **Step 12.3: Implement**

```jsx
// src/dashboard/EvidenceStack.jsx
import React from 'react';
import styled from 'styled-components';
import { Chip } from '../ui/primitives/Chip.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { getFeedbackPriority, getFeedbackEvidenceSummary } from '../lib/feedbackEvidence.js';
import { useSectionState } from './useSectionState.js';
import { UserSignalSection } from './sections/UserSignalSection.jsx';
import { VisualSection } from './sections/VisualSection.jsx';
import { LogsSection } from './sections/LogsSection.jsx';
import { SourceSection } from './sections/SourceSection.jsx';

const SECTIONS = [UserSignalSection, VisualSection, LogsSection, SourceSection];

const Outer = styled.div`
  background: ${pickToken('color.canvas')};
  display: flex; flex-direction: column; height: 100%;
  font-family: ${pickToken('font.sans')};
  color: ${pickToken('color.text')};
`;
const Header = styled.div`
  position: sticky; top: 0; z-index: 1;
  padding: 14px 18px;
  background: ${pickToken('color.bg')};
  border-bottom: 1px solid ${pickToken('color.border')};
`;
const Title = styled.div`font-size: ${pickToken('font.size.md')}; font-weight: 600;`;
const SubLine = styled.div`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.textMuted')}; margin-top: 4px;`;
const Body = styled.div`flex: 1; overflow-y: auto;`;
const Section = styled.div`border-bottom: 1px solid ${pickToken('color.border')};`;
const SectionHead = styled.button`
  appearance: none; width: 100%; padding: 12px 18px;
  background: transparent; border: 0; text-align: left;
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; color: ${pickToken('color.text')};
  font-size: ${pickToken('font.size.sm')};
  font-weight: 500;
  font-family: inherit;
  &:focus-visible { outline: 3px solid ${pickToken('color.focusRing')}; outline-offset: -3px; }
`;
const Caret = styled.span`
  font-size: 11px;
  color: ${pickToken('color.textFaint')};
  margin-right: 10px;
  transition: transform 0.15s ease;
  &[data-open="true"] { transform: rotate(90deg); color: ${pickToken('color.accent')}; }
`;
const Summary = styled.span`font-size: ${pickToken('font.size.xs')}; color: ${pickToken('color.textFaint')}; font-weight: 400;`;
const SectionBody = styled.div`padding: 0 18px 14px;`;

const PRIORITY_VARIANT = { urgent: 'danger', high: 'warning', normal: 'neutral', low: 'neutral' };

export function EvidenceStack({ item }) {
  const { isOpen, toggle } = useSectionState();
  if (!item) {
    return <Outer><Header><Title>Select a feedback to inspect</Title></Header></Outer>;
  }
  const priority = getFeedbackPriority(item);
  const summary = getFeedbackEvidenceSummary(item);

  return (
    <Outer>
      <Header>
        <Title>{item.feedback}</Title>
        <SubLine>
          {item.userName || 'Anonymous'} · {item.url || ''}
        </SubLine>
        <Stack direction="row" gap="2" wrap style={{ marginTop: 6 }}>
          <Chip variant={PRIORITY_VARIANT[priority.band] || 'neutral'} dot size="sm">{priority.band}</Chip>
          {item.type && <Chip size="sm">{item.type}</Chip>}
          {summary.hasScreenshot && <Chip size="sm" variant="accent">screenshot</Chip>}
          {summary.hasVideo && <Chip size="sm" variant="accent">video</Chip>}
          {summary.errorCount > 0 && <Chip size="sm" variant="danger">{summary.errorCount} error{summary.errorCount === 1 ? '' : 's'}</Chip>}
          {summary.failedNetworkCount > 0 && <Chip size="sm" variant="warning">{summary.failedNetworkCount} failed req</Chip>}
        </Stack>
      </Header>
      <Body>
        {SECTIONS.filter((S) => !S.shouldRender || S.shouldRender(item)).map((S) => {
          const open = isOpen(S.id);
          return (
            <Section key={S.id}>
              <SectionHead onClick={() => toggle(S.id)} aria-expanded={open}>
                <span><Caret data-open={open}>▸</Caret>{S.title}</span>
                <Summary>{S.summary(item)}</Summary>
              </SectionHead>
              {open && <SectionBody><S item={item} /></SectionBody>}
            </Section>
          );
        })}
      </Body>
    </Outer>
  );
}
export default EvidenceStack;
```

- [ ] **Step 12.4: Run test to confirm pass**

Run: `npm test -- EvidenceStack`
Expected: PASS.

- [ ] **Step 12.5: Commit**

```bash
git add src/dashboard/EvidenceStack.jsx src/dashboard/__tests__/EvidenceStack.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add EvidenceStack container

Sticky header (title + sub + chips) over four collapsible
sections sourced from sections/. Collapsed section headers
always show a one-line summary so users can scan items without
expanding. Section state persisted via useSectionState.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — `WorkflowStatusControl` + tests

**Files:** `src/dashboard/workflow/WorkflowStatusControl.jsx`, `src/dashboard/__tests__/WorkflowStatusControl.test.jsx`

- [ ] **Step 13.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { WorkflowStatusControl } from '../workflow/WorkflowStatusControl.jsx';

const statuses = {
  new: { label: 'New', color: '#888', bgColor: '#eee', textColor: '#000' },
  open: { label: 'Open', color: '#888', bgColor: '#eee', textColor: '#000' },
  resolved: { label: 'Resolved', color: '#16a34a', bgColor: '#d1fae5', textColor: '#047857' },
};

describe('WorkflowStatusControl', () => {
  it('renders the current status label', () => {
    render(<WorkflowStatusControl status="new" statuses={statuses} onChange={() => {}} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('opens the popover and selects a new status', () => {
    const fn = vi.fn();
    render(<WorkflowStatusControl status="new" statuses={statuses} onChange={fn} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Resolved'));
    expect(fn).toHaveBeenCalledWith('resolved');
  });
});
```

- [ ] **Step 13.2: Run to confirm fail**

Run: `npm test -- WorkflowStatusControl`
Expected: FAIL.

- [ ] **Step 13.3: Implement**

```jsx
// src/dashboard/workflow/WorkflowStatusControl.jsx
import React from 'react';
import { Select } from '../../ui/primitives/Select.jsx';
import { Chip } from '../../ui/primitives/Chip.jsx';

export function WorkflowStatusControl({ status, statuses = {}, onChange }) {
  const options = Object.entries(statuses).map(([value, def]) => ({
    value,
    label: def.label || value,
  }));
  return (
    <Select
      options={options}
      value={status}
      onChange={(next) => onChange?.(next)}
      placeholder="Set status"
      renderTrigger={(_open, selected) => {
        const label = selected?.label || statuses[status]?.label || status || 'Set status';
        return <Chip variant="accent" dot size="md">{label}</Chip>;
      }}
    />
  );
}
export default WorkflowStatusControl;
```

- [ ] **Step 13.4: Run test to confirm pass**

Run: `npm test -- WorkflowStatusControl`
Expected: PASS.

- [ ] **Step 13.5: Commit**

```bash
git add src/dashboard/workflow/WorkflowStatusControl.jsx src/dashboard/__tests__/WorkflowStatusControl.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add WorkflowStatusControl

Internal control that mimics StatusDropdown's contract but renders
on top of the B1 Select primitive with a Chip-styled trigger.
StatusBadge and StatusDropdown remain byte-compatible.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — Remaining six workflow rows + tests

**Files:** `src/dashboard/workflow/{SeverityRow,OwnerRow,CustomerRow,IntegrationsRow,HandoffRow,DangerRow}.jsx`, `src/dashboard/__tests__/workflow-rows.test.jsx`

- [ ] **Step 14.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { SeverityRow } from '../workflow/SeverityRow.jsx';
import { OwnerRow } from '../workflow/OwnerRow.jsx';
import { CustomerRow } from '../workflow/CustomerRow.jsx';
import { IntegrationsRow } from '../workflow/IntegrationsRow.jsx';
import { HandoffRow } from '../workflow/HandoffRow.jsx';
import { DangerRow } from '../workflow/DangerRow.jsx';

const baseItem = { id: '1', feedback: 'x', severity: 'high', userName: 'M' };

describe('SeverityRow', () => {
  it('selects a new severity', () => {
    const fn = vi.fn();
    render(<SeverityRow item={baseItem} onChange={fn} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Critical'));
    expect(fn).toHaveBeenCalledWith('1', 'critical');
  });
});

describe('OwnerRow', () => {
  it('hidden when isDeveloper is false', () => {
    const { container } = render(<OwnerRow item={baseItem} isDeveloper={false} onChange={() => {}} />);
    expect(container.textContent).toBe('');
  });

  it('shows "Unassigned" when no owner', () => {
    render(<OwnerRow item={baseItem} isDeveloper={true} onChange={() => {}} />);
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  it('renders the owner name when set', () => {
    render(<OwnerRow item={{ ...baseItem, owner: { name: 'Alex' } }} isDeveloper={true} onChange={() => {}} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
  });
});

describe('CustomerRow', () => {
  it('hidden when isDeveloper is false', () => {
    const { container } = render(<CustomerRow item={baseItem} isDeveloper={false} onChange={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('renders existing customerValue chip', () => {
    render(<CustomerRow item={{ ...baseItem, customerValue: 'Acme' }} isDeveloper={true} onChange={() => {}} />);
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});

describe('IntegrationsRow', () => {
  it('hidden when no integrationState set', () => {
    const { container } = render(<IntegrationsRow item={baseItem} isDeveloper={true} onRetry={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('hidden when isDeveloper is false', () => {
    const item = { ...baseItem, integrationState: { jira: { status: 'created', issueKey: 'X-1' } } };
    const { container } = render(<IntegrationsRow item={item} isDeveloper={false} onRetry={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('renders the jira issue key when present', () => {
    const item = { ...baseItem, integrationState: { jira: { status: 'created', issueKey: 'X-1' } } };
    render(<IntegrationsRow item={item} isDeveloper={true} onRetry={() => {}} />);
    expect(screen.getByText('X-1')).toBeInTheDocument();
  });
  it('shows retry icon when state is error', () => {
    const item = { ...baseItem, integrationState: { jira: { status: 'error', error: 'boom' } } };
    const fn = vi.fn();
    render(<IntegrationsRow item={item} isDeveloper={true} onRetry={fn} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(fn).toHaveBeenCalledWith('1', 'jira');
  });
});

describe('HandoffRow', () => {
  it('copies short handoff text to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<HandoffRow item={baseItem} />);
    fireEvent.click(screen.getByRole('button', { name: /copy as/i }));
    fireEvent.click(screen.getByText(/short/i));
    expect(writeText).toHaveBeenCalled();
  });
});

describe('DangerRow', () => {
  it('hidden when isDeveloper is false', () => {
    const { container } = render(<DangerRow item={baseItem} isDeveloper={false} onDelete={() => {}} />);
    expect(container.textContent).toBe('');
  });
  it('confirms before deleting', () => {
    const fn = vi.fn();
    render(<DangerRow item={baseItem} isDeveloper={true} onDelete={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Step 14.2: Run to confirm fail**

Run: `npm test -- workflow-rows`
Expected: FAIL.

- [ ] **Step 14.3: Implement `workflow/SeverityRow.jsx`**

```jsx
import React from 'react';
import { Select } from '../../ui/primitives/Select.jsx';
import { Chip } from '../../ui/primitives/Chip.jsx';

const OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];
const VARIANT = { low: 'neutral', medium: 'neutral', high: 'warning', critical: 'danger' };

export function SeverityRow({ item, onChange }) {
  const sev = item.severity || 'medium';
  return (
    <Select
      options={OPTIONS}
      value={sev}
      onChange={(next) => onChange?.(item.id, next)}
      placeholder="Set severity"
      renderTrigger={(_open, selected) => (
        <Chip variant={VARIANT[(selected?.value || sev)]} dot size="md">
          {selected?.label || OPTIONS.find(o => o.value === sev)?.label || sev}
        </Chip>
      )}
    />
  );
}
export default SeverityRow;
```

- [ ] **Step 14.4: Implement `workflow/OwnerRow.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { Avatar } from '../../ui/primitives/Avatar.jsx';
import { Chip } from '../../ui/primitives/Chip.jsx';
import { Stack } from '../../ui/primitives/Stack.jsx';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Wrap = styled.div`display: flex; align-items: center; gap: 8px;`;
const Name = styled.span`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.text')};`;
const Unassigned = styled.span`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.textFaint')};`;

export function OwnerRow({ item, isDeveloper, onChange }) {
  if (!isDeveloper) return null;
  const owner = item.owner;
  if (!owner) {
    return (
      <Wrap>
        {onChange
          ? <Chip onClick={() => { const name = window.prompt('Owner name?'); if (name) onChange(item.id, { name }); }}>Unassigned</Chip>
          : <Unassigned>Unassigned</Unassigned>}
      </Wrap>
    );
  }
  return (
    <Wrap>
      <Avatar name={owner.name} size="sm" />
      <Name>{owner.name}</Name>
      {onChange && (
        <Chip onClick={() => onChange(item.id, null)} size="sm">Clear</Chip>
      )}
    </Wrap>
  );
}
export default OwnerRow;
```

- [ ] **Step 14.5: Implement `workflow/CustomerRow.jsx`**

```jsx
import React from 'react';
import { Chip } from '../../ui/primitives/Chip.jsx';

export function CustomerRow({ item, isDeveloper, onChange }) {
  if (!isDeveloper) return null;
  const v = item.customerValue;
  const display = v === undefined || v === null ? '—' : String(v);
  const handle = () => {
    if (!onChange) return;
    const next = window.prompt('Customer value', display);
    if (next != null) onChange(item.id, next);
  };
  return <Chip variant="accent" onClick={onChange ? handle : undefined}>{display}</Chip>;
}
export default CustomerRow;
```

- [ ] **Step 14.6: Implement `workflow/IntegrationsRow.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { Chip } from '../../ui/primitives/Chip.jsx';
import { IconButton } from '../../ui/primitives/IconButton.jsx';
import { Stack } from '../../ui/primitives/Stack.jsx';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Row = styled.div`
  display: flex; align-items: center; gap: 8px;
  font-size: ${pickToken('font.size.sm')};
`;
const Provider = styled.span`font-weight: 500; color: ${pickToken('color.text')};`;
const Key = styled.code`
  font-family: ${pickToken('font.mono')};
  background: ${pickToken('color.canvas')};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: ${pickToken('font.size.xs')};
`;
const STATE_VARIANT = {
  created: 'success', synced: 'success', appended: 'success',
  pending: 'neutral', not_sent: 'neutral',
  error: 'danger',
};

function Item({ name, state, onRetry }) {
  if (!state) return null;
  return (
    <Row>
      <Provider>{name}</Provider>
      <Chip variant={STATE_VARIANT[state.status] || 'neutral'} dot size="sm">{state.status}</Chip>
      {(state.issueKey || state.rowId) && <Key>{state.issueKey || state.rowId}</Key>}
      {state.status === 'error' && onRetry && (
        <IconButton aria-label="Retry sync" icon={<span>↻</span>} onClick={onRetry} />
      )}
    </Row>
  );
}

export function IntegrationsRow({ item, isDeveloper, onRetry }) {
  if (!isDeveloper) return null;
  const state = item.integrationState || {};
  if (!state.jira && !state.sheets) return null;
  return (
    <Stack direction="column" gap="3">
      <Item name="Jira" state={state.jira} onRetry={onRetry ? () => onRetry(item.id, 'jira') : null} />
      <Item name="Sheets" state={state.sheets} onRetry={onRetry ? () => onRetry(item.id, 'sheets') : null} />
    </Stack>
  );
}
export default IntegrationsRow;
```

- [ ] **Step 14.7: Implement `workflow/HandoffRow.jsx`**

```jsx
import React, { useState } from 'react';
import { Select } from '../../ui/primitives/Select.jsx';
import { Button } from '../../ui/primitives/Button.jsx';
import { createFeedbackHandoffText } from '../../lib/feedbackEvidence.js';

const FORMATS = [
  { value: 'short', label: 'Short' },
  { value: 'full', label: 'Full' },
  { value: 'jira', label: 'Jira-ready' },
  { value: 'slack', label: 'Slack-ready' },
];

export function HandoffRow({ item }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async (format) => {
    const text = createFeedbackHandoffText(item, { format });
    try {
      await navigator.clipboard?.writeText?.(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <Select
      options={FORMATS}
      onChange={doCopy}
      placeholder="Copy as…"
      renderTrigger={() => (
        <Button variant="secondary" size="sm">{copied ? 'Copied' : 'Copy as…'}</Button>
      )}
    />
  );
}
export default HandoffRow;
```

- [ ] **Step 14.8: Implement `workflow/DangerRow.jsx`**

```jsx
import React from 'react';
import { ConfirmButton } from '../ConfirmButton.jsx';

export function DangerRow({ item, isDeveloper, onDelete }) {
  if (!isDeveloper || !onDelete) return null;
  return (
    <ConfirmButton
      variant="danger"
      size="sm"
      confirmLabel="Confirm delete"
      onConfirm={() => onDelete(item.id)}
    >
      Delete
    </ConfirmButton>
  );
}
export default DangerRow;
```

- [ ] **Step 14.9: Run test to confirm pass**

Run: `npm test -- workflow-rows`
Expected: PASS.

- [ ] **Step 14.10: Commit**

```bash
git add src/dashboard/workflow src/dashboard/__tests__/workflow-rows.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add six remaining Workflow Panel rows

SeverityRow, OwnerRow, CustomerRow, IntegrationsRow, HandoffRow,
DangerRow. Owner/Customer/Integrations/Danger gated by isDeveloper;
Handoff always visible. HandoffRow uses Phase A
createFeedbackHandoffText; IntegrationsRow reads Phase A
integrationState shape; DangerRow uses the ConfirmButton inline
pattern (no window.confirm).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — `WorkflowPanel` container + tests

**Files:** `src/dashboard/WorkflowPanel.jsx`, `src/dashboard/__tests__/WorkflowPanel.test.jsx`

- [ ] **Step 15.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { WorkflowPanel } from '../WorkflowPanel.jsx';

const item = { id: '1', feedback: 'x', status: 'new', severity: 'high' };
const statuses = { new: { label: 'New' }, resolved: { label: 'Resolved' } };

describe('WorkflowPanel', () => {
  it('renders status, severity, handoff when not developer', () => {
    render(<WorkflowPanel item={item} statuses={statuses} onStatusChange={() => {}} isDeveloper={false} />);
    expect(screen.getByText(/New/)).toBeInTheDocument();
    expect(screen.getByText(/High|Severity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy as/i })).toBeInTheDocument();
  });

  it('shows owner/customer/integrations/delete when developer', () => {
    const fullItem = { ...item, integrationState: { jira: { status: 'created', issueKey: 'A-1' } }, owner: { name: 'Alex' } };
    render(<WorkflowPanel item={fullItem} statuses={statuses} onStatusChange={() => {}} onOwnerChange={() => {}} onDelete={() => {}} onIntegrationRetry={() => {}} isDeveloper={true} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('A-1')).toBeInTheDocument();
    expect(screen.getByText(/delete/i)).toBeInTheDocument();
  });

  it('returns null when no item selected', () => {
    const { container } = render(<WorkflowPanel item={null} statuses={statuses} />);
    expect(container.textContent).toMatch(/select/i);
  });

  it('status change fires callback', () => {
    const fn = vi.fn();
    render(<WorkflowPanel item={item} statuses={statuses} onStatusChange={fn} isDeveloper={false} />);
    fireEvent.click(screen.getByText('New'));
    fireEvent.click(screen.getByText('Resolved'));
    expect(fn).toHaveBeenCalledWith('1', 'resolved');
  });
});
```

- [ ] **Step 15.2: Run to confirm fail**

Run: `npm test -- WorkflowPanel`
Expected: FAIL.

- [ ] **Step 15.3: Implement**

```jsx
// src/dashboard/WorkflowPanel.jsx
import React from 'react';
import styled from 'styled-components';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { WorkflowStatusControl } from './workflow/WorkflowStatusControl.jsx';
import { SeverityRow } from './workflow/SeverityRow.jsx';
import { OwnerRow } from './workflow/OwnerRow.jsx';
import { CustomerRow } from './workflow/CustomerRow.jsx';
import { IntegrationsRow } from './workflow/IntegrationsRow.jsx';
import { HandoffRow } from './workflow/HandoffRow.jsx';
import { DangerRow } from './workflow/DangerRow.jsx';

const Outer = styled.div`
  display: flex; flex-direction: column;
  height: 100%; overflow-y: auto;
  font-family: ${pickToken('font.sans')};
  color: ${pickToken('color.text')};
  background: ${pickToken('color.bg')};
`;
const RowBox = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${pickToken('color.border')};
`;
const Label = styled.div`
  font-size: ${pickToken('font.size.xs')};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${pickToken('color.textFaint')};
  margin-bottom: 8px;
`;
const Empty = styled.div`
  padding: 28px 18px;
  color: ${pickToken('color.textFaint')};
  text-align: center;
  font-size: ${pickToken('font.size.sm')};
`;

export function WorkflowPanel({
  item, statuses = {},
  isDeveloper = false,
  onStatusChange, onSeverityChange, onOwnerChange,
  onCustomerValueChange, onIntegrationRetry, onDelete,
}) {
  if (!item) return <Outer><Empty>Select a feedback to see workflow actions.</Empty></Outer>;
  return (
    <Outer>
      <RowBox><Label>Status</Label><WorkflowStatusControl status={item.status} statuses={statuses} onChange={(next) => onStatusChange?.(item.id, next)} /></RowBox>
      <RowBox><Label>Severity</Label><SeverityRow item={item} onChange={onSeverityChange} /></RowBox>
      {isDeveloper && <RowBox><Label>Owner</Label><OwnerRow item={item} isDeveloper={true} onChange={onOwnerChange} /></RowBox>}
      {isDeveloper && <RowBox><Label>Customer value</Label><CustomerRow item={item} isDeveloper={true} onChange={onCustomerValueChange} /></RowBox>}
      {isDeveloper && (item.integrationState?.jira || item.integrationState?.sheets) && (
        <RowBox><Label>Integrations</Label><IntegrationsRow item={item} isDeveloper={true} onRetry={onIntegrationRetry} /></RowBox>
      )}
      <RowBox><Label>Handoff</Label><HandoffRow item={item} /></RowBox>
      {isDeveloper && onDelete && <RowBox><Label>Danger zone</Label><DangerRow item={item} isDeveloper={true} onDelete={onDelete} /></RowBox>}
    </Outer>
  );
}
export default WorkflowPanel;
```

- [ ] **Step 15.4: Run test to confirm pass**

Run: `npm test -- WorkflowPanel`
Expected: PASS.

- [ ] **Step 15.5: Commit**

```bash
git add src/dashboard/WorkflowPanel.jsx src/dashboard/__tests__/WorkflowPanel.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add WorkflowPanel container

Stacks the seven workflow rows: status, severity, owner, customer
value, integrations, handoff, danger. Owner/customer/integrations/
delete gated by isDeveloper; integrations row hidden when item has
no integrationState. Empty state when no item selected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — `SummaryBar` + tests

**Files:** `src/dashboard/SummaryBar.jsx`, `src/dashboard/__tests__/SummaryBar.test.jsx`

- [ ] **Step 16.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SummaryBar } from '../SummaryBar.jsx';
import { CommandCenterProvider, useCommandCenter } from '../CommandCenterContext.jsx';

const items = [
  { id: '1', status: 'new', eventLogs: [{ type: 'console', level: 'error' }] },
  { id: '2', status: 'new', screenshot: 'x' },
  { id: '3', status: 'resolved', owner: { name: 'A' } },
];

function ReadFilters() {
  const { filters } = useCommandCenter();
  return <span data-testid="state">{JSON.stringify({ statuses: [...filters.statuses], flags: [...filters.flags] })}</span>;
}

describe('SummaryBar', () => {
  it('renders status counts', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /></CommandCenterProvider>);
    const newChip = screen.getAllByText(/^new$/i)[0];
    expect(newChip).toBeInTheDocument();
  });

  it('renders needs-attention counts', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /></CommandCenterProvider>);
    expect(screen.getByText(/needs owner/i)).toBeInTheDocument();
  });

  it('clicking a status chip toggles the filter', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /><ReadFilters /></CommandCenterProvider>);
    fireEvent.click(screen.getAllByText(/^new$/i)[0]);
    expect(screen.getByTestId('state').textContent).toContain('"statuses":["new"]');
    fireEvent.click(screen.getAllByText(/^new$/i)[0]);
    expect(screen.getByTestId('state').textContent).toContain('"statuses":[]');
  });

  it('clicking a needs-attention chip toggles flag filter', () => {
    render(<CommandCenterProvider><SummaryBar items={items} /><ReadFilters /></CommandCenterProvider>);
    fireEvent.click(screen.getByText(/has errors/i));
    expect(screen.getByTestId('state').textContent).toContain('"flags":["hasErrors"]');
  });
});
```

- [ ] **Step 16.2: Run to confirm fail**

Run: `npm test -- SummaryBar`
Expected: FAIL.

- [ ] **Step 16.3: Implement**

```jsx
// src/dashboard/SummaryBar.jsx
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Chip } from '../ui/primitives/Chip.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { useCommandCenter } from './CommandCenterContext.jsx';
import { getStatusCounts, getAttentionCounts } from './filtering.js';

const Bar = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid ${pickToken('color.border')};
  background: ${pickToken('color.bg')};
  font-family: ${pickToken('font.sans')};
`;
const Divider = styled.span`
  width: 1px; height: 22px;
  background: ${pickToken('color.border')};
  margin: 0 4px;
`;

const STATUS_ORDER = ['new', 'open', 'in_progress', 'resolved', 'closed'];
const STATUS_LABEL = { new: 'New', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

export function SummaryBar({ items = [] }) {
  const { filters, dispatch } = useCommandCenter();
  const statusCounts = useMemo(() => getStatusCounts(items), [items]);
  const attn = useMemo(() => getAttentionCounts(items), [items]);

  return (
    <Bar>
      {STATUS_ORDER.map((s) => (
        <Chip
          key={s}
          variant={filters.statuses.has(s) ? 'accent' : 'neutral'}
          onClick={() => dispatch({ type: 'TOGGLE_STATUS_FILTER', value: s })}
        >
          {STATUS_LABEL[s]} · {statusCounts[s] || 0}
        </Chip>
      ))}
      <Divider />
      <Chip variant={filters.flags.has('withMedia') ? 'accent' : 'neutral'} onClick={() => dispatch({ type: 'TOGGLE_FLAG_FILTER', value: 'withMedia' })}>
        With media · {attn.withMedia}
      </Chip>
      <Chip variant={filters.flags.has('hasErrors') ? 'accent' : 'neutral'} onClick={() => dispatch({ type: 'TOGGLE_FLAG_FILTER', value: 'hasErrors' })}>
        Has errors · {attn.hasErrors}
      </Chip>
      <Chip variant={filters.flags.has('needsOwner') ? 'accent' : 'neutral'} onClick={() => dispatch({ type: 'TOGGLE_FLAG_FILTER', value: 'needsOwner' })}>
        Needs owner · {attn.needsOwner}
      </Chip>
    </Bar>
  );
}
export default SummaryBar;
```

- [ ] **Step 16.4: Run test to confirm pass**

Run: `npm test -- SummaryBar`
Expected: PASS.

- [ ] **Step 16.5: Commit**

```bash
git add src/dashboard/SummaryBar.jsx src/dashboard/__tests__/SummaryBar.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add SummaryBar (status counts + needs-attention)

Reads items + filters from CommandCenterContext. Status count
chips (New/Open/In Progress/Resolved/Closed) toggle status
filters. Right-segment chips (With media / Has errors / Needs
owner) toggle attention flag filters. Counts memoised on items.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17 — `FeedbackCommandCenter` shell + tests

**Files:** `src/dashboard/FeedbackCommandCenter.jsx`, `src/dashboard/__tests__/FeedbackCommandCenter.test.jsx`

- [ ] **Step 17.1: Write the failing test**

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { FeedbackCommandCenter } from '../FeedbackCommandCenter.jsx';

const items = [
  { id: '1', feedback: 'one', status: 'new', timestamp: new Date(Date.now() - 5000).toISOString() },
  { id: '2', feedback: 'two', status: 'open', timestamp: new Date().toISOString() },
];

describe('FeedbackCommandCenter', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(<FeedbackCommandCenter isOpen={false} onClose={() => {}} data={items} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders shell when open', () => {
    render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    expect(screen.getByText(/Feedback/)).toBeInTheDocument();
  });

  it('Esc fires onClose', () => {
    const fn = vi.fn();
    render(<FeedbackCommandCenter isOpen onClose={fn} data={items} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fn).toHaveBeenCalled();
  });

  it('clicking the backdrop fires onClose', () => {
    const fn = vi.fn();
    const { container } = render(<FeedbackCommandCenter isOpen onClose={fn} data={items} />);
    const backdrop = container.querySelector('[data-role="backdrop"]');
    fireEvent.click(backdrop);
    expect(fn).toHaveBeenCalled();
  });

  it('shows item count chip', () => {
    render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it('defaults selection to the newest unresolved item', () => {
    render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    // sticky header shows the selected item's feedback
    expect(screen.getAllByText('two').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 17.2: Run to confirm fail**

Run: `npm test -- FeedbackCommandCenter`
Expected: FAIL.

- [ ] **Step 17.3: Implement**

```jsx
// src/dashboard/FeedbackCommandCenter.jsx
import React, { useEffect, useMemo } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { Chip } from '../ui/primitives/Chip.jsx';
import { IconButton } from '../ui/primitives/IconButton.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { tokens } from '../ui/tokens.js';
import { lightTheme, darkTheme } from '../theme.js';
import { CommandCenterProvider, useCommandCenter, useSelection } from './CommandCenterContext.jsx';
import { useFeedbackStore } from './useFeedbackStore.js';
import { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
import { getFilteredItems } from './filtering.js';
import { SummaryBar } from './SummaryBar.jsx';
import { TriageList } from './TriageList.jsx';
import { EvidenceStack } from './EvidenceStack.jsx';
import { WorkflowPanel } from './WorkflowPanel.jsx';
import { ErrorState } from './ErrorState.jsx';

const Root = styled.div`position: fixed; inset: 0; z-index: 10000; font-family: ${pickToken('font.sans')};`;
const Backdrop = styled.div`
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.35);
`;
const Panel = styled.div`
  position: absolute; top: 0; right: 0; bottom: 0;
  width: min(1280px, 92vw);
  background: ${pickToken('color.bg')};
  border-left: 1px solid ${pickToken('color.border')};
  border-radius: 14px 0 0 14px;
  box-shadow: -20px 0 50px rgba(28,25,23,0.18);
  display: grid;
  grid-template-rows: 56px 60px 1fr 36px;
  grid-template-columns: 320px minmax(360px, 1fr) 320px;
`;
const Header = styled.header`
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid ${pickToken('color.border')};
  background: ${pickToken('color.bg')};
`;
const Title = styled.div`font-size: ${pickToken('font.size.md')}; font-weight: 600;`;
const Spacer = styled.div`flex: 1;`;
const SummarySlot = styled.div`grid-column: 1 / -1;`;
const Body = styled.div`grid-column: 1 / -1; display: grid; grid-template-columns: 320px minmax(360px, 1fr) 320px; min-height: 0;`;
const Col = styled.div`min-height: 0; border-right: 1px solid ${pickToken('color.border')}; &:last-child { border-right: 0; }`;
const Footer = styled.footer`
  grid-column: 1 / -1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px;
  border-top: 1px solid ${pickToken('color.border')};
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textFaint')};
  background: ${pickToken('color.bg')};
`;

function pickDefaultSelected(items) {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  const unresolved = sorted.find((i) => !['resolved', 'closed'].includes(i.status));
  return (unresolved || sorted[0]).id;
}

function Inner({
  isOpen, onClose, items, isLoading, error, refresh,
  statuses, customStatuses, isDeveloper, isUser,
  onStatusChange, onSeverityChange, onOwnerChange, onCustomerValueChange, onIntegrationRetry, onDelete,
}) {
  const { filters, dispatch } = useCommandCenter();
  const { selectedId, select } = useSelection();
  const filteredItems = useMemo(() => getFilteredItems(items, filters), [items, filters]);
  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  // initial default selection
  useEffect(() => {
    if (!selectedId && items.length > 0) {
      const id = pickDefaultSelected(items);
      if (id) select(id);
    }
  }, [selectedId, items, select]);

  // re-resolve selection if it disappears
  useEffect(() => {
    if (selectedId && !items.find((i) => i.id === selectedId)) {
      const id = pickDefaultSelected(items);
      select(id);
    }
  }, [selectedId, items, select]);

  // keyboard
  useKeyboardShortcuts({
    enabled: isOpen,
    shortcuts: {
      Escape: () => onClose?.(),
      '/': () => document.querySelector('input[placeholder*="Search feedback"]')?.focus(),
      'j': () => {
        const idx = filteredItems.findIndex((i) => i.id === selectedId);
        const next = filteredItems[Math.min(filteredItems.length - 1, idx + 1)];
        if (next) select(next.id);
      },
      'k': () => {
        const idx = filteredItems.findIndex((i) => i.id === selectedId);
        const next = filteredItems[Math.max(0, idx - 1)];
        if (next) select(next.id);
      },
    },
  });

  const statusMap = customStatuses || statuses || {};

  return (
    <Root>
      <Backdrop data-role="backdrop" onClick={onClose} />
      <Panel role="dialog" aria-modal="true" aria-label="Feedback Command Center">
        <Header>
          <Title>Feedback</Title>
          <Chip>{items.length} items</Chip>
          <Spacer />
          {refresh && <IconButton aria-label="Refresh" icon={<span>↻</span>} onClick={refresh} />}
          <IconButton aria-label="Close" icon={<span>×</span>} onClick={onClose} />
        </Header>
        <SummarySlot><SummaryBar items={items} /></SummarySlot>
        <Body>
          <Col>
            {error
              ? <ErrorState message={String(error?.message || error)} onRetry={refresh} />
              : <TriageList items={filteredItems} />}
          </Col>
          <Col><EvidenceStack item={selectedItem} /></Col>
          <Col>
            <WorkflowPanel
              item={selectedItem}
              statuses={statusMap}
              isDeveloper={isDeveloper}
              onStatusChange={onStatusChange}
              onSeverityChange={onSeverityChange}
              onOwnerChange={onOwnerChange}
              onCustomerValueChange={onCustomerValueChange}
              onIntegrationRetry={onIntegrationRetry}
              onDelete={onDelete}
            />
          </Col>
        </Body>
        <Footer>
          <span>{isLoading ? 'Loading…' : `${items.length} items`}</span>
          <span>/ search · j/k next-prev · Esc close</span>
        </Footer>
      </Panel>
    </Root>
  );
}

export function FeedbackCommandCenter(props) {
  if (!props.isOpen) return null;
  const mode = props.mode === 'dark' ? 'dark' : 'light';
  const themeBase = mode === 'dark' ? darkTheme : lightTheme;
  const themeWithTokens = { ...themeBase, tokens: mode === 'dark' ? tokens.dark : tokens.light };
  const storeOpts = props.data
    ? { mode: 'prop', data: props.data }
    : (props.dataSource ? { mode: 'source', source: props.dataSource } : { mode: 'localStorage' });
  const { items, isLoading, error, save, remove, refresh } = useFeedbackStore(storeOpts);

  // Wire delete + status change through callbacks the host already provides; for localStorage mode also persist.
  const handleStatusChange = (id, next) => {
    props.onStatusChange?.(id, next);
    const cur = items.find((i) => i.id === id);
    if (cur && storeOpts.mode === 'localStorage') save({ ...cur, status: next });
  };
  const handleDelete = (id) => {
    props.onDelete?.(id);
    if (storeOpts.mode === 'localStorage') remove(id);
  };

  return (
    <ThemeProvider theme={themeWithTokens}>
      <CommandCenterProvider>
        <Inner
          {...props}
          items={items}
          isLoading={isLoading}
          error={error}
          refresh={props.dataSource ? refresh : null}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </CommandCenterProvider>
    </ThemeProvider>
  );
}
export default FeedbackCommandCenter;
```

- [ ] **Step 17.4: Run test to confirm pass**

Run: `npm test -- FeedbackCommandCenter`
Expected: PASS.

- [ ] **Step 17.5: Commit**

```bash
git add src/dashboard/FeedbackCommandCenter.jsx src/dashboard/__tests__/FeedbackCommandCenter.test.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add FeedbackCommandCenter shell

Wider slide-out (88vw / 1280px) with backdrop. Internal CSS grid:
header / summary bar / 3-column body / footer. Wires
CommandCenterContext, useFeedbackStore, and useKeyboardShortcuts.
Default selection picks the newest unresolved item; selection
re-resolves when the previously-selected item disappears.
LocalStorage mode persists status/delete back transparently while
still firing host callbacks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18 — Wire `FeedbackDashboard` as wrapper; update `FeedbackProvider`; `src/index.js`; rollup/package

**Files:** `src/FeedbackDashboard.jsx`, `src/FeedbackProvider.jsx`, `src/index.js`, `rollup.config.js`, `package.json`, `src/dashboard/index.js`.

- [ ] **Step 18.1: Inspect the existing `FeedbackDashboard.jsx` exports**

Run: `/usr/bin/grep -n "^export" src/FeedbackDashboard.jsx`
Expected output includes at least:
- `export const FEEDBACK_STORAGE_KEY = '...'`
- `export const DEFAULT_STATUSES = ...`
- `export const FeedbackDashboard = (...)`
- `export const saveFeedbackToLocalStorage = ...`

Note the names; we must preserve them.

- [ ] **Step 18.2: Move the legacy body aside**

```bash
mkdir -p src/dashboard/legacy
git mv src/FeedbackDashboard.jsx src/dashboard/legacy/FeedbackDashboardLegacy.jsx
```

Edit `src/dashboard/legacy/FeedbackDashboardLegacy.jsx` and rename the exported component:
- Replace `export const FeedbackDashboard = (` with `export const FeedbackDashboardLegacy = (`.
- Leave every other export untouched.

- [ ] **Step 18.3: Create the new shim `src/FeedbackDashboard.jsx`**

```jsx
import React from 'react';
import { FeedbackCommandCenter } from './dashboard/FeedbackCommandCenter.jsx';

// Re-exports preserved for backward compatibility:
export {
  FEEDBACK_STORAGE_KEY,
  DEFAULT_STATUSES,
  saveFeedbackToLocalStorage,
} from './dashboard/legacy/FeedbackDashboardLegacy.jsx';

/**
 * Backward-compat wrapper. The 1068-line legacy implementation
 * still exists under src/dashboard/legacy/ as FeedbackDashboardLegacy,
 * but FeedbackDashboard now renders the new Command Center shell.
 * Public props unchanged.
 */
export const FeedbackDashboard = (props) => {
  return <FeedbackCommandCenter {...props} />;
};

export default FeedbackDashboard;
```

- [ ] **Step 18.4: Update `src/FeedbackProvider.jsx`**

Read the file, find the existing `<FeedbackDashboard` mount around line 976, and verify it now imports + renders the wrapper correctly. The import path is unchanged (`./FeedbackDashboard.jsx`).

No code change needed if the import points at `./FeedbackDashboard.jsx`. If it points at a deeper path, update to `./FeedbackDashboard.jsx`.

- [ ] **Step 18.5: Create `src/dashboard/index.js` barrel**

```js
export { FeedbackCommandCenter } from './FeedbackCommandCenter.jsx';
export { CommandCenterProvider, useCommandCenter, useSelection } from './CommandCenterContext.jsx';
export { useFeedbackStore, LS_KEY } from './useFeedbackStore.js';
export { useSectionState, SECTION_LS_KEY } from './useSectionState.js';
export { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
export { getFilteredItems, getStatusCounts, getAttentionCounts, initialFilters } from './filtering.js';
export { TriageList } from './TriageList.jsx';
export { TriageListRow } from './TriageListRow.jsx';
export { EvidenceStack } from './EvidenceStack.jsx';
export { WorkflowPanel } from './WorkflowPanel.jsx';
export { SummaryBar } from './SummaryBar.jsx';
export { EmptyState } from './EmptyState.jsx';
export { ErrorState } from './ErrorState.jsx';
export { ConfirmButton } from './ConfirmButton.jsx';
```

- [ ] **Step 18.6: Update `src/index.js`**

Add a single export line after the existing `FeedbackDashboard` re-export:

```js
export { FeedbackCommandCenter } from './dashboard/FeedbackCommandCenter.jsx';
```

(Preserve every existing export. Don't move imports around.)

- [ ] **Step 18.7: Add `./dashboard` rollup bundle**

Edit `rollup.config.js`. After the UI primitives bundle add:

```js
  // Dashboard / Command Center bundle
  {
    input: 'src/dashboard/index.js',
    output: [
      { file: 'dist/dashboard/index.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/dashboard/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
```

- [ ] **Step 18.8: Add `./dashboard` subpath export to `package.json`**

In the `exports` block, after the existing `./ui` entry add:

```json
    "./dashboard": {
      "types": "./dist/types.d.ts",
      "import": "./dist/dashboard/index.esm.js",
      "require": "./dist/dashboard/index.js"
    },
```

- [ ] **Step 18.9: Verify build + tests**

```bash
npm test
npm run build
```

Expected: tests pass; `dist/dashboard/index.{js,esm.js}` present.

- [ ] **Step 18.10: Commit**

```bash
git add src/FeedbackDashboard.jsx src/dashboard/legacy/FeedbackDashboardLegacy.jsx src/dashboard/index.js src/index.js rollup.config.js package.json
git commit -m "$(cat <<'EOF'
feat: wire FeedbackCommandCenter; preserve FeedbackDashboard API

FeedbackDashboard.jsx becomes a thin shim that renders
FeedbackCommandCenter; the 1068-line legacy body moves to
src/dashboard/legacy/FeedbackDashboardLegacy.jsx and keeps its
side-effect exports (FEEDBACK_STORAGE_KEY, DEFAULT_STATUSES,
saveFeedbackToLocalStorage) re-exported unchanged. Adds
react-visual-feedback/dashboard subpath export and a rollup entry
producing dist/dashboard/index.{js,esm.js}.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19 — Backward-compat + a11y + un-skip legacy tests

**Files:** `src/dashboard/__tests__/backward-compat.test.jsx`, `src/dashboard/__tests__/command-center.a11y.test.jsx`, `src/__tests__/FeedbackFeatures.test.js`

- [ ] **Step 19.1: Write `backward-compat.test.jsx`**

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeedbackDashboard, FEEDBACK_STORAGE_KEY, DEFAULT_STATUSES, saveFeedbackToLocalStorage } from '../../FeedbackDashboard.jsx';

describe('FeedbackDashboard backward compat', () => {
  it('side-effect exports survive the wrapper', () => {
    expect(typeof FEEDBACK_STORAGE_KEY).toBe('string');
    expect(typeof DEFAULT_STATUSES).toBe('object');
    expect(typeof saveFeedbackToLocalStorage).toBe('function');
  });

  it('renders without warnings when given current prop shape', () => {
    const { container } = render(
      <FeedbackDashboard
        isOpen={true}
        onClose={() => {}}
        data={[{ id: '1', feedback: 'hi', status: 'new' }]}
        isDeveloper={false}
        mode="light"
      />
    );
    expect(container.textContent).toMatch(/Feedback/);
  });
});
```

- [ ] **Step 19.2: Write `command-center.a11y.test.jsx`**

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { FeedbackCommandCenter } from '../FeedbackCommandCenter.jsx';

const items = [
  { id: '1', feedback: 'hello world', type: 'bug', status: 'new', severity: 'high', timestamp: new Date().toISOString(), userName: 'M' },
];

describe('FeedbackCommandCenter a11y', () => {
  it('passes axe on a default render', async () => {
    const { container } = render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

- [ ] **Step 19.3: Un-skip the legacy feature test**

Open `src/__tests__/FeedbackFeatures.test.js`. Replace every `describe.skip(` with `describe(`. The existing test bodies should still pass since `<FeedbackProvider dashboard={true}>` still mounts a dashboard (now the Command Center wrapper).

If any case relies on the legacy 700px slide-out width or specific selectors that no longer exist, replace those assertions with the new equivalent — at minimum verify that pressing `Alt+Q` opens the dashboard and Esc closes it.

- [ ] **Step 19.4: Run the full suite**

Run: `npm test`
Expected: every Phase A test, every B1 primitive test, every B2 test passes. Skipped count should drop to 0.

- [ ] **Step 19.5: Commit**

```bash
git add src/dashboard/__tests__/backward-compat.test.jsx src/dashboard/__tests__/command-center.a11y.test.jsx src/__tests__/FeedbackFeatures.test.js
git commit -m "$(cat <<'EOF'
test(dashboard): backward-compat + axe + un-skipped legacy suite

backward-compat.test.jsx verifies FeedbackDashboard.jsx still
re-exports FEEDBACK_STORAGE_KEY, DEFAULT_STATUSES, and
saveFeedbackToLocalStorage and renders with the current prop
shape. command-center.a11y.test.jsx gates the default Command
Center render through axe. The previously-skipped
FeedbackFeatures suite is un-skipped now that jsdom and the
dashboard are wired up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20 — README + CHANGELOG + final manual verify

**Files:** `README.md`, `CHANGELOG.md`

- [ ] **Step 20.1: Update README**

Find the "UI primitives" section. Below it, add:

```markdown
## Command Center (v2.3+)

Phase B2 ships the Command Center: a wider three-pane workspace
(Triage list · Evidence Stack · Workflow Panel) that replaces the
internals of `FeedbackDashboard`. Existing consumers don't need any
code change — `<FeedbackProvider dashboard={true}>` continues to
work and now opens the Command Center.

Direct import:

\`\`\`js
import { FeedbackCommandCenter } from 'react-visual-feedback/dashboard';
\`\`\`

The Command Center accepts the same prop shape as
`FeedbackDashboard` plus optional Phase A fields:
`onSeverityChange`, `onOwnerChange`, `onCustomerValueChange`,
`onIntegrationRetry`, `onDelete`, and an async `dataSource={{ load,
save, remove, subscribe }}` for hosts that want server-driven data
instead of localStorage.

Keyboard: `Esc` close · `/` focus search · `j` / `k` next-prev item.
```

- [ ] **Step 20.2: Update CHANGELOG**

Find the `## [Unreleased]` block from B1 and append:

```markdown
- **Command Center workspace.** Wider three-pane shell replaces the
  internals of FeedbackDashboard while keeping every public export
  byte-compatible. New triage list with thumbnails, collapsible
  Evidence Stack with always-visible section summaries, full
  Workflow Panel (status, severity, owner, customer, integrations,
  copy-as handoff, danger zone with inline confirm), and a Summary
  Bar with status counts + needs-attention shortcuts as one-click
  filters.
- New `react-visual-feedback/dashboard` subpath export with
  `FeedbackCommandCenter`, hooks, and pure helpers.
- Optional `dataSource` prop for async / server-driven data sources.
- Keyboard shortcuts: Esc, /, j, k.
```

- [ ] **Step 20.3: Final verification**

```bash
npm test
npm run build
```

Expected: full suite passes; `dist/dashboard/index.{js,esm.js}` produced.

Manual: `cd example-nextjs && npm install && PORT=3005 npm run dev`. Open `http://localhost:3005`. Submit two or three feedback items (Alt+A). Press Alt+Q to open the dashboard. Verify the ten checks listed in the spec's "Manual verification" section. Note any issues; small fixes go in this task, larger issues become follow-up commits.

- [ ] **Step 20.4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: announce Phase B2 — Command Center workspace

README gains a Command Center section pointing at the new
react-visual-feedback/dashboard subpath and listing the new
optional props + keyboard shortcuts. CHANGELOG's Unreleased
section grows with the B2 surface area. FeedbackDashboard
remains byte-compatible.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**

- [x] vitest.config scope expansion — Task 1
- [x] `filtering.js` + helpers — Task 2
- [x] `useFeedbackStore` (prop / source / localStorage) — Task 3
- [x] `useSectionState` — Task 4
- [x] `useKeyboardShortcuts` — Task 5
- [x] `CommandCenterContext` — Task 6
- [x] `ConfirmButton` — Task 7
- [x] `EmptyState` + `ErrorState` — Task 8
- [x] `TriageListRow` — Task 9
- [x] `TriageList` — Task 10
- [x] Four `sections/*` — Task 11
- [x] `EvidenceStack` — Task 12
- [x] `WorkflowStatusControl` — Task 13
- [x] Six workflow rows — Task 14
- [x] `WorkflowPanel` — Task 15
- [x] `SummaryBar` — Task 16
- [x] `FeedbackCommandCenter` shell — Task 17
- [x] `FeedbackDashboard` wrapper + `FeedbackProvider` + index + rollup + package.json — Task 18
- [x] Backward-compat + a11y + un-skip legacy tests — Task 19
- [x] README + CHANGELOG + final verify — Task 20

**Placeholder scan:** no "TBD", "TODO", or hand-wavy steps. Every code block is concrete.

**Type consistency:** Section component contract — each exports `summary(item)`, `title`, `id`, optional `shouldRender(item)`. EvidenceStack consumes them by name. Hook return shapes match what containers destructure. CommandCenterContext action types match Reducer cases. `FeedbackCommandCenter` props mirror the spec's interface.

**Known caveats deferred:**
- Virtualisation in TriageList is implemented as "render all" in the plan's TriageList step (matching the spec's "≤ 200 items → render all"). The windowed renderer kicks in only via a follow-up if performance complaints appear. The spec explicitly allows this.
- Status history strip mentioned in the spec is omitted from WorkflowPanel; it can ship in Phase C polish.
- `acceptableStatuses` prop on the spec is currently passed through but not surfaced as an option filter — same minor follow-up.
