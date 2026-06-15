# Feedback Command Center — Phase A Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the security + data + DX foundation for the Feedback Command Center: pure helpers (evidence, redaction, validation, auth), additive server-adapter security via a `withSecureDefaults` preset, client-side auth wiring on `FeedbackProvider`, a Vitest test suite, and working Next.js + Express + anonymous-capture examples. Strictly additive; existing 2.2.x consumers upgrade with zero config changes.

**Architecture:** Three categories of additions. (1) Isomorphic pure helpers in `src/lib/` — no React, no DOM, no fetch — usable from browser and server. (2) An additive server-adapter wrapper (`withSecureDefaults`) that composes origin/CSRF/rate-limit/authorize/validate/redact in a fixed order and forwards to the existing `createJiraHandler` / `createSheetsHandler`. (3) A small client surface on `FeedbackProvider` (`auth`, `redact` props) and `IntegrationClient` (`getAuthHeaders`, one-time webhook warnings). Backward compatibility is non-negotiable — everything is opt-in.

**Tech Stack:** JavaScript (ESM), React 16.8+, styled-components 5/6, rollup for build, Vitest for tests (new), web-standard `Request`/`Response` for server adapter, no TypeScript at runtime (one `src/types.d.ts` declaration file for consumer types).

**Spec:** `docs/superpowers/specs/2026-06-15-feedback-phase-a-foundation-design.md`

---

## File Map

### New files
- `vitest.config.js`
- `src/lib/feedbackErrors.js` + `__tests__/feedbackErrors.test.js`
- `src/lib/feedbackValidation.js` + `__tests__/feedbackValidation.test.js`
- `src/lib/feedbackSecurity.js` + `__tests__/feedbackSecurity.test.js` + `__tests__/auth.test.js`
- `src/lib/feedbackEvidence.js` + `__tests__/feedbackEvidence.test.js`
- `src/lib/index.js`
- `src/types.d.ts`
- `src/integrations/server/request.js`
- `src/integrations/server/csrf.js`
- `src/integrations/server/defaults.js` + `__tests__/defaults.test.js`
- `src/integrations/server/withSecureDefaults.js` + `__tests__/withSecureDefaults.test.js`
- `src/integrations/__tests__/webhook-warning.test.js`
- `example-nextjs/app/api/feedback/jira/route.js`
- `example-nextjs/app/api/feedback/anonymous/route.js`
- `example-nextjs/app/api/feedback/token/route.js`
- `example-nextjs/lib/feedback-auth.js`
- `example-express/package.json`
- `example-express/server.js`
- `example-express/README.md`
- `docs/production-security-checklist.md`

### Modified files
- `package.json` — add vitest, test scripts, `./lib` export
- `rollup.config.js` — add lib bundle
- `src/FeedbackProvider.jsx` — `auth`, `redact` props; `useFeedbackAuth` hook
- `src/integrations/index.js` — `getAuthHeaders`, webhook warnings, auth-header injection on fetch calls
- `src/integrations/jira.js` — accept optional `security` config; production warning when missing
- `src/integrations/sheets.js` — same as jira
- `src/integrations/server/index.js` — re-export new server surface
- `src/__tests__/FeedbackFeatures.test.js` — convert to Vitest API
- `example-nextjs/app/layout.jsx` (or equivalent) — `<FeedbackProvider auth={{ mode: 'session' }} ... />`
- `README.md` — "Secure setup in 10 lines" section, link to checklist
- `CHANGELOG.md` — `[2.3.0]` section

---

## Conventions for all tasks

- **TDD order:** write the failing test, run to confirm fail, write minimal implementation, run to confirm pass, then commit. Don't skip the fail-first step.
- **Commits:** one per task at minimum. Use the conventional-commit style already in the repo (`feat:`, `fix:`, `docs:`, `test:`). End every message with the Co-Authored-By trailer.
- **No new runtime deps** in this phase except `vitest` (devDependency).
- **Imports:** keep relative inside `src/`. The `src/lib/` modules are pure — they must not import React, styled-components, or anything from outside `src/lib/`.
- **Logging:** when adding a runtime warning, use `console.warn('[react-visual-feedback] ...')` and gate "production only" warnings with `typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'` (works in both Node and bundlers that DCE this branch).

---

## Task 1 — Vitest setup, scripts, convert existing test

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json`
- Modify: `src/__tests__/FeedbackFeatures.test.js`

- [ ] **Step 1.1: Install Vitest as a devDependency**

```bash
npm install --save-dev vitest@^1.6.0
```

Expected: `package.json` `devDependencies` gains `vitest`, `package-lock.json` updates.

- [ ] **Step 1.2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    exclude: ['node_modules', 'dist', 'example', 'example-nextjs', 'example-express'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/integrations/server/**'],
      thresholds: {
        'src/lib/**': { lines: 100, branches: 95, functions: 100, statements: 100 },
        'src/integrations/server/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
      },
    },
  },
});
```

- [ ] **Step 1.3: Add test scripts in `package.json`**

Modify the `scripts` block (preserve existing `build`):

```json
"scripts": {
  "build": "rollup -c",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "prepublishOnly": "npm test && npm run build"
}
```

- [ ] **Step 1.4: Convert `src/__tests__/FeedbackFeatures.test.js` to Vitest API**

Read the file. Replace any Jest-specific imports/globals with Vitest equivalents:
- `jest.fn()` → `vi.fn()`
- `jest.mock(...)` → `vi.mock(...)`
- `beforeAll`, `afterAll`, `describe`, `it`/`test`, `expect` keep working as Vitest globals.

Add at the top of the file if any `vi` usage is needed:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

- [ ] **Step 1.5: Run the existing test under Vitest**

