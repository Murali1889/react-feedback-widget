# Zero-effort integration

The shortest path from "I want a feedback widget" to "we're triaging the first ticket."

## 1. Install

```bash
npm install react-visual-feedback
```

## 2. Mount the provider

```jsx
import { FeedbackProvider } from 'react-visual-feedback';

export default function App() {
  return (
    <FeedbackProvider dashboard>
      <YourApp />
    </FeedbackProvider>
  );
}
```

That's it. Hosts press `Alt+A` to capture, `Alt+Q` to open the Command Center dashboard. All feedback lives in `localStorage` until you wire a backend.

## 3. Open the viewer (no React app needed)

The library ships a standalone HTML viewer that reads the same `localStorage` key your widget writes to. Two ways to use it:

### Locally, just open the file

```
open node_modules/react-visual-feedback/dist/viewer.html
```

(Or paste that path into your browser's address bar.) The Command Center loads with every feedback the widget has stored in this browser.

### Hosted on your project

Copy `node_modules/react-visual-feedback/dist/viewer.html` to your `public/` folder so it's served at `/viewer.html`. Anyone on the team can open `https://your-app.com/viewer.html` to triage.

The viewer auto-detects `prefers-color-scheme: dark`, supports keyboard shortcuts, status changes, deletion, and refreshes when you regain focus on the tab.

## 4. (Optional) connect a backend

Add a `dataSource` so the widget writes to your server in addition to localStorage:

```jsx
<FeedbackProvider
  dashboard
  dataSource={{
    load:    () => fetch('/api/feedback').then(r => r.json()),
    save:    async (item) => {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    },
    remove:  (id) => fetch(`/api/feedback/${id}`, { method: 'DELETE' }),
  }}
/>
```

For a secure server adapter that handles auth, redaction, rate-limit, and CSRF in five lines:

```js
import {
  withSecureDefaults, createJiraHandler, FeedbackAuthError,
} from 'react-visual-feedback/server';

export const POST = withSecureDefaults({
  authorize: async (req) => {
    const session = await getServerSession(req);
    if (!session) throw new FeedbackAuthError();
    return { userId: session.userId, projectId: session.projectId };
  },
})(createJiraHandler({ projectKey: 'BUG' }));
```

That's `react-visual-feedback/server` from Phase A. See `docs/production-security-checklist.md`.

## 5. (Optional) opt into AI-actionable capture

```jsx
<FeedbackProvider
  dashboard
  captureConfig={{
    sensitiveSelectors: ['input[name="token"]'],
    flagsSnapshot: () => myFlags.allFlags(),
    buildInfo: { commit: process.env.GIT_SHA, branch: 'main' },
  }}
/>
```

Now every captured feedback is also enriched with the source file + ±10 lines of real code (via source maps), a repro recipe from the interaction trail, React state at click time, captured errors, build metadata, and feature-flag snapshot. The AI ticket is available both as a Markdown copy-to-clipboard in the Workflow Panel and as JSON for programmatic consumers.

See `docs/ai-capture-setup.md` for the host wiring (build metadata, feature flags, server source-map fallback, privacy posture).

## Stuck?

- The widget feels invisible: check that you wrapped it at the app root, not inside a route component that unmounts.
- `Alt+A` opens nothing: a host shortcut elsewhere may be capturing the keystroke. The widget's modal opens on the keydown event; other libraries that call `preventDefault()` earlier will block it.
- LocalStorage filled up: clear `react-feedback-data` once, or move to a server `dataSource`.
