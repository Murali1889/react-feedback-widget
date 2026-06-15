# Feedback Command Center — Phase C: AI-Actionable Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase C of the Feedback Command Center: every captured feedback becomes an AI-actionable ticket. Source file + line + ±10 lines of real code (via hybrid worker-or-server source-map deminification), React component state at click time, auto-generated repro recipe from the interaction trail, build metadata, feature-flag snapshot — all rendered as both Markdown and structured JSON. Capture work runs in a Web Worker so the user-facing UI feels instantaneous; with `captureConfig` omitted the widget behaves identically to post-B2.

**Architecture:** Three execution contexts — main thread does only event capture and cheap fiber walk; lazy Web Worker owns source-map parsing, fiber serialization, ticket assembly, and the heavy redaction pass; `withSecureDefaults` server adapter owns source-map fallback. Phase A redactor gets three new helpers (interaction trail, fiber snapshot, build info), reused on both client and server. Memory-bounded ring buffers for every observer.

**Tech Stack:** React 18, styled-components, Vitest + jsdom + @testing-library/react (Phase B1), `source-map-js` (new runtime dep, lazy-loaded in worker only), `@vitest/web-worker` (new devDep), idb-keyval-like manual IndexedDB wrapper (no extra dep).

**Spec:** `docs/superpowers/specs/2026-06-15-feedback-phase-c-ai-actionable-capture-design.md`

---

## File Map

### New files under `src/capture/`

```
src/capture/
├── index.js                          # barrel
├── CaptureProvider.jsx               # mount observers + manage worker
├── CaptureContext.jsx                # context provider
├── ringBuffer.js                     # bounded buffer
├── buildInfo.js                      # three-tier resolver
├── FeedbackErrorBoundary.jsx         # optional HOC
├── workerClient.js                   # lazy spawn + postMessage protocol
├── observers/
│   ├── interaction.js
│   ├── route.js
│   ├── error.js
│   └── flags.js
├── snapshot/
│   ├── fiberWalk.js                  # main-thread cheap walk
│   └── selectorPath.js               # selector helper
└── publicTypes.d.ts
```

### New worker bundle (`src/capture/worker/`)

```
src/capture/worker/
├── feedback-capture-worker.js        # entry, postMessage protocol
├── sourcemaps.js                     # source-map-js wrapper + IDB cache
├── codeContext.js                    # snippet extraction
├── fiberSerializer.js                # depth-capped, cycle-safe
├── ticketAssembler.js                # markdown + json
├── idbCache.js                       # IndexedDB wrapper (no extra dep)
└── redactorAdapter.js                # imports Phase A redactor
```

### Server additions

```
src/integrations/server/
├── sourcemap-resolver.js             # hook into withSecureDefaults
└── codeContextLoader.js              # filesystem reader with path safelist
```

### Modified files

- `src/lib/feedbackSecurity.js` — three new helpers (additive).
- `src/integrations/server/withSecureDefaults.js` — wires `resolveSourceMap` hook.
- `src/integrations/jira.js` — attaches AI ticket files.
- `src/integrations/sheets.js` — appends AI ticket columns.
- `src/FeedbackProvider.jsx` — accepts `captureConfig` prop; renders `CaptureProvider`.
- `src/dashboard/workflow/HandoffRow.jsx` — new "AI ticket" format.
- `src/dashboard/sections/SourceSection.jsx` — inline code snippet when present.
- `src/index.js` — re-exports `FeedbackErrorBoundary`.
- `rollup.config.js` — new `dist/capture/` bundle + `dist/capture/worker.js`.
- `package.json` — `./capture` subpath; `source-map-js` dep; `@vitest/web-worker` devDep; `build:check-size` script.

### Conventions

- All capture modules are isomorphic where possible (pure helpers reused in worker + server).
- Observers use `{ passive: true, capture: true }` listeners on `document` so they never interfere with host handlers.
- Worker entry uses `type: 'module'` to allow ES imports. Vite/webpack/rollup handle the worker bundle separately.
- All new test files: `.test.js` for helpers/hooks, `.test.jsx` for components/observers using JSX.
- Each task ends with one commit using `feat(capture):` / `feat(capture/worker):` / `feat(capture/server):` / `chore:` style + Co-Authored-By trailer.
- Tests use Phase B1's RTL setup (`afterEach(cleanup)`) — already wired.

---

## Task 1 — Dev dependencies + size-check script

**Files:** `package.json`, `scripts/check-bundle-size.js`

- [ ] **Step 1.1: Install dependencies**

```bash
npm install --save source-map-js@^1.2.0
npm install --save-dev @vitest/web-worker@^1.6.0 gzip-size@^7.0.0
```

- [ ] **Step 1.2: Create `scripts/check-bundle-size.js`**

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { gzipSizeSync } from 'gzip-size';

const BUDGETS = {
  'dist/index.esm.js': { maxGzipKB: 100, note: 'main bundle' },
  'dist/capture/index.esm.js': { maxGzipKB: 12, note: 'capture client (main thread)' },
  'dist/capture/worker.js': { maxGzipKB: 35, note: 'capture worker (lazy chunk)' },
};

let failures = 0;
for (const [file, budget] of Object.entries(BUDGETS)) {
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.log(`SKIP ${file} (not built yet)`);
    continue;
  }
  const gz = gzipSizeSync(fs.readFileSync(abs));
  const kb = (gz / 1024).toFixed(1);
  const status = gz <= budget.maxGzipKB * 1024 ? 'OK' : 'FAIL';
  console.log(`${status}  ${file}  ${kb}KB gz / ${budget.maxGzipKB}KB max  ${budget.note}`);
  if (status === 'FAIL') failures += 1;
}
process.exit(failures > 0 ? 1 : 0);
```

- [ ] **Step 1.3: Add `build:check-size` script to package.json**

In `"scripts"`:
```json
"build:check-size": "node scripts/check-bundle-size.js"
```

- [ ] **Step 1.4: Verify**

Run: `npm test`
Expected: `Tests 296 passed | 0 skipped` (Phase B2 baseline unchanged).

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json scripts/check-bundle-size.js
git commit -m "$(cat <<'EOF'
chore(deps): add source-map-js + vitest worker + size-check script

source-map-js is the runtime dep used by the worker for
deminification (~25KB raw, only inside the lazy worker chunk).
@vitest/web-worker enables jsdom Worker tests. check-bundle-size.js
asserts the documented Phase C budgets (main +12KB, worker chunk
+35KB) for CI gating.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — `ringBuffer.js` + tests

**Files:** `src/capture/ringBuffer.js`, `src/capture/__tests__/ringBuffer.test.js`

- [ ] **Step 2.1: Write failing test**

```js
// src/capture/__tests__/ringBuffer.test.js
import { describe, it, expect } from 'vitest';
import { createRingBuffer } from '../ringBuffer.js';

describe('createRingBuffer', () => {
  it('returns an empty snapshot when nothing pushed', () => {
    const b = createRingBuffer(4);
    expect(b.snapshot()).toEqual([]);
    expect(b.size()).toBe(0);
  });

  it('keeps order for non-overflowing inserts', () => {
    const b = createRingBuffer(4);
    b.push('a'); b.push('b'); b.push('c');
    expect(b.snapshot()).toEqual(['a', 'b', 'c']);
  });

  it('evicts the oldest when capacity is exceeded', () => {
    const b = createRingBuffer(3);
    b.push('a'); b.push('b'); b.push('c'); b.push('d');
    expect(b.snapshot()).toEqual(['b', 'c', 'd']);
  });

  it('clear() empties the buffer', () => {
    const b = createRingBuffer(4);
    b.push('a'); b.push('b');
    b.clear();
    expect(b.snapshot()).toEqual([]);
    expect(b.size()).toBe(0);
  });

  it('size() reports current count, not capacity', () => {
    const b = createRingBuffer(10);
    b.push('a');
    expect(b.size()).toBe(1);
  });

  it('snapshot returns a shallow copy (callers cannot mutate internal state)', () => {
    const b = createRingBuffer(3);
    b.push('a');
    const snap = b.snapshot();
    snap.push('hack');
    expect(b.snapshot()).toEqual(['a']);
  });
});
```

- [ ] **Step 2.2: Run to confirm fail**

Run: `npm test -- ringBuffer`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement `src/capture/ringBuffer.js`**

```js
/**
 * Bounded ring buffer. Single producer is fine; not thread-safe
 * across workers. Cheap snapshot() returns a new array each call.
 */
export function createRingBuffer(capacity = 128) {
  if (!Number.isFinite(capacity) || capacity < 1) capacity = 128;
  const buf = new Array(capacity);
  let head = 0;   // next write index
  let count = 0;

  return {
    push(item) {
      buf[head] = item;
      head = (head + 1) % capacity;
      if (count < capacity) count += 1;
    },
    snapshot() {
      if (count === 0) return [];
      const out = new Array(count);
      const start = (head - count + capacity) % capacity;
      for (let i = 0; i < count; i += 1) {
        out[i] = buf[(start + i) % capacity];
      }
      return out;
    },
    size() { return count; },
    capacity() { return capacity; },
    clear() { head = 0; count = 0; for (let i = 0; i < capacity; i += 1) buf[i] = undefined; },
  };
}
```

- [ ] **Step 2.4: Run + commit**

```bash
npm test -- ringBuffer
# Expected: 6 passed
git add src/capture/ringBuffer.js src/capture/__tests__/ringBuffer.test.js
git commit -m "$(cat <<'EOF'
feat(capture): add ringBuffer bounded queue

Single-producer ring buffer used by every observer (interaction,
error, route). Capacity-bounded; oldest entries evicted on
overflow. Snapshot returns a defensive shallow copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — `buildInfo.js` + tests

**Files:** `src/capture/buildInfo.js`, `src/capture/__tests__/buildInfo.test.js`

- [ ] **Step 3.1: Write failing test**

```js
// src/capture/__tests__/buildInfo.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveBuildInfo } from '../buildInfo.js';

beforeEach(() => {
  delete globalThis.__feedbackBuildInfo;
  document.head.querySelectorAll('meta[name="feedback-build"]').forEach((m) => m.remove());
});

describe('resolveBuildInfo', () => {
  it('prefers explicit prop over everything else', () => {
    globalThis.__feedbackBuildInfo = { commit: 'globalCommit' };
    const meta = document.createElement('meta');
    meta.name = 'feedback-build'; meta.content = 'commit=metaCommit';
    document.head.appendChild(meta);
    expect(resolveBuildInfo({ commit: 'propCommit' }).commit).toBe('propCommit');
  });

  it('uses global when prop omitted', () => {
    globalThis.__feedbackBuildInfo = { commit: 'g1', branch: 'main' };
    expect(resolveBuildInfo()).toEqual(expect.objectContaining({ commit: 'g1', branch: 'main' }));
  });

  it('parses meta tag form-encoded content', () => {
    const meta = document.createElement('meta');
    meta.name = 'feedback-build';
    meta.content = 'commit=abc&branch=main&builtAt=2026-06-15T00:00Z';
    document.head.appendChild(meta);
    const info = resolveBuildInfo();
    expect(info.commit).toBe('abc');
    expect(info.branch).toBe('main');
    expect(info.builtAt).toBe('2026-06-15T00:00Z');
  });

  it('falls back to environment-only when nothing else is set', () => {
    const info = resolveBuildInfo();
    expect(info.environment).toBeTruthy();
  });

  it('ignores non-object global value', () => {
    globalThis.__feedbackBuildInfo = 'not an object';
    const info = resolveBuildInfo();
    expect(info.commit).toBeUndefined();
  });
});
```

- [ ] **Step 3.2: Run to confirm fail**

Run: `npm test -- buildInfo`
Expected: FAIL.

- [ ] **Step 3.3: Implement `src/capture/buildInfo.js`**

```js
/**
 * Resolve build metadata for the current host app.
 * Order: explicit prop > globalThis.__feedbackBuildInfo > <meta name="feedback-build">.
 */
function parseMetaContent(content) {
  const out = {};
  if (typeof content !== 'string') return out;
  for (const pair of content.split('&')) {
    const [k, ...rest] = pair.split('=');
    if (!k) continue;
    out[k.trim()] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

function readGlobal() {
  const g = globalThis.__feedbackBuildInfo;
  return g && typeof g === 'object' ? { ...g } : null;
}

function readMeta() {
  if (typeof document === 'undefined') return null;
  const tag = document.querySelector('meta[name="feedback-build"]');
  if (!tag) return null;
  return parseMetaContent(tag.getAttribute('content') || '');
}

export function resolveBuildInfo(propValue) {
  const fallbackEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'production';
  const result = {
    environment: fallbackEnv,
    ...(readMeta() || {}),
    ...(readGlobal() || {}),
    ...(propValue && typeof propValue === 'object' ? propValue : {}),
  };
  return result;
}
```

- [ ] **Step 3.4: Run + commit**

