# react-visual-feedback — AI Agent Guide

> This file is the canonical project spec for AI agents (Cursor, Claude,
> Aider, Continue, Copilot Workspace). It's scoped for fast comprehension —
> code-first, structured, ~200 lines. Read this before suggesting changes.

## What it is

A drop-in React widget that captures user feedback (clicks, screenshots,
screen-recordings with synced event timeline, console/network/storage
traces, React fiber state, source-map–resolved component info), assembles
an AI-actionable ticket, and fans the submission out to one or more
destinations (local, GitHub Issues, Linear, Notion, Jira, Sheets,
Supabase, webhook, hosted cloud) in parallel.

## Mental model

```
USER          BROWSER ADAPTER          ┌───────────────────────────┐
clicks   →    captures evidence   →    │ destinations[]           │
            assembles AI ticket        │ ✓ local       (localStorage)
                                       │ ✓ github      (server)
                                       │ ✓ linear      (server)
                                       │ ✓ supabasePublic (anon+RLS)
                                       └───────────────────────────┘
                                              ↓
                          one feedback fans out to N destinations
                                  in parallel, per-destination
                                  status returned to the UI
```

Both the browser and the server import the **same config file** so
adding a destination = editing one line. Auto-pairing by convention:
adapter `name` ↔ server `/api/feedback/<name>` route.

## 60-second integration

```bash
npm install react-visual-feedback
```

```ts
// feedback.config.ts   (project root)
import { defineConfig } from 'react-visual-feedback/config'
import { local, githubIssue } from 'react-visual-feedback/destinations'

export default defineConfig({
  destinations: [
    local(),                  // browser-only fallback — always include
    githubIssue(),            // env: GH_TOKEN, GH_REPO
  ],
  auth:   { mode: 'session' },
  redact: 'default',
  ui:     { variant: 'two-column' },
})
```

```tsx
// app/layout.tsx   (or any provider position)
import feedbackConfig from '@/feedback.config'
import { FeedbackProvider } from 'react-visual-feedback'

export default function RootLayout({ children }) {
  return <FeedbackProvider {...feedbackConfig}>{children}</FeedbackProvider>
}
```

```ts
// app/api/feedback/[...rest]/route.ts   (Next.js catch-all)
import { createFeedbackRouter, FeedbackAuthError }
  from 'react-visual-feedback/server'
import feedbackConfig from '@/feedback.config'
import { getSession } from '@/lib/auth'

export const POST = createFeedbackRouter({
  ...feedbackConfig,
  authorize: async (req) => {
    const s = await getSession(req)
    if (!s) throw new FeedbackAuthError()
    return { userId: s.userId, projectId: s.projectId }
  },
})
```

That's the whole integration. `Alt+A` opens the modal in dev.

## Security invariant (do not violate)

**No browser-side adapter ever holds a production credential.**

| Adapter mode      | Where the credential lives | Detection |
|-------------------|---------------------------|-----------|
| `local`           | nowhere (localStorage)    | n/a |
| `public-token`    | client (anon-only, e.g. Supabase anon key with INSERT-only RLS) | Adapter name ends in `Public`; doc carries the RLS SQL; safety guard refuses service-role JWT shape |
| `server-proxied`  | server env, never bundled | Token shape (ghp_, lin_api_, ATATT3, AKIA, …) refused at adapter construction with `FeedbackCredentialLeakError` |

Run `assertNoPrivateCredentials(value, 'fieldName')` from
`react-visual-feedback/destinations` if you write a new adapter that
accepts arbitrary header values.

## Common changes — recipe table

| Task | File(s) | Touch |
|---|---|---|
| Add a new destination | `feedback.config.ts` | append `someAdapter()` to `destinations[]`; set env vars |
| Remove a destination | `feedback.config.ts` | delete the adapter line |
| Change modal layout | `feedback.config.ts` | `ui.variant: 'two-column' \| 'drawer' \| 'compact' \| 'stepper' \| 'centered' \| 'workspace'` |
| Switch auth strategy | `feedback.config.ts` + catch-all route | `auth.mode` + `authorize:` callback |
| Custom server handler for one destination | catch-all route | `routes: { mycustom: myHandler }` in router config |
| Disable network capture | `feedback.config.ts` | `captureConfig: { disableNetworkCapture: true }` |
| Tighten redaction | `feedback.config.ts` | `redact: 'strict'` |

## Architecture map

