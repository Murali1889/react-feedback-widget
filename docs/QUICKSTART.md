# Quickstart — react-visual-feedback

> One line per destination. The library handles every security boundary. You only provide the access token.

**See also:**
- [`docs/QUICKSTART.html`](./QUICKSTART.html) — the same guide as a standalone webpage
- [`docs/INTEGRATION.md`](./INTEGRATION.md) — full reference (every destination, env var, security note)
- [`docs/architecture.html`](./architecture.html) — visual flow chart

---

## Path 1 — Try it without a server (30 seconds)

For prototypes, demos, internal tools, or anywhere you don't want to wire up a backend.

```bash
npm install react-visual-feedback
```

```tsx
import { FeedbackProvider } from 'react-visual-feedback'

export default function App() {
  return (
    <FeedbackProvider dashboard>
      <YourApp />
    </FeedbackProvider>
  )
}
```

**Done.**
- Press `Alt + A` → modal opens
- Submit feedback → saved to `localStorage`
- Press `Alt + Q` → see all collected feedback in a dashboard

No env vars, no server route, no config file.

---

## Path 2 — Production (~5 minutes)

For real apps where you want feedback to land in GitHub Issues, Linear, Notion, Jira, Supabase, HubSpot, Slack, etc.

### Files you'll create

```
your-project/
├── feedback.config.ts                          ← single source of truth
├── app/layout.tsx                              ← 1 line added (Provider)
├── app/api/feedback/[...rest]/route.ts         ← 6 lines, catch-all router
└── .env.local                                  ← 1 env var per destination
```

### Step 1 — Install

```bash
npm install react-visual-feedback
```

### Step 2 — One config file at your project root

```ts
// feedback.config.ts
import { defineConfig, connect } from 'react-visual-feedback'

export default defineConfig({
  destinations: [
    connect.local(),                                    // always — works offline
    connect.github({ repo: 'acme/web' }),              // env: GITHUB_TOKEN
    // Add as many as you want. Each is one line.
    // connect.linear({ team: '...' }),                // env: LINEAR_API_KEY, LINEAR_TEAM_ID
    // connect.notion({ database: '...' }),            // env: NOTION_TOKEN
    // connect.hubspot(),                              // env: HUBSPOT_TOKEN
    // connect.slack({ channel: '#bugs' }),            // env: SLACK_WEBHOOK_URL
    // connect.jira({ project: 'BUG' }),               // env: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
    // connect.sheets({ spreadsheet: '...' }),         // env: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_KEY
    // connect.supabase(),                             // env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    // connect.webhook({ url: '...' }),                // env: WEBHOOK_URL
  ],
  ui: { variant: 'two-column' },
})
```

> **Tip:** type `connect.` in any modern editor and you'll see the full destination menu with inline docs. No need to remember names.

### Step 3 — Spread the config into the provider

```tsx
// app/layout.tsx (Next.js App Router)
import feedbackConfig from '@/feedback.config'
import { FeedbackProvider } from 'react-visual-feedback'

export default function RootLayout({ children }) {
  return (
    <FeedbackProvider {...feedbackConfig}>
      {children}
    </FeedbackProvider>
  )
}
```

### Step 4 — One catch-all server route

```ts
// app/api/feedback/[...rest]/route.ts
import { createFeedbackHandler } from 'react-visual-feedback/server'
import feedbackConfig from '@/feedback.config'
import { getSession } from '@/lib/auth' // your existing auth

export const POST = createFeedbackHandler({
  ...feedbackConfig,
  authorize: async (req) => {
    const session = await getSession(req)
    return session ? { userId: session.userId, projectId: session.projectId } : null
  },
})
```

This **one** route auto-dispatches to every destination in your config — GitHub, Linear, Notion, Jira, Supabase, HubSpot, Slack — they all route through this same handler.

> **Security default:** if `NODE_ENV === 'production'` and you forget to pass `authorize`, **the handler refuses to start** with a clear error pointing to the fix. You can't accidentally ship an open endpoint.