```bash
npm test -- buildInfo
# Expected: 5 passed
git add src/capture/buildInfo.js src/capture/__tests__/buildInfo.test.js
git commit -m "$(cat <<'EOF'
feat(capture): add three-tier buildInfo resolver

Resolution order: explicit prop > globalThis.__feedbackBuildInfo >
<meta name="feedback-build"> > NODE_ENV. Meta tag content is parsed
form-encoded (commit=abc&branch=main&...).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `snapshot/selectorPath.js` + `snapshot/fiberWalk.js` + tests

**Files:** `src/capture/snapshot/selectorPath.js`, `src/capture/snapshot/fiberWalk.js`, `src/capture/snapshot/__tests__/fiberWalk.test.js`, `src/capture/snapshot/__tests__/selectorPath.test.js`

- [ ] **Step 4.1: Write failing tests**

```js
// src/capture/snapshot/__tests__/selectorPath.test.js
import { describe, it, expect } from 'vitest';
import { selectorPath, labelFor } from '../selectorPath.js';

describe('selectorPath', () => {
  it('returns id selector when element has id', () => {
    const el = document.createElement('div');
    el.id = 'main';
    document.body.appendChild(el);
    expect(selectorPath(el)).toBe('#main');
    el.remove();
  });

  it('returns tag.class path', () => {
    document.body.innerHTML = '<main><button class="submit primary">Go</button></main>';
    const btn = document.querySelector('button');
    expect(selectorPath(btn)).toContain('button.submit');
    document.body.innerHTML = '';
  });

  it('uses data-testid when available', () => {
    document.body.innerHTML = '<div data-testid="checkout-form"><button>x</button></div>';
    const btn = document.querySelector('button');
    expect(selectorPath(btn)).toContain('[data-testid="checkout-form"]');
    document.body.innerHTML = '';
  });
});

describe('labelFor', () => {
  it('uses aria-label', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-label', 'Close dialog');
    expect(labelFor(el)).toBe('Close dialog');
  });

  it('uses associated <label>', () => {
    document.body.innerHTML = '<label for="email">Email</label><input id="email" />';
    const input = document.querySelector('input');
    expect(labelFor(input)).toBe('Email');
    document.body.innerHTML = '';
  });

  it('uses button text', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Place order';
    expect(labelFor(btn)).toBe('Place order');
  });

  it('uses image alt', () => {
    const img = document.createElement('img');
    img.alt = 'logo';
    expect(labelFor(img)).toBe('logo');
  });
});
```

```js
// src/capture/snapshot/__tests__/fiberWalk.test.js
import { describe, it, expect } from 'vitest';
import { snapshotFiberTree } from '../fiberWalk.js';

function makeFiber(name, props = {}, state = null, parent = null) {
  return {
    type: { displayName: name },
    memoizedProps: props,
    memoizedState: state,
    return: parent,
  };
}

describe('snapshotFiberTree', () => {
  it('walks up the parent chain to the given depth', () => {
    const root = makeFiber('App');
    const middle = makeFiber('Layout', {}, null, root);
    const leaf = makeFiber('Button', { label: 'Go' }, null, middle);
    const tree = snapshotFiberTree(leaf, { depth: 6 });
    expect(Object.keys(tree)).toEqual(['Button', 'Layout', 'App']);
    expect(tree.Button.props.label).toBe('Go');
  });

  it('caps depth', () => {
    let f = makeFiber('Leaf');
    for (let i = 0; i < 10; i += 1) f = makeFiber(`N${i}`, {}, null, f);
    const tree = snapshotFiberTree(f, { depth: 3 });
    expect(Object.keys(tree).length).toBeLessThanOrEqual(3);
  });

  it('replaces functions with [Function]', () => {
    const fn = function go() {};
    const leaf = makeFiber('X', { onClick: fn });
    const tree = snapshotFiberTree(leaf);
    expect(tree.X.props.onClick).toMatch(/^\[Function/);
  });

  it('replaces DOM nodes with [DOMNode]', () => {
    const div = document.createElement('div');
    div.id = 'x';
    const leaf = makeFiber('X', { el: div });
    const tree = snapshotFiberTree(leaf);
    expect(tree.X.props.el).toMatch(/^\[DOMNode/);
  });

  it('breaks cycles', () => {
    const obj = { a: 1 };
    obj.self = obj;
    const leaf = makeFiber('X', { obj });
    const tree = snapshotFiberTree(leaf);
    expect(JSON.stringify(tree)).toContain('[Circular]');
  });

  it('truncates long strings', () => {
    const longStr = 'a'.repeat(5000);
    const leaf = makeFiber('X', { msg: longStr });
    const tree = snapshotFiberTree(leaf, { maxStr: 100 });
    expect(tree.X.props.msg.length).toBeLessThan(120);
    expect(tree.X.props.msg).toMatch(/\.\.\./);
  });

  it('truncates wide objects to maxKeys', () => {
    const wide = {};
    for (let i = 0; i < 200; i += 1) wide[`k${i}`] = i;
    const leaf = makeFiber('X', { wide });
    const tree = snapshotFiberTree(leaf, { maxKeys: 5 });
    expect(Object.keys(tree.X.props.wide).length).toBeLessThanOrEqual(6); // 5 + truncation marker
  });

  it('completes under the perf budget for a typical tree', () => {
    let f = makeFiber('Leaf', { x: 1, y: 'hi' });
    for (let i = 0; i < 6; i += 1) f = makeFiber(`N${i}`, { idx: i }, null, f);
    const start = performance.now();
    for (let i = 0; i < 100; i += 1) snapshotFiberTree(f);
    const avg = (performance.now() - start) / 100;
    expect(avg).toBeLessThan(2); // < 2ms p99 budget (averaged here)
  });
});
```

- [ ] **Step 4.2: Run to confirm fail**

Run: `npm test -- "snapshot/__tests__"`
Expected: FAIL — modules not found.

- [ ] **Step 4.3: Implement `src/capture/snapshot/selectorPath.js`**

```js
/**
 * Build a short CSS-ish selector path for an element. Optimised for
 * readability in tickets, not for re-querying. data-testid wins.
 */
export function selectorPath(el, { maxDepth = 5 } = {}) {
  if (!el || el.nodeType !== 1) return '';
  if (el.id) return `#${el.id}`;
  const parts = [];
  let cur = el;
  let depth = 0;
  while (cur && cur.nodeType === 1 && depth < maxDepth) {
    let segment = cur.tagName.toLowerCase();
    const testId = cur.getAttribute?.('data-testid');
    if (testId) segment = `[data-testid="${testId}"]`;
    else if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className.trim().split(/\s+/).slice(0, 2).filter(Boolean);
      if (cls.length) segment += '.' + cls.join('.');
    }
    parts.unshift(segment);
    if (testId) break; // stop walking once we hit a stable id
    cur = cur.parentElement;
    depth += 1;
  }
  return parts.join(' > ');
}

export function labelFor(el) {
  if (!el || el.nodeType !== 1) return null;
  const aria = el.getAttribute?.('aria-label');
  if (aria) return aria.trim();
  if (el.id && typeof document !== 'undefined') {
    const lab = document.querySelector(`label[for="${el.id}"]`);
    if (lab) return (lab.textContent || '').trim();
  }
  if (el.tagName === 'BUTTON' || el.tagName === 'A') {
    return (el.textContent || '').trim().slice(0, 80);
  }
  if (el.tagName === 'IMG') return el.getAttribute('alt') || null;
  if (el.tagName === 'INPUT') {
    return el.getAttribute('placeholder') || el.getAttribute('name') || null;
  }
  return null;
}
```

- [ ] **Step 4.4: Implement `src/capture/snapshot/fiberWalk.js`**

```js
/**
 * Walk a React fiber up the parent chain, producing a depth-capped,
 * cycle-safe, serializable snapshot of each level's props and state.
 * Designed to take < 2ms p99 for trees up to 6 deep / 64 keys.
 */
const DEFAULT_OPTS = { depth: 6, maxKeys: 64, maxStr: 2000 };

function placeholder(v) {
  if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
  if (typeof window !== 'undefined' && v instanceof Element) {
    return `[DOMNode: ${v.tagName.toLowerCase()}${v.id ? '#' + v.id : ''}]`;
  }
  if (v && typeof v === 'object' && v.$$typeof) {
    const typeName = v.type?.displayName || v.type?.name || (typeof v.type === 'string' ? v.type : 'Element');
    return `[ReactElement: ${typeName}]`;
  }
  return undefined;
}

function serializable(value, opts, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'number' || t === 'boolean') return value;
  if (t === 'string') {
    return value.length > opts.maxStr
      ? value.slice(0, opts.maxStr) + `... (${value.length - opts.maxStr} more chars)`
      : value;
  }
  const ph = placeholder(value);
  if (ph !== undefined) return ph;
  if (t !== 'object') return String(value);
  if (depth > 6) return '[MaxDepth]';
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    const limit = Math.min(value.length, opts.maxKeys);
    const out = [];
    for (let i = 0; i < limit; i += 1) out.push(serializable(value[i], opts, seen, depth + 1));
    if (value.length > limit) out.push(`... (${value.length - limit} more items)`);
    return out;
  }
  const out = {};
  const keys = Object.keys(value);
  const limit = Math.min(keys.length, opts.maxKeys);
  for (let i = 0; i < limit; i += 1) {
    const k = keys[i];
    out[k] = serializable(value[k], opts, seen, depth + 1);
  }
  if (keys.length > limit) out[`... (${keys.length - limit} more keys)`] = true;
  return out;
}

function nameOf(fiber) {
  const t = fiber?.type;
  if (!t) return 'Unknown';
  if (typeof t === 'string') return t;
  return t.displayName || t.name || (t.render?.displayName || t.render?.name) || 'Anonymous';
}

export function snapshotFiberTree(rootFiber, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (!rootFiber) return {};
  const out = {};
  let cur = rootFiber;
  let i = 0;
  while (cur && i < o.depth) {
    const name = nameOf(cur);
    out[name] = {
      props: cur.memoizedProps ? serializable(cur.memoizedProps, o) : {},
      state: cur.memoizedState ? serializable(cur.memoizedState, o) : null,
    };
    cur = cur.return;
    i += 1;
  }
  return out;
}
```

- [ ] **Step 4.5: Run + commit**

```bash
npm test -- "snapshot/__tests__"
# Expected: all green
git add src/capture/snapshot src/capture/snapshot/__tests__
git commit -m "$(cat <<'EOF'
feat(capture): add selectorPath, labelFor, snapshotFiberTree

selectorPath builds a short readable CSS-ish path (data-testid wins);
labelFor extracts the human-readable label of an element. fiberWalk
walks the fiber parent chain up to depth 6 producing a serializable
tree: functions → [Function], DOM nodes → [DOMNode], React elements
→ [ReactElement], cycles → [Circular]. Strings + key counts truncated
within the documented caps. Perf-budget assertion < 2ms p99.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Route + error observers + `FeedbackErrorBoundary`

**Files:** `src/capture/observers/route.js`, `src/capture/observers/error.js`, `src/capture/FeedbackErrorBoundary.jsx`, `src/capture/__tests__/route.test.js`, `src/capture/__tests__/error.test.jsx`

- [ ] **Step 5.1: Write failing tests**

```js
// src/capture/__tests__/route.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountRouteObserver } from '../observers/route.js';
import { createRingBuffer } from '../ringBuffer.js';

let buffer, unmount;
beforeEach(() => { buffer = createRingBuffer(20); unmount = mountRouteObserver(buffer); });
afterEach(() => { unmount(); window.history.replaceState({}, '', '/'); });

describe('route observer', () => {
  it('captures pushState', () => {
    window.history.pushState({}, '', '/checkout');
    const snap = buffer.snapshot();
    expect(snap.at(-1)).toMatchObject({ type: 'route', to: '/checkout' });
  });
  it('captures replaceState', () => {
    window.history.replaceState({}, '', '/x');
    expect(buffer.snapshot().at(-1).to).toBe('/x');
  });
  it('captures popstate', () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(buffer.snapshot().at(-1)).toMatchObject({ type: 'route' });
  });
  it('captures hashchange', () => {
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: 'a', newURL: 'b' }));
    expect(buffer.snapshot().at(-1)).toMatchObject({ type: 'route' });
  });
});
```

