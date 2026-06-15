# AI-actionable capture setup

This guide covers the host wiring needed to turn every captured feedback into an AI-ready ticket.

## 1. Build metadata

Pick one of three ways. Order of precedence (highest first):

### a) Explicit prop (recommended for SPAs)
```jsx
<FeedbackProvider captureConfig={{ buildInfo: { commit: process.env.GIT_SHA, branch: 'main', builtAt: new Date().toISOString() } }} />
```

### b) Global
```html
<script>window.__feedbackBuildInfo = { commit: 'abc123', branch: 'main' };</script>
```

### c) Meta tag (works without a JS injection step)
```html
<meta name="feedback-build" content="commit=abc&branch=main&builtAt=2026-06-15T17:30Z">
```

## 2. Feature flags

```jsx
captureConfig={{
  flagsSnapshot: () => myFlags.allFlags(),
}}
```

LaunchDarkly: `flagsSnapshot: () => ldClient.allFlags(ldUser)`.
GrowthBook: `flagsSnapshot: () => gb.getAllAttributes()`.
Statsig: `flagsSnapshot: () => Statsig.checkGateAll()`.

## 3. Server source-map fallback

```js
import { withSecureDefaults, createJiraHandler } from 'react-visual-feedback/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const POST = withSecureDefaults({
  authorize: getSession,
  resolveSourceMap: async ({ bundleHash, scriptUrl }) => {
    const safe = path.resolve('/srv/maps', `${bundleHash}.map.json`);
    return fs.readFile(safe, 'utf8');
  },
})(createJiraHandler({ projectKey: 'BUG' }));
```

Maps stay off the public CDN; the widget hands the bundle hash to the server when it can't fetch the map itself.

## 4. Privacy posture

The interaction trail captures full input values, then runs three layers of redaction:

1. **HTML hints:** `type=password`, `autocomplete=cc-*`, `inputmode=numeric` with sensitive name, `[data-feedback-redact="true"]` subtree.
2. **Host-configured `sensitiveSelectors: string[]`.**
3. **Phase A inline-secret regex pass** (worker AND server).

Use `data-feedback-redact="true"` to mark any subtree as never-captured.

## 5. Verify it works

After integration:
1. Submit a feedback after typing into a password field. Verify the stored item's `aiTicket.markdown` shows `<password-field>` and no password value anywhere.
2. Open the dashboard (or the standalone `dist/viewer.html`), copy the AI ticket from the Workflow Panel, paste into Claude / Cursor and confirm the file, code snippet, and repro are present.