Run: `npm test`
Expected: existing test passes (or fails for unrelated reasons that aren't Vitest config). If it passes, proceed. If it fails for a reason caused by the conversion, fix the conversion until the previous behaviour holds.

- [ ] **Step 1.6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/__tests__/FeedbackFeatures.test.js
git commit -m "$(cat <<'EOF'
chore: add Vitest test runner, convert existing tests

Adds vitest as a devDependency, configures Node environment for pure
helpers, sets coverage targets for src/lib and src/integrations/server,
and converts the existing test file to the Vitest API. No behaviour
changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — `feedbackErrors.js` (error classes)

**Files:**
- Create: `src/lib/feedbackErrors.js`
- Create: `src/lib/__tests__/feedbackErrors.test.js`

- [ ] **Step 2.1: Write the failing test**

Create `src/lib/__tests__/feedbackErrors.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  FeedbackAuthError,
  FeedbackForbiddenError,
  FeedbackValidationError,
  FeedbackRateLimitError,
  FeedbackPayloadTooLargeError,
} from '../feedbackErrors.js';

describe('Feedback error classes', () => {
  it('FeedbackAuthError has code "unauthorized" and is an Error', () => {
    const err = new FeedbackAuthError();
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('unauthorized');
    expect(err.name).toBe('FeedbackAuthError');
  });

  it('FeedbackForbiddenError has code "forbidden"', () => {
    expect(new FeedbackForbiddenError().code).toBe('forbidden');
  });

  it('FeedbackValidationError carries fields', () => {
    const err = new FeedbackValidationError('bad', { feedback: 'required' });
    expect(err.code).toBe('validation_failed');
    expect(err.fields).toEqual({ feedback: 'required' });
  });

  it('FeedbackRateLimitError carries retryAfter seconds', () => {
    const err = new FeedbackRateLimitError(60);
    expect(err.code).toBe('rate_limited');
    expect(err.retryAfter).toBe(60);
  });

  it('FeedbackPayloadTooLargeError has code "payload_too_large"', () => {
    expect(new FeedbackPayloadTooLargeError().code).toBe('payload_too_large');
  });

  it('errors accept and preserve a message', () => {
    const err = new FeedbackAuthError('token expired');
    expect(err.message).toBe('token expired');
  });
});
```

- [ ] **Step 2.2: Run the test to confirm it fails**

Run: `npm test -- feedbackErrors`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement `src/lib/feedbackErrors.js`**

```js
/**
 * Error classes for the Feedback library.
 * Isomorphic: usable in browser and Node.
 */

class FeedbackError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class FeedbackAuthError extends FeedbackError {
  constructor(message = 'unauthorized') {
    super(message, 'unauthorized');
  }
}

export class FeedbackForbiddenError extends FeedbackError {
  constructor(message = 'forbidden') {
    super(message, 'forbidden');
  }
}

export class FeedbackValidationError extends FeedbackError {
  constructor(message = 'validation_failed', fields = {}) {
    super(message, 'validation_failed');
    this.fields = fields;
  }
}

export class FeedbackRateLimitError extends FeedbackError {
  constructor(retryAfter = 60, message = 'rate_limited') {
    super(message, 'rate_limited');
    this.retryAfter = retryAfter;
  }
}

export class FeedbackPayloadTooLargeError extends FeedbackError {
  constructor(message = 'payload_too_large') {
    super(message, 'payload_too_large');
  }
}
```

- [ ] **Step 2.4: Run test to confirm it passes**

Run: `npm test -- feedbackErrors`
Expected: PASS, 6/6.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/feedbackErrors.js src/lib/__tests__/feedbackErrors.test.js
git commit -m "$(cat <<'EOF'
feat(lib): add error classes for feedback security layer

Five Error subclasses with stable .code values matching the server
response taxonomy: unauthorized, forbidden, validation_failed,
rate_limited, payload_too_large. Isomorphic — used by both the
browser client and the server adapter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — `feedbackValidation.js`

**Files:**
- Create: `src/lib/feedbackValidation.js`
- Create: `src/lib/__tests__/feedbackValidation.test.js`

The function exported is `validateFeedbackSubmission(input, { authContext })`. It enforces enums, caps, owner shape, and silently strips server-write-only fields. Returns `{ ok: true, data }` or `{ ok: false, errors }`.

- [ ] **Step 3.1: Write the failing test**

Create `src/lib/__tests__/feedbackValidation.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validateFeedbackSubmission } from '../feedbackValidation.js';

const ctx = { authContext: { userId: 'u1' } };

describe('validateFeedbackSubmission', () => {
  it('accepts a minimal valid submission', () => {
    const r = validateFeedbackSubmission({ feedback: 'Looks broken' }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.feedback).toBe('Looks broken');
    expect(r.data.severity).toBe('medium'); // default
  });

  it('rejects empty feedback', () => {
    const r = validateFeedbackSubmission({ feedback: '   ' }, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.feedback).toMatch(/required/i);
  });

  it('rejects feedback over 5000 chars', () => {
    const r = validateFeedbackSubmission({ feedback: 'x'.repeat(5001) }, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.feedback).toMatch(/length/i);
  });

  it('coerces unknown type to "other"', () => {
    const r = validateFeedbackSubmission({ feedback: 'hi', type: 'weird' }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.type).toBe('other');
  });

  it('rejects invalid severity', () => {
    const r = validateFeedbackSubmission({ feedback: 'hi', severity: 'urgent' }, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.severity).toBeTruthy();
  });

  it('validates owner shape', () => {
    const r1 = validateFeedbackSubmission(
      { feedback: 'hi', owner: { name: 'A', email: 'not-an-email' } }, ctx);
    expect(r1.ok).toBe(false);
    expect(r1.errors['owner.email']).toBeTruthy();

    const r2 = validateFeedbackSubmission(
      { feedback: 'hi', owner: { name: 'A', avatar: 'http://x' } }, ctx);
    expect(r2.ok).toBe(false);
    expect(r2.errors['owner.avatar']).toMatch(/https/i);
  });

  it('clamps customerValue numerically and length-limits strings', () => {
    const r = validateFeedbackSubmission(
      { feedback: 'hi', customerValue: 1e12 }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.customerValue).toBe(1e9);

    const r2 = validateFeedbackSubmission(
      { feedback: 'hi', customerValue: 'x'.repeat(100) }, ctx);
    expect(r2.ok).toBe(false);
    expect(r2.errors.customerValue).toBeTruthy();
  });

  it('silently strips statusHistory and securityContext from input', () => {
    const r = validateFeedbackSubmission({
      feedback: 'hi',
      statusHistory: [{ to: 'resolved', changedAt: 'now' }],
      securityContext: { tenantId: 'evil' },
    }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.statusHistory).toBeUndefined();
    expect(r.data.securityContext).toBeUndefined();
  });

  it('silently strips integrationState provider-write fields', () => {
    const r = validateFeedbackSubmission({
      feedback: 'hi',
      integrationState: {
        jira: { status: 'created', issueKey: 'FAKE-1', issueUrl: 'evil' },
        sheets: { status: 'appended', rowId: '999' },
      },
    }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.integrationState.jira.issueKey).toBeUndefined();
    expect(r.data.integrationState.jira.issueUrl).toBeUndefined();
    expect(r.data.integrationState.sheets.rowId).toBeUndefined();
  });

  it('error messages do not echo submitted values', () => {
    const r = validateFeedbackSubmission(
      { feedback: 'hi', owner: { name: 'A', email: 'malicious<script>' } }, ctx);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.errors)).not.toContain('malicious');
    expect(JSON.stringify(r.errors)).not.toContain('script');
  });

  it('caps eventLogs to 5000 entries by dropping the overflow', () => {
    const events = Array.from({ length: 6000 }, (_, i) => ({ type: 'console', message: String(i) }));
    const r = validateFeedbackSubmission({ feedback: 'hi', eventLogs: events }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.eventLogs.length).toBe(5000);
  });
});
```

- [ ] **Step 3.2: Run the test to confirm it fails**

Run: `npm test -- feedbackValidation`
Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement `src/lib/feedbackValidation.js`**

```js
/**
 * Pure validation for client-submitted feedback.
 * Returns { ok:true, data } or { ok:false, errors }.
 * Server-write-only fields are silently stripped, not rejected.
 * Error messages never echo submitted values (avoid reflective leakage).
 */

const TYPES = ['bug', 'idea', 'praise', 'question', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

const CAPS = {
  feedback: 5000,
  userName: 120,
  userEmail: 320,
  url: 2048,
  ownerName: 120,
  customerValueString: 40,
  selector: 1024,
  sourceFile: 1024,
  componentStack: 50,
  eventLogs: 5000,
};

function strOrNull(v) {
  return typeof v === 'string' ? v : null;
}

function clampNumber(n, lo, hi) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.max(lo, Math.min(hi, n));
}

export function validateFeedbackSubmission(input, { authContext } = {}) {
  const errors = {};
  const data = {};

  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { _: 'invalid_payload' } };
  }

  // feedback (required)
  const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : '';
  if (!feedback) {
    errors.feedback = 'required';
  } else if (feedback.length > CAPS.feedback) {
    errors.feedback = 'length_exceeded';
  } else {
    data.feedback = feedback;
  }

  // type (default 'other' if unknown)
  if (input.type === undefined) {
    data.type = 'bug';
  } else if (typeof input.type !== 'string') {
    errors.type = 'invalid';
  } else {
    data.type = TYPES.includes(input.type) ? input.type : 'other';
  }

  // severity (default 'medium')
  if (input.severity === undefined) {
    data.severity = 'medium';
  } else if (typeof input.severity !== 'string' || !SEVERITIES.includes(input.severity)) {
    errors.severity = 'invalid';
  } else {
    data.severity = input.severity;
  }

  // owner
  if (input.owner !== undefined) {
    if (!input.owner || typeof input.owner !== 'object') {
      errors.owner = 'invalid';
    } else {
      const o = {};
      if (typeof input.owner.name !== 'string' || !input.owner.name.trim()) {
        errors['owner.name'] = 'required';
      } else if (input.owner.name.length > CAPS.ownerName) {
        errors['owner.name'] = 'length_exceeded';
      } else {
        o.name = input.owner.name.trim();
      }
      if (input.owner.id !== undefined) {
        if (typeof input.owner.id !== 'string' || !SAFE_ID_RE.test(input.owner.id)) {
          errors['owner.id'] = 'invalid';
        } else {
          o.id = input.owner.id;
        }
      }
      if (input.owner.email !== undefined) {
        if (typeof input.owner.email !== 'string' || !EMAIL_RE.test(input.owner.email)) {
          errors['owner.email'] = 'invalid';
        } else {
          o.email = input.owner.email;
        }
      }
      if (input.owner.avatar !== undefined) {
        if (typeof input.owner.avatar !== 'string' || !input.owner.avatar.startsWith('https://')) {
          errors['owner.avatar'] = 'must_be_https';
        } else {
          o.avatar = input.owner.avatar;
        }
      }
      if (Object.keys(o).length > 0 && !errors['owner.name']) data.owner = o;
    }
  }

  // customerValue
  if (input.customerValue !== undefined) {
    if (typeof input.customerValue === 'number') {
      data.customerValue = clampNumber(input.customerValue, 0, 1e9);
    } else if (typeof input.customerValue === 'string') {
      if (input.customerValue.length > CAPS.customerValueString) {
        errors.customerValue = 'length_exceeded';
      } else {
        data.customerValue = input.customerValue;
      }
    } else {
      errors.customerValue = 'invalid';
    }
  }

  // simple length-capped strings
  for (const [key, cap] of [
    ['userName', CAPS.userName],
    ['userEmail', CAPS.userEmail],
    ['url', CAPS.url],
  ]) {
    const v = strOrNull(input[key]);
    if (v === null) continue;
    if (v.length > cap) errors[key] = 'length_exceeded';
    else data[key] = v;
  }

  // elementInfo
  if (input.elementInfo && typeof input.elementInfo === 'object') {
    const ei = {};
    const selector = strOrNull(input.elementInfo.selector);
    if (selector !== null) {
      if (selector.length > CAPS.selector) errors['elementInfo.selector'] = 'length_exceeded';
      else ei.selector = selector;
    }
    const sourceFile = strOrNull(input.elementInfo.sourceFile);
    if (sourceFile !== null) {
      if (sourceFile.length > CAPS.sourceFile) errors['elementInfo.sourceFile'] = 'length_exceeded';
      else ei.sourceFile = sourceFile;
    }
    if (Array.isArray(input.elementInfo.componentStack)) {
      ei.componentStack = input.elementInfo.componentStack
        .filter((x) => typeof x === 'string')
        .slice(0, CAPS.componentStack);
    }
    if (Object.keys(ei).length > 0) data.elementInfo = ei;
  }

  // eventLogs — cap quantity, drop malformed events silently
  if (Array.isArray(input.eventLogs)) {
    data.eventLogs = input.eventLogs
      .filter((e) => e && typeof e === 'object' && typeof e.type === 'string')
      .slice(0, CAPS.eventLogs);
  }

  // integrationState — preserve only allowed client-set status values
  if (input.integrationState && typeof input.integrationState === 'object') {
    const allowedClientStatus = new Set(['not_sent']);
    const is = {};
    for (const provider of ['local', 'jira', 'sheets']) {
      const p = input.integrationState[provider];
      if (!p || typeof p !== 'object') continue;
      const out = {};
      if (allowedClientStatus.has(p.status)) out.status = p.status;
      // issueKey/issueUrl/rowId silently stripped — server writes them
      if (Object.keys(out).length > 0) is[provider] = out;
    }
    if (Object.keys(is).length > 0) data.integrationState = is;
  }

  // statusHistory and securityContext silently stripped — server-write-only.

  // pass-through fields we don't validate but allow
  for (const key of ['screenshot', 'video', 'videoBlob', 'timestamp', 'id', 'status', 'viewport']) {
    if (input[key] !== undefined) data[key] = input[key];
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}
```

- [ ] **Step 3.4: Run test to confirm it passes**

Run: `npm test -- feedbackValidation`
Expected: PASS, 11/11.

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/feedbackValidation.js src/lib/__tests__/feedbackValidation.test.js
git commit -m "$(cat <<'EOF'
feat(lib): add validateFeedbackSubmission pure helper

Enforces enums (type, severity), shape (owner), length caps, and
silently strips server-write-only fields (statusHistory,
securityContext, integrationState provider keys). Error messages
never echo submitted values to avoid reflective leakage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `feedbackSecurity.js` redaction core

**Files:**
- Create: `src/lib/feedbackSecurity.js` (initial: redaction helpers only; auth helpers in Task 5)
- Create: `src/lib/__tests__/feedbackSecurity.test.js`

- [ ] **Step 4.1: Write the failing test**

Create `src/lib/__tests__/feedbackSecurity.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import {
  redactFeedbackEvidence,
  redactNetworkEvent,
  redactConsoleEvent,
  redactStorageEvent,
  redactHandoffText,
  resolveRedactionConfig,
} from '../feedbackSecurity.js';

describe('resolveRedactionConfig', () => {
  it('returns default profile when called with "default"', () => {
    const cfg = resolveRedactionConfig('default');
    expect(cfg.redactHeaders).toContain('authorization');
    expect(cfg.allowRequestBodies).toBe(false);
    expect(cfg.stripUrlQuery).toBe(false);
  });

  it('strict profile strips URL query and drops storage values', () => {
    const cfg = resolveRedactionConfig('strict');
    expect(cfg.stripUrlQuery).toBe(true);
    expect(cfg.dropStorageValues).toBe(true);
  });

  it('"off" returns empty config', () => {
    expect(resolveRedactionConfig('off').redactHeaders).toEqual([]);
  });

  it('custom object merges on top of default', () => {
    const cfg = resolveRedactionConfig({
      redactHeaders: ['x-org-secret'],
      allowRequestBodies: true,
    });
    expect(cfg.redactHeaders).toContain('authorization');
    expect(cfg.redactHeaders).toContain('x-org-secret');
    expect(cfg.allowRequestBodies).toBe(true);
  });
});

describe('redactNetworkEvent', () => {
  const cfg = resolveRedactionConfig('default');

  it('redacts known sensitive headers case-insensitively', () => {
    const out = redactNetworkEvent({
      type: 'network',
      url: 'https://api.example.com/x',
      method: 'GET',
      headers: { Authorization: 'Bearer abc', 'X-API-KEY': 'k', 'Content-Type': 'application/json' },
    }, cfg);
    expect(out.headers.Authorization).toBe('<redacted>');
    expect(out.headers['X-API-KEY']).toBe('<redacted>');
    expect(out.headers['Content-Type']).toBe('application/json');
  });

  it('redacts headers by prefix match (x-amz-security-*)', () => {
    const out = redactNetworkEvent({
      type: 'network',
      headers: { 'X-Amz-Security-Token': 'aws', 'X-Goog-Auth': 'g' },
    }, cfg);
    expect(out.headers['X-Amz-Security-Token']).toBe('<redacted>');
    expect(out.headers['X-Goog-Auth']).toBe('<redacted>');
  });

  it('drops request and response bodies by default', () => {
    const out = redactNetworkEvent({
      type: 'network',
      request: { body: 'secret=abc' },
      response: { body: 'token=xyz' },
    }, cfg);
    expect(out.request.body).toBeUndefined();
    expect(out.response.body).toBeUndefined();
    expect(out.bodyRedacted).toBe('dropped-by-default');
  });

  it('redacts sensitive query params in place', () => {
    const out = redactNetworkEvent({
      type: 'network',
      url: 'https://api.example.com/x?token=secret&page=2',
    }, cfg);
    expect(out.url).toContain('token=%3Credacted%3E');
    expect(out.url).toContain('page=2');
  });

  it('strict profile strips entire query', () => {
    const out = redactNetworkEvent({
      type: 'network',
      url: 'https://api.example.com/x?token=secret&page=2',
    }, resolveRedactionConfig('strict'));
    expect(out.url).toBe('https://api.example.com/x');
  });

  it('allows bodies when allowRequestBodies/allowResponseBodies set', () => {
    const cfg = resolveRedactionConfig({ allowRequestBodies: true, allowResponseBodies: true });
    const out = redactNetworkEvent({
      type: 'network',
      request: { body: JSON.stringify({ password: 'p', name: 'a' }) },
      response: { body: JSON.stringify({ access_token: 't', id: 1 }) },
    }, cfg);
    expect(out.request.body).toContain('"password":"<redacted>"');
    expect(out.request.body).toContain('"name":"a"');
    expect(out.response.body).toContain('"access_token":"<redacted>"');
  });
});

describe('redactConsoleEvent', () => {
  const cfg = resolveRedactionConfig('default');

  it('truncates long messages', () => {
    const out = redactConsoleEvent({
      type: 'console', level: 'log', message: 'x'.repeat(3000),
    }, cfg);
    expect(out.message.length).toBeLessThanOrEqual(cfg.maxLogMessageLength + 20);
    expect(out.message).toMatch(/truncated/);
  });

  it('redacts inline key=value secrets', () => {
    const out = redactConsoleEvent({
      type: 'console', level: 'log',
      message: 'request token=abc.def.ghi started',
    }, cfg);
    expect(out.message).not.toContain('abc.def.ghi');
    expect(out.message).toContain('token=<redacted>');
  });
});

describe('redactStorageEvent', () => {
  const cfg = resolveRedactionConfig('default');

  it('redacts value for known sensitive keys', () => {
    const out = redactStorageEvent({
      type: 'storage', storageType: 'localStorage',
      action: 'setItem', key: 'access_token', value: 'real-token',
    }, cfg);
    expect(out.value).toBe('<redacted>');
  });

  it('truncates long values for non-sensitive keys', () => {
    const out = redactStorageEvent({
      type: 'storage', storageType: 'localStorage',
      action: 'setItem', key: 'prefs', value: 'x'.repeat(500),
    }, cfg);
    expect(out.value.length).toBeLessThanOrEqual(220);
  });

  it('strict profile drops values entirely', () => {
    const out = redactStorageEvent({
      type: 'storage', action: 'setItem', key: 'prefs', value: 'data',
    }, resolveRedactionConfig('strict'));
    expect(out.value).toBe('<dropped: storage value>');
  });
});

describe('redactFeedbackEvidence', () => {
  it('returns { data, appliedRules } and never mutates input', () => {
    const item = {
      feedback: 'hi',
      eventLogs: [
        { type: 'network', headers: { Authorization: 'x' } },
        { type: 'console', message: 'token=abc' },
      ],
    };
    const before = JSON.stringify(item);
    const out = redactFeedbackEvidence(item, resolveRedactionConfig('default'));
    expect(JSON.stringify(item)).toBe(before);
    expect(out.data.eventLogs[0].headers.Authorization).toBe('<redacted>');
    expect(out.appliedRules).toContain('headers');
    expect(out.appliedRules).toContain('console');
  });
});

describe('redactHandoffText', () => {
  it('redacts inline secrets in free text', () => {
    const cfg = resolveRedactionConfig('default');
    expect(redactHandoffText('curl -H "Authorization: Bearer abc.def"', cfg))
      .toMatch(/<redacted>/);
  });
});
```

- [ ] **Step 4.2: Run the test to confirm it fails**

Run: `npm test -- feedbackSecurity`
Expected: FAIL — module not found.

- [ ] **Step 4.3: Implement `src/lib/feedbackSecurity.js`**

```js
/**
 * Pure redaction helpers and config resolution.
 * Isomorphic: usable in browser and Node.
 * Auth helpers (getFeedbackAuthHeaders, etc.) are appended in Task 5.
 */

export const DEFAULT_REDACTION = Object.freeze({
  preset: 'default',
  redactHeaders: [
    'authorization', 'cookie', 'set-cookie', 'proxy-authorization',
    'x-api-key', 'x-auth-token', 'api-key', 'token', 'secret',
  ],
  redactHeaderPrefixes: ['x-amz-security-', 'x-goog-', 'x-firebase-'],
  redactQueryParams: [
    'password', 'passcode', 'pin', 'token', 'secret', 'apikey', 'apikey',
    'api_key', 'authorization', 'refresh_token', 'access_token', 'id_token',
    'session', 'cookie', 'otp', 'ssn', 'credit_card', 'cvv', 'card_number',
  ],
  redactBodyKeys: [
    'password', 'passcode', 'pin', 'token', 'secret', 'apikey', 'apiKey',
    'api_key', 'authorization', 'refresh_token', 'access_token', 'id_token',
    'session', 'cookie', 'otp', 'ssn', 'credit_card', 'cvv', 'card_number',
  ],
  maxBodyLength: 0,
  maxLogMessageLength: 2000,
  allowRequestBodies: false,
  allowResponseBodies: false,
  stripUrlQuery: false,
  dropStorageValues: false,
  dropIndexedDbEvents: false,
});

const STRICT_OVERRIDES = Object.freeze({
  preset: 'strict',
  stripUrlQuery: true,
  dropStorageValues: true,
  dropIndexedDbEvents: true,
});

const OFF_PROFILE = Object.freeze({
  preset: 'off',
  redactHeaders: [],
  redactHeaderPrefixes: [],
  redactQueryParams: [],
  redactBodyKeys: [],
  maxBodyLength: Infinity,
  maxLogMessageLength: Infinity,
  allowRequestBodies: true,
  allowResponseBodies: true,
  stripUrlQuery: false,
  dropStorageValues: false,
  dropIndexedDbEvents: false,
});

export function resolveRedactionConfig(input) {
  if (input === 'off') return { ...OFF_PROFILE };
  if (input === 'strict') {
    return { ...DEFAULT_REDACTION, ...STRICT_OVERRIDES };
  }
  if (input === 'default' || input === undefined || input === null) {
    return { ...DEFAULT_REDACTION };
  }
  if (typeof input === 'object') {
    const base = input.preset === 'strict'
      ? { ...DEFAULT_REDACTION, ...STRICT_OVERRIDES }
      : { ...DEFAULT_REDACTION };
    return {
      ...base,
      ...input,
      redactHeaders: [...new Set([...(base.redactHeaders || []), ...(input.redactHeaders || [])])],
      redactHeaderPrefixes: [...new Set([...(base.redactHeaderPrefixes || []), ...(input.redactHeaderPrefixes || [])])],
      redactQueryParams: [...new Set([...(base.redactQueryParams || []), ...(input.redactQueryParams || [])])],
      redactBodyKeys: [...new Set([...(base.redactBodyKeys || []), ...(input.redactBodyKeys || [])])],
    };
  }
  return { ...DEFAULT_REDACTION };
}

function matchHeader(name, cfg) {
  const low = name.toLowerCase();
  if (cfg.redactHeaders.some((h) => h.toLowerCase() === low)) return true;
  if (cfg.redactHeaderPrefixes.some((p) => low.startsWith(p))) return true;
  return false;
}

function redactHeaders(headers, cfg) {
  if (!headers || typeof headers !== 'object') return headers;
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = matchHeader(k, cfg) ? '<redacted>' : v;
  }
  return out;
}

function redactObjectByKeys(value, sensitiveKeys, depth = 0) {
  if (depth > 12) return value;
  if (Array.isArray(value)) return value.map((v) => redactObjectByKeys(v, sensitiveKeys, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (sensitiveKeys.some((s) => s.toLowerCase() === k.toLowerCase())) {
        out[k] = '<redacted>';
      } else {
        out[k] = redactObjectByKeys(v, sensitiveKeys, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function redactBodyString(body, cfg) {
  if (typeof body !== 'string') return body;
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(redactObjectByKeys(parsed, cfg.redactBodyKeys));
  } catch {
    // Not JSON; apply regex inline redaction
    return redactInlineSecrets(body, cfg);
  }
}

const INLINE_SECRET_RE = /((?:password|token|secret|api[-_]?key|authorization)\s*[:=]\s*)("?[^"\s,;]+"?)/gi;

function redactInlineSecrets(text, cfg) {
  if (typeof text !== 'string') return text;
  return text.replace(INLINE_SECRET_RE, (_m, prefix) => `${prefix}<redacted>`);
}

function redactUrl(url, cfg) {
  if (typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (cfg.stripUrlQuery) {
      u.search = '';
      return u.toString();
    }
    if (u.searchParams) {
      const replacements = [];
      for (const [k] of u.searchParams) {
        if (cfg.redactQueryParams.some((p) => p.toLowerCase() === k.toLowerCase())) {
          replacements.push(k);
        }
      }
      for (const k of replacements) u.searchParams.set(k, '<redacted>');
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function redactNetworkEvent(event, cfg) {
  if (!event || event.type !== 'network') return event;
  const out = { ...event };
  if (out.url) out.url = redactUrl(out.url, cfg);
  if (out.headers) out.headers = redactHeaders(out.headers, cfg);
  if (out.request) {
    out.request = { ...out.request };
    if (out.request.headers) out.request.headers = redactHeaders(out.request.headers, cfg);
    if (!cfg.allowRequestBodies) {
      delete out.request.body;
      out.bodyRedacted = 'dropped-by-default';
    } else if (out.request.body !== undefined) {
      out.request.body = redactBodyString(out.request.body, cfg);
      if (typeof out.request.body === 'string' && cfg.maxBodyLength && out.request.body.length > cfg.maxBodyLength) {
        out.request.body = out.request.body.slice(0, cfg.maxBodyLength) + '...<truncated>';
      }
    }
  }
  if (out.response) {
    out.response = { ...out.response };
    if (out.response.headers) out.response.headers = redactHeaders(out.response.headers, cfg);
    if (!cfg.allowResponseBodies) {
      delete out.response.body;
      out.bodyRedacted = 'dropped-by-default';
    } else if (out.response.body !== undefined) {
      out.response.body = redactBodyString(out.response.body, cfg);
      if (typeof out.response.body === 'string' && cfg.maxBodyLength && out.response.body.length > cfg.maxBodyLength) {
        out.response.body = out.response.body.slice(0, cfg.maxBodyLength) + '...<truncated>';
      }
    }
  }
  return out;
}

export function redactConsoleEvent(event, cfg) {
  if (!event || event.type !== 'console') return event;
  const out = { ...event };
  if (typeof out.message === 'string') {
    let msg = out.message;
    if (cfg.maxLogMessageLength && msg.length > cfg.maxLogMessageLength) {
      msg = msg.slice(0, cfg.maxLogMessageLength) + ' ...<truncated>';
    }
    msg = redactInlineSecrets(msg, cfg);
    out.message = msg;
  }
  return out;
}

export function redactStorageEvent(event, cfg) {
  if (!event || (event.type !== 'storage' && event.type !== 'indexedDB')) return event;
  if (event.type === 'indexedDB' && cfg.dropIndexedDbEvents) {
    return { type: 'indexedDB-summary', action: event.action, dbName: event.dbName };
  }
  const out = { ...event };
  if (event.type === 'storage') {
    if (typeof out.value === 'string') {
      if (cfg.dropStorageValues) {
        out.value = '<dropped: storage value>';
      } else if (cfg.redactBodyKeys.some((k) => k.toLowerCase() === String(out.key || '').toLowerCase())) {
        out.value = '<redacted>';
      } else if (out.value.length > 200) {
        out.value = out.value.slice(0, 200) + '...<truncated>';
      }
    }
  } else if (event.type === 'indexedDB') {
    if (out.data) out.data = '<dropped: indexeddb value>';
  }
  return out;
}

export function redactHandoffText(text, cfg) {
  return redactInlineSecrets(String(text || ''), cfg);
}

export function redactFeedbackEvidence(item, cfg) {
  const appliedRules = new Set();
  const out = { ...item };

  if (Array.isArray(out.eventLogs)) {
    out.eventLogs = out.eventLogs.map((e) => {
      if (!e || typeof e !== 'object') return e;
      switch (e.type) {
        case 'network': {
          appliedRules.add('headers');
          if (!cfg.allowRequestBodies || !cfg.allowResponseBodies) appliedRules.add('bodies');
          if (cfg.stripUrlQuery || cfg.redactQueryParams.length) appliedRules.add('urls');
          return redactNetworkEvent(e, cfg);
        }
        case 'console':
          appliedRules.add('console');
          return redactConsoleEvent(e, cfg);
        case 'storage':
          appliedRules.add('storage');
          return redactStorageEvent(e, cfg);
        case 'indexedDB':
          appliedRules.add('idb');
          return redactStorageEvent(e, cfg);
        default:
          return e;
      }
    }).filter(Boolean);
  }

  // url at top level
  if (out.url) out.url = redactUrl(out.url, cfg);

  return { data: out, appliedRules: [...appliedRules] };
}
```

- [ ] **Step 4.4: Run test to confirm it passes**

Run: `npm test -- feedbackSecurity`
Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/feedbackSecurity.js src/lib/__tests__/feedbackSecurity.test.js
git commit -m "$(cat <<'EOF'
feat(lib): add redaction core for feedback evidence

Pure helpers redact network, console, storage, and IndexedDB events
plus top-level URLs and free-text handoff. Three profiles (default,
strict, off) plus a custom config that merges on top of defaults.
Bodies dropped by default; opt-in via allowRequestBodies /
allowResponseBodies. Returns { data, appliedRules } so callers can
stamp securityContext.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — `feedbackSecurity.js` auth helpers

**Files:**
- Modify: `src/lib/feedbackSecurity.js` (append auth helpers)
- Create: `src/lib/__tests__/auth.test.js`

- [ ] **Step 5.1: Write the failing test**

Create `src/lib/__tests__/auth.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFeedbackAuthHeaders,
  resolveCsrfToken,
  isInsecureWebhookMode,
} from '../feedbackSecurity.js';

describe('getFeedbackAuthHeaders', () => {
  it('mode "none" returns empty headers', async () => {
    expect(await getFeedbackAuthHeaders({ mode: 'none' })).toEqual({});
  });

  it('mode "bearer" calls getToken and returns Authorization', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 'tok-abc',
    });
    expect(headers.Authorization).toBe('Bearer tok-abc');
  });

  it('mode "bearer" supports async getToken', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: async () => 'async-tok',
    });
    expect(headers.Authorization).toBe('Bearer async-tok');
  });

  it('mode "signed" uses same Bearer scheme', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'signed',
      getToken: () => 'signed-tok',
    });
    expect(headers.Authorization).toBe('Bearer signed-tok');
  });

  it('mode "session" returns CSRF header when explicit token provided', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'session',
      csrfToken: 'csrf-x',
    });
    expect(headers['X-CSRF-Token']).toBe('csrf-x');
  });

  it('merges custom getHeaders result', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 't',
      getHeaders: () => ({ 'X-Tenant': 'acme' }),
    });
    expect(headers.Authorization).toBe('Bearer t');
    expect(headers['X-Tenant']).toBe('acme');
  });

  it('does not persist tokens (no side effects beyond return)', async () => {
    const headers = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 'one-shot',
    });
    expect(headers.Authorization).toBe('Bearer one-shot');
    // calling again with different token returns different headers
    const h2 = await getFeedbackAuthHeaders({
      mode: 'bearer',
      getToken: () => 'two-shot',
    });
    expect(h2.Authorization).toBe('Bearer two-shot');
  });
});

describe('resolveCsrfToken', () => {
  it('returns explicit string token first', async () => {
    expect(await resolveCsrfToken({ csrfToken: 'explicit' })).toBe('explicit');
  });

  it('calls a function csrfToken', async () => {
    expect(await resolveCsrfToken({ csrfToken: () => 'fn-token' })).toBe('fn-token');
  });

  it('returns null when nothing found', async () => {
    expect(await resolveCsrfToken({})).toBe(null);
  });
});

describe('isInsecureWebhookMode', () => {
  it('returns true for known insecure modes', () => {
    expect(isInsecureWebhookMode('jira-automation')).toBe(true);
    expect(isInsecureWebhookMode('appsScript')).toBe(true);
    expect(isInsecureWebhookMode('zapier')).toBe(true);
  });
  it('returns false for server-mediated modes', () => {
    expect(isInsecureWebhookMode('server')).toBe(false);
    expect(isInsecureWebhookMode('oauth')).toBe(false);
  });
});
```

- [ ] **Step 5.2: Run the test to confirm it fails**

Run: `npm test -- auth.test`
Expected: FAIL — exports not defined.

- [ ] **Step 5.3: Append auth helpers to `src/lib/feedbackSecurity.js`**

Append at end of file:

```js
// =============================================================
// Auth helpers
// =============================================================

export async function resolveCsrfToken(authConfig) {
  if (!authConfig) return null;
  const t = authConfig.csrfToken;
  if (typeof t === 'function') {
    const v = await t();
    return typeof v === 'string' && v ? v : null;
  }
  if (typeof t === 'string' && t) return t;
  // Browser-only discovery: cookie + meta tag
  if (typeof document !== 'undefined') {
    const cookie = document.cookie || '';
    const m = cookie.match(/(?:^|;\s*)(?:csrf-token|XSRF-TOKEN)=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    const meta = document.querySelector?.('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
  }
  return null;
}

export async function getFeedbackAuthHeaders(authConfig) {
  if (!authConfig || authConfig.mode === 'none') return {};

  const headers = {};

  if (authConfig.mode === 'bearer' || authConfig.mode === 'signed') {
    if (typeof authConfig.getToken === 'function') {
      const tok = await authConfig.getToken();
      if (typeof tok === 'string' && tok) {
        headers.Authorization = `Bearer ${tok}`;
      }
    }
  }

  if (authConfig.mode === 'session') {
    const csrf = await resolveCsrfToken(authConfig);
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  if (typeof authConfig.getHeaders === 'function') {
    const extra = await authConfig.getHeaders();
    if (extra && typeof extra === 'object') {
      Object.assign(headers, extra);
    }
  }

  return headers;
}

const INSECURE_MODES = new Set(['jira-automation', 'jiraAutomation', 'appsScript', 'apps-script', 'zapier']);

export function isInsecureWebhookMode(type) {
  if (typeof type !== 'string') return false;
  return INSECURE_MODES.has(type);
}

export function getDestinationPolicy(authContext, destination) {
  // Hook point. By default, allow all destinations. Hosts override via withSecureDefaults.
  return { allowed: true, destination, reason: null };
}

export function getSubmissionState(item) {
  if (!item) return 'idle';
  const local = item.integrationState?.local?.status;
  const jira = item.integrationState?.jira?.status;
  const sheets = item.integrationState?.sheets?.status;
  if ([jira, sheets].includes('pending') || local === 'pending') return 'submitting';
  if ([jira, sheets, local].includes('error')) {
    if ([jira, sheets].some((s) => s === 'created' || s === 'synced' || s === 'appended')) {
      return 'partial';
    }
    return 'failed';
  }
  if (jira === 'created' || jira === 'synced' || sheets === 'appended' || sheets === 'synced' || local === 'saved') {
    return 'submitted';
  }
  return 'idle';
}

export function getAuthState({ auth, lastError } = {}) {
  if (!auth || auth.mode === 'none') return 'anonymous';
  if (lastError?.code === 'unauthorized') return 'token_expired';
  if (lastError?.code === 'forbidden') return 'unauthenticated';
  if (!auth.mode) return 'misconfigured';
  return 'authenticated';
}
```

- [ ] **Step 5.4: Run test to confirm it passes**

Run: `npm test -- auth.test`
Expected: PASS, 12/12.

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/feedbackSecurity.js src/lib/__tests__/auth.test.js
git commit -m "$(cat <<'EOF'
feat(lib): add auth header + state helpers for client SDK

getFeedbackAuthHeaders resolves Authorization (bearer/signed) and
X-CSRF-Token (session) with auto-discovery from cookies and meta
tags. Tokens never persisted. Adds isInsecureWebhookMode,
getDestinationPolicy, getSubmissionState, getAuthState as the
read-only state derivations the UI will consume in Phase B.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — `feedbackEvidence.js`

**Files:**
- Create: `src/lib/feedbackEvidence.js`
- Create: `src/lib/__tests__/feedbackEvidence.test.js`

- [ ] **Step 6.1: Write the failing test**

Create `src/lib/__tests__/feedbackEvidence.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  getFeedbackEvidenceSummary,
  getFeedbackPriority,
  createFeedbackHandoffText,
  getDerivedFeedbackMeta,
} from '../feedbackEvidence.js';

const baseItem = {
  id: 'fb-1',
  feedback: 'The submit button is broken',
  type: 'bug',
  severity: 'high',
  userName: 'Murali',
  userEmail: 'm@example.com',
  url: 'https://app.example.com/checkout',
  screenshot: 'data:image/png;base64,abc',
  video: null,
  eventLogs: [
    { type: 'console', level: 'error', message: 'TypeError: x is undefined' },
    { type: 'console', level: 'log', message: 'click' },
    { type: 'network', method: 'POST', url: 'https://api.example.com/x', status: 500 },
    { type: 'network', method: 'GET', url: 'https://api.example.com/y', status: 200 },
    { type: 'storage', action: 'setItem' },
  ],
  elementInfo: { selector: 'button.submit', componentStack: ['Checkout', 'App'], sourceFile: 'src/Checkout.jsx:42' },
};

describe('getFeedbackEvidenceSummary', () => {
  it('counts everything correctly', () => {
    const s = getFeedbackEvidenceSummary(baseItem);
    expect(s.hasScreenshot).toBe(true);
    expect(s.hasVideo).toBe(false);
    expect(s.logCount).toBe(5);
    expect(s.errorCount).toBe(1);
    expect(s.failedNetworkCount).toBe(1);
    expect(s.storageEventCount).toBe(1);
    expect(s.hasComponent).toBe(true);
    expect(s.hasSource).toBe(true);
  });

  it('handles empty input', () => {
    const s = getFeedbackEvidenceSummary({});
    expect(s.hasScreenshot).toBe(false);
    expect(s.logCount).toBe(0);
    expect(s.errorCount).toBe(0);
  });
});

describe('getFeedbackPriority', () => {
  it('assigns urgent band for critical severity with error', () => {
    const p = getFeedbackPriority({ ...baseItem, severity: 'critical' });
    expect(p.band).toBe('urgent');
    expect(p.score).toBeGreaterThanOrEqual(80);
    expect(p.reasons.length).toBeGreaterThan(0);
  });

  it('lowers score for non-bug types', () => {
    const bug = getFeedbackPriority({ ...baseItem, severity: 'medium', type: 'bug' });
    const idea = getFeedbackPriority({ ...baseItem, severity: 'medium', type: 'idea' });
    expect(idea.score).toBeLessThan(bug.score);
  });

  it('reasons explain the score', () => {
    const p = getFeedbackPriority({ ...baseItem, severity: 'critical' });
    expect(p.reasons.join(' ').toLowerCase()).toContain('critical');
  });

  it('clamps to 0..100', () => {
    const p = getFeedbackPriority({ ...baseItem, severity: 'critical', customerValue: 999999 });
    expect(p.score).toBeLessThanOrEqual(100);
  });
});

describe('createFeedbackHandoffText', () => {
  it('short format includes one-liner', () => {
    const t = createFeedbackHandoffText(baseItem, { format: 'short' });
    expect(t).toContain('submit button');
    expect(t).toContain('Murali');
  });

  it('full format includes evidence summary', () => {
    const t = createFeedbackHandoffText(baseItem, { format: 'full' });
    expect(t).toMatch(/screenshot/i);
    expect(t).toMatch(/component/i);
  });

  it('redacts inline secrets when redact:true (default)', () => {
    const item = { ...baseItem, feedback: 'token=secret123 not working' };
    const t = createFeedbackHandoffText(item);
    expect(t).not.toContain('secret123');
  });
});

describe('getDerivedFeedbackMeta', () => {
  it('returns a frozen object', () => {
    const m = getDerivedFeedbackMeta(baseItem);
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('selects primaryEvidence based on what exists', () => {
    expect(getDerivedFeedbackMeta({ ...baseItem, video: 'x' }).primaryEvidence).toBe('video');
    expect(getDerivedFeedbackMeta({ ...baseItem, video: null }).primaryEvidence).toBe('screenshot');
    expect(getDerivedFeedbackMeta({
      ...baseItem, video: null, screenshot: null,
    }).primaryEvidence).toBe('logs');
    expect(getDerivedFeedbackMeta({ feedback: 'hi' }).primaryEvidence).toBe('text');
  });

  it('never mutates input', () => {
    const before = JSON.stringify(baseItem);
    getDerivedFeedbackMeta(baseItem);
    expect(JSON.stringify(baseItem)).toBe(before);
  });
});
```

- [ ] **Step 6.2: Run the test to confirm it fails**

Run: `npm test -- feedbackEvidence`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement `src/lib/feedbackEvidence.js`**

```js
/**
 * Pure helpers for derived feedback metadata.
 * Never mutate input. All outputs deterministic.
 */

import { redactHandoffText, resolveRedactionConfig } from './feedbackSecurity.js';

const SEVERITY_WEIGHT = { low: 10, medium: 30, high: 60, critical: 85 };
const NON_BUG_PENALTY = { idea: -10, praise: -20, question: -5, other: -5 };

function isErrorLog(e) {
  return e && e.type === 'console' && (e.level === 'error' || e.level === 'warn' && e.isError);
}

function isFailedNetwork(e) {
  if (!e || e.type !== 'network') return false;
  if (typeof e.status === 'number') return e.status >= 400;
  if (e.status === 'failed' || e.status === 'error') return true;
  return false;
}

export function getFeedbackEvidenceSummary(item = {}) {
  const logs = Array.isArray(item.eventLogs) ? item.eventLogs : [];
  return {
    hasScreenshot: !!item.screenshot,
    hasVideo: !!item.video,
    logCount: logs.length,
    errorCount: logs.filter(isErrorLog).length,
    failedNetworkCount: logs.filter(isFailedNetwork).length,
    storageEventCount: logs.filter((e) => e?.type === 'storage' || e?.type === 'indexedDB').length,
    hasComponent: !!(item.elementInfo?.componentStack && item.elementInfo.componentStack.length),
    hasSource: !!item.elementInfo?.sourceFile,
    integrationStates: {
      jira: item.integrationState?.jira?.status || 'not_sent',
      sheets: item.integrationState?.sheets?.status || 'not_sent',
      local: item.integrationState?.local?.status || 'saved',
    },
  };
}

function normaliseCustomerValue(v) {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // log-scale: 0..1e6 → 0..15
    if (v <= 0) return 0;
    return Math.min(15, Math.round(Math.log10(v + 1) * 2.5));
  }
  if (typeof v === 'string' && v) return 5;
  return 0;
}

export function getFeedbackPriority(item = {}) {
  const summary = getFeedbackEvidenceSummary(item);
  const reasons = [];
  let score = SEVERITY_WEIGHT[item.severity] ?? SEVERITY_WEIGHT.medium;
  reasons.push(`${item.severity || 'medium'} severity`);

  if (summary.errorCount > 0) {
    score += 10;
    reasons.push(`${summary.errorCount} console error${summary.errorCount === 1 ? '' : 's'}`);
  }
  if (summary.failedNetworkCount > 0) {
    score += 5;
    reasons.push(`${summary.failedNetworkCount} failed request${summary.failedNetworkCount === 1 ? '' : 's'}`);
  }
  const cv = normaliseCustomerValue(item.customerValue);
  if (cv > 0) {
    score += cv;
    reasons.push('customer value');
  }
  const penalty = NON_BUG_PENALTY[item.type] || 0;
  if (penalty !== 0) {
    score += penalty;
    reasons.push(`${item.type} (deprioritized)`);
  }

  score = Math.max(0, Math.min(100, score));
  let band = 'low';
  if (score >= 80) band = 'urgent';
  else if (score >= 55) band = 'high';
  else if (score >= 25) band = 'normal';

  return { score, band, reasons };
}

function shortText(item) {
  const who = item.userName || 'Anonymous';
  const fb = (item.feedback || '').replace(/\s+/g, ' ').trim();
  const fbShort = fb.length > 140 ? fb.slice(0, 137) + '...' : fb;
  return `${who}: ${fbShort}`;
}

function fullText(item) {
  const s = getFeedbackEvidenceSummary(item);
  const p = getFeedbackPriority(item);
  const lines = [
    `Feedback (${item.type || 'bug'}, ${item.severity || 'medium'}): ${item.feedback || ''}`,
    `From: ${item.userName || 'Anonymous'}${item.userEmail ? ` <${item.userEmail}>` : ''}`,
    item.url ? `URL: ${item.url}` : null,
    `Priority: ${p.band} (${p.score}) — ${p.reasons.join(', ')}`,
    `Evidence: ${[
      s.hasScreenshot && 'screenshot',
      s.hasVideo && 'video',
      s.logCount && `${s.logCount} log${s.logCount === 1 ? '' : 's'}`,
      s.errorCount && `${s.errorCount} error${s.errorCount === 1 ? '' : 's'}`,
      s.failedNetworkCount && `${s.failedNetworkCount} failed request${s.failedNetworkCount === 1 ? '' : 's'}`,
    ].filter(Boolean).join(', ') || 'text only'}`,
    item.elementInfo?.componentStack?.length
      ? `Component: ${item.elementInfo.componentStack.join(' > ')}`
      : null,
    item.elementInfo?.sourceFile ? `Source: ${item.elementInfo.sourceFile}` : null,
    item.elementInfo?.selector ? `Selector: ${item.elementInfo.selector}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function createFeedbackHandoffText(item, opts = {}) {
  const format = opts.format || 'full';
  const redact = opts.redact !== false;
  const cfg = resolveRedactionConfig(opts.redactConfig || 'default');

  let text;
  switch (format) {
    case 'short':
      text = shortText(item);
      break;
    case 'jira':
    case 'slack':
    case 'full':
    default:
      text = fullText(item);
  }
  return redact ? redactHandoffText(text, cfg) : text;
}

export function getDerivedFeedbackMeta(item = {}) {
  const summary = getFeedbackEvidenceSummary(item);
  const priority = getFeedbackPriority(item);
  const primaryEvidence = item.video ? 'video'
    : item.screenshot ? 'screenshot'
    : summary.logCount > 0 ? 'logs'
    : 'text';
  const ageMs = item.timestamp ? Date.now() - new Date(item.timestamp).getTime() : 0;
  return Object.freeze({
    summary,
    priority,
    primaryEvidence,
    ageMs,
  });
}
```

- [ ] **Step 6.4: Run test to confirm it passes**

Run: `npm test -- feedbackEvidence`
Expected: PASS, all cases.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/feedbackEvidence.js src/lib/__tests__/feedbackEvidence.test.js
git commit -m "$(cat <<'EOF'
feat(lib): add evidence summary, priority, and handoff helpers

Pure, deterministic helpers consumed later by the dashboard UI.
getFeedbackEvidenceSummary counts media/logs/errors/failed requests.
getFeedbackPriority returns score + band + explainable reasons.
createFeedbackHandoffText renders short/full text for paste-into-Slack
or Jira, always running through the redactor by default.
getDerivedFeedbackMeta returns a frozen one-call convenience bundle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — `src/lib/index.js` barrel + `src/types.d.ts` + package exports

**Files:**
- Create: `src/lib/index.js`
- Create: `src/types.d.ts`
- Modify: `package.json` (add `./lib` export)
- Modify: `rollup.config.js` (build lib bundle)

- [ ] **Step 7.1: Create `src/lib/index.js`**

```js
export {
  getFeedbackEvidenceSummary,
  getFeedbackPriority,
  createFeedbackHandoffText,
  getDerivedFeedbackMeta,
} from './feedbackEvidence.js';

export {
  redactFeedbackEvidence,
  redactNetworkEvent,
  redactConsoleEvent,
  redactStorageEvent,
  redactHandoffText,
  resolveRedactionConfig,
  getFeedbackAuthHeaders,
  resolveCsrfToken,
  isInsecureWebhookMode,
  getDestinationPolicy,
  getSubmissionState,
  getAuthState,
  DEFAULT_REDACTION,
} from './feedbackSecurity.js';

export {
  validateFeedbackSubmission,
} from './feedbackValidation.js';

export {
  FeedbackAuthError,
  FeedbackForbiddenError,
  FeedbackValidationError,
  FeedbackRateLimitError,
  FeedbackPayloadTooLargeError,
} from './feedbackErrors.js';
```

- [ ] **Step 7.2: Create `src/types.d.ts`**

```ts
export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackType = 'bug' | 'idea' | 'praise' | 'question' | 'other';
export type FeedbackAuthMode = 'none' | 'session' | 'bearer' | 'signed';
export type FeedbackErrorCode =
  | 'unauthorized' | 'forbidden' | 'csrf_failed' | 'origin_blocked'
  | 'rate_limited' | 'validation_failed' | 'payload_too_large'
  | 'integration_failed' | 'integration_unavailable' | 'redacted_blocked'
  | 'server_error';

export interface FeedbackOwner {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface FeedbackIntegrationState {
  local?:  { status: 'saved' | 'pending' | 'error'; error?: string };
  jira?:   { status: 'not_sent' | 'pending' | 'created' | 'synced' | 'error';
             issueKey?: string; issueUrl?: string; error?: string };
  sheets?: { status: 'not_sent' | 'pending' | 'appended' | 'synced' | 'error';
             rowId?: string; error?: string };
}

export interface FeedbackStatusHistoryItem {
  from?: string; to: string;
  changedBy?: string; changedAt: string;
  comment?: string;
}

export interface FeedbackSecurityContext {
  projectId?: string;
  tenantId?: string;
  submittedBy?: { id?: string; role?: string };
  authMode?: FeedbackAuthMode;
  redactionApplied?: boolean;
  captureConsent?: 'implicit' | 'explicit';
}

export interface FeedbackAuthConfig {
  mode: FeedbackAuthMode;
  getToken?: () => string | null | Promise<string | null>;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  csrfToken?: string | (() => string | null | Promise<string | null>);
  retryOnUnauthorized?: boolean;
}

export interface FeedbackRedactionConfig {
  preset?: 'default' | 'strict';
  redactHeaders?: string[];
  redactHeaderPrefixes?: string[];
  redactQueryParams?: string[];
  redactBodyKeys?: string[];
  maxBodyLength?: number;
  maxLogMessageLength?: number;
  allowRequestBodies?: boolean;
  allowResponseBodies?: boolean;
  stripUrlQuery?: boolean;
  dropStorageValues?: boolean;
  dropIndexedDbEvents?: boolean;
}

export interface AuthorizedFeedbackContext {
  userId?: string;
  projectId?: string;
  tenantId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface FeedbackServerSecurityHooks {
  authorize: (req: unknown) => Promise<AuthorizedFeedbackContext>;
  validateOrigin?: (req: unknown) => boolean | Promise<boolean>;
  rateLimit?: (req: unknown, ctx: AuthorizedFeedbackContext) => Promise<void>;
  redactFeedback?: (feedback: unknown, ctx: AuthorizedFeedbackContext) => Promise<unknown>;
  resolveIntegrationSecrets?: (ctx: AuthorizedFeedbackContext) => Promise<Record<string, unknown>>;
  errorNormalizer?: (err: unknown, ctx?: AuthorizedFeedbackContext) => unknown;
}

export type FeedbackServerResponse<T = unknown> =
  | { ok: true; data: T; securityContext: FeedbackSecurityContext }
  | { ok: false; error: FeedbackErrorCode; message?: string; fields?: Record<string, string> };
```

- [ ] **Step 7.3: Add `./lib` to `package.json` exports**

Modify the `exports` block — add the `./lib` entry alongside the existing ones:

```json
"./lib": {
  "import": "./dist/lib/index.esm.js",
  "require": "./dist/lib/index.js",
  "types": "./dist/types.d.ts"
}
```

Also add `"types"` field to the root export:
```json
".": {
  "import": "./dist/index.esm.js",
  "require": "./dist/index.js",
  "types": "./dist/types.d.ts"
}
```

- [ ] **Step 7.4: Update `rollup.config.js` to build the lib bundle**

Read `rollup.config.js`. Add an additional export-config object for the `src/lib/index.js` entry (output to `dist/lib/index.js` and `dist/lib/index.esm.js`), and copy `src/types.d.ts` to `dist/types.d.ts` via a small rollup plugin or post-build step.

If rollup is configured with an array of configs, add a third entry mirroring the existing pattern. If it's a single config, convert to an array.

Minimal example structure (the existing config shape governs the exact form):

```js
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import terser from '@rollup/plugin-terser';
import fs from 'node:fs';

const plugins = [peerDepsExternal(), resolve(), commonjs(), babel({ babelHelpers: 'bundled' }), terser()];

export default [
  // ... existing entries
  {
    input: 'src/lib/index.js',
    output: [
      { file: 'dist/lib/index.js', format: 'cjs' },
      { file: 'dist/lib/index.esm.js', format: 'esm' },
    ],
    plugins,
  },
  {
    input: 'src/types.d.ts',
    output: { file: 'dist/types.d.ts', format: 'esm' },
    plugins: [
      {
        name: 'copy-types',
        buildEnd() {
          fs.mkdirSync('dist', { recursive: true });
          fs.copyFileSync('src/types.d.ts', 'dist/types.d.ts');
        },
      },
    ],
  },
];
```

If the project's rollup config is complex, prefer the minimal change: add the `src/lib/index.js` build entry and use a simple `cp` step in the build script for `src/types.d.ts`.

- [ ] **Step 7.5: Verify the build**

Run: `npm run build`
Expected: success; `dist/lib/index.js`, `dist/lib/index.esm.js`, `dist/types.d.ts` exist.

- [ ] **Step 7.6: Commit**

```bash
git add src/lib/index.js src/types.d.ts package.json rollup.config.js
git commit -m "$(cat <<'EOF'
feat(lib): expose pure helpers + TypeScript declarations

Adds the react-visual-feedback/lib subpath export bundling
feedbackEvidence, feedbackSecurity, feedbackValidation, and
feedbackErrors. Ships a single src/types.d.ts with the public
surface for TypeScript consumers and consumer JSDoc references.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Server request adapter + CSRF helpers

**Files:**
- Create: `src/integrations/server/request.js`
- Create: `src/integrations/server/csrf.js`

- [ ] **Step 8.1: Implement `src/integrations/server/request.js`**

```js
/**
 * Normalize Next.js (App + Pages Router), Express, and standard Request
 * into a single internal RequestLike shape.
 */

export async function toRequestLike(req) {
  // Web Request (Next App Router)
  if (typeof req?.headers?.get === 'function') {
    const headers = {};
    req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return {
      method: req.method,
      url: req.url,
      origin: headers.origin || null,
      headers,
      cookies: parseCookieHeader(headers.cookie || ''),
      ip: headers['x-forwarded-for']?.split(',')[0]?.trim() || headers['x-real-ip'] || null,
      raw: req,
      readBody: async () => parseBody(req, headers),
    };
  }
  // Express / Next Pages Router
  if (req?.headers && typeof req.headers === 'object') {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      headers[k.toLowerCase()] = Array.isArray(v) ? v.join(',') : v;
    }
    return {
      method: req.method,
      url: req.url,
      origin: headers.origin || null,
      headers,
      cookies: req.cookies || parseCookieHeader(headers.cookie || ''),
      ip: req.ip || headers['x-forwarded-for']?.split(',')[0]?.trim() || headers['x-real-ip'] || null,
      raw: req,
      readBody: async () => req.body !== undefined ? req.body : null,
    };
  }
  throw new Error('Unsupported request shape');
}

function parseCookieHeader(s) {
  const out = {};
  if (!s) return out;
  for (const piece of s.split(';')) {
    const [k, ...rest] = piece.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

async function parseBody(req, headers) {
  const ct = headers['content-type'] || '';
  if (ct.includes('application/json')) return req.json();
  if (ct.includes('multipart/form-data')) return req.formData();
  return req.text();
}

export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function sendResponse(reqLike, body, status = 200, headers = {}) {
  const raw = reqLike.raw;
  // Express
  if (raw?.res || raw?.status && typeof raw.status === 'function') {
    const res = raw.res || raw;
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.status(status).json(body);
    return;
  }
  // Web Response
  return jsonResponse(body, status, headers);
}
```

- [ ] **Step 8.2: Implement `src/integrations/server/csrf.js`**

```js
/**
 * Double-submit cookie CSRF helpers.
 * Same-site cookies + matching X-CSRF-Token header.
 */

export function isStateChanging(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase());
}

export function csrfRequired(reqLike) {
  if (!isStateChanging(reqLike.method)) return false;
  // Skip CSRF for bearer-only requests (no cookies)
  if (reqLike.headers['authorization'] && !reqLike.headers['cookie']) return false;
  return !!reqLike.headers['cookie'];
}

export function checkCsrf(reqLike) {
  const cookieToken = reqLike.cookies['csrf-token'] || reqLike.cookies['XSRF-TOKEN'];
  const headerToken = reqLike.headers['x-csrf-token'] || reqLike.headers['x-xsrf-token'];
  if (!cookieToken || !headerToken) return false;
  return safeEqual(cookieToken, headerToken);
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
```

- [ ] **Step 8.3: Commit (no tests yet — exercised by Task 10 integration tests)**

```bash
git add src/integrations/server/request.js src/integrations/server/csrf.js
git commit -m "$(cat <<'EOF'
feat(server): add request normalizer and CSRF helpers

toRequestLike adapts Next App Router, Pages Router, Express, and
standard Web Request into one internal shape with headers, cookies,
ip, origin, and a readBody promise. Double-submit CSRF check with
constant-time comparison; skipped for bearer-only requests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — Server defaults (origin, rate limit, redaction, error normalizer)

**Files:**
- Create: `src/integrations/server/defaults.js`
- Create: `src/integrations/server/__tests__/defaults.test.js`

- [ ] **Step 9.1: Write the failing test**

Create `src/integrations/server/__tests__/defaults.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import {
  defaultOriginValidator,
  defaultRateLimiter,
  defaultErrorNormalizer,
} from '../defaults.js';

describe('defaultOriginValidator', () => {
  const reqWith = (origin, host) => ({ origin, headers: { host } });

  it('accepts same-origin', () => {
    expect(defaultOriginValidator(reqWith('https://app.example.com', 'app.example.com'))).toBe(true);
  });

  it('accepts localhost in development', () => {
    process.env.NODE_ENV = 'development';
    expect(defaultOriginValidator(reqWith('http://localhost:3000', 'localhost:3000'))).toBe(true);
  });

  it('rejects different origin without env allowlist', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FEEDBACK_ALLOWED_ORIGINS;
    expect(defaultOriginValidator(reqWith('https://evil.com', 'app.example.com'))).toBe(false);
  });

  it('accepts env allowlist match', () => {
    process.env.NODE_ENV = 'production';
    process.env.FEEDBACK_ALLOWED_ORIGINS = 'https://partner.com,https://app.example.com';
    expect(defaultOriginValidator(reqWith('https://partner.com', 'app.example.com'))).toBe(true);
  });
});

describe('defaultRateLimiter', () => {
  beforeEach(() => {
    defaultRateLimiter.reset?.();
  });

  it('allows under the limit', async () => {
    const limiter = defaultRateLimiter.create({ limit: 3, windowMs: 60_000 });
    await limiter({ ip: '1.1.1.1', headers: {} }, {});
    await limiter({ ip: '1.1.1.1', headers: {} }, {});
    await expect(limiter({ ip: '1.1.1.1', headers: {} }, {})).resolves.toBeUndefined();
  });

  it('throws once over the limit', async () => {
    const limiter = defaultRateLimiter.create({ limit: 1, windowMs: 60_000 });
    await limiter({ ip: '2.2.2.2', headers: {} }, {});
    await expect(limiter({ ip: '2.2.2.2', headers: {} }, {})).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('keys by IP + user separately', async () => {
    const limiter = defaultRateLimiter.create({ limit: 1, windowMs: 60_000 });
    await limiter({ ip: '3.3.3.3', headers: {} }, { userId: 'u1' });
    await expect(
      limiter({ ip: '3.3.3.3', headers: {} }, { userId: 'u2' })
    ).resolves.toBeUndefined();
  });
});

describe('defaultErrorNormalizer', () => {
  it('translates known error codes to safe responses', () => {
    const r = defaultErrorNormalizer({ code: 'unauthorized', message: 'token expired' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('unauthorized');
  });

  it('opaque server_error for unknown errors with request id', () => {
    const r = defaultErrorNormalizer(new Error('postgres connection lost'));
    expect(r.status).toBe(500);
    expect(r.body.error).toBe('server_error');
    expect(r.body.message).not.toContain('postgres');
    expect(r.body.message).toMatch(/req=/);
  });
});
```

- [ ] **Step 9.2: Run to confirm fail**

Run: `npm test -- defaults.test`
Expected: FAIL — module not found.

- [ ] **Step 9.3: Implement `src/integrations/server/defaults.js`**

```js
import { FeedbackRateLimitError } from '../../lib/feedbackErrors.js';

export function defaultOriginValidator(reqLike) {
  const origin = reqLike?.origin || '';
  const host = reqLike?.headers?.host || '';
  if (!origin) return true; // same-origin form posts
  try {
    const o = new URL(origin);
    if (host && o.host === host) return true;
    if (process.env.NODE_ENV !== 'production') {
      if (o.hostname === 'localhost' || o.hostname === '127.0.0.1') return true;
    }
    const list = (process.env.FEEDBACK_ALLOWED_ORIGINS || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes(origin)) return true;
    return false;
  } catch {
    return false;
  }
}

function createInMemoryRateLimiter({ limit = 30, windowMs = 60 * 60 * 1000 } = {}) {
  const buckets = new Map();
  const fn = async (reqLike, ctx) => {
    const userId = ctx?.userId || '';
    const ip = reqLike?.ip || '';
    const key = `${ip}::${userId}`;
    const now = Date.now();
    const b = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > b.resetAt) {
      b.count = 0;
      b.resetAt = now + windowMs;
    }
    b.count += 1;
    buckets.set(key, b);
    if (b.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
      throw new FeedbackRateLimitError(retryAfter);
    }
  };
  fn.reset = () => buckets.clear();
  return fn;
}

const sharedLimiter = createInMemoryRateLimiter();
sharedLimiter.create = (opts) => createInMemoryRateLimiter(opts);
sharedLimiter.reset = () => { /* shared limiter resets per test below */ };
export const defaultRateLimiter = sharedLimiter;

const CODE_STATUS = {
  unauthorized: 401,
  forbidden: 403,
  csrf_failed: 403,
  origin_blocked: 403,
  rate_limited: 429,
  validation_failed: 400,
  payload_too_large: 413,
  integration_failed: 502,
  integration_unavailable: 503,
  redacted_blocked: 422,
  server_error: 500,
};

function newRequestId() {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultErrorNormalizer(err) {
  const code = err?.code && CODE_STATUS[err.code] ? err.code : 'server_error';
  const status = CODE_STATUS[code];
  const body = { ok: false, error: code };
  if (code === 'validation_failed' && err?.fields) body.fields = err.fields;
  if (code === 'rate_limited') body.message = 'rate_limited';
  if (code === 'server_error') {
    const id = newRequestId();
    body.message = `server_error (req=${id})`;
    // Caller is expected to log the full err with `id` for correlation.
    body._logId = id;
  }
  const headers = {};
  if (code === 'rate_limited' && err?.retryAfter) {
    headers['Retry-After'] = String(err.retryAfter);
  }
  return { status, body, headers };
}

export const defaultRedactionImport = 'src/lib/feedbackSecurity.js#resolveRedactionConfig';
```

- [ ] **Step 9.4: Run test to confirm pass**

Run: `npm test -- defaults.test`
Expected: PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/integrations/server/defaults.js src/integrations/server/__tests__/defaults.test.js
git commit -m "$(cat <<'EOF'
feat(server): add defaults for origin, rate limit, error normalization

defaultOriginValidator allows same-origin, env allowlist
(FEEDBACK_ALLOWED_ORIGINS), and localhost in development.
defaultRateLimiter is an in-memory token bucket keyed by IP+user
with a .create() factory for custom limits. defaultErrorNormalizer
maps error codes to safe HTTP responses and never echoes raw
provider text — a request id is generated for server_error so
support can correlate against full server-side logs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — `withSecureDefaults` composition wrapper

**Files:**
- Create: `src/integrations/server/withSecureDefaults.js`
- Create: `src/integrations/server/__tests__/withSecureDefaults.test.js`

- [ ] **Step 10.1: Write the failing test**

Create `src/integrations/server/__tests__/withSecureDefaults.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withSecureDefaults } from '../withSecureDefaults.js';
import { FeedbackAuthError, FeedbackForbiddenError } from '../../../lib/feedbackErrors.js';

function mockReq({ method = 'POST', origin = 'https://app.example.com', host = 'app.example.com', cookies = '', csrf = '', body = { feedback: 'hi' }, auth = '' } = {}) {
  const headers = new Map(Object.entries({
    origin,
    host,
    'content-type': 'application/json',
    ...(cookies ? { cookie: cookies } : {}),
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
    ...(auth ? { authorization: auth } : {}),
  }));
  return new Request('https://app.example.com/api/feedback', {
    method,
    headers: Object.fromEntries(headers),
    body: JSON.stringify(body),
  });
}

const okInner = () => async () => ({ ok: true, data: { id: 'srv-1' } });

beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.FEEDBACK_ALLOWED_ORIGINS = 'https://app.example.com';
});

describe('withSecureDefaults composition order', () => {
  it('1. blocks bad origin before anything else', async () => {
    const authorize = vi.fn();
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ origin: 'https://evil.com', host: 'app.example.com' }));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe('origin_blocked');
    expect(authorize).not.toHaveBeenCalled();
  });

  it('2. requires CSRF when cookies present', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ cookies: 'session=abc' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('csrf_failed');
    expect(authorize).not.toHaveBeenCalled();
  });

  it('2b. skips CSRF for bearer-only requests', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(200);
    expect(authorize).toHaveBeenCalled();
  });

  it('3. rate-limits after origin/CSRF pass', async () => {
    const limiter = vi.fn().mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'rate_limited', retryAfter: 30 }));
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize, rateLimit: limiter })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('4. authorize FeedbackAuthError -> 401', async () => {
    const authorize = vi.fn().mockRejectedValue(new FeedbackAuthError());
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
  });

  it('4b. authorize FeedbackForbiddenError -> 403', async () => {
    const authorize = vi.fn().mockRejectedValue(new FeedbackForbiddenError());
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden');
  });

  it('5. validation_failed -> 400 with fields, no echoed values', async () => {
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok', body: { feedback: '   ' } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('validation_failed');
    expect(body.fields.feedback).toBeTruthy();
  });

  it('6. stamps redactionApplied and forwards to inner handler', async () => {
    const inner = vi.fn().mockResolvedValue({ ok: true, data: { id: 'srv-1' } });
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1', projectId: 'p1' });
    const handler = withSecureDefaults({ authorize })(inner);
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.securityContext.redactionApplied).toBe(true);
    expect(body.securityContext.submittedBy.id).toBe('u1');
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('7. provider error becomes opaque integration_failed', async () => {
    const inner = vi.fn().mockRejectedValue(new Error('Jira: 401 invalid API token'));
    const authorize = vi.fn().mockResolvedValue({ userId: 'u1' });
    const handler = withSecureDefaults({ authorize })(inner);
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('integration_failed');
    expect(JSON.stringify(body)).not.toContain('API token');
    expect(JSON.stringify(body)).not.toContain('Jira');
  });

  it('8. missing authorize in production fails closed with warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = withSecureDefaults({})(okInner());
    const res = await handler(mockReq({ auth: 'Bearer tok' }));
    expect(res.status).toBe(401);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 10.2: Run to confirm fail**

Run: `npm test -- withSecureDefaults`
Expected: FAIL — module not found.

- [ ] **Step 10.3: Implement `src/integrations/server/withSecureDefaults.js`**

```js
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

function buildResponse(reqLike, normalized) {
  return new Response(JSON.stringify(normalized.body), {
    status: normalized.status,
    headers: { 'Content-Type': 'application/json', ...normalized.headers },
  });
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
    return async function secureHandler(req, ctxArg) {
      let reqLike;
      try {
        reqLike = await toRequestLike(req);

        // 1. Origin
        if (!(await validateOrigin(reqLike))) {
          return buildResponse(reqLike, errorNormalizer({ code: 'origin_blocked' }));
        }

        // 2. CSRF
        if (csrfRequired(reqLike) && !checkCsrf(reqLike)) {
          return buildResponse(reqLike, errorNormalizer({ code: 'csrf_failed' }));
        }

        // 4. Authorize (so rate limiter can key by user)
        let authContext;
        try {
          authContext = await authorize(reqLike);
        } catch (err) {
          const code = err instanceof FeedbackForbiddenError ? 'forbidden'
            : 'unauthorized';
          return buildResponse(reqLike, errorNormalizer({ code, message: err.message }));
        }

        // 3. Rate limit (after auth so we can key per-user)
        try {
          await rateLimit(reqLike, authContext);
        } catch (err) {
          return buildResponse(reqLike, errorNormalizer(err));
        }

        // 5. Read + validate body
        const raw = await reqLike.readBody();
        const parsed = typeof raw === 'string' ? safeJson(raw) : raw;
        const v = validateFeedbackSubmission(parsed, { authContext });
        if (!v.ok) {
          return buildResponse(reqLike, errorNormalizer(new FeedbackValidationError('validation_failed', v.errors)));
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

        // 7. Forward
        let innerResult;
        try {
          innerResult = await innerHandler(redacted, { reqLike, authContext, securityContext });
        } catch (err) {
          // Log full server-side; return opaque
          console.error('[react-visual-feedback] integration error:', err);
          return buildResponse(reqLike, errorNormalizer({ code: 'integration_failed' }));
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
        return buildResponse(reqLike || { raw: req }, normalized);
      }
    };
  };
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function detectAuthMode(reqLike) {
  if (reqLike.headers?.authorization) return 'bearer';
  if (reqLike.headers?.cookie) return 'session';
  return 'none';
}
```

- [ ] **Step 10.4: Run test to confirm pass**

Run: `npm test -- withSecureDefaults`
Expected: PASS.

- [ ] **Step 10.5: Commit**

```bash
git add src/integrations/server/withSecureDefaults.js src/integrations/server/__tests__/withSecureDefaults.test.js
git commit -m "$(cat <<'EOF'
feat(server): add withSecureDefaults composition wrapper

Fixed-order composition: origin -> CSRF -> authorize -> rate limit
-> validate -> redact -> forward -> normalize. Each step
short-circuits with a safe response. Missing authorize fails closed
with one-time production warning. Provider errors normalized to
opaque integration_failed with full detail logged server-side.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — Wire `security` config into existing Jira/Sheets handlers

**Files:**
- Modify: `src/integrations/jira.js` (accept optional `security`; production warn if missing)
- Modify: `src/integrations/sheets.js` (same)
- Modify: `src/integrations/server/index.js` (re-export new surface)

- [ ] **Step 11.1: Modify `src/integrations/jira.js`**

Read the file. In `createJiraHandler(config = {})`, immediately after the function entry, add:

```js
const security = config.security || null;

if (!security && !config.__suppressInsecureWarning) {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' && !createJiraHandler._warned) {
    createJiraHandler._warned = true;
    console.warn('[react-visual-feedback] createJiraHandler() called without security wrapper in production. Wrap with withSecureDefaults({...}). See docs/production-security-checklist.md');
  }
}
```

The existing handler logic continues unchanged. When called by `withSecureDefaults`, the wrapper already validated/authed/redacted; the inner handler trusts the inputs.

- [ ] **Step 11.2: Mirror the change in `src/integrations/sheets.js`**

Same pattern: read `config.security`, log one-time production warning if missing.

- [ ] **Step 11.3: Create/Modify `src/integrations/server/index.js`**

```js
export { withSecureDefaults } from './withSecureDefaults.js';
export {
  defaultOriginValidator,
  defaultRateLimiter,
  defaultErrorNormalizer,
} from './defaults.js';
export { toRequestLike } from './request.js';
export { csrfRequired, checkCsrf } from './csrf.js';

// Re-export existing handlers
export { default as createJiraHandler, createNextAppHandler as createJiraNextAppHandler,
  createNextPagesHandler as createJiraNextPagesHandler,
  createExpressMiddleware as createJiraExpressMiddleware,
} from '../jira.js';

// Re-export errors so hosts can throw them inside `authorize`
export {
  FeedbackAuthError,
  FeedbackForbiddenError,
  FeedbackValidationError,
  FeedbackRateLimitError,
  FeedbackPayloadTooLargeError,
} from '../../lib/feedbackErrors.js';
```

- [ ] **Step 11.4: Verify existing Jira/Sheets test still passes**

Run: `npm test`
Expected: all tests still green; new server tests pass.

- [ ] **Step 11.5: Commit**

```bash
git add src/integrations/jira.js src/integrations/sheets.js src/integrations/server/index.js
git commit -m "$(cat <<'EOF'
feat(server): accept optional security config; warn when missing

createJiraHandler and createSheetsHandler now accept an optional
`security` field for future per-handler overrides. When called
without `withSecureDefaults` in production, log a one-time warning
linking to the security checklist. Re-export error classes and
helpers from /server entry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — `FeedbackProvider` auth + redact props

**Files:**
- Modify: `src/FeedbackProvider.jsx`

- [ ] **Step 12.1: Read `src/FeedbackProvider.jsx` to locate the integration submission path**

Identify where the provider currently calls `IntegrationClient.sendFeedback` or fetches `/api/feedback/...`. Two places typically:
1. Initial submission from the modal.
2. Status updates.

- [ ] **Step 12.2: Add `auth` and `redact` props and the `useFeedbackAuth` hook**

At the top of the component or in a new internal section:

```jsx
import { useMemo, useRef } from 'react';
import { getFeedbackAuthHeaders, resolveRedactionConfig, redactFeedbackEvidence }
  from './lib/feedbackSecurity.js';

function useFeedbackAuth(auth) {
  const ref = useRef(auth);
  ref.current = auth;
  return useMemo(() => ({
    async getHeaders() {
      if (!ref.current) return {};
      return getFeedbackAuthHeaders(ref.current);
    },
    isNone() { return !ref.current || ref.current.mode === 'none'; },
  }), []);
}
```

In the `FeedbackProvider` props, accept `auth` and `redact` with defaults:

```jsx
function FeedbackProvider({
  auth,
  redact = 'default',
  ...existingProps
}) {
  const feedbackAuth = useFeedbackAuth(auth);
  const redactionConfig = useMemo(() => resolveRedactionConfig(redact), [redact]);
  // ...existing implementation
}
```

Before any outbound fetch for feedback submission, merge headers:

```jsx
const authHeaders = await feedbackAuth.getHeaders();
const headers = { 'Content-Type': 'application/json', ...authHeaders };
```

Before any local persistence (when `auth.mode === 'none'` or storing locally as a queue), run client-side redaction:

```jsx
const redacted = redactFeedbackEvidence(submission, redactionConfig).data;
// store `redacted`, not `submission`
```

Also, when the response is 401 and the auth mode is `bearer` or `signed`, call `getToken` once more and retry. (Track via a `_retried` flag local to the submission call.)

- [ ] **Step 12.3: Verify existing tests still pass**

Run: `npm test`
Expected: green; legacy behaviour preserved.

- [ ] **Step 12.4: Commit**

```bash
git add src/FeedbackProvider.jsx
git commit -m "$(cat <<'EOF'
feat(provider): add auth + redact props to FeedbackProvider

Accepts FeedbackAuthConfig (none|session|bearer|signed) and runs
getFeedbackAuthHeaders on every submission. Tokens stay in memory.
Auto-retry once on 401 for bearer/signed modes. Client-side
redaction runs before localStorage write when auth.mode === 'none'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — `IntegrationClient` getAuthHeaders + webhook warnings

**Files:**
- Modify: `src/integrations/index.js`
- Create: `src/integrations/__tests__/webhook-warning.test.js`

- [ ] **Step 13.1: Write the failing test**

Create `src/integrations/__tests__/webhook-warning.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationClient } from '../index.js';