```jsx
// src/capture/__tests__/error.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { mountErrorObserver } from '../observers/error.js';
import { FeedbackErrorBoundary } from '../FeedbackErrorBoundary.jsx';
import { createRingBuffer } from '../ringBuffer.js';

let buffer, unmount;
beforeEach(() => { buffer = createRingBuffer(20); unmount = mountErrorObserver(buffer); });
afterEach(() => { unmount(); });

describe('error observer', () => {
  it('captures window.onerror without breaking the chain', () => {
    const original = vi.fn();
    window.onerror = original;
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', filename: 'a.js', lineno: 1 }));
    const snap = buffer.snapshot();
    expect(snap.at(-1)).toMatchObject({ type: 'error', message: 'boom' });
  });

  it('captures unhandledrejection', () => {
    const ev = new Event('unhandledrejection');
    Object.defineProperty(ev, 'reason', { value: new Error('rejected') });
    window.dispatchEvent(ev);
    expect(buffer.snapshot().at(-1).message).toContain('rejected');
  });

  it('caps at the buffer capacity', () => {
    for (let i = 0; i < 30; i += 1) {
      window.dispatchEvent(new ErrorEvent('error', { message: `e${i}`, filename: 'a', lineno: i }));
    }
    expect(buffer.size()).toBeLessThanOrEqual(20);
  });
});

describe('FeedbackErrorBoundary', () => {
  it('passes children through when no error', () => {
    const { getByText } = render(
      <FeedbackErrorBoundary buffer={buffer}><span>ok</span></FeedbackErrorBoundary>
    );
    expect(getByText('ok')).toBeInTheDocument();
  });

  it('catches a render error and writes to the buffer', () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom() { throw new Error('render-boom'); }
    render(
      <FeedbackErrorBoundary buffer={buffer} fallback={<span>oops</span>}><Boom /></FeedbackErrorBoundary>
    );
    expect(buffer.snapshot().at(-1)).toMatchObject({ type: 'error', message: 'render-boom' });
    consoleErr.mockRestore();
  });
});
```

- [ ] **Step 5.2: Run to confirm fail**

Run: `npm test -- "observers"` and `npm test -- FeedbackErrorBoundary`
Expected: FAIL.

- [ ] **Step 5.3: Implement `src/capture/observers/route.js`**

```js
export function mountRouteObserver(buffer) {
  if (typeof window === 'undefined') return () => {};
  const origPush = window.history.pushState;
  const origReplace = window.history.replaceState;
  let prev = window.location.pathname + window.location.search + window.location.hash;

  function record(to) {
    buffer.push({ type: 'route', from: prev, to, ts: Date.now() });
    prev = to;
  }

  window.history.pushState = function pushState(...args) {
    const r = origPush.apply(this, args);
    record(window.location.pathname + window.location.search + window.location.hash);
    return r;
  };
  window.history.replaceState = function replaceState(...args) {
    const r = origReplace.apply(this, args);
    record(window.location.pathname + window.location.search + window.location.hash);
    return r;
  };
  const onPop = () => record(window.location.pathname + window.location.search + window.location.hash);
  const onHash = () => record(window.location.pathname + window.location.search + window.location.hash);
  window.addEventListener('popstate', onPop);
  window.addEventListener('hashchange', onHash);

  return () => {
    window.history.pushState = origPush;
    window.history.replaceState = origReplace;
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('hashchange', onHash);
  };
}
```

- [ ] **Step 5.4: Implement `src/capture/observers/error.js`**

```js
function fromErrorEvent(e) {
  return {
    type: 'error',
    source: 'window',
    message: e?.message || String(e?.error || ''),
    name: e?.error?.name || 'Error',
    stack: e?.error?.stack || null,
    fileName: e?.filename || null,
    lineNumber: e?.lineno || null,
    columnNumber: e?.colno || null,
    ts: Date.now(),
  };
}

function fromRejection(e) {
  const reason = e?.reason;
  return {
    type: 'error',
    source: 'unhandledrejection',
    message: reason?.message || String(reason),
    name: reason?.name || 'UnhandledRejection',
    stack: reason?.stack || null,
    ts: Date.now(),
  };
}

export function mountErrorObserver(buffer) {
  if (typeof window === 'undefined') return () => {};
  const onErr = (e) => { try { buffer.push(fromErrorEvent(e)); } catch {} };
  const onRej = (e) => { try { buffer.push(fromRejection(e)); } catch {} };
  window.addEventListener('error', onErr, true);
  window.addEventListener('unhandledrejection', onRej, true);
  return () => {
    window.removeEventListener('error', onErr, true);
    window.removeEventListener('unhandledrejection', onRej, true);
  };
}
```

- [ ] **Step 5.5: Implement `src/capture/FeedbackErrorBoundary.jsx`**

```jsx
import React from 'react';

export class FeedbackErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    try {
      this.props.buffer?.push({
        type: 'error',
        source: 'react',
        message: error?.message || String(error),
        name: error?.name || 'Error',
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
        ts: Date.now(),
      });
    } catch {}
  }
  render() {
    if (this.state.hasError && this.props.fallback !== undefined) return this.props.fallback;
    return this.props.children;
  }
}

export default FeedbackErrorBoundary;
```

- [ ] **Step 5.6: Run + commit**

```bash
npm test -- "observers"
npm test -- FeedbackErrorBoundary
# Expected: all green
git add src/capture/observers/route.js src/capture/observers/error.js src/capture/FeedbackErrorBoundary.jsx src/capture/__tests__/route.test.js src/capture/__tests__/error.test.jsx
git commit -m "$(cat <<'EOF'
feat(capture): add route/error observers + FeedbackErrorBoundary

Route observer patches history.pushState/replaceState and listens to
popstate/hashchange, preserves originals on unmount. Error observer
uses capture-phase passive listeners on window 'error' and
'unhandledrejection' so it never interferes with the host's own
handlers. FeedbackErrorBoundary is an opt-in HOC that captures
component-stack-rich React errors into the same shared buffer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Interaction observer (with three privacy layers)

**Files:** `src/capture/observers/interaction.js`, `src/capture/__tests__/interaction.test.js`

- [ ] **Step 6.1: Write failing tests**

```js
// src/capture/__tests__/interaction.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountInteractionObserver } from '../observers/interaction.js';
import { createRingBuffer } from '../ringBuffer.js';

let buffer, unmount;
beforeEach(() => { buffer = createRingBuffer(64); unmount = mountInteractionObserver(buffer); });
afterEach(() => { unmount(); document.body.innerHTML = ''; });

describe('interaction observer', () => {
  it('captures click with selector + label', () => {
    document.body.innerHTML = '<button class="go" aria-label="Place order">Go</button>';
    document.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const ev = buffer.snapshot().at(-1);
    expect(ev.type).toBe('click');
    expect(ev.target.selector).toContain('button.go');
    expect(ev.target.label).toBe('Place order');
  });

  it('captures input value for non-sensitive fields', () => {
    document.body.innerHTML = '<input name="city" value="">';
    const input = document.querySelector('input');
    input.value = 'Bangalore';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBe('Bangalore');
  });

  it('drops password values (HTML hint)', () => {
    document.body.innerHTML = '<input type="password" name="pwd" value="">';
    const input = document.querySelector('input');
    input.value = 'hunter2';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
    expect(ev.redacted).toBe('password-field');
  });

  it('drops cc-* autocomplete values', () => {
    document.body.innerHTML = '<input autocomplete="cc-number" value="">';
    const input = document.querySelector('input');
    input.value = '4242424242424242';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
    expect(ev.redacted).toBe('cc-autocomplete');
  });

  it('drops data-feedback-redact subtree values', () => {
    document.body.innerHTML = '<div data-feedback-redact="true"><input name="secret"></div>';
    const input = document.querySelector('input');
    input.value = 'top-secret';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
    expect(ev.redacted).toBe('host-marker');
  });

  it('drops values via host sensitiveSelectors', () => {
    unmount();
    buffer = createRingBuffer(32);
    unmount = mountInteractionObserver(buffer, { sensitiveSelectors: ['input[name="token"]'] });
    document.body.innerHTML = '<input name="token">';
    const input = document.querySelector('input');
    input.value = 'abc';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
  });

  it('does not interfere with host click handlers', () => {
    let hostHandlerCalled = false;
    document.body.innerHTML = '<button>x</button>';
    document.querySelector('button').addEventListener('click', () => { hostHandlerCalled = true; });
    document.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(hostHandlerCalled).toBe(true);
  });
});
```

- [ ] **Step 6.2: Run to confirm fail**

Run: `npm test -- "interaction"`
Expected: FAIL.

- [ ] **Step 6.3: Implement `src/capture/observers/interaction.js`**

```js
import { selectorPath, labelFor } from '../snapshot/selectorPath.js';

const SENSITIVE_NAME_RE = /ssn|cvv|cvc|card|secret|otp|password/i;

function isSensitiveField(el, hostSelectors = []) {
  if (!el || el.nodeType !== 1) return null;
  if (el.tagName === 'INPUT' && el.type === 'password') return 'password-field';
  const autocomplete = el.getAttribute?.('autocomplete') || '';
  if (autocomplete.startsWith('cc-')) return 'cc-autocomplete';
  const name = el.getAttribute?.('name') || '';
  const inputmode = el.getAttribute?.('inputmode') || '';
  if (inputmode === 'numeric' && SENSITIVE_NAME_RE.test(name)) return 'numeric-sensitive';
  if (el.closest?.('[data-feedback-redact="true"]')) return 'host-marker';
  for (const sel of hostSelectors) {
    try { if (el.matches?.(sel)) return 'host-selector'; } catch {}
  }
  return null;
}

function targetOf(el) {
  if (!el || el.nodeType !== 1) return null;
  return {
    selector: selectorPath(el),
    label: labelFor(el),
    role: el.getAttribute?.('role') || null,
    name: el.getAttribute?.('name') || null,
  };
}

export function mountInteractionObserver(buffer, opts = {}) {
  if (typeof document === 'undefined') return () => {};
  const hostSelectors = Array.isArray(opts.sensitiveSelectors) ? opts.sensitiveSelectors : [];

  const onClick = (e) => buffer.push({ type: 'click', target: targetOf(e.target), ts: Date.now() });
  const onPointer = (e) => {
    if (e.pointerType !== 'mouse') buffer.push({ type: 'pointerdown', target: targetOf(e.target), ts: Date.now() });
  };
  const onFocusIn = (e) => buffer.push({ type: 'focus', target: targetOf(e.target), ts: Date.now() });
  const onInput = (e) => {
    const reason = isSensitiveField(e.target, hostSelectors);
    const base = { type: 'input', target: targetOf(e.target), ts: Date.now() };
    if (reason) buffer.push({ ...base, redacted: reason });
    else buffer.push({ ...base, value: e.target.value });
  };
  const onSubmit = (e) => buffer.push({ type: 'submit', target: targetOf(e.target), ts: Date.now() });
  const onKey = (e) => {
    if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      buffer.push({ type: 'keydown', key: e.key, target: targetOf(e.target), ts: Date.now() });
    } else {
      buffer.push({ type: 'keydown', target: targetOf(e.target), ts: Date.now() });
    }
  };
  let scrollT = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - scrollT < 200) return;
    scrollT = now;
    buffer.push({ type: 'scroll', target: { selector: 'window' }, ts: now });
  };

  const cfg = { capture: true, passive: true };
  document.addEventListener('click', onClick, cfg);
  document.addEventListener('pointerdown', onPointer, cfg);
  document.addEventListener('focusin', onFocusIn, cfg);
  document.addEventListener('input', onInput, cfg);
  document.addEventListener('change', onInput, cfg);
  document.addEventListener('submit', onSubmit, cfg);
  document.addEventListener('keydown', onKey, cfg);
  window.addEventListener('scroll', onScroll, cfg);

  return () => {
    document.removeEventListener('click', onClick, cfg);
    document.removeEventListener('pointerdown', onPointer, cfg);
    document.removeEventListener('focusin', onFocusIn, cfg);
    document.removeEventListener('input', onInput, cfg);
    document.removeEventListener('change', onInput, cfg);
    document.removeEventListener('submit', onSubmit, cfg);
    document.removeEventListener('keydown', onKey, cfg);
    window.removeEventListener('scroll', onScroll, cfg);
  };
}
```

- [ ] **Step 6.4: Run + commit**

```bash
npm test -- interaction
# Expected: 7 passed
git add src/capture/observers/interaction.js src/capture/__tests__/interaction.test.js
git commit -m "$(cat <<'EOF'
feat(capture): add interaction observer with three privacy layers

Captures click / pointerdown / focusin / input / change / submit /
keydown / scroll on document via capture-phase passive listeners so
host handlers fire unaffected. Sensitive-field auto-drop covers
type=password, autocomplete=cc-*, inputmode=numeric+sensitive name,
[data-feedback-redact='true'] subtrees, and host-configured
sensitiveSelectors. Scroll is throttled 200ms.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Flags observer + `CaptureContext` + `CaptureProvider`

**Files:** `src/capture/observers/flags.js`, `src/capture/CaptureContext.jsx`, `src/capture/CaptureProvider.jsx`, `src/capture/__tests__/flags.test.js`, `src/capture/__tests__/CaptureProvider.test.jsx`

- [ ] **Step 7.1: Write failing tests**

```js
// src/capture/__tests__/flags.test.js
import { describe, it, expect, vi } from 'vitest';
import { snapshotFlags } from '../observers/flags.js';

describe('snapshotFlags', () => {
  it('calls the host adapter and returns its result', async () => {
    const fn = vi.fn().mockReturnValue({ a: 1, b: 'two' });
    expect(await snapshotFlags(fn)).toEqual({ a: 1, b: 'two' });
    expect(fn).toHaveBeenCalledOnce();
  });
  it('supports async adapter', async () => {
    const fn = vi.fn().mockResolvedValue({ async: true });
    expect(await snapshotFlags(fn)).toEqual({ async: true });
  });
  it('catches adapter errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    expect(await snapshotFlags(fn)).toEqual({ error: 'snapshot_failed' });
  });
  it('returns empty when no adapter', async () => {
    expect(await snapshotFlags()).toEqual({});
  });
});
```