### Step 5 — Set env vars

```bash
# .env.local
GITHUB_TOKEN=ghp_…         # https://github.com/settings/tokens — fine-grained PAT
                            # "Issues: Read & write" on the target repo

# add per destination you enabled, e.g.:
# LINEAR_API_KEY=lin_api_…
# LINEAR_TEAM_ID=…
# NOTION_TOKEN=secret_…
# NOTION_DB_ID=…
# HUBSPOT_TOKEN=pat-…
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/…
```

**Done.** Restart your dev server, press `Alt + A`, submit feedback → a GitHub Issue appears.

---

### Adding a new destination

Edit the array, add one line, set its env var. No new route file.

```ts
destinations: [
  connect.local(),
  connect.github({ repo: 'acme/web' }),
  connect.hubspot(),                       // ← NEW: just add the line
  connect.slack({ channel: '#bugs' }),     // ← and another
],
```

Append `HUBSPOT_TOKEN=...` and `SLACK_WEBHOOK_URL=...` to `.env.local`. Restart. Done.

---

## Path 3 — High volume: direct-to-storage uploads (~10 minutes)

Same as Path 2, plus the screenshots and videos go **directly from the browser to your S3 / R2 / Supabase Storage** bucket — your app server never sees the binary bytes. Best for production with real volume.

### Add to `feedback.config.ts`

```ts
captureConfig: {
  upload: { strategy: 'signed-url', endpoint: '/api/feedback/upload-url' },
},
```

### Add a second server route

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
  provider: 'r2',                                                    // or 's3' or 'supabase'
  bucket: process.env.R2_BUCKET!,
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY!,
  secretAccessKey: process.env.R2_SECRET_KEY!,
  publicBaseUrl: process.env.R2_PUBLIC_URL,
}))
```

Now screenshots upload directly from the browser to your bucket. The payload that goes to your destinations carries only a URL reference.

---

## The full `connect` menu

```ts
import { connect } from 'react-visual-feedback'