describe('IntegrationClient insecure webhook warnings', () => {
  let warnSpy;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // reset module-level warned flag
    IntegrationClient._warnedModes?.clear?.();
  });

  it('warns once for jira-automation mode', async () => {
    const client = new IntegrationClient({ jira: { enabled: true, type: 'jira-automation', webhookUrl: 'https://hooks.example' } });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await client.sendToJira({ feedback: 'hi' });
    await client.sendToJira({ feedback: 'hi again' });
    const insecureWarnings = warnSpy.mock.calls.filter(c => /jira-automation|insecure/i.test(String(c[0])));
    expect(insecureWarnings.length).toBe(1);
  });

  it('does not warn for server mode', async () => {
    const client = new IntegrationClient({ jira: { enabled: true, type: 'server', endpoint: '/api/feedback/jira' } });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await client.sendToJira({ feedback: 'hi' });
    expect(warnSpy.mock.calls.filter(c => /insecure/i.test(String(c[0])))).toHaveLength(0);
  });

  it('includes auth headers when getAuthHeaders provided', async () => {
    const client = new IntegrationClient({
      jira: { enabled: true, type: 'server', endpoint: '/api/feedback/jira' },
      getAuthHeaders: async () => ({ Authorization: 'Bearer tok', 'X-CSRF-Token': 'csrf' }),
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    globalThis.fetch = fetchMock;
    await client.sendToJira({ feedback: 'hi' });
    const init = fetchMock.mock.calls[0][1];
    // FormData; headers passed separately
    expect(init.headers?.Authorization).toBe('Bearer tok');
    expect(init.headers?.['X-CSRF-Token']).toBe('csrf');
  });
});
```

- [ ] **Step 13.2: Run to confirm fail**

Run: `npm test -- webhook-warning`
Expected: FAIL.

- [ ] **Step 13.3: Modify `src/integrations/index.js`**

At the top of the file (after existing imports):

```js
import { isInsecureWebhookMode } from '../lib/feedbackSecurity.js';