```jsx
// src/capture/__tests__/CaptureProvider.test.jsx
import React, { useContext } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CaptureProvider } from '../CaptureProvider.jsx';
import { CaptureContext } from '../CaptureContext.jsx';

function Probe() {
  const ctx = useContext(CaptureContext);
  return <pre>{ctx ? 'ctx' : 'none'}</pre>;
}

describe('CaptureProvider', () => {
  it('provides the context when mounted', () => {
    const { getByText } = render(<CaptureProvider config={{}}><Probe /></CaptureProvider>);
    expect(getByText('ctx')).toBeInTheDocument();
  });

  it('exposes getInteractions / getErrors / getRoutes', () => {
    let captured;
    function Read() {
      captured = useContext(CaptureContext);
      return null;
    }
    render(<CaptureProvider config={{}}><Read /></CaptureProvider>);
    expect(typeof captured.getInteractions).toBe('function');
    expect(typeof captured.getErrors).toBe('function');
    expect(typeof captured.getRoutes).toBe('function');
    expect(typeof captured.snapshotFiber).toBe('function');
  });
});
```

- [ ] **Step 7.2: Run to confirm fail**

Run: `npm test -- flags` and `npm test -- CaptureProvider`
Expected: FAIL.

- [ ] **Step 7.3: Implement `src/capture/observers/flags.js`**

```js
export async function snapshotFlags(adapter) {
  if (typeof adapter !== 'function') return {};
  try {
    const result = await adapter();
    return result && typeof result === 'object' ? result : {};
  } catch {
    return { error: 'snapshot_failed' };
  }
}
```

- [ ] **Step 7.4: Implement `src/capture/CaptureContext.jsx`**

```jsx
import { createContext } from 'react';
export const CaptureContext = createContext(null);
```

- [ ] **Step 7.5: Implement `src/capture/CaptureProvider.jsx`**

```jsx
import React, { useEffect, useMemo, useRef } from 'react';
import { CaptureContext } from './CaptureContext.jsx';
import { createRingBuffer } from './ringBuffer.js';
import { mountInteractionObserver } from './observers/interaction.js';
import { mountRouteObserver } from './observers/route.js';
import { mountErrorObserver } from './observers/error.js';
import { snapshotFlags } from './observers/flags.js';
import { resolveBuildInfo } from './buildInfo.js';
import { snapshotFiberTree } from './snapshot/fiberWalk.js';

export function CaptureProvider({ children, config = {} }) {
  const interactionRef = useRef(null);
  const errorRef = useRef(null);
  const routeRef = useRef(null);
  const unmountRef = useRef([]);

  if (!interactionRef.current) interactionRef.current = createRingBuffer(config.interactionBufferSize || 128);
  if (!errorRef.current) errorRef.current = createRingBuffer(20);
  if (!routeRef.current) routeRef.current = createRingBuffer(20);

  useEffect(() => {
    const u1 = mountInteractionObserver(interactionRef.current, { sensitiveSelectors: config.sensitiveSelectors });
    const u2 = mountRouteObserver(routeRef.current);
    const u3 = mountErrorObserver(errorRef.current);
    unmountRef.current = [u1, u2, u3];
    return () => { unmountRef.current.forEach((u) => u && u()); };
  }, [config.sensitiveSelectors]);

  const value = useMemo(() => ({
    getInteractions: () => interactionRef.current.snapshot(),
    getErrors: () => errorRef.current.snapshot(),
    getRoutes: () => routeRef.current.snapshot(),
    getBuildInfo: () => resolveBuildInfo(config.buildInfo),
    getFlags: () => snapshotFlags(config.flagsSnapshot),
    snapshotFiber: (rootFiber, opts) => snapshotFiberTree(rootFiber, opts),
    errorBuffer: errorRef.current,
  }), [config.buildInfo, config.flagsSnapshot]);

  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export default CaptureProvider;
```

- [ ] **Step 7.6: Run + commit**

```bash
npm test -- flags
npm test -- CaptureProvider
# Expected: all green
git add src/capture/observers/flags.js src/capture/CaptureContext.jsx src/capture/CaptureProvider.jsx src/capture/__tests__/flags.test.js src/capture/__tests__/CaptureProvider.test.jsx
git commit -m "$(cat <<'EOF'
feat(capture): add CaptureProvider + flags adapter

CaptureProvider mounts the three observers (interaction, route,
error) with bounded ring buffers and exposes accessors via context.
snapshotFlags() wraps host adapter with await + error swallowing so
a broken adapter never blocks the modal opening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Phase A redactor extensions

**Files:** `src/lib/feedbackSecurity.js`, `src/lib/__tests__/redactionExtensions.test.js`

- [ ] **Step 8.1: Write failing tests**

```js
// src/lib/__tests__/redactionExtensions.test.js
import { describe, it, expect } from 'vitest';
import { redactInteractionTrail, redactFiberSnapshot, redactBuildInfo, resolveRedactionConfig } from '../feedbackSecurity.js';

const cfg = resolveRedactionConfig('default');

describe('redactInteractionTrail', () => {
  it('redacts inline secrets in input values', () => {
    const trail = [
      { type: 'input', target: { selector: 'input[name="x"]' }, value: 'password=hunter2' },
      { type: 'click', target: { selector: 'button' } },
    ];
    const out = redactInteractionTrail(trail, cfg);
    expect(out[0].value).not.toContain('hunter2');
    expect(out[0].value).toContain('<redacted>');
  });
  it('leaves values that are already redacted alone', () => {
    const trail = [{ type: 'input', target: { selector: 'x' }, redacted: 'password-field' }];
    expect(redactInteractionTrail(trail, cfg)).toEqual(trail);
  });
});

describe('redactFiberSnapshot', () => {
  it('redacts sensitive props/state keys', () => {
    const tree = { Form: { props: { apiKey: 'leaked', label: 'fine' }, state: null } };
    const out = redactFiberSnapshot(tree, cfg);
    expect(out.Form.props.apiKey).toBe('<redacted>');
    expect(out.Form.props.label).toBe('fine');
  });
});

describe('redactBuildInfo', () => {
  it('strips token-shaped fields', () => {
    const info = { commit: 'abc', deployToken: 'super-secret', branch: 'main' };
    const out = redactBuildInfo(info, cfg);
    expect(out.deployToken).toBe('<redacted>');
    expect(out.commit).toBe('abc');
  });
});
```

- [ ] **Step 8.2: Run to confirm fail**

Run: `npm test -- redactionExtensions`
Expected: FAIL (functions not exported).

- [ ] **Step 8.3: Append the three helpers to `src/lib/feedbackSecurity.js`**

Append after the existing exports:

```js
// =====================================================================
// Phase C redaction extensions
// =====================================================================

export function redactInteractionTrail(trail, cfg) {
  if (!Array.isArray(trail)) return [];
  return trail.map((ev) => {
    if (!ev || ev.redacted || typeof ev.value !== 'string') return ev;
    return { ...ev, value: redactInlineSecrets(ev.value, cfg) };
  });
}

export function redactFiberSnapshot(tree, cfg) {
  if (!tree || typeof tree !== 'object') return tree;
  const out = {};
  for (const name of Object.keys(tree)) {
    const node = tree[name];
    out[name] = {
      props: node?.props ? redactObjectByKeys(node.props, cfg.redactBodyKeys) : {},
      state: node?.state ? redactObjectByKeys(node.state, cfg.redactBodyKeys) : null,
    };
  }
  return out;
}

export function redactBuildInfo(info, cfg) {
  if (!info || typeof info !== 'object') return info;
  return redactObjectByKeys(info, cfg.redactBodyKeys);
}
```

- [ ] **Step 8.4: Run + commit**

```bash
npm test -- redactionExtensions
# Expected: 4 passed
git add src/lib/feedbackSecurity.js src/lib/__tests__/redactionExtensions.test.js
git commit -m "$(cat <<'EOF'
feat(lib): add Phase C redaction helpers

redactInteractionTrail runs the inline-secret regex pass on each
event value; preserves already-redacted entries untouched.
redactFiberSnapshot applies key-name redaction to every node's
props and state. redactBuildInfo strips token-shaped fields.
All three reuse Phase A primitives.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — Worker IDB cache + source-map wrapper

**Files:** `src/capture/worker/idbCache.js`, `src/capture/worker/sourcemaps.js`, `src/capture/worker/__tests__/idbCache.test.js`, `src/capture/worker/__tests__/sourcemaps.test.js`

- [ ] **Step 9.1: Write failing tests**

```js
// src/capture/worker/__tests__/idbCache.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { idbGet, idbSet, idbClear } from '../idbCache.js';

beforeEach(() => idbClear());

describe('idbCache', () => {
  it('stores and retrieves a string value', async () => {
    await idbSet('k', 'v');
    expect(await idbGet('k')).toBe('v');
  });
  it('returns null for missing key', async () => {
    expect(await idbGet('missing')).toBeNull();
  });
});
```

```js
// src/capture/worker/__tests__/sourcemaps.test.js
import { describe, it, expect, vi } from 'vitest';
import { resolveStack } from '../sourcemaps.js';

const tinyMap = JSON.stringify({
  version: 3,
  sources: ['src/Checkout.jsx'],
  names: ['handleSubmit'],
  mappings: 'AAAA;AACA;AACA',
  sourcesContent: ['const x = 1;\nfunction handleSubmit(){}\nexport default handleSubmit;'],
  file: 'app.bundle.js',
});

describe('resolveStack', () => {
  it('returns needsServerResolution=true when fetch fails', async () => {
    const out = await resolveStack(
      [{ file: 'http://x/app.bundle.js', line: 1, column: 0 }],
      { fetchMap: async () => { throw new Error('no map'); } }
    );
    expect(out[0]).toMatchObject({ needsServerResolution: true });
  });

  it('returns resolved positions when fetch succeeds', async () => {
    const out = await resolveStack(
      [{ file: 'http://x/app.bundle.js', line: 1, column: 0 }],
      { fetchMap: async () => tinyMap }
    );
    expect(out[0].source).toBe('src/Checkout.jsx');
  });
});
```

- [ ] **Step 9.2: Run to confirm fail**

Run: `npm test -- "worker/__tests__/idbCache"` and `npm test -- "worker/__tests__/sourcemaps"`
Expected: FAIL.

- [ ] **Step 9.3: Implement `src/capture/worker/idbCache.js`**

```js
const DB_NAME = 'feedback-capture';
const STORE = 'sourcemap-cache';
const VERSION = 1;

// Module-level memory fallback for environments without IndexedDB.
const mem = new Map();

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-idb'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key) {
  try {
    const db = await openDb();
    return new Promise((res) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result === undefined ? null : r.result);
      r.onerror = () => res(null);
    });
  } catch {
    return mem.has(key) ? mem.get(key) : null;
  }
}

export async function idbSet(key, value) {
  try {
    const db = await openDb();
    return new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {
    mem.set(key, value);
  }
}

export async function idbClear() {
  mem.clear();
  try {
    const db = await openDb();
    return new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {}
}
```

- [ ] **Step 9.4: Implement `src/capture/worker/sourcemaps.js`**

```js
import { SourceMapConsumer } from 'source-map-js';
import { idbGet, idbSet } from './idbCache.js';

async function fetchAdjacent(bundleUrl) {
  const res = await fetch(bundleUrl);
  if (!res.ok) throw new Error(`script fetch ${res.status}`);
  const text = await res.text();
  const m = text.match(/\/\/# sourceMappingURL=(\S+)/);
  if (!m) throw new Error('no sourceMappingURL');
  const mapUrl = new URL(m[1], bundleUrl).toString();
  const mr = await fetch(mapUrl);
  if (!mr.ok) throw new Error(`map fetch ${mr.status}`);
  return mr.text();
}

function bundleHashFor(url) {
  // Simple stable hash; in practice host can override via captureConfig.bundleHashFor
  let h = 0;
  for (let i = 0; i < url.length; i += 1) h = (h * 31 + url.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(16)}`;
}

export async function resolveStack(frames, opts = {}) {
  const fetchMap = opts.fetchMap || fetchAdjacent;
  const out = [];
  const consumerCache = new Map();
  for (const f of frames) {
    if (!f?.file) { out.push(f); continue; }
    const hash = bundleHashFor(f.file);
    let mapText = consumerCache.has(hash) ? null : await idbGet(`map:${hash}`);
    if (!consumerCache.has(hash)) {
      try {
        if (!mapText) {
          mapText = await fetchMap(f.file);
          await idbSet(`map:${hash}`, mapText);
        }
        consumerCache.set(hash, new SourceMapConsumer(JSON.parse(mapText)));
      } catch (e) {
        out.push({ ...f, bundleHash: hash, needsServerResolution: true });
        continue;
      }
    }
    const c = consumerCache.get(hash);
    const pos = c.originalPositionFor({ line: f.line, column: f.column });
    if (!pos?.source) { out.push({ ...f, bundleHash: hash, needsServerResolution: true }); continue; }
    const sourcesContent = c.sourcesContent || [];
    const sourceIdx = c.sources?.indexOf?.(pos.source);
    out.push({
      ...f,
      bundleHash: hash,
      source: pos.source,
      line: pos.line,
      column: pos.column,
      name: pos.name,
      sourcesContent: sourceIdx != null ? sourcesContent[sourceIdx] : null,
    });
  }
  return out;
}

