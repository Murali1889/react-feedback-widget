# Integration Guide — react-visual-feedback

This document is the canonical reference for wiring the widget into your project.
Every destination, every upload strategy, every security boundary — with copy-paste recipes.

**Companion files**
- [`AGENTS.md`](../AGENTS.md) — AI-readable project spec (Cursor / Claude / Aider)
- [`docs/architecture.html`](./architecture.html) — visual flow chart, open in any browser
- [`README.md`](../README.md) — quick-start landing page

---

## Table of contents

1. [Mental model in 30 seconds](#mental-model-in-30-seconds)
2. [60-second integration](#60-second-integration)
3. [Configuration reference](#configuration-reference)
4. [Upload strategies — json / multipart / signed-url](#upload-strategies)
5. [Capture data — what lands in every submission](#capture-data-what-lands-in-every-submission)
6. [Security model](#security-model)
7. **Integration recipes** (per destination)
   - [GitHub Issues](#destination-github-issues)
   - [GitHub Actions (repository_dispatch)](#destination-github-actions)
   - [Linear](#destination-linear)
   - [Notion](#destination-notion)
   - [Jira](#destination-jira)
   - [Google Sheets](#destination-google-sheets)
   - [Supabase (server-proxied)](#destination-supabase-server-proxied)
   - [Supabase (browser direct + RLS)](#destination-supabase-browser-direct--rls)
   - [Generic Webhook](#destination-generic-webhook)
   - [Hosted Cloud](#destination-hosted-cloud)
   - [Custom destination](#destination-custom)
8. [Object storage for media](#object-storage-for-media-s3--r2--supabase-storage)
9. [Common patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Mental model in 30 seconds

```
USER          BROWSER ADAPTER                ┌─────────────────────────────┐
clicks   ─►   captures evidence       ─►    │  destinations[]              │
              compresses screenshot          │   ✓ local       (browser)    │
              builds AI ticket               │   ✓ github      (server)     │
              uploads via signed URLs        │   ✓ linear      (server)     │
              (optional)                     │   ✓ supabase    (server/RLS) │
                                             │   ✓ webhook     (any URL)    │
                                             └─────────────────────────────┘

                       one feedback fans out to N destinations in parallel
                       per-destination status returned to the UI footer
```

Both the **browser** and the **server** import the **same config file** so adding a destination = editing one line. The catch-all server route auto-dispatches by convention: adapter `name` ↔ `/api/feedback/<name>`.

**Hosts provide their own credentials.** We provide the framework, the safety guards, the wiring. Tokens for production destinations live in your server env — never in the browser bundle. Every adapter constructor refuses known-private-key shapes at build time.

---

## 60-second integration

### 1. Install

```bash
npm install react-visual-feedback
```

### 2. Single config file (project root)

```ts
// feedback.config.ts
import { defineConfig } from 'react-visual-feedback/config'
import { local, githubIssue } from 'react-visual-feedback/destinations'

export default defineConfig({
  destinations: [
    local(),                  // browser fallback — always include
    githubIssue(),            // server env: GH_TOKEN, GH_REPO
  ],
  auth:   { mode: 'session' },
  redact: 'default',
  ui:     { variant: 'two-column' },
  captureConfig: {
    media:  { compress: true, format: 'webp', quality: 0.85 },
    upload: { strategy: 'multipart' }, // or 'signed-url' for direct-to-storage
  },
})
```

### 3. Browser — one line

```tsx
// app/layout.tsx
import feedbackConfig from '@/feedback.config'
import { FeedbackProvider } from 'react-visual-feedback'

export default function RootLayout({ children }) {
  return <FeedbackProvider {...feedbackConfig}>{children}</FeedbackProvider>
}
```

### 4. Server — one catch-all route

```ts
// app/api/feedback/[...rest]/route.ts
import { createFeedbackRouter, FeedbackAuthError } from 'react-visual-feedback/server'
import feedbackConfig from '@/feedback.config'
import { getSession } from '@/lib/auth'

export const POST = createFeedbackRouter({
  ...feedbackConfig,
  authorize: async (req) => {
    const session = await getSession(req)
    if (!session) throw new FeedbackAuthError()
    return { userId: session.userId, projectId: session.projectId }
  },
})
```

### 5. Set env vars

```bash
# .env.local
GH_TOKEN=ghp_…
GH_REPO=acme/web
```

**Done.** `Alt+A` opens the modal. Adding another destination = adding one more `…()` line in the config.

---

## Configuration reference

```ts
defineConfig({
  /* DESTINATIONS — fan a submission out in parallel */
  destinations: Array<FeedbackDestination>,

  /* SECURITY — pre-defaults that withSecureDefaults applies on the server side */
  auth: { mode: 'session' | 'bearer' | 'signed' | 'none' },

  /* REDACTION — server-side as defense-in-depth even with no auth */
  redact: 'default' | 'strict' | 'off' | FeedbackRedactionConfig,

  /* UI — pick the modal layout */
  ui: {
    variant: 'centered' | 'drawer' | 'compact' | 'stepper' | 'two-column' | 'workspace',
    accent?: string, // CSS color (planned)
  },

  /* CAPTURE — controls every observer + the AI ticket assembly */
  captureConfig: {
    buildInfo?: { commit, branch, builtAt, environment, packageVersion },
    flagsSnapshot?: () => Record<string, unknown>,
    sensitiveSelectors?: string[],          // host-marked redaction targets
    networkBufferSize?: number,             // default 50
    networkExcludePatterns?: string[],
    disableNetworkCapture?: boolean,
    disableVitals?: boolean,                // skip LCP/CLS/INP/FCP
    disableMutations?: boolean,             // skip DOM mutation buffer

    /* MEDIA — compression at capture time */
    media: {
      compress?: boolean,                   // default true
      format?: 'webp' | 'jpeg' | 'png',     // default 'webp'
      quality?: number,                     // default 0.85
      maxDimension?: number | null,         // default null (no resize)
    },

    /* UPLOAD — three strategies, see below */
    upload: {
      strategy?: 'json' | 'multipart' | 'signed-url',
      endpoint?: string,                    // signed-url endpoint, default '/api/feedback/upload-url'
    },
  },

  /* ROUTES — override the auto-mapping on the server side */
  routes?: Record<string, ServerHandler>,
})
```

---

## Upload strategies

The widget picks the best available strategy automatically based on payload contents and config:

| Strategy | When | Per-destination wire size | Where binary lives |
|---|---|---|---|
| **json** | No binary in payload | small | inline as base64 in JSON |
| **multipart** (default for binary) | Payload has screenshot/video | binary + tiny overhead | separate multipart part — no base64 inflation |
| **signed-url** (best at scale) | `upload.strategy: 'signed-url'` configured | small JSON only (URL refs) | direct PUT to object storage — bypasses your app server entirely |

**All three are verified end-to-end** with live Playwright runs. Real numbers from a 1.07 MB PNG screenshot test:

```
Strategy        Per-destination wire size
───────────     ─────────────────────────
json            30.5 KB    (base64 + metadata)
multipart       24.3 KB    (binary + framing)
signed-url       8.6 KB    (URL refs only — binary went to S3/R2/Supabase Storage)
```

### Picking a strategy

- **Local prototype / `local()` only** → `json` (default)
- **Production with server-proxied destinations** → `multipart` (default for binary)
- **High volume / large media** → `signed-url` ⭐ recommended

### Speed wins (always-on)

- **WebP compression at quality 0.85** — typical screenshot 1.0 MB → ~20 KB (98% smaller)
- **OffscreenCanvas worker** — compression runs off the main thread (`encodedOn: 'worker'` in `mediaCompressed` metadata)
- **Eager compression** — kicks off the moment a screenshot is captured, not at submit time. Real benchmark: cold submit 326 ms → warm submit 53 ms (**6× faster**) when the user types for 2.5 seconds before sending.
- **Skip dataUrl roundtrip** — when downstream is binary, the `blob → dataUrl → blob` encoding is skipped.

---

## Capture data — what lands in every submission

Submissions carry an `aiTicket` with both Markdown (human-readable) and JSON (machine-readable) representations.

### Top-level payload shape

```ts
{
  feedback: string,           // the user's description
  type: 'bug' | 'feature' | 'improvement' | 'ui-change' | 'idea' | 'praise' | 'question' | 'other',
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'low' | 'medium' | 'high' | 'critical',
  labels: string[],
  screenshot: string | { url, mimeType, size, uploadedAt }, // dataUrl OR signed-URL ref
  videoBlob:  Blob | { url, mimeType, size, uploadedAt },   // same
  attachment: File | { url, mimeType, size, uploadedAt },
  timestamp: ISO_8601,
  url: string,                // page URL
  userName, userEmail, userAvatar, viewport, userAgent,
  mediaCompressed: { format, fromBytes, toBytes, savedBytes, ratio, encodedOn },
  uploadedVia: 'signed-url' | undefined,
  destinationResults: Array<{ name, mode, describe, ok, id?, url?, error?, durationMs }>,
  aiTicket: { markdown, json, generatedAt, assembledOn },
}
```

### `aiTicket.json` — every observed signal

| Section | Contents |
|---|---|
| `summary` | type, severity, page, timestamp, user, feedback text |
| `where` | resolved file:line, React component name, CSS selector, code snippet (±10 lines) |
| `state` | React fiber walk — props, state, hooks of the clicked component |
| `repro.steps` | last 30 user interactions + route changes + errors |
| `logs` | merged network + console + storage + error trace |
| `environment.build` | commit, branch, builtAt, environment, packageVersion |
| `environment.runtime` | a11y (color scheme, reduced motion, locale, timezone), network conditions (effectiveType, downlink), memory, document state, service worker, online status, devicePixelRatio |
| `environment.webVitals` | LCP / CLS / INP / FCP |
| `environment.recentMutations` | last ~20 DOM additions/removals/attr changes |
| `environment.recentLongTasks` | tasks > 50ms |
| `environment.storageQuota` | usageMb / quotaMb |
| `evidence` | hasScreenshot, hasVideo, annotations[], event count |
| `impact` (workspace variant) | likely related files (importers / importees / sibling tests) |
| `suggestedTest` (workspace variant) | copy-paste failing vitest scaffold |

### Recording mode (Alt+W)

When the reporter starts a screen recording (Alt+W), the recorder additionally captures a full event timeline synced to the video:

- **interaction** — click / pointerdown / focus / input / change / submit / notable keydown (Enter, Tab, Escape, arrows)
- **network** — fetch + XHR (method, url, status, duration)
- **console** — log / warn / error / info / debug
- **storage** — localStorage / sessionStorage / IndexedDB writes
- **route** — pushState / replaceState / popstate / hashchange

Each event has a `timestamp` in milliseconds **relative to recording start**, so the modal's TimelineScrubber can seek the video to any event.

---

## Security model

> **No browser-side adapter ever holds a production credential.**

Every adapter is one of three modes:

| Mode | Where the credential lives | Detection |
|---|---|---|
| `local` | nowhere — localStorage | n/a |
| `public-token` | client (anon-only — e.g. Supabase anon key with INSERT-only RLS) | adapter name ends in `Public`; doc carries the RLS SQL; safety guard refuses service-role JWT shape |
| `server-proxied` | server env, never bundled | known private-key shapes refused at adapter construction with `FeedbackCredentialLeakError` |

### Refused at construction

The widget refuses these private-key shapes if you accidentally pass them to a client adapter:

```
GitHub PAT (classic):      ghp_…
GitHub fine-grained PAT:   github_pat_…
GitHub Actions/App tokens: ghs_… / ghu_… / gho_… / ghr_…
Linear API key:            lin_api_…
Linear OAuth:              lin_oauth_…
Notion integration token:  secret_… / ntn_…
Atlassian (Jira):          ATATT3…
Slack:                     xox[abprs]-…
AWS access key id:         AKIA…
Google OAuth secret:       GOCSPX-…
Stripe secret:             sk_(live|test)_…
Supabase service-role JWT: eyJ… with role=service_role in payload
```

Plus header-value embedded matches — so `Authorization: "Bearer ghp_…"` triggers the same guard.

### Server side — `withSecureDefaults`

Every server handler is wrapped uniformly:

```ts
withSecureDefaults({
  authorize: async (req) => { /* your real auth */ },
  // optional:
  validateOrigin, rateLimit, redactFeedback, resolveIntegrationSecrets, errorNormalizer,
})(createGithubHandler({}))
```

Enforces:
- **Origin allow-list** (env: `FEEDBACK_ALLOWED_ORIGINS`)
- **CSRF check** when cookies are present
- **Rate limit** per-IP-and-user (default 30/hour)
- **Your `authorize` callback** — throw `FeedbackAuthError` to reject
- **Payload validation** — type/severity/length caps
- **Defense-in-depth redaction** — strip headers, query params, body keys

---

# Integration recipes

Each destination below is **independent** — pick any combination. Add or remove a line from `destinations[]` in `feedback.config.ts` and the catch-all route handles the rest.

---

## destination: GitHub Issues

Maps the feedback to title + Markdown body + auto-tagged labels (`severity:Pn`, `type:bug`).

```ts
// feedback.config.ts
import { githubIssue } from 'react-visual-feedback/destinations'
destinations: [ ..., githubIssue() ]
```

**Server env:**
```bash
GH_TOKEN=ghp_…   # fine-grained PAT with Issues: Read & write
                  # OR GitHub App installation token with same permission
GH_REPO=acme/web # "owner/repo"
```

**What lands in the issue:**
- Title: first 120 chars of the feedback
- Body: the full Markdown AI ticket (Where / Repro / Logs / Environment / State / Suggested Test / Annotations)
- Labels: `severity:P1`, `type:bug`, plus whatever labels the reporter picked

The catch-all route handles this automatically — no per-destination route file needed.

---

## destination: GitHub Actions

The "universal automation" backdoor — fire a `repository_dispatch` event so any workflow listening for it runs with the feedback as payload.

```ts
// feedback.config.ts
import { githubAction } from 'react-visual-feedback/destinations'
destinations: [ ..., githubAction() ]
```

**Server env:**
```bash
GH_TOKEN=ghp_…             # PAT with Actions: Write on the target repo
GH_REPO=acme/web
GH_ACTION_EVENT=feedback   # event_type — default 'feedback'; pick anything
```

**Your workflow file** (`.github/workflows/feedback.yml`):

```yaml
name: Handle feedback
on:
  repository_dispatch:
    types: [feedback]
jobs:
  handle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # github.event.client_payload.feedback contains the full submission
      - run: echo "${{ toJSON(github.event.client_payload.feedback) }}"
      # Then do anything: file an issue, ping Slack, auto-draft a PR,
      # replay the interaction trail with Playwright, mirror to another
      # tracker, run smoke tests against the captured route, etc.
```

**Why this is high-leverage:** Actions gives you all of CI as an extension surface. Anything you can write in a workflow, you can wire to a feedback report.

---

## destination: Linear

GraphQL `IssueCreate` mutation. Severity automatically maps to Linear priority (P0=1 Urgent, P1=2 High, P2=3 Medium, P3=4 Low).

```ts
import { linearIssue } from 'react-visual-feedback/destinations'
destinations: [ ..., linearIssue() ]
```

**Server env:**
```bash
LINEAR_API_KEY=lin_api_…     # from Linear → Settings → API → Personal API keys
                              # OR LINEAR_OAUTH_TOKEN=lin_oauth_…
LINEAR_TEAM_ID=…             # UUID; find via the GraphQL playground:
                              # `query { teams { nodes { id name } } }`
```

---

## destination: Notion

Inserts a page into a database. Title + optional `Severity` select + optional `Type` select. Body chunked to fit Notion's 2000-char rich-text limit.

```ts
import { notionDb } from 'react-visual-feedback/destinations'
destinations: [ ..., notionDb() ]
```

**Server env:**
```bash
NOTION_TOKEN=secret_…   # internal integration token from
                         # notion.so/my-integrations
NOTION_DB_ID=…          # database UUID
```

**Database setup:**
1. Create a database in Notion
2. Required: a `Name` (title) property
3. Optional: `Severity` (select) and `Type` (select) — auto-populated if present
4. **Share the database with your integration** (Database page → ⋯ → Connections → add your integration). The handler will fail with 404 if you forget this.

---

## destination: Jira

The "legacy" mature path — supports server / Apps Script / Zapier modes via the existing `integrations={ jira: {…} }` prop. The catch-all router also auto-dispatches when `name: 'jira'` is in `destinations`.

**Server env:**
```bash
JIRA_DOMAIN=your-org.atlassian.net
JIRA_EMAIL=alice@your-org.com
JIRA_API_TOKEN=ATATT3…       # from id.atlassian.com → Account → Security
JIRA_PROJECT_KEY=BUG          # short project key
```

**Full setup walkthrough:** see the existing per-destination route at `example-nextjs/src/app/api/feedback/jira/route.ts`.

---

## destination: Google Sheets

Appends a row per submission. Three sub-modes: direct API, Apps Script (no service account needed), Zapier webhook.

**Server env (direct):**
```bash
GOOGLE_SHEETS_ID=…                       # spreadsheet ID from the URL
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",…}
                                          # share the sheet with the service account email
```

Sheet columns auto-mapped from `feedbackToSheetRow` — extend via `mergeSheetColumns`.

---

## destination: Supabase (server-proxied)

Inserts into a Postgres table via PostgREST. Service-role key lives ONLY on your server. The widget refuses service-role keys at construction time if you ever try to pass one client-side.

```ts
import { supabaseProxied } from 'react-visual-feedback/destinations'
destinations: [ ..., supabaseProxied() ]
```

**Server env:**
```bash
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ…              # NEVER ship to browser; widget refuses it
SUPABASE_FEEDBACK_TABLE=feedback             # optional, defaults to "feedback"
```

**SQL setup:**
```sql
create table feedback (
  id         uuid primary key default gen_random_uuid(),
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  origin     text
);
-- The handler captures `origin` from authContext for audit.
```

---

## destination: Supabase (browser direct + RLS)

The browser writes directly with the **anon** key. Safe ONLY with a properly locked-down RLS policy that allows INSERT but nothing else.

```ts
import { supabasePublic } from 'react-visual-feedback/destinations'
destinations: [
  ...,
  supabasePublic({
    url:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  }),
]
```

**Required SQL — read this before deploying:**

```sql
create table feedback (
  id         uuid primary key default gen_random_uuid(),
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  origin     text
);

alter table feedback enable row level security;

create policy "anon can insert feedback only" on feedback
  for insert
  to anon
  with check (
    jsonb_typeof(payload) = 'object'
    and pg_column_size(payload) < 100000   -- 100 KB cap per row
  );
-- intentionally NO select / update / delete policies for anon

create policy "service role full access" on feedback
  for all
  to service_role
  using (true) with check (true);
```

**If you skip the RLS step, anyone with the anon key (i.e., everyone on the internet) can read all feedback.** The adapter refuses service-role keys at construction time but it cannot inspect your RLS policy from the browser — that's on you.

---

## destination: Generic Webhook

POST the feedback to any URL.

**Server-proxied** (recommended — credential lives in env):

```ts
import { webhookProxied } from 'react-visual-feedback/destinations'
destinations: [ ..., webhookProxied() ]
```

```bash
WEBHOOK_URL=https://hooks.slack.com/services/T0…/B0…/abcd
WEBHOOK_HMAC_SECRET=…   # optional: adds X-Feedback-Signature: sha256=<hex>
WEBHOOK_HEADERS={"x-team":"feedback"}   # optional: JSON
```

**Browser-direct** (no credential — for public webhooks like Zapier triggers):

```ts
import { webhook } from 'react-visual-feedback/destinations'
destinations: [
  webhook({ url: process.env.NEXT_PUBLIC_FEEDBACK_HOOK! }),
]
```

The constructor refuses any header value matching a known-private-key shape — so `headers: { authorization: 'Bearer ghp_…' }` throws `FeedbackCredentialLeakError`.

---

## destination: Hosted Cloud

> ⚠ **Backend service not yet live.** The client adapter is shipped and the wire protocol is locked; until our hosted backend rolls out, this adapter throws a clean "cloud not yet available" message at send-time.

Sentry/Datadog-style write-only ingest. Token is **identity, not auth** — origin allow-list + rate limit enforced server-side.

```ts
import { cloud } from 'react-visual-feedback/destinations'
destinations: [
  cloud({
    projectId:   process.env.NEXT_PUBLIC_RVF_PROJECT!,
    ingestToken: process.env.NEXT_PUBLIC_RVF_TOKEN!,
  }),
]
```

**Worst case if the token leaks:** an attacker with a valid origin can submit garbage feedback to your project until you rotate. **No data exfiltration possible** — the endpoint is INGEST-ONLY.

---

## destination: Custom

Any function returning `{ name, mode, describe, send }`:

```ts
const myCustomAdapter = () => ({
  name: 'mycustom',
  mode: 'server-proxied',  // or 'public-token' or 'local'
  describe: () => 'my custom destination',
  send: async (feedback) => {
    const t0 = performance.now()
    try {
      const res = await fetch('/api/feedback/mycustom', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(feedback),
      })
      const body = await res.json()
      return { ok: res.ok, id: body.id, url: body.url, durationMs: Math.round(performance.now() - t0) }
    } catch (e) {
      return { ok: false, error: e.message, durationMs: Math.round(performance.now() - t0) }
    }
  },
})

destinations: [ ..., myCustomAdapter() ]
```

For the **server side**, write your handler in `app/api/feedback/mycustom/route.ts` and the catch-all router will dispatch automatically. OR pass it via `routes:` override:

```ts
createFeedbackRouter({
  ...feedbackConfig,
  routes: { mycustom: myCustomHandler },
})
```

---

# Object storage for media (S3 / R2 / Supabase Storage)

When `upload.strategy: 'signed-url'` is configured, the browser PUTs binaries (screenshots, videos) **directly** to your object store — bypassing your app server entirely. Saves bandwidth + makes submissions faster.

```ts
// feedback.config.ts
captureConfig: {
  upload: { strategy: 'signed-url', endpoint: '/api/feedback/upload-url' },
}
```

**Server route:**

```ts
// app/api/feedback/upload-url/route.ts
import {
  withSecureDefaults,
  createUploadUrlHandler,
  FeedbackAuthError,
} from 'react-visual-feedback/server'
import { getSession } from '@/lib/auth'

export const POST = withSecureDefaults({
  authorize: async (req) => {
    const s = await getSession(req)
    if (!s) throw new FeedbackAuthError()
    return { userId: s.userId, projectId: s.projectId }
  },
})(createUploadUrlHandler({
  // Pick ONE provider:

  // ─── AWS S3 ─────────────────────────────────
  provider: 's3',
  bucket: process.env.S3_BUCKET!,
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT!,
  accessKeyId: process.env.S3_ACCESS_KEY!,
  secretAccessKey: process.env.S3_SECRET_KEY!,
  publicBaseUrl: process.env.S3_PUBLIC_BASE_URL, // optional CDN

  // ─── Cloudflare R2 ──────────────────────────
  // provider: 'r2',
  // bucket: process.env.R2_BUCKET!,
  // region: 'auto',
  // endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  // accessKeyId: process.env.R2_ACCESS_KEY!,
  // secretAccessKey: process.env.R2_SECRET_KEY!,
  // publicBaseUrl: process.env.R2_PUBLIC_URL!,

  // ─── Supabase Storage ───────────────────────
  // provider: 'supabase',
  // supabaseUrl: process.env.SUPABASE_URL!,
  // serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // bucket: 'feedback',

  // ─── Custom signer ──────────────────────────
  // provider: async ({ name, mimeType, size, key }) => ({
  //   url: 'https://your-store/PUT-url',
  //   headers: { 'content-type': mimeType },
  //   finalUrl: 'https://your-cdn/' + key,
  //   expiresAt: new Date(Date.now() + 300_000).toISOString(),
  // }),

  /* Enforced server-side: */
  maxBytesPerFile: 50 * 1024 * 1024,   // 50 MB
  maxFilesPerRequest: 5,
  allowedMimes: ['image/webp', 'image/jpeg', 'image/png', 'video/webm', 'video/mp4', 'application/pdf'],
  expiresSeconds: 300,
}))
```

**The storage path is server-chosen** via `pathPrefix(authContext)` (default `${projectId}/${userId}/`) so a user with a valid session can only write into their own scope.

---

# Common patterns

## Multi-destination

Stack as many as you want — they run in parallel:

```ts
destinations: [
  local(),                                 // always — offline fallback
  githubIssue(),                           // your tracker
  webhookProxied(),                        // your Slack channel
  supabaseProxied(),                       // your analytics / search
]
```

The reporter sees per-destination status chips in the submission toast: `✓ local · ✓ github · ✓ slack · ⚠ supabase failed`.

## Development mode without server

```ts
// feedback.config.ts
destinations: [ local() ],   // localStorage; no server route needed
```

Press `Alt+Q` to view the dashboard. Use the bundled `viewer.html` (or copy to `public/`) for a standalone viewer.

## Production-hardening checklist

- [ ] `auth.mode: 'session'` or `'bearer'` (NEVER `'none'`)
- [ ] `redact: 'default'` or `'strict'`
- [ ] `FEEDBACK_ALLOWED_ORIGINS` env set to your production origin
- [ ] Every server-proxied destination has its env vars set
- [ ] `withSecureDefaults({ authorize })` wraps every handler (catch-all router does this for you)
- [ ] `upload.strategy: 'signed-url'` configured with a real bucket if you expect volume
- [ ] If using `supabasePublic`, the RLS policy from the doc above is applied
- [ ] Rotate the `WEBHOOK_HMAC_SECRET` periodically if you signed webhooks

## Customizing the AI ticket Markdown

The catch-all route reuses `withSecureDefaults`. If you want to customize the body each destination receives, intercept via a custom adapter:

```ts
const githubIssueCustom = () => {
  const inner = githubIssue()
  return {
    ...inner,
    send: (feedback) => inner.send({
      ...feedback,
      aiTicket: {
        ...feedback.aiTicket,
        markdown: `**Triage:** auto-assigned to oncall\n\n${feedback.aiTicket.markdown}`,
      },
    }),
  }
}
```

---

# Troubleshooting

### `Module not found: Can't resolve './worker/feedback-capture-worker.js'`

This was a Phase D bug — the worker URL was statically referenced from the main bundle. **Already fixed** as of `feat(capture): make worker opt-in via globalThis.__feedbackWorkerUrl`. If you hit it on an older version, upgrade.

### Modal doesn't open

The widget loads via dynamic import in the Next.js example. If you see SSR errors, wrap in:

```tsx
const FeedbackProvider = dynamic(
  () => import('react-visual-feedback').then((m) => m.FeedbackProvider),
  { ssr: false },
)
```

### Destination returns 401

Means `withSecureDefaults`'s `authorize` callback threw `FeedbackAuthError`. The widget reached the server correctly; your auth function rejected the request. Double-check `getSession(req)` resolves with the expected shape.

### "Refused to use … as a client-side …" thrown at build time

Your adapter received a known-private-key shape. The error message tells you which adapter to use instead (e.g., `githubIssue()` server-proxied instead of putting the PAT in a `webhook()` header). This is the safety guard doing its job.

### Submission seems slow

Run with `?upload=signed-url` to switch to direct-to-storage and remove server bandwidth from the binary path. The `mediaCompressed.encodedOn` field on the payload tells you whether the OffscreenCanvas worker ran (`'worker'`) or fell back to main-thread (`'main'`).

### `payload.screenshot` is `{ url, mimeType, size, uploadedAt }` not a string

This is correct when `upload.strategy: 'signed-url'` is active — the binary went directly to object storage and the payload now carries a URL reference.

---

## See also

- [`AGENTS.md`](../AGENTS.md) — AI-agent guide (recipe tables, common-modification rules)
- [`docs/architecture.html`](./architecture.html) — visual flow chart
- `example-nextjs/feedback.config.ts` — working reference config
- `example-nextjs/src/app/api/feedback/[...rest]/route.ts` — catch-all router setup
- `example-nextjs/src/app/api/feedback/upload-url/route.ts` — object-storage handler