const _warnedModes = new Set();
function maybeWarnInsecure(modeKey) {
  if (!modeKey || _warnedModes.has(modeKey)) return;
  _warnedModes.add(modeKey);
  console.warn(`[react-visual-feedback] Using insecure webhook mode "${modeKey}" — provider URL is shipped to the browser and acts as a secret. Switch to a server-mediated endpoint. See docs/production-security-checklist.md`);
}
```

In the constructor of `IntegrationClient`, accept a `getAuthHeaders` callback:

```js
this.getAuthHeaders = config.getAuthHeaders || null;
```

Expose `_warnedModes` on the class for tests:

```js
IntegrationClient._warnedModes = _warnedModes;
```

In `sendToJira`, before dispatching to a branch:

```js
if (isInsecureWebhookMode(type)) {
  maybeWarnInsecure(`jira:${type}`);
}
```

In `sendToJiraServer` (and `sendToSheetsServer`), before calling fetch:

```js
const extraHeaders = this.getAuthHeaders ? await this.getAuthHeaders() : {};
```

Then pass `extraHeaders` into the fetch headers. For `sendToJiraServer` (FormData), set:

```js
const response = await fetch(endpoint, {
  method: 'POST',
  body: formData,
  headers: extraHeaders, // browser sets Content-Type for multipart
});
```

For `sendToSheetsServer` (JSON), merge:

```js
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...extraHeaders },
  body: JSON.stringify({ action: 'append', feedbackData }),
});
```

Mirror the same pattern in `updateJiraStatus`, `updateSheetsStatus`, `getJiraStatus`.

- [ ] **Step 13.4: Wire `getAuthHeaders` through `useIntegrations` hook**

Inside `useIntegrations(config)`, when constructing the `IntegrationClient`, pass `getAuthHeaders` from `config`. Add it as a new option on the hook contract; document via JSDoc.

- [ ] **Step 13.5: Run tests to confirm pass**

Run: `npm test`
Expected: green including the new `webhook-warning` test.

- [ ] **Step 13.6: Commit**

```bash
git add src/integrations/index.js src/integrations/__tests__/webhook-warning.test.js
git commit -m "$(cat <<'EOF'
feat(integrations): support auth headers + warn on insecure webhook modes