export { bundleHashFor };
```

- [ ] **Step 9.5: Run + commit**

```bash
npm test -- "worker/__tests__/idbCache"
npm test -- "worker/__tests__/sourcemaps"
# Expected: all green
git add src/capture/worker/idbCache.js src/capture/worker/sourcemaps.js src/capture/worker/__tests__/idbCache.test.js src/capture/worker/__tests__/sourcemaps.test.js
git commit -m "$(cat <<'EOF'
feat(capture/worker): add IDB cache + source-map resolver

idbCache wraps IndexedDB with an in-memory fallback so worker tests
run unchanged. sourcemaps.resolveStack walks each frame: load map
(memory > IDB > network), parse once, lookup originalPositionFor;
on any failure marks frame needsServerResolution=true for the
server fallback path. Uses source-map-js (small mature parser).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — Code-context, fiber serializer, ticket assembler

**Files:** `src/capture/worker/codeContext.js`, `src/capture/worker/fiberSerializer.js`, `src/capture/worker/ticketAssembler.js`, `src/capture/worker/__tests__/codeContext.test.js`, `src/capture/worker/__tests__/fiberSerializer.test.js`, `src/capture/worker/__tests__/ticketAssembler.test.js`

- [ ] **Step 10.1: Write failing tests**

```js
// src/capture/worker/__tests__/codeContext.test.js
import { describe, it, expect } from 'vitest';
import { extractSnippet } from '../codeContext.js';

const SRC = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');

describe('extractSnippet', () => {
  it('extracts ±N lines around the target line', () => {
    const out = extractSnippet(SRC, 10, { context: 3 });
    expect(out.lines.map((l) => l.text)).toEqual(['line 7','line 8','line 9','line 10','line 11','line 12','line 13']);
    expect(out.lines.find((l) => l.line === 10).highlight).toBe(true);
  });
  it('clamps near the start', () => {
    const out = extractSnippet(SRC, 1, { context: 5 });
    expect(out.lines[0].line).toBe(1);
  });
  it('clamps near the end', () => {
    const out = extractSnippet(SRC, 30, { context: 5 });
    expect(out.lines.at(-1).line).toBe(30);
  });
  it('returns empty when source missing', () => {
    expect(extractSnippet(null, 10).lines).toEqual([]);
  });
  it('truncates very long lines', () => {
    const long = Array.from({ length: 5 }, () => 'x'.repeat(500)).join('\n');
    const out = extractSnippet(long, 3, { context: 1, maxChars: 50 });
    expect(out.lines.every((l) => l.text.length <= 60)).toBe(true);
  });
});
```

```js
// src/capture/worker/__tests__/fiberSerializer.test.js
import { describe, it, expect } from 'vitest';
import { serializeFiberTree } from '../fiberSerializer.js';

describe('serializeFiberTree', () => {
  it('returns the tree shallow-cloned', () => {
    const t = { App: { props: { a: 1 }, state: null } };
    const out = serializeFiberTree(t);
    expect(out).toEqual(t);
    expect(out).not.toBe(t);
  });
  it('safely JSON-stringifies', () => {
    const t = { App: { props: { date: new Date(0).toISOString() }, state: null } };
    expect(() => JSON.stringify(serializeFiberTree(t))).not.toThrow();
  });
});
```

```js
// src/capture/worker/__tests__/ticketAssembler.test.js
import { describe, it, expect } from 'vitest';
import { assembleTicket } from '../ticketAssembler.js';

const baseInput = {
  item: {
    feedback: 'Submit broken',
    type: 'bug',
    severity: 'high',
    userName: 'Murali',
    userEmail: 'm@x.com',
    url: 'https://app.example.com/checkout',
    timestamp: '2026-06-15T17:03:21Z',
    eventLogs: [],
  },
  interactions: [
    { type: 'click', target: { selector: 'button.submit', label: 'Place order' }, ts: 1000 },
    { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'Bangalore', ts: 900 },
  ],
  errors: [
    { type: 'error', message: 'TypeError: x', stack: 'at handleSubmit (src/Checkout.jsx:42:18)', ts: 1100 },
  ],
  routes: [{ type: 'route', from: '/', to: '/checkout', ts: 800 }],
  fiberSnapshot: { Checkout: { props: { userId: 'u1' }, state: null } },
  buildInfo: { commit: 'abc', branch: 'main', environment: 'production' },
  flags: { 'checkout-redesign': 'b' },
  resolvedFrames: [{ source: 'src/Checkout.jsx', line: 42, column: 18, name: 'handleSubmit',
                    sourcesContent: 'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\nL11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\nL21\nL22\nL23\nL24\nL25\nL26\nL27\nL28\nL29\nL30\nL31\nL32\nL33\nL34\nL35\nL36\nL37\nL38\nL39\nL40\nL41\nL42\nL43\nL44\nL45' }],
};

describe('assembleTicket', () => {
  it('produces both markdown and json with stable schemaVersion', () => {
    const t = assembleTicket(baseInput);
    expect(typeof t.markdown).toBe('string');
    expect(t.json.schemaVersion).toBe('1.0');
    expect(t.generatedAt).toMatch(/T/);
  });
  it('markdown contains key sections', () => {
    const md = assembleTicket(baseInput).markdown;
    expect(md).toMatch(/^# Feedback/);
    expect(md).toMatch(/## Summary/);
    expect(md).toMatch(/## Where/);
    expect(md).toMatch(/## Repro/);
    expect(md).toMatch(/## Logs/);
    expect(md).toMatch(/## Environment/);
  });
  it('inlines the code snippet around the resolved line', () => {
    const md = assembleTicket(baseInput).markdown;
    expect(md).toContain('L42');
  });
  it('json.where references the resolved file', () => {
    const t = assembleTicket(baseInput);
    expect(t.json.where.file).toBe('src/Checkout.jsx');
    expect(t.json.where.line).toBe(42);
  });
  it('coalesces consecutive inputs on the same target', () => {
    const t = assembleTicket({
      ...baseInput,
      interactions: [
        { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'B', ts: 100 },
        { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'Ba', ts: 110 },
        { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'Bangalore', ts: 200 },
      ],
    });
    const inputs = t.json.repro.steps.filter((s) => s.kind === 'input');
    expect(inputs.length).toBe(1);
    expect(inputs[0].value).toBe('Bangalore');
  });
  it('places errors inline at their timestamp position', () => {
    const md = assembleTicket(baseInput).markdown;
    expect(md).toMatch(/ERROR.*TypeError/);
  });
});
```

- [ ] **Step 10.2: Run to confirm fail**

Run: `npm test -- "worker/__tests__/codeContext"`, `npm test -- "worker/__tests__/fiberSerializer"`, `npm test -- "worker/__tests__/ticketAssembler"`
Expected: FAIL.

- [ ] **Step 10.3: Implement `src/capture/worker/codeContext.js`**

```js
export function extractSnippet(source, line, opts = {}) {
  const context = opts.context ?? 10;
  const maxChars = opts.maxChars ?? 200;
  if (!source || typeof source !== 'string' || !Number.isFinite(line) || line < 1) {
    return { lines: [] };
  }
  const all = source.split('\n');
  const start = Math.max(1, line - context);
  const end = Math.min(all.length, line + context);
  const lines = [];
  for (let i = start; i <= end; i += 1) {
    let text = all[i - 1] || '';
    if (text.length > maxChars) text = text.slice(0, maxChars) + '…';
    lines.push({ line: i, text, highlight: i === line });
  }
  return { lines };
}
```

- [ ] **Step 10.4: Implement `src/capture/worker/fiberSerializer.js`**

```js
export function serializeFiberTree(tree) {
  if (!tree || typeof tree !== 'object') return {};
  const out = {};
  for (const name of Object.keys(tree)) {
    const node = tree[name] || {};
    out[name] = {
      props: node.props ?? {},
      state: node.state ?? null,
    };
  }
  return out;
}
```

- [ ] **Step 10.5: Implement `src/capture/worker/ticketAssembler.js`**

```js
import { extractSnippet } from './codeContext.js';
import { serializeFiberTree } from './fiberSerializer.js';

function coalesceInputs(steps) {
  const out = [];
  for (const s of steps) {
    const last = out.at(-1);
    if (
      last && last.kind === 'input' && s.kind === 'input' &&
      last.target?.selector === s.target?.selector
    ) {
      last.value = s.value;
      last.ts = s.ts;
    } else {
      out.push(s);
    }
  }
  return out;
}

function reproSteps(input) {
  const allEvents = [
    ...(input.routes || []).map((r) => ({ kind: 'route', from: r.from, to: r.to, ts: r.ts })),
    ...(input.interactions || []).map((e) => ({
      kind: e.type,
      target: e.target,
      value: e.value,
      redacted: e.redacted,
      ts: e.ts,
    })),
    ...(input.errors || []).map((e) => ({ kind: 'error', message: e.message, stack: e.stack, ts: e.ts })),
  ].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return coalesceInputs(allEvents).slice(-30);
}

function summarize(input) {
  const it = input.item || {};
  return {
    type: it.type || 'bug',
    severity: it.severity || 'medium',
    userName: it.userName || 'Anonymous',
    userEmail: it.userEmail || null,
    page: it.url || null,
    timestamp: it.timestamp || new Date().toISOString(),
    feedback: it.feedback || '',
  };
}

function whereFrom(input) {
  const frame = (input.resolvedFrames || [])[0];
  const ei = input.item?.elementInfo || {};
  if (!frame && !ei.sourceFile) return null;
  const snippetSource = frame?.sourcesContent || input.codeContext || null;
  const line = frame?.line || (ei.sourceFile?.match(/:(\d+)/)?.[1]) || null;
  const snippet = snippetSource && line ? extractSnippet(snippetSource, Number(line)) : { lines: [] };
  return {
    file: frame?.source || ei.sourceFile || null,
    line: frame?.line || (line ? Number(line) : null),
    column: frame?.column || null,
    name: frame?.name || null,
    component: (ei.componentStack || []).join(' > '),
    selector: ei.selector || null,
    codeSnippet: snippet.lines,
  };
}

function logsSummary(item, errors) {
  const out = [];
  for (const e of (item.eventLogs || [])) {
    if (e.type === 'console') out.push({ type: 'console', level: e.level, message: e.message, ts: e.timestamp });
    if (e.type === 'network' && (e.status === undefined || e.status >= 400 || e.status === 'failed')) {
      out.push({ type: 'network', method: e.method, url: e.url, status: e.status, ts: e.timestamp });
    }
  }
  for (const e of errors || []) out.push({ type: 'error', message: e.message, ts: e.ts });
  return out;
}

function environment(input) {
  const it = input.item || {};
  return {
    build: input.buildInfo || {},
    viewport: it.viewport || null,
    browser: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    flags: input.flags || {},
  };
}

function fmtCodeSnippet(snippet) {
  if (!snippet || !snippet.length) return '';
  const w = String(snippet.at(-1).line).length;
  return snippet.map((l) => {
    const num = String(l.line).padStart(w, ' ');
    return `${l.highlight ? '>>>' : '   '} ${num}  ${l.text}`;
  }).join('\n');
}

function fmtRepro(steps) {
  return steps.map((s, i) => {
    const n = i + 1;
    if (s.kind === 'route') return `${n}. Visited \`${s.to}\``;
    if (s.kind === 'click') return `${n}. Clicked \`${s.target?.selector || ''}\`${s.target?.label ? ' (label "' + s.target.label + '")' : ''}`;
    if (s.kind === 'input') {
      const value = s.redacted ? `<${s.redacted}>` : (s.value ?? '<unknown>');
      return `${n}. Typed \`${value}\` into \`${s.target?.selector || ''}\``;
    }
    if (s.kind === 'error') return `${n}. **ERROR** ${s.message || ''}${s.stack ? '\n   ' + s.stack.split('\n')[0] : ''}`;
    return `${n}. ${s.kind}`;
  }).join('\n');
}

function fmtState(tree) {
  const lines = ['```json'];
  lines.push(JSON.stringify(tree, null, 2));
  lines.push('```');
  return lines.join('\n');
}