connect.local()                                  // browser only — always safe
connect.github({ repo })                         // env: GITHUB_TOKEN
connect.githubAction()                           // env: GITHUB_TOKEN — fire any GH Action workflow
connect.linear({ team })                         // env: LINEAR_API_KEY, LINEAR_TEAM_ID
connect.notion({ database })                     // env: NOTION_TOKEN
connect.hubspot()                                // env: HUBSPOT_TOKEN
connect.slack({ channel })                       // env: SLACK_WEBHOOK_URL  OR  SLACK_BOT_TOKEN
connect.jira({ project })                        // env: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
connect.sheets({ spreadsheet })                  // env: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_KEY
connect.supabase()                               // env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
connect.supabasePublic({ url, anonKey })         // browser direct — requires INSERT-only RLS
connect.webhook({ url })                         // server-proxied (default safe)
connect.webhookDirect({ url })                   // browser → URL directly (no creds)
connect.cloud({ projectId, ingestToken })        // our hosted SKU (backend coming)
```

---

## Framework support

| Framework | Route file path |
|---|---|
| Next.js App Router | `app/api/feedback/[...rest]/route.ts` |
| Next.js Pages Router | `pages/api/feedback/[...rest].ts` (default-export the router) |
| Remix | `app/routes/api.feedback.$.tsx` (export `action`) |
| Express | `app.post('/api/feedback/*', handler)` |
| Cloudflare Workers / Hono / Bun | Route any catch-all to the handler function |

`createFeedbackHandler` returns a function `(req, res?) => Response`. Wire it however your framework expects.

---

## Where do I get the tokens?

| Destination | Where to get the token |
|---|---|
| GitHub | https://github.com/settings/tokens → "Fine-grained tokens" → scope to one repo → "Issues: Read & write" |
| Linear | Linear → Settings → API → Personal API keys |
| Notion | https://www.notion.so/my-integrations → new internal integration → **don't forget to share your database with it** |
| HubSpot | HubSpot → Settings → Integrations → Private Apps → create app → scope: `tickets` |
| Slack | App home → Incoming Webhooks → Create new (gives you SLACK_WEBHOOK_URL) **OR** OAuth & Permissions → bot token + chat:write scope |
| Jira | https://id.atlassian.com/manage-profile/security/api-tokens |
| Supabase service-role | Supabase Dashboard → Settings → API → service_role secret |
| Cloudflare R2 | Dashboard → R2 → "Manage R2 API Tokens" → bucket-scoped token |
| AWS S3 | IAM → Users → access key → restrict to `s3:PutObject` on your bucket |

---

## Common questions

### "My dev server has no auth — how do I just try this?"

Two options. Pick one:

**Option A** — return a stub session in dev only (recommended):

```ts
authorize: async (req) => {
  if (process.env.NODE_ENV !== 'production') {
    return { userId: 'dev', projectId: 'dev', role: 'developer' }
  }
  const s = await getSession(req)
  return s ? { userId: s.userId, projectId: s.projectId } : null
}
```

**Option B** — explicitly opt-in to no-auth (origin + rate-limit still apply):

```ts
export default defineConfig({
  destinations: [...],
  auth: { mode: 'none' },  // dev only — production refusal allows it once you opt in
})
```

### "Will the widget leak my GitHub token?"

**No.** If you accidentally pass a token like `ghp_…` to a client adapter, the constructor throws `FeedbackCredentialLeakError` at build time — before the app even runs. Tokens only live in your server env; the catch-all handler reads them when forwarding.

### "What if I forget `authorize` in production?"

`createFeedbackHandler` **refuses to construct** with a clear error pointing to the fix:

```
createFeedbackHandler: production refusal — no `authorize` callback was
provided. This would expose the feedback endpoint to anyone. Either pass
`authorize: async (req) => { ... }` or set `auth: { mode: 'none' }` to
opt-in to an open endpoint (dev only — origin + rate-limit still apply).
```

You can't accidentally ship an open endpoint.

### "Can I use this with Vite / Create React App / no Next.js?"

Yes. You need any server that can run a route (Express, Hono, Cloudflare Workers, Vercel functions, Bun, anything). Wire `createFeedbackHandler` to that server's catch-all route. Or skip the server entirely with Path 1.

### "I'm using SSR — the widget breaks on the server"

Wrap in a dynamic import:

```tsx
import dynamic from 'next/dynamic'

const FeedbackProvider = dynamic(
  () => import('react-visual-feedback').then((m) => m.FeedbackProvider),
  { ssr: false },
)
```

### "How do I customize the modal layout?"

Add `ui: { variant: '…' }` to your config:

| variant | What it looks like |
|---|---|
| `centered` | Classic centered modal (default) |
| `two-column` | Form left, evidence right — recommended for most apps |
| `drawer` | Slide-out from right edge |
| `compact` | 320px chat-style card, bottom-right |
| `stepper` | 3-step wizard (Describe → Tag → Send) |
| `workspace` | Rail + sticky evidence + impact map + annotation pins |

### "I want to use the older `githubIssue()` / `linearIssue()` imports — do they still work?"

Yes — `connect.github` is just a friendly alias for `githubIssue`. The old imports still work:

```ts
import { githubIssue, linearIssue, notionDb } from 'react-visual-feedback/destinations'
```

`connect` is the recommended shape for new code because it's discoverable (single import, IDE autocompletes all options).

---

## TL;DR

```
PATH 1  →  1 file changed, 30 seconds, no server
PATH 2  →  3 files, ~5 minutes, GitHub / Linear / Notion / HubSpot / Slack / etc.
PATH 3  →  4 files, ~10 minutes, direct-to-S3/R2/Supabase Storage
```

The library's promise: **one line per destination, you provide the token, we handle security**. Production refuses to start without auth. Tokens are refused at build time if they end up in client code.

For the full reference (every destination, env var, security note, troubleshooting), see [`INTEGRATION.md`](./INTEGRATION.md).