IntegrationClient accepts an optional getAuthHeaders callback that
is awaited and merged into every server fetch (Jira server, Sheets
server, status updates). One-time console.warn per insecure mode
(jira-automation, appsScript, zapier) on first send.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — `example-nextjs` secure integration

**Files:**
- Create: `example-nextjs/app/api/feedback/jira/route.js`
- Create: `example-nextjs/app/api/feedback/anonymous/route.js`
- Create: `example-nextjs/app/api/feedback/token/route.js`
- Create: `example-nextjs/lib/feedback-auth.js`
- Modify: existing `example-nextjs/app/layout.jsx` (or equivalent) to add `auth={{ mode: 'session' }}`

- [ ] **Step 14.1: Read the existing example-nextjs structure**

Run `ls -R example-nextjs` to locate the layout, current API routes, and integration props in use.

- [ ] **Step 14.2: Create `example-nextjs/lib/feedback-auth.js`**

```js
import crypto from 'node:crypto';

const SECRET = process.env.FEEDBACK_SIGNING_SECRET || 'dev-only-do-not-use-in-prod';
const TOKEN_TTL_MS = 5 * 60 * 1000;

export function signSubmissionToken({ tenantId = 'public' } = {}) {
  const payload = { tenantId, exp: Date.now() + TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySubmissionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Demo "session" — replace with your real auth in production.
export async function getDemoSession(req) {
  const cookie = req.headers.get?.('cookie') || req.headers?.cookie || '';
  if (cookie.includes('demo-session=ok')) {
    return { userId: 'demo-user', projectId: 'DEMO', role: 'developer' };
  }
  return null;
}
```