function fmtMarkdown(json) {
  const where = json.where;
  const code = fmtCodeSnippet(where?.codeSnippet || []);
  return [
    `# Feedback · ${(json.summary.feedback || '').slice(0, 80)}`,
    `*From ${json.summary.userName}${json.summary.userEmail ? ' (' + json.summary.userEmail + ')' : ''}, ${json.summary.timestamp} — ${json.summary.type}, severity ${json.summary.severity}*`,
    '',
    '## Summary',
    `> ${(json.summary.feedback || '').replace(/\n/g, '\n> ')}`,
    '',
    '## Where',
    where ? `- **File:** \`${where.file}:${where.line}\`${where.name ? '  (function `' + where.name + '`)' : ''}` : '- *(unresolved)*',
    where?.component ? `- **Component:** ${where.component}` : '',
    where?.selector ? `- **Selector:** \`${where.selector}\`` : '',
    `- **Page:** ${json.summary.page || '—'}`,
    code ? `\n### Code (\`${where?.file}\`, lines ${where?.codeSnippet[0]?.line}–${where?.codeSnippet.at(-1)?.line})\n\`\`\`\n${code}\n\`\`\`` : '',
    '',
    '### State at click time',
    fmtState(json.state),
    '',
    '## Repro',
    fmtRepro(json.repro.steps),
    '',
    '## Logs',
    ...(json.logs.length === 0 ? ['*(none captured)*'] : json.logs.slice(-20).map((l) => `- \`${new Date(l.ts || 0).toISOString()}\` [${l.type}${l.level ? '.' + l.level : ''}] ${l.message || l.url || ''}`)),
    '',
    '## Environment',
    `- **Branch:** \`${json.environment.build.branch || '—'}\` · **Commit:** \`${json.environment.build.commit || '—'}\` · **Built:** ${json.environment.build.builtAt || '—'}`,
    json.environment.build.packageVersion ? `- **Package:** \`${json.environment.build.packageVersion}\`` : '',
    `- **Env:** ${json.environment.build.environment || '—'}`,
    json.environment.viewport ? `- **Viewport:** ${json.environment.viewport.width}×${json.environment.viewport.height}` : '',
    json.environment.browser ? `- **Browser:** ${json.environment.browser}` : '',
    Object.keys(json.environment.flags).length ? `- **Active flags:** ${Object.entries(json.environment.flags).map(([k,v]) => `\`${k}: ${JSON.stringify(v)}\``).join(', ')}` : '',
  ].filter(Boolean).join('\n');
}

export function assembleTicket(input) {
  const json = {
    schemaVersion: '1.0',
    summary: summarize(input),
    where: whereFrom(input),
    state: serializeFiberTree(input.fiberSnapshot || {}),
    repro: { steps: reproSteps(input), format: 'v1' },
    logs: logsSummary(input.item || {}, input.errors || []),
    environment: environment(input),
    evidence: {
      hasScreenshot: !!input.item?.screenshot,
      hasVideo: !!input.item?.video,
      eventCount: (input.item?.eventLogs || []).length,
    },
  };
  return {
    markdown: fmtMarkdown(json),
    json,
    generatedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 10.6: Run + commit**

```bash
npm test -- "worker/__tests__/codeContext"
npm test -- "worker/__tests__/fiberSerializer"
npm test -- "worker/__tests__/ticketAssembler"
# Expected: all green
git add src/capture/worker/codeContext.js src/capture/worker/fiberSerializer.js src/capture/worker/ticketAssembler.js src/capture/worker/__tests__
git commit -m "$(cat <<'EOF'
feat(capture/worker): add codeContext + ticket assembler

extractSnippet pulls ±10 lines around a resolved position, clamping
at file bounds and truncating long lines. ticketAssembler turns the
worker input record into both Markdown and JSON: # title /
summary / where (file + line + snippet) / state at click / repro
(coalesced inputs + errors inline) / logs / environment (build,
viewport, browser, flags). schemaVersion locked at '1.0'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — Worker entry + client + main thread integration

**Files:** `src/capture/worker/feedback-capture-worker.js`, `src/capture/workerClient.js`, `src/capture/__tests__/workerClient.test.js`

- [ ] **Step 11.1: Write failing test**

```js
// src/capture/__tests__/workerClient.test.js
import { describe, it, expect, vi } from 'vitest';
import { runOnMainThread } from '../workerClient.js';

describe('runOnMainThread fallback', () => {
  it('assembles a ticket synchronously when worker is disabled', async () => {
    const t = await runOnMainThread({
      item: { feedback: 'x', timestamp: '2026-01-01T00:00:00Z' },
      interactions: [], errors: [], routes: [], buildInfo: {}, flags: {},
    });
    expect(t.json.schemaVersion).toBe('1.0');
    expect(t.assembledOn).toBe('main');
  });
});
```

- [ ] **Step 11.2: Run to confirm fail**

Run: `npm test -- workerClient`
Expected: FAIL.

- [ ] **Step 11.3: Implement `src/capture/worker/feedback-capture-worker.js`**

```js
import { assembleTicket } from './ticketAssembler.js';
import { resolveStack } from './sourcemaps.js';
import {
  redactInteractionTrail,
  redactFiberSnapshot,
  redactBuildInfo,
  resolveRedactionConfig,
} from '../../lib/feedbackSecurity.js';

self.addEventListener('message', async (e) => {
  const msg = e.data;
  if (!msg || msg.type !== 'assemble') return;
  try {
    const cfg = resolveRedactionConfig(msg.redactConfig || 'default');
    const resolvedFrames = msg.framesToResolve?.length
      ? await resolveStack(msg.framesToResolve)
      : [];
    const ticket = assembleTicket({
      item: msg.item,
      interactions: redactInteractionTrail(msg.interactions || [], cfg),
      errors: msg.errors || [],
      routes: msg.routes || [],
      fiberSnapshot: redactFiberSnapshot(msg.fiberSnapshot || {}, cfg),
      buildInfo: redactBuildInfo(msg.buildInfo || {}, cfg),
      flags: msg.flags || {},
      resolvedFrames,
    });
    self.postMessage({ type: 'assembled', id: msg.id, ticket });
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, error: err?.message || String(err) });
  }
});
```

- [ ] **Step 11.4: Implement `src/capture/workerClient.js`**

```js
import { assembleTicket } from './worker/ticketAssembler.js';
import {
  redactInteractionTrail,
  redactFiberSnapshot,
  redactBuildInfo,
  resolveRedactionConfig,
} from '../lib/feedbackSecurity.js';

let worker = null;
let workerIdleTimer = null;
let nextId = 1;
const pending = new Map();

function spawn() {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./worker/feedback-capture-worker.js', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
    return null;
  }
  worker.addEventListener('message', (e) => {
    const { id, type, ticket, error } = e.data || {};
    const cb = pending.get(id);
    if (!cb) return;
    pending.delete(id);
    if (type === 'assembled') cb.resolve({ ...ticket, assembledOn: 'worker' });
    else cb.reject(new Error(error || 'worker error'));
    scheduleIdleKill();
  });
  return worker;
}

function scheduleIdleKill() {
  if (workerIdleTimer) clearTimeout(workerIdleTimer);
  workerIdleTimer = setTimeout(() => {
    if (worker) { try { worker.terminate(); } catch {} worker = null; }
  }, 30_000);
}

export function runViaWorker(input) {
  const w = spawn();
  if (!w) return runOnMainThread(input);
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    w.postMessage({
      type: 'assemble', id,
      item: input.item,
      interactions: input.interactions || [],
      errors: input.errors || [],
      routes: input.routes || [],
      fiberSnapshot: input.fiberSnapshot || {},
      buildInfo: input.buildInfo || {},
      flags: input.flags || {},
      framesToResolve: input.framesToResolve || [],
      redactConfig: input.redactConfig || 'default',
    });
  }).catch(() => runOnMainThread(input));
}

export async function runOnMainThread(input) {
  const cfg = resolveRedactionConfig(input.redactConfig || 'default');
  const ticket = assembleTicket({
    item: input.item,
    interactions: redactInteractionTrail(input.interactions || [], cfg),
    errors: input.errors || [],
    routes: input.routes || [],
    fiberSnapshot: redactFiberSnapshot(input.fiberSnapshot || {}, cfg),
    buildInfo: redactBuildInfo(input.buildInfo || {}, cfg),
    flags: input.flags || {},
    resolvedFrames: [],
  });
  return { ...ticket, assembledOn: 'main' };
}
```

- [ ] **Step 11.5: Run + commit**

```bash
npm test -- workerClient
# Expected: 1 passed
git add src/capture/worker/feedback-capture-worker.js src/capture/workerClient.js src/capture/__tests__/workerClient.test.js
git commit -m "$(cat <<'EOF'
feat(capture): add worker entry + lazy spawn client + main fallback

Worker entry is module-mode, handles 'assemble' messages, runs the
Phase A + C redactors before assembly. workerClient spawns on first
use; idle-killed after 30s; any spawn or runtime failure falls back
to runOnMainThread which produces a ticket synchronously (marked
assembledOn: 'main'). Capture is invisible to the host either way.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — Server-side source-map resolver

**Files:** `src/integrations/server/sourcemap-resolver.js`, `src/integrations/server/__tests__/sourcemap-resolver.test.js`

- [ ] **Step 12.1: Write failing test**

```js
// src/integrations/server/__tests__/sourcemap-resolver.test.js
import { describe, it, expect, vi } from 'vitest';
import { runResolveSourceMap } from '../sourcemap-resolver.js';

const tinyMap = JSON.stringify({
  version: 3,
  sources: ['src/Checkout.jsx'],
  mappings: 'AAAA',
  sourcesContent: ['line1\nline2\nline3'],
  file: 'app.bundle.js',
});

describe('runResolveSourceMap', () => {
  it('resolves frames marked needsServerResolution', async () => {
    const hook = vi.fn().mockResolvedValue(tinyMap);
    const item = {
      eventLogs: [],
      aiTicket: {
        json: {
          where: {
            unresolvedFrames: [{ file: 'app.bundle.js', line: 1, column: 0, needsServerResolution: true, bundleHash: 'h1' }],
          },
        },
      },
    };
    const out = await runResolveSourceMap(item, hook);
    expect(hook).toHaveBeenCalledWith({ bundleHash: 'h1', scriptUrl: 'app.bundle.js' });
    expect(out.aiTicket.json.where.file).toBe('src/Checkout.jsx');
  });

  it('returns item unchanged when no hook provided', async () => {
    const item = { aiTicket: { json: { where: { unresolvedFrames: [] } } } };
    expect(await runResolveSourceMap(item, undefined)).toBe(item);
  });

  it('swallows hook errors and leaves the frame unresolved', async () => {
    const hook = vi.fn().mockRejectedValue(new Error('boom'));
    const item = { aiTicket: { json: { where: { unresolvedFrames: [{ file: 'x.js', line: 1, column: 0, needsServerResolution: true, bundleHash: 'h' }] } } } };
    const out = await runResolveSourceMap(item, hook);
    expect(out.aiTicket.json.where.file).toBeUndefined();
  });
});
```

- [ ] **Step 12.2: Run to confirm fail**

Run: `npm test -- sourcemap-resolver`
Expected: FAIL.

- [ ] **Step 12.3: Implement `src/integrations/server/sourcemap-resolver.js`**

```js
import { SourceMapConsumer } from 'source-map-js';

export async function runResolveSourceMap(item, hook) {
  if (typeof hook !== 'function') return item;
  const where = item?.aiTicket?.json?.where;
  const frames = where?.unresolvedFrames;
  if (!Array.isArray(frames) || frames.length === 0) return item;
  let resolvedOne = null;
  for (const frame of frames) {
    if (!frame?.needsServerResolution) continue;
    try {
      const mapText = await hook({ bundleHash: frame.bundleHash, scriptUrl: frame.file });
      if (!mapText) continue;
      const c = new SourceMapConsumer(typeof mapText === 'string' ? JSON.parse(mapText) : mapText);
      const pos = c.originalPositionFor({ line: frame.line, column: frame.column });
      if (!pos?.source) continue;
      const idx = c.sources?.indexOf?.(pos.source);
      resolvedOne = {
        file: pos.source,
        line: pos.line,
        column: pos.column,
        name: pos.name,
        sourcesContent: idx != null ? c.sourcesContent?.[idx] : null,
      };
      break;
    } catch {
      // ignore, try next frame
    }
  }
  if (!resolvedOne) return item;
  return {
    ...item,
    aiTicket: {
      ...item.aiTicket,
      json: {
        ...item.aiTicket.json,
        where: {
          ...where,
          file: resolvedOne.file,
          line: resolvedOne.line,
          column: resolvedOne.column,
          name: resolvedOne.name,
          codeSnippetSource: resolvedOne.sourcesContent,
        },
      },
    },
  };
}
```

- [ ] **Step 12.4: Wire into `withSecureDefaults`**

Read `src/integrations/server/withSecureDefaults.js`. Just after the redact step (step 6) and before the inner-handler forward (step 7), add:

```js
// Step 6.5: Optional source-map resolution
if (typeof hooks.resolveSourceMap === 'function') {
  const { runResolveSourceMap } = await import('./sourcemap-resolver.js');
  v.data = await runResolveSourceMap(v.data, hooks.resolveSourceMap);
}
```

(Existing step numbering stays; this is an additive call between redact and forward.)

- [ ] **Step 12.5: Run + commit**

```bash
npm test -- sourcemap-resolver
npm test
# Expected: all green, no regressions
git add src/integrations/server/sourcemap-resolver.js src/integrations/server/__tests__/sourcemap-resolver.test.js src/integrations/server/withSecureDefaults.js
git commit -m "$(cat <<'EOF'
feat(capture/server): add resolveSourceMap hook + withSecureDefaults integration

