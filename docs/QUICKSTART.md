# Quickstart — react-visual-feedback

> Pick the path that matches what you have. Each one is complete on its own.

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

For real apps where you want feedback to land in GitHub Issues, Linear, Notion, Jira, Supabase, etc.

### Files you'll create

```
your-project/
├── feedback.config.ts                          ← 10 lines, single source of truth
├── app/layout.tsx                              ← 1 line added (Provider)
├── app/api/feedback/[...rest]/route.ts         ← 10 lines, catch-all router
└── .env.local                                  ← 2 env vars per destination
```

### Step 1 — Install

```bash
npm install react-visual-feedback
```

### Step 2 — Create `feedback.config.ts` at your project root

```ts
// feedback.config.ts
import { defineConfig } from 'react-visual-feedback/config'
import { local, githubIssue } from 'react-visual-feedback/destinations'

export default defineConfig({
  destinations: [
    local(),          // always keep — works offline
    githubIssue(),    // server env: GH_TOKEN, GH_REPO
  ],
  auth: { mode: 'session' },
  ui:   { variant: 'two-column' },
})
```

### Step 3 — Use it in your React tree

```tsx
// app/layout.tsx (Next.js)
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

### Step 4 — Add ONE catch-all server route

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

That's it. This **one** route auto-dispatches to GitHub, Linear, Notion, Jira, Supabase, webhook — anything you add to `destinations[]`.

### Step 5 — Set env vars

```bash
# .env.local
GH_TOKEN=ghp_…             # https://github.com/settings/tokens — fine-grained PAT
                            # "Issues: Read & write" on the target repo
GH_REPO=acme/web           # "owner/repo"
```

### Step 6 — Restart dev server, press `Alt + A`

Submit a test feedback → a GitHub Issue appears.

---

### Adding more destinations

Edit `feedback.config.ts`. No new route file needed.

```ts
import { local, githubIssue, linearIssue, notionDb, supabaseProxied } from 'react-visual-feedback/destinations'

export default defineConfig({
  destinations: [
    local(),
    githubIssue(),       // GH_TOKEN, GH_REPO
    linearIssue(),       // LINEAR_API_KEY, LINEAR_TEAM_ID
    notionDb(),          // NOTION_TOKEN, NOTION_DB_ID
    supabaseProxied(),   // SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  ],
  // ...
})
```

Append the env vars to `.env.local`. Done.

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
  // Pick ONE provider:
  provider: 'r2',                                                    // or 's3' or 'supabase'
  bucket: process.env.R2_BUCKET!,
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY!,
  secretAccessKey: process.env.R2_SECRET_KEY!,
  publicBaseUrl: process.env.R2_PUBLIC_URL,  // optional — CDN-fronted reads
}))
```

That's it. Browser now uploads the screenshot to R2 directly via a short-lived signed URL. The payload that goes to your destinations carries only a URL reference.

---

## Framework support

| Framework | Route file path |
|---|---|
| Next.js App Router | `app/api/feedback/[...rest]/route.ts` |
| Next.js Pages Router | `pages/api/feedback/[...rest].ts` (default-export the router) |
| Remix | `app/routes/api.feedback.$.tsx` (export `action`) |
| Express | `app.post('/api/feedback/*', router)` |
| Cloudflare Workers / Hono / Bun | Route any catch-all to the router function |

`createFeedbackRouter` returns a function `(req, res?) => Response`. Wire it however your framework expects.

---

## Where do I get the tokens?

| Destination | Where to get the token |
|---|---|
| GitHub | https://github.com/settings/tokens → "Fine-grained tokens" → scope to one repo → "Issues: Read & write" |
| Linear | Linear → Settings → API → Personal API keys |
| Notion | https://www.notion.so/my-integrations → new internal integration → **don't forget to share your database with it** |
| Jira | https://id.atlassian.com/manage-profile/security/api-tokens |
| Supabase service-role | Supabase Dashboard → Settings → API → service_role secret |
| Cloudflare R2 | Dashboard → R2 → "Manage R2 API Tokens" → bucket-scoped token |
| AWS S3 | IAM → Users → access key → restrict to `s3:PutObject` on your bucket |

---

## Common questions

### "My dev server has no auth — how do I just try this?"

In your `authorize` callback, return a stub for development:

```ts
authorize: async (req) => {
  if (process.env.NODE_ENV !== 'production') {
    return { userId: 'dev', projectId: 'dev', role: 'developer' }
  }
  const s = await getSession(req)
  if (!s) throw new FeedbackAuthError()
  return { userId: s.userId, projectId: s.projectId }
}
```

### "Will the widget leak my GitHub token?"

**No.** If you accidentally pass a token like `ghp_…` to a client adapter, the constructor throws `FeedbackCredentialLeakError` at build time — before the app even runs. Tokens only live in your server env; the catch-all router reads them when forwarding.

### "Can I use this with Vite / Create React App / no Next.js?"

Yes. You need any server that can run a route (Express, Hono, Cloudflare Workers, Vercel functions, Bun, anything). Wire `createFeedbackRouter` to that server's catch-all route. Or skip the server entirely with Path 1.

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

### "Can I customize the AI ticket Markdown that lands in GitHub?"

Wrap an adapter:

```ts
const githubIssueCustom = () => {
  const inner = githubIssue()
  return {
    ...inner,
    send: (feedback) => inner.send({
      ...feedback,
      aiTicket: {
        ...feedback.aiTicket,
        markdown: `**Triage:** auto-assigned\n\n${feedback.aiTicket.markdown}`,
      },
    }),
  }
}

// then use githubIssueCustom() in destinations[]
```

---

## TL;DR

```
PATH 1  →  1 file changed, 30 seconds, no server
PATH 2  →  3 files, ~5 minutes, GitHub / Linear / Notion etc.
PATH 3  →  4 files, ~10 minutes, direct-to-S3/R2/Supabase Storage
```

Every path is independent — start with Path 1, upgrade to Path 2 when you need a real backend, upgrade to Path 3 when volume justifies it.

For the full reference (every destination, env var, security note, troubleshooting), see [`INTEGRATION.md`](./INTEGRATION.md).