- [ ] **Step 14.3: Create `example-nextjs/app/api/feedback/jira/route.js`**

```js
import {
  withSecureDefaults, createJiraHandler, FeedbackAuthError,
} from 'react-visual-feedback/server';
import { getDemoSession } from '@/lib/feedback-auth';

export const POST = withSecureDefaults({
  authorize: async (req) => {
    const session = await getDemoSession(req);
    if (!session) throw new FeedbackAuthError();
    return session;
  },
})(createJiraHandler({ projectKey: process.env.JIRA_PROJECT_KEY || 'BUG' }));
```

- [ ] **Step 14.4: Create `example-nextjs/app/api/feedback/token/route.js`**

```js
import { signSubmissionToken } from '@/lib/feedback-auth';

export async function POST(req) {
  // Public token issuance — rate-limit on your edge / WAF in production.
  const token = signSubmissionToken({ tenantId: 'public' });
  return Response.json({ token });
}
```

- [ ] **Step 14.5: Create `example-nextjs/app/api/feedback/anonymous/route.js`**

```js
import { withSecureDefaults, createJiraHandler, FeedbackAuthError }
  from 'react-visual-feedback/server';
import { verifySubmissionToken } from '@/lib/feedback-auth';

export const POST = withSecureDefaults({
  authorize: async (req) => {
    const headers = req.headers;
    const auth = headers.get?.('authorization') || headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const payload = verifySubmissionToken(token);
    if (!payload) throw new FeedbackAuthError('invalid_token');
    return { userId: 'anonymous', tenantId: payload.tenantId, role: 'anonymous' };
  },
})(createJiraHandler({ projectKey: process.env.JIRA_PROJECT_KEY || 'PUB' }));
```