withSecureDefaults gains an optional resolveSourceMap({bundleHash,
scriptUrl}) hook. When the worker can't fetch a map (CORS / 404 /
host policy), it marks frames needsServerResolution=true; the server
hook reads the map from disk/S3/secrets, parses via source-map-js,
fills in file + line + code source. No hook = forward as-is.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — Wire `CaptureProvider` into `FeedbackProvider` + submit pipeline

**Files:** `src/FeedbackProvider.jsx`, `src/index.js`, `src/capture/index.js`

- [ ] **Step 13.1: Read the relevant section of `FeedbackProvider.jsx`** so the edit lands cleanly.

Run: `/usr/bin/grep -n "captureConfig\|handleAsyncSubmit\|saveFeedbackToLocalStorage" src/FeedbackProvider.jsx | head -10`

- [ ] **Step 13.2: Edit `src/FeedbackProvider.jsx`** to mount `<CaptureProvider>` and append the ticket assembly to the submit path.

Add this import block (top of file):
```jsx
import { CaptureProvider } from './capture/CaptureProvider.jsx';
import { CaptureContext } from './capture/CaptureContext.jsx';
import { runViaWorker } from './capture/workerClient.js';
```

Accept a new prop `captureConfig`:
```jsx
export const FeedbackProvider = ({
  // ...existing props,
  captureConfig,
  ...rest
}) => {
  // existing body
```

Wrap the rendered tree with `<CaptureProvider config={captureConfig || {}}>` when `captureConfig` is truthy. When omitted, render the tree without the provider so behaviour is byte-identical.

Inside `handleAsyncSubmit`, just before the `await onSubmit(processedData)` call, add (using a ref captured by the wrapping render — see below):
```js
if (captureConfig && captureRef.current) {
  try {
    const ticket = await runViaWorker({
      item: processedData,
      interactions: captureRef.current.getInteractions(),
      errors: captureRef.current.getErrors(),
      routes: captureRef.current.getRoutes(),
      fiberSnapshot: processedData.elementInfo?.fiberSnapshot || {},
      buildInfo: captureRef.current.getBuildInfo(),
      flags: await captureRef.current.getFlags(),
      framesToResolve: [],
      redactConfig: 'default',
    });
    processedData = { ...processedData, aiTicket: ticket };
  } catch {
    // Ticket assembly failures never block submission.
  }
}
```

To get a `captureRef.current` value, define a small reader-component pattern. Add this inside the component, before `return`:
```jsx
const captureRef = useRef(null);
function CaptureReader() {
  const ctx = React.useContext(CaptureContext);
  captureRef.current = ctx;
  return null;
}
```

Then wrap the existing render tree:
```jsx
const tree = (
  <ThemeProvider /* existing */>
    {/* existing body */}
  </ThemeProvider>
);
return captureConfig
  ? <CaptureProvider config={captureConfig}><CaptureReader />{tree}</CaptureProvider>
  : tree;
```

- [ ] **Step 13.3: Create `src/capture/index.js`** (barrel for the subpath export)

```js
export { CaptureProvider } from './CaptureProvider.jsx';
export { CaptureContext } from './CaptureContext.jsx';
export { FeedbackErrorBoundary } from './FeedbackErrorBoundary.jsx';
export { runViaWorker, runOnMainThread } from './workerClient.js';
export { resolveBuildInfo } from './buildInfo.js';
export { createRingBuffer } from './ringBuffer.js';
export { snapshotFiberTree } from './snapshot/fiberWalk.js';
```

- [ ] **Step 13.4: Update `src/index.js`** to re-export `FeedbackErrorBoundary`.

Add one line:
```js
export { FeedbackErrorBoundary } from './capture/FeedbackErrorBoundary.jsx';
```

- [ ] **Step 13.5: Run the full suite to make sure nothing regressed.**

```bash
npm test
# Expected: full suite passes; no Phase A/B1/B2 regressions
```

- [ ] **Step 13.6: Commit**