```
src/
├── FeedbackProvider.jsx            React entry — orchestrates capture + modal + submit
├── FeedbackModal.jsx               legacy centered modal (variant: 'centered')
├── feedback-modal/                 Phase D variants
│   ├── FeedbackModalDrawer.jsx
│   ├── FeedbackModalCompact.jsx
│   ├── FeedbackModalStepper.jsx
│   ├── FeedbackModalTwoColumn.jsx  ← current default visual treatment
│   ├── FeedbackModalWorkspace.jsx  ← rail + impact map + pins + scaffold
│   ├── TimelineScrubber.jsx        ← video evidence timeline
│   └── useFeedbackModalState.js    shared state hook
├── capture/                        Phase C — observers, ring buffer, fiber walk,
│                                   source-map worker, ticket assembler
├── destinations/                   Phase E — adapter contract + safety + registry
│   ├── adapters/                   local, webhook, supabase, issue-trackers, cloud
│   ├── safety.js                   FeedbackCredentialLeakError + private-key patterns
│   └── registry.js                 dispatchToDestinations (parallel fanout)
├── integrations/server/            server-side handlers
│   ├── router.js                   Phase F createFeedbackRouter — catch-all dispatcher
│   ├── github.js linear.js
│   ├── notion.js supabase.js webhook.js
│   ├── withSecureDefaults.js       origin + CSRF + rate-limit + redaction wrapper
│   └── index.js                    public exports
├── config.js                       Phase F defineConfig (passthrough)
└── lib/                            isomorphic helpers (feedbackErrors, feedbackSecurity)
```

## Public-API entry points

| Subpath | What |
|---|---|
| `react-visual-feedback` | `FeedbackProvider`, `SimpleFeedbackButton`, `FeedbackModal`, theme |
| `react-visual-feedback/config` | `defineConfig` |
| `react-visual-feedback/destinations` | every browser adapter + safety guards |
| `react-visual-feedback/server` | `createFeedbackRouter`, every `createXHandler`, `withSecureDefaults`, error classes |
| `react-visual-feedback/capture` | React-bound capture (`CaptureProvider`, `FeedbackErrorBoundary`) |
| `react-visual-feedback/capture/core` | framework-agnostic capture (no React imports, 30KB) |
| `react-visual-feedback/ui` | design-token primitives |
| `react-visual-feedback/dashboard` | command-center components |

## Test layout

```
src/**/__tests__/*.test.{js,jsx}     → vitest --run
                                       jsdom env auto-applied for src/capture/**,
                                       src/__tests__/**, src/dashboard/**,
                                       src/feedback-modal/**, src/ui/**
```

459 tests as of Phase F1. Run with `npm test -- --run`. Coverage gate
configured per src/ subdir in `vitest.config.js`.

## What an AI agent should know before modifying code

1. **Don't break the credential-safety invariant.** New adapter? Add its
   private-key shapes to `src/destinations/safety.js` PRIVATE_KEY_PATTERNS
   and verify the JWT decoder still handles the format.

2. **Don't add React imports under `src/capture/core.js`.** The guardrail
   test in `src/capture/__tests__/core-framework-agnostic.test.js` will
   fail the build.

3. **schemaVersion of the AI ticket stays `'1.0'`** unless making a breaking
   change. Additive fields don't bump it — `src/capture/__tests__/security-hardening.test.js`
   enforces this.

4. **Hooks-rules in modal variants:** every `useState`/`useEffect`/`useMemo`/`useRef`
   must run before any `if (!isOpen) return null` early-return. Workspace
   variant got bit by this once.

5. **Default to server-proxied.** Public-token adapters need an aggressive
   doc warning naming the lockdown (`*Public` suffix in the name).

6. **Build via `npm run build`** before publishing. Rollup produces:
   `dist/{index, capture/{index,core,worker}, destinations/index,
   config, dashboard/index, ui/index, lib/index, server/*, integrations/*}.{js,esm.js}`.

## Phase history (most recent first)

- **F1** — `defineConfig` + `createFeedbackRouter`; one config file for both sides
- **E** — destinations adapter system + safety guards + 5 community adapters + server handlers
- **D** — 6 modal variants + smart pre-fill draft + annotation pins + impact map + test scaffold + per-destination status chips
- **C** — AI-actionable capture (source-map deminify worker, fiber walk, code context, repro recipe, Markdown+JSON ticket)
- **B2** — three-pane Command Center dashboard
- **B1** — design-token UI primitives
- **A** — secure-by-default server pipeline (`withSecureDefaults`)

## Common pitfalls

- Importing the widget bundle in a Server Component — wrap in `dynamic(() => …, { ssr: false })`.
- Forgetting the catch-all route file when using the single-config pattern.
- Passing a private token to a client adapter — the guard throws `FeedbackCredentialLeakError`.
- Expecting Supabase realtime / public-token adapters to work without the RLS policy applied — read each `*Public` adapter's JSDoc top comment.