- [ ] **Step 14.6: Modify the example's `layout.jsx` (or `_app.jsx`)**

Update `<FeedbackProvider>` to pass `auth={{ mode: 'session' }}` (or `{ mode: 'signed', getToken: async () => (await fetch('/api/feedback/token', { method: 'POST' }).then(r => r.json())).token }` for the anonymous variant — pick the one that matches the example's intent). Also set `endpoint` to `/api/feedback/jira` (or `/api/feedback/anonymous`).

- [ ] **Step 14.7: Manual verification (run example locally)**

Run example dev server (whatever script the example uses, typically `cd example-nextjs && npm run dev`). Submit a feedback while logged in (cookie `demo-session=ok`) — expect 200. Submit while logged out — expect 401. Submit with `Authorization: Bearer <invalid>` to `/api/feedback/anonymous` — expect 401.

- [ ] **Step 14.8: Commit**

```bash
git add example-nextjs
git commit -m "$(cat <<'EOF'
feat(example): wire example-nextjs to withSecureDefaults

Adds three secure routes: /api/feedback/jira (session auth),
/api/feedback/token (short-lived HMAC token issuance), and
/api/feedback/anonymous (token-verified public capture). The widget
in layout.jsx now uses auth={ mode: 'session' }.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — `example-express` minimal app

**Files:**
- Create: `example-express/package.json`
- Create: `example-express/server.js`
- Create: `example-express/README.md`

- [ ] **Step 15.1: Create `example-express/package.json`**

```json
{
  "name": "example-express",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.0",
    "cookie-parser": "^1.4.6",
    "react-visual-feedback": "file:.."
  }
}
```

- [ ] **Step 15.2: Create `example-express/server.js`**

```js
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  withSecureDefaults,
  createJiraHandler,
  FeedbackAuthError,
} from 'react-visual-feedback/server';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const secureHandler = withSecureDefaults({
  authorize: async (req) => {
    if (req.cookies?.['demo-session'] !== 'ok') throw new FeedbackAuthError();
    return { userId: 'demo-user', projectId: 'DEMO', role: 'developer' };
  },
})(createJiraHandler({ projectKey: process.env.JIRA_PROJECT_KEY || 'BUG' }));