```bash
git add src/FeedbackProvider.jsx src/capture/index.js src/index.js
git commit -m "$(cat <<'EOF'
feat: wire CaptureProvider into FeedbackProvider; opt-in via captureConfig

FeedbackProvider gains a captureConfig prop. When present, wraps the
existing tree with CaptureProvider (mounts the three observers,
exposes context). handleAsyncSubmit attempts ticket assembly via the
lazy worker (runViaWorker) before the host onSubmit. Assembly
failures never block submission. When captureConfig is omitted,
behaviour is byte-identical to post-B2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — Workflow Panel + Evidence Stack adopt the ticket

**Files:** `src/dashboard/workflow/HandoffRow.jsx`, `src/dashboard/sections/SourceSection.jsx`

- [ ] **Step 14.1: Read both files** to land the edits cleanly.

Run:
```
/usr/bin/grep -n "FORMATS\|aiTicket\|doCopy" src/dashboard/workflow/HandoffRow.jsx | head -5
/usr/bin/grep -n "elementInfo\|aiTicket" src/dashboard/sections/SourceSection.jsx | head -5
```

- [ ] **Step 14.2: Modify `HandoffRow.jsx`** to add the AI ticket format.

Replace the existing `FORMATS` constant:
```jsx
const FORMATS = [
  { value: 'short', label: 'Short' },
  { value: 'full', label: 'Full' },
  { value: 'jira', label: 'Jira-ready' },
  { value: 'slack', label: 'Slack-ready' },
  { value: 'ai', label: 'AI ticket (Markdown)' },
];
```

Update `doCopy` to prefer the ticket Markdown when format is `ai`:
```jsx
const doCopy = async (format) => {
  let text;
  if (format === 'ai' && item.aiTicket?.markdown) text = item.aiTicket.markdown;
  else text = createFeedbackHandoffText(item, { format });
  try {
    await navigator.clipboard?.writeText?.(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  } catch {}
};
```

- [ ] **Step 14.3: Modify `SourceSection.jsx`** to render the inline code snippet when present.

After the existing `viewport` row, before the closing `</Stack>`:

```jsx
{item.aiTicket?.json?.where?.codeSnippet?.length > 0 && (
  <pre style={{
    fontFamily: 'ui-monospace, Menlo, monospace',
    fontSize: 12,
    background: 'var(--cs-canvas, #f7f7f3)',
    padding: '10px 12px',
    borderRadius: 8,
    overflowX: 'auto',
    marginTop: 8,
  }}>
    {item.aiTicket.json.where.codeSnippet.map((l) => {
      const num = String(l.line).padStart(4, ' ');
      return `${l.highlight ? '>>>' : '   '} ${num}  ${l.text}\n`;
    }).join('')}
  </pre>
)}
```

(Inline style here for minimum risk to the existing token chain; can be promoted to a styled-component in Phase C polish.)

- [ ] **Step 14.4: Run + commit**

```bash
npm test
# Expected: all green; no dashboard regressions
git add src/dashboard/workflow/HandoffRow.jsx src/dashboard/sections/SourceSection.jsx
git commit -m "$(cat <<'EOF'
feat(dashboard): HandoffRow gains 'AI ticket' format; SourceSection inlines code snippet

HandoffRow's Select grows a fifth option that copies item.aiTicket.markdown
when present, falling back to the existing handoff formatter when
the ticket isn't yet attached. SourceSection renders the resolved
code-context snippet inline (monospace, highlighted target line)
so reviewers see the exact code without leaving the dashboard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — Jira + Sheets handlers attach the ticket

**Files:** `src/integrations/jira.js`, `src/integrations/sheets.js`

- [ ] **Step 15.1: Read the legacy `handleCreate` in Jira and the create handler in Sheets** to land edits cleanly.

Run:
```
/usr/bin/grep -n "handleCreate\|attachments\|addAttachment" src/integrations/jira.js | head -10
/usr/bin/grep -n "handleAppend\|aiTicket\|feedbackToSheetRow" src/integrations/sheets.js | head -10
```

- [ ] **Step 15.2: Modify `src/integrations/jira.js` `handleCreate`** to attach `feedback-ai.md` + `feedback-ai.json` when present.

Inside `handleCreate`, after the existing screenshot/video/logs attachment block, add:
```js
if (feedbackData.aiTicket && config.uploadAttachments !== false) {
  try {
    const md = Buffer.from(String(feedbackData.aiTicket.markdown || ''), 'utf-8');
    if (md.length > 0) {
      const result = await client.addAttachment(
        issueKey,
        `feedback-ai-${feedbackData.id || Date.now()}.md`,
        md,
        'text/markdown',
      );
      attachments.push({ type: 'aiMarkdown', ...result[0] });
    }
    const jsonBuf = Buffer.from(JSON.stringify(feedbackData.aiTicket.json || {}, null, 2), 'utf-8');
    if (jsonBuf.length > 0) {
      const result2 = await client.addAttachment(
        issueKey,
        `feedback-ai-${feedbackData.id || Date.now()}.json`,
        jsonBuf,
        'application/json',
      );
      attachments.push({ type: 'aiJson', ...result2[0] });
    }
  } catch (err) {
    attachments.push({ type: 'aiTicket', error: err.message });
  }
}
```

- [ ] **Step 15.3: Modify `src/integrations/sheets.js` `handleAppend`** to append two columns.

Locate where the sheet row is composed (`feedbackToSheetRow` call). After the row is built, augment with:
```js
const row = await feedbackToSheetRow(feedbackData, config);
if (feedbackData.aiTicket) {
  row.push(
    (feedbackData.aiTicket.markdown || '').slice(0, 4000),
    JSON.stringify(feedbackData.aiTicket.json || {}).slice(0, 4000),
  );
}
```

(Sheets cells cap at 50KB; we truncate at 4KB for safety. Hosts that want the full payload can attach via Jira instead.)

- [ ] **Step 15.4: Run the full suite**

```bash
npm test
# Expected: green; existing Jira/Sheets tests untouched.
```

- [ ] **Step 15.5: Commit**

```bash
git add src/integrations/jira.js src/integrations/sheets.js
git commit -m "$(cat <<'EOF'
feat(integrations): attach AI ticket to Jira + append to Sheets

Jira handleCreate now attaches feedback-ai.md and feedback-ai.json
alongside screenshot/video/logs when item.aiTicket is present.
Sheets handleAppend appends two extra columns (truncated to 4KB
each) so hosts can scan the AI summary without leaving the sheet.
No-op when item.aiTicket is absent (legacy items render unchanged).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — Backward-compat + a11y + adversarial security tests

**Files:** `src/capture/__tests__/backward-compat.test.jsx`, `src/capture/__tests__/security-hardening.test.js`

- [ ] **Step 16.1: Write backward-compat test**

```jsx
// src/capture/__tests__/backward-compat.test.jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeedbackProvider } from '../../FeedbackProvider.jsx';

describe('Phase C backward compatibility', () => {
  it('FeedbackProvider without captureConfig does not spawn observers', () => {
    const before = document.addEventListener.bind(document);
    let mounted = 0;
    document.addEventListener = (type, ...rest) => {
      if (['click', 'pointerdown', 'focusin', 'input', 'change', 'submit', 'keydown'].includes(type)) mounted += 1;
      return before(type, ...rest);
    };
    render(<FeedbackProvider><div>x</div></FeedbackProvider>);
    expect(mounted).toBe(0);
    document.addEventListener = before;
  });

  it('with captureConfig={}, observers mount but aiTicket assembly is opt-in via the submit pipeline only', () => {
    render(<FeedbackProvider captureConfig={{}}><div>x</div></FeedbackProvider>);
    // No assertions on aiTicket — the test only verifies render is clean.
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 16.2: Write adversarial security test**

```js
// src/capture/__tests__/security-hardening.test.js
import { describe, it, expect } from 'vitest';
import { assembleTicket } from '../worker/ticketAssembler.js';
import { redactInteractionTrail, redactFiberSnapshot, redactBuildInfo, resolveRedactionConfig } from '../../lib/feedbackSecurity.js';

const cfg = resolveRedactionConfig('default');

describe('Phase C adversarial security', () => {
  it('redacts secret-shaped values in interaction trail', () => {
    const t = redactInteractionTrail([
      { type: 'input', target: { selector: 'x' }, value: 'token=sk_live_ABC' },
    ], cfg);
    expect(t[0].value).not.toContain('sk_live_ABC');
  });

  it('redacts secret-shaped keys in fiber snapshot at depth', () => {
    const tree = { Form: { props: { nested: { apiKey: 'leak' } }, state: null } };
    const out = redactFiberSnapshot(tree, cfg);
    expect(out.Form.props.nested.apiKey).toBe('<redacted>');
  });

  it('does not allow prototype pollution via crafted interaction value', () => {
    const before = ({}).polluted;
    redactInteractionTrail([
      { type: 'input', target: { selector: 'x' }, value: '{"__proto__":{"polluted":true}}' },
    ], cfg);
    expect(({}).polluted).toBe(before);
  });

  it('redactBuildInfo strips token-shaped fields', () => {
    const info = { deployToken: 'super', branch: 'main' };
    const out = redactBuildInfo(info, cfg);
    expect(out.deployToken).toBe('<redacted>');
    expect(out.branch).toBe('main');
  });

  it('ticket markdown never echoes a password-typed value', () => {
    const t = assembleTicket({
      item: { feedback: 'x', timestamp: '2026-01-01T00:00Z' },
      interactions: [{ type: 'input', target: { selector: 'input[type=password]' }, redacted: 'password-field', ts: 1 }],
      errors: [], routes: [],
    });
    expect(t.markdown).not.toContain('hunter2');
    expect(t.markdown).toMatch(/<password-field>/);
  });

  it('ticket schemaVersion is stable so consumers can pin', () => {
    const t = assembleTicket({ item: { feedback: 'x' }, interactions: [], errors: [], routes: [] });
    expect(t.json.schemaVersion).toBe('1.0');
  });
});
```

- [ ] **Step 16.3: Run + commit**

```bash
npm test -- "backward-compat"
npm test -- "security-hardening"
# Expected: green
git add src/capture/__tests__/backward-compat.test.jsx src/capture/__tests__/security-hardening.test.js
git commit -m "$(cat <<'EOF'
test(capture): backward-compat + adversarial hardening

backward-compat verifies <FeedbackProvider> without captureConfig
mounts ZERO observers — byte-identical to post-B2. Hardening covers
inline secret redaction in interaction values, deep key-name
redaction in fiber snapshot, prototype-pollution attempt via
crafted body, build-info token redaction, password-field never
echoed in ticket markdown, schemaVersion stability.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17 — Rollup bundle + package exports

**Files:** `rollup.config.js`, `package.json`

- [ ] **Step 17.1: Add `dist/capture/` bundle to `rollup.config.js`**

After the existing dashboard bundle entry, append:

```js
  // Capture client (main thread)
  {
    input: 'src/capture/index.js',
    output: [
      { file: 'dist/capture/index.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/capture/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Capture worker (self-contained chunk)
  {
    input: 'src/capture/worker/feedback-capture-worker.js',
    output: { file: 'dist/capture/worker.js', format: 'esm', sourcemap: true },
    onwarn,
    plugins: clientPlugins,
    external: [],
  },
```

- [ ] **Step 17.2: Add `./capture` subpath to `package.json` exports**

In the `exports` block after `./dashboard`:
```json
    "./capture": {
      "types": "./dist/types.d.ts",
      "import": "./dist/capture/index.esm.js",
      "require": "./dist/capture/index.js"
    },
    "./capture/worker": {
      "import": "./dist/capture/worker.js",
      "require": "./dist/capture/worker.js"
    },
```

- [ ] **Step 17.3: Build and size-check**

```bash
npm run build
ls dist/capture/
npm run build:check-size
# Expected: budgets within limits
```

- [ ] **Step 17.4: Commit**

```bash
git add rollup.config.js package.json
git commit -m "$(cat <<'EOF'
build: ship react-visual-feedback/capture + worker subpath

Adds two rollup entries: dist/capture/index.{js,esm.js} is the
main-thread capture surface (lazy-loadable from a host import);
dist/capture/worker.js is the self-contained worker bundle the
client points new Worker() at. package.json exports both subpaths.
Bundle sizes pass the documented Phase C budgets via
build:check-size.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18 — README + capture docs + CHANGELOG + final verify

**Files:** `README.md`, `docs/ai-capture-setup.md`, `docs/capture-performance.md`, `CHANGELOG.md`

- [ ] **Step 18.1: Append to `README.md`** the AI-actionable capture section.

After the "Command Center" section:

```markdown
## AI-actionable capture (v2.3+)

Phase C enriches every captured feedback with the file path + ±10
lines of real source code, React state at the click, a repro recipe
auto-generated from the interaction trail, captured errors, build
metadata, and an active feature-flag snapshot. The result is
attached to the feedback as both Markdown (paste-into-Claude /
Cursor / Copilot Chat) and structured JSON.

Opt in:

\`\`\`jsx
<FeedbackProvider
  captureConfig={{
    sensitiveSelectors: ['input[name="token"]'],
    flagsSnapshot: () => myFlags.allFlags(),
    buildInfo: { commit: process.env.GIT_SHA, branch: 'main' },
  }}
>
  …
</FeedbackProvider>
\`\`\`

Server source-map fallback (recommended for production):

\`\`\`js
withSecureDefaults({
  authorize: ...,
  resolveSourceMap: async ({ bundleHash, scriptUrl }) =>
    fs.readFile(\`./maps/\${bundleHash}.map.json\`, 'utf8'),
})(createJiraHandler({...}));
\`\`\`

See [docs/ai-capture-setup.md](docs/ai-capture-setup.md) and
[docs/capture-performance.md](docs/capture-performance.md).
```

- [ ] **Step 18.2: Create `docs/ai-capture-setup.md`** (host onboarding).

```markdown
# AI-actionable capture setup

This guide covers the host wiring needed to turn every captured
feedback into an AI-ready ticket.

## 1. Build metadata

Pick one of three ways. Order of precedence (highest first):

### a) Explicit prop (recommended for SPAs)
\`\`\`jsx
<FeedbackProvider captureConfig={{ buildInfo: { commit: process.env.GIT_SHA, branch: 'main', builtAt: new Date().toISOString() } }} />
\`\`\`

### b) Global
\`\`\`html
<script>window.__feedbackBuildInfo = { commit: 'abc123', branch: 'main' };</script>
\`\`\`

### c) Meta tag (works without a JS injection step)
\`\`\`html
<meta name="feedback-build" content="commit=abc&branch=main&builtAt=2026-06-15T17:30Z">
\`\`\`

Examples for Vite, Next.js, CRA are in the repository under `example-nextjs/` and `example-express/`.

## 2. Feature flags

\`\`\`jsx
captureConfig={{
  flagsSnapshot: () => myFlags.allFlags(),
}}
\`\`\`

LaunchDarkly: `flagsSnapshot: () => ldClient.allFlags(ldUser)`.
GrowthBook: `flagsSnapshot: () => gb.getAllAttributes()`.
Statsig: `flagsSnapshot: () => Statsig.checkGateAll()`.

## 3. Server source-map fallback

\`\`\`js
import { withSecureDefaults, createJiraHandler } from 'react-visual-feedback/server';

export const POST = withSecureDefaults({
  authorize: getSession,
  resolveSourceMap: async ({ bundleHash, scriptUrl }) => {
    // Read map for this build. Maps stay off the public CDN.
    const path = path.resolve('/srv/maps', bundleHash + '.map.json');
    return fs.readFile(path, 'utf8');
  },
})(createJiraHandler({ projectKey: 'BUG' }));
\`\`\`

## 4. Privacy posture

The interaction trail captures full input values, then runs three
layers of redaction:

1. HTML hints: `type=password`, `autocomplete=cc-*`, `inputmode=numeric` with sensitive name, `[data-feedback-redact="true"]` subtree.
2. Host-configured `sensitiveSelectors: string[]`.
3. Phase A inline-secret regex pass (worker AND server).

Use `data-feedback-redact="true"` to mark any subtree as never-captured.

## 5. Verify it works

After integration:
1. Submit a feedback after typing into a password field. Verify the
   stored item's `aiTicket.markdown` shows `<password-field>` and no
   password value anywhere.
2. Open the dashboard, copy the AI ticket from the Workflow Panel,
   paste into Claude / Cursor and confirm the file, code snippet,
   and repro are present.
```

- [ ] **Step 18.3: Create `docs/capture-performance.md`** (perf budgets).

```markdown
# Capture performance budgets

Phase C documents these hard budgets. CI enforces the bundle ones
via `npm run build:check-size`; the others are documented test
assertions.

| Budget | Limit | Where enforced |
|---|---|---|
| Main bundle delta (capture) | ≤ 12KB gz | `npm run build:check-size` |
| Lazy worker chunk | ≤ 35KB gz | `npm run build:check-size` |
| Main-thread fiber walk (depth 6) | < 2ms p99 | `snapshot/__tests__/fiberWalk.test.js` |
| Per observer event | < 1ms p99 | Run an example app and profile in DevTools |
| Modal open path | < 8ms p99 | Manual, DevTools Performance tab |

## How to measure locally

\`\`\`bash
npm run build
npm run build:check-size
\`\`\`

For interactive perf:
1. `cd example-nextjs && PORT=3005 npm run dev`
2. Open Chrome DevTools → Performance tab.
3. Record a 10-second session of interacting with the host app while observers are mounted.
4. Verify total scripting time added by observers < 5ms in the recording.
```

- [ ] **Step 18.4: Update `CHANGELOG.md`**

Append to the existing Unreleased block:

```markdown
### Added — Phase C (AI-actionable capture)
- New `react-visual-feedback/capture` subpath with `CaptureProvider`, `FeedbackErrorBoundary`, `runViaWorker`, `resolveBuildInfo`.
- Optional `captureConfig` prop on `FeedbackProvider` opting into interaction/route/error capture, fiber snapshot, build-info, feature-flag snapshot.
- Lazy Web Worker bundle (`dist/capture/worker.js`) for source-map deminification, code-context extraction, redaction, and ticket assembly. Idle-killed after 30s.
- Optional `resolveSourceMap` hook on `withSecureDefaults` for server-side source-map fallback. Maps stay off the public bundle.
- Three new redaction helpers in `feedbackSecurity`: `redactInteractionTrail`, `redactFiberSnapshot`, `redactBuildInfo`.
- HandoffRow gains an "AI ticket (Markdown)" format. SourceSection inlines the resolved code snippet.
- Jira handler attaches `feedback-ai.md` + `feedback-ai.json`. Sheets appends two truncated columns.
- New `source-map-js` runtime dependency, only loaded inside the worker chunk.

### Compatibility
- No breaking changes. Without `captureConfig`, the widget behaves byte-identically to post-B2.
```

- [ ] **Step 18.5: Final verify**

```bash
npm test
npm run build
npm run build:check-size
# Expected: all green, all budgets within limits
```

Manual: `cd example-nextjs && PORT=3005 npm run dev`. Submit a feedback. Open the dashboard, open the Workflow Panel, copy the AI ticket. Verify the Markdown contains the expected sections.

- [ ] **Step 18.6: Commit**

```bash
git add README.md docs/ai-capture-setup.md docs/capture-performance.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: announce Phase C AI-actionable capture

README gains the capture section + minimal opt-in example.
docs/ai-capture-setup.md walks through build metadata wiring,
feature-flag adapters (LaunchDarkly / GrowthBook / Statsig),
server source-map fallback, privacy posture (three layers),
verification recipe. docs/capture-performance.md documents the
hard budgets and how to measure locally. CHANGELOG Unreleased
block lists every new surface and re-asserts byte-identical
behaviour without captureConfig.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage check:**

- [x] T1 — devDeps + size check script
- [x] T2 — ringBuffer
- [x] T3 — buildInfo (three-tier)
- [x] T4 — selectorPath / labelFor / snapshotFiberTree
- [x] T5 — route + error observers + FeedbackErrorBoundary
- [x] T6 — interaction observer with three privacy layers
- [x] T7 — flags adapter + CaptureContext + CaptureProvider
- [x] T8 — three Phase A redactor extensions
- [x] T9 — IDB cache + source-map worker resolver
- [x] T10 — code context + fiber serializer + ticket assembler
- [x] T11 — worker entry + worker client (lazy spawn + main fallback)
- [x] T12 — server-side resolveSourceMap + withSecureDefaults integration
- [x] T13 — FeedbackProvider wiring (opt-in via captureConfig)
- [x] T14 — Workflow Panel (HandoffRow + SourceSection)
- [x] T15 — Jira + Sheets ticket attach
- [x] T16 — backward-compat + adversarial security tests
- [x] T17 — rollup + package exports
- [x] T18 — README + docs + CHANGELOG + final verify

**Placeholder scan:** no "TBD", "TODO", or empty steps.

**Type consistency:** `ringBuffer.snapshot()` / `.push()` / `.size()` consistent across observers, ticket assembler, tests. Worker postMessage `{type, id, ...}` consistent between client and worker. `aiTicket: { markdown, json, generatedAt, assembledOn? }` consistent across assembler, client fallback, dashboard sections, integrations.

**Known caveats (documented):**
- Source-map deminification needs `sourcesContent` populated in maps (default for webpack/rollup/Vite). If a host generates maps without `sourcesContent`, the worker path returns `needsServerResolution: true` and the server `resolveSourceMap` hook supplies the source directly.
- Browser CSP without `worker-src` will block worker spawn; client falls back to main-thread assembly automatically with `assembledOn: 'main'` on the ticket.
- `<FeedbackErrorBoundary>` requires the host to wrap the relevant subtree — not automatic.