app.post('/api/feedback/jira', async (req, res) => {
  const result = await secureHandler(req);
  // result is a Web Response
  res.status(result.status);
  result.headers.forEach((v, k) => res.setHeader(k, v));
  const body = await result.text();
  res.send(body);
});

app.listen(3001, () => {
  console.log('Express example listening on http://localhost:3001');
});
```

- [ ] **Step 15.3: Create `example-express/README.md`**

```markdown
# example-express

Minimal Express integration of `react-visual-feedback`.

## Run

\`\`\`bash
cd example-express
npm install
JIRA_DOMAIN=... JIRA_EMAIL=... JIRA_API_TOKEN=... npm start
\`\`\`

## Try it

\`\`\`bash
# Authorized:
curl -X POST -H 'Content-Type: application/json' \
     -H 'Cookie: demo-session=ok' \
     -d '{"feedback":"hi"}' http://localhost:3001/api/feedback/jira

# Unauthorized:
curl -X POST -H 'Content-Type: application/json' \
     -d '{"feedback":"hi"}' http://localhost:3001/api/feedback/jira
\`\`\`
```

- [ ] **Step 15.4: Commit**

```bash
git add example-express
git commit -m "$(cat <<'EOF'
feat(example): add minimal Express integration

40-line app demonstrating withSecureDefaults wrapped around the
existing createJiraHandler with cookie-session demo auth. Hosts
production deployments swap demo session for their own auth and
plug in a Redis-backed rateLimit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — Production Security Checklist + README + CHANGELOG

**Files:**
- Create: `docs/production-security-checklist.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json` (version 2.2.14 → 2.3.0)

- [ ] **Step 16.1: Create `docs/production-security-checklist.md`**

```markdown
# Production Security Checklist

Use this before deploying `react-visual-feedback` to production.

## Required

- [ ] **Wrap your server handler in `withSecureDefaults`.** Direct usage of
      `createJiraHandler` without the wrapper logs a warning and skips origin,
      CSRF, rate-limit, and authorize checks.
- [ ] **Provide `authorize`.** Without it, all requests are rejected as
      `unauthorized` in production.
- [ ] **Set `FEEDBACK_ALLOWED_ORIGINS`** (comma-separated) when your widget
      is loaded from a different origin than the API.
- [ ] **Keep provider secrets server-side.** `JIRA_API_TOKEN`,
      Google service-account JSON, OAuth refresh tokens, and webhook signing
      secrets must live in env vars or a secret manager — never in
      `FeedbackProvider` props or browser-visible config.
- [ ] **Pick a redact profile.** `'default'` is safe out of the box.
      Use `'strict'` for high-sensitivity hosts.

## Recommended

- [ ] **Configure `rateLimit` for production scale.** The default in-memory
      limiter is single-instance only. Multi-instance deployments need a
      Redis-backed limiter.
- [ ] **Choose your auth mode.** `mode: 'session'` for logged-in users
      (cookies + auto CSRF). `mode: 'bearer'` for token-based apps. `mode:
      'signed'` for anonymous public capture (host-signed short-lived tokens).
- [ ] **Don't expose dashboard reads to non-admin roles.** Gate read endpoints
      in your `authorize` callback by `role`.
- [ ] **Migrate off direct webhook modes.** `jira-automation`, `appsScript`,
      and `zapier` ship a public URL to the browser that acts as a secret.
      Use the server-mediated handler instead.

## Verification

- Submit a feedback while signed in → 200.
- Submit while signed out → 401.
- Plant an `Authorization: Bearer ...` header on a captured network request
  in the example. Submit. Verify the Jira attachment and any persisted log
  shows `<redacted>` instead of the value.
- Send 35 submissions in a minute → 429 with `Retry-After` header.
```

- [ ] **Step 16.2: Update `README.md`**

Add a "Secure setup in 10 lines" section near the top (after the existing introduction). Insert this block:

```markdown
## Secure setup in 10 lines

\`\`\`js
// Client (e.g. app/layout.jsx)
<FeedbackProvider endpoint="/api/feedback/jira" auth={{ mode: 'session' }} />

// Server (Next.js App Router)
import { withSecureDefaults, createJiraHandler, FeedbackAuthError }
  from 'react-visual-feedback/server';
import { getServerSession } from '@/lib/auth';

export const POST = withSecureDefaults({
  authorize: async (req) => {
    const session = await getServerSession(req);
    if (!session) throw new FeedbackAuthError();
    return { userId: session.userId, projectId: session.projectId };
  },
})(createJiraHandler({ projectKey: 'BUG' }));
\`\`\`

This is the secure path. It includes origin allowlist, CSRF protection,
rate limiting, redaction of sensitive headers and body keys, authorization,
and opaque error normalization. Read the full
[Production Security Checklist](docs/production-security-checklist.md).
```

- [ ] **Step 16.3: Update `CHANGELOG.md`**

Add at the top (preserve existing entries):

```markdown
## [2.3.0] — 2026-06-15

### Added
- **Security foundation.** New `withSecureDefaults` server wrapper composes
  origin allowlist, CSRF check, rate limit, host-supplied `authorize`,
  validation, redaction, and opaque error normalization in a fixed order.
- **Auth on the client.** `FeedbackProvider` accepts `auth` prop with modes
  `none | session | bearer | signed`. Auto CSRF discovery, in-memory tokens
  only, one-retry on 401.
- **Pure helpers** under `react-visual-feedback/lib`:
  `getFeedbackEvidenceSummary`, `getFeedbackPriority`,
  `createFeedbackHandoffText`, `getDerivedFeedbackMeta`,
  `redactFeedbackEvidence`, `getFeedbackAuthHeaders`.
- **Data model fields** (all optional): `severity`, `owner`, `customerValue`,
  `integrationState`, `statusHistory`, `securityContext`.
- **Vitest test suite** with coverage targets for `src/lib/` and
  `src/integrations/server/`.
- **Examples:** secure Next.js routes for session auth and anonymous capture,
  minimal Express app.
- **Production Security Checklist** at `docs/production-security-checklist.md`.

### Deprecated (still working)
- Direct browser webhook modes (`jira-automation`, `appsScript`, `zapier`)
  emit a one-time console warning per mode pointing to the checklist.
- Calling `createJiraHandler` / `createSheetsHandler` without
  `withSecureDefaults` in production emits a one-time server warning.

### Compatibility
- No breaking changes. All existing props, exports, and stored data shapes
  remain.
```

- [ ] **Step 16.4: Bump version**

Update `package.json`:

```json
"version": "2.3.0"
```

- [ ] **Step 16.5: Final verification**

Run the full suite:

```bash
npm test
npm run build
```

Expected: both green. Spot-check `dist/` contains `lib/index.js`, `lib/index.esm.js`, `types.d.ts`.

Run example checks if possible:
- `cd example-nextjs && npm install && npm run dev` — submit while logged in and out; verify 200/401.
- `cd example-express && npm install && npm start` — same checks via curl.

- [ ] **Step 16.6: Commit**

```bash
git add docs/production-security-checklist.md README.md CHANGELOG.md package.json
git commit -m "$(cat <<'EOF'
docs: add production security checklist; release 2.3.0

Documents the secure-by-default integration pattern, lists every
required and recommended security control, and provides a four-step
verification recipe. Bumps version to 2.3.0; CHANGELOG details the
additive security surface and the deprecation warnings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**

- [x] Vitest + scripts — Task 1
- [x] `feedbackEvidence.js` helpers — Task 6
- [x] `feedbackSecurity.js` redaction — Task 4
- [x] `feedbackSecurity.js` auth helpers + state derivations — Task 5
- [x] `feedbackValidation.js` — Task 3
- [x] `feedbackErrors.js` — Task 2
- [x] `src/lib/index.js` barrel + `src/types.d.ts` + `./lib` export — Task 7
- [x] Server `request.js` + `csrf.js` — Task 8
- [x] Server `defaults.js` (origin / rateLimit / errorNormalizer) — Task 9
- [x] `withSecureDefaults` composition — Task 10
- [x] Wire `security` config + warning into existing `createJiraHandler` / `createSheetsHandler` — Task 11
- [x] `FeedbackProvider` `auth` + `redact` props — Task 12
- [x] `IntegrationClient` `getAuthHeaders` + insecure webhook warnings — Task 13
- [x] Next.js example: secure session route, token issuance, anonymous capture — Task 14
- [x] Express example — Task 15
- [x] Production Security Checklist + README + CHANGELOG + version bump — Task 16

**Type consistency:** `FeedbackSecurityContext`, `FeedbackAuthConfig`, `FeedbackRedactionConfig`, error codes used in tests match `src/types.d.ts` and the error classes in `feedbackErrors.js`. Status enum values match the parent spec. `submittedBy` shape (id, role) matches.

**Placeholder scan:** none found.

**Known caveats deferred to Phase B/C:**
- `getDestinationPolicy` is a stub returning `{ allowed: true }`; hosts can override via custom logic inside `authorize`. Real per-destination policy enforcement is Phase B.
- `redact: 'off'` warning happens server-side; the client-side warning is added in Task 12 if not already implicit (covered in Step 12.2).
- `_logId` from `defaultErrorNormalizer` is currently only stamped in the body and logged inline; structured server logging integration is Phase C.

These are noted explicitly so future work doesn't re-discover them.
