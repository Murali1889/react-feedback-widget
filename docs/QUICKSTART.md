# Quickstart — react-visual-feedback

> The goal: **even someone new to coding can integrate this in 5 minutes**.

**See also:**
- [`docs/QUICKSTART.html`](./QUICKSTART.html) — same guide, dark-theme webpage
- [`docs/INTEGRATION.md`](./INTEGRATION.md) — full reference
- [`docs/architecture.html`](./architecture.html) — visual flow chart

---

## The actually-easy path — one command

```bash
npx rvf init
```

The CLI:
1. **Detects your framework** (Next.js App Router / Pages Router / Express / Vite)
2. **Asks which destinations you want** (GitHub, Linear, Notion, HubSpot, Slack, Jira, Sheets, Supabase)
3. **Writes the right files for your stack** — `feedback.config.ts` + the correct route file
4. **Appends env var stubs** to your `.env.local` with **token-acquisition URLs inline** (clickable in modern terminals) so you don't have to Google "how to get a GitHub PAT"

Then add **one line** to your root layout:

```tsx
import feedbackConfig from './feedback.config'
import { FeedbackProvider } from 'react-visual-feedback'

<FeedbackProvider {...feedbackConfig}>{children}</FeedbackProvider>
```

Fill in the env vars (the CLI told you where to get each one), restart your dev server, press `Alt + A`. **Done.**

---

## Path 1 — Just try it, no server (30 seconds)

For prototypes, demos, internal tools.

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
- `Alt + A` → modal opens
- Submit → saved to `localStorage`
- `Alt + Q` → see all collected feedback

No env vars. No server route. No config file.

---

## Path 2 — Production setup

You have **two options**: the CLI (recommended), or manual file creation.

### Option A — CLI (recommended, ~2 minutes)

```bash
npx rvf init
```

Follow the prompts. Then add the Provider to your layout (the CLI shows you the exact snippet). Set the env vars listed at the end of the run. Done.

### Option B — Manual (for the curious)

#### 1. Install

```bash
npm install react-visual-feedback
```

#### 2. Create `feedback.config.ts` at your project root

```ts
import { defineConfig, connect } from 'react-visual-feedback'

export default defineConfig({
  destinations: [
    connect.local(),                                    // always — works offline
    connect.github({ repo: 'acme/web' }),              // env: GITHUB_TOKEN
    // connect.linear({ team: '...' }),                // env: LINEAR_API_KEY, LINEAR_TEAM_ID
    // connect.notion({ database: '...' }),            // env: NOTION_TOKEN
    // connect.hubspot(),                              // env: HUBSPOT_TOKEN
    // connect.slack({ channel: '#bugs' }),            // env: SLACK_WEBHOOK_URL
    // connect.jira({ project: 'BUG' }),               // env: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
    // connect.supabase(),                             // env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  ],
  ui: { variant: 'two-column' },
})
```

> Type `connect.` in any modern editor to see the full destination menu.

#### 3. Add to your React tree

```tsx
import feedbackConfig from '@/feedback.config'
import { FeedbackProvider } from 'react-visual-feedback'

<FeedbackProvider {...feedbackConfig}>{children}</FeedbackProvider>
```

#### 4. One catch-all server route

Pick the row that matches your framework:

| Framework | File to create |
|---|---|
| Next.js App Router | `app/api/feedback/[...rest]/route.ts` |
| Next.js Pages Router | `pages/api/feedback/[...rest].ts` (see [`example-pages-router/`](../example-pages-router/)) |
| Express | a route in your existing app (see [`example-express/`](../example-express/)) |
| Vite / CRA | you need a server — pick one of the above |

**The route file (Next.js App Router):**

```ts
import { createFeedbackHandler, devSessionAuth } from 'react-visual-feedback/server'
import feedbackConfig from '@/feedback.config'

export const POST = createFeedbackHandler({
  ...feedbackConfig,
  authorize: devSessionAuth(),
})
```

**That's it.** No NextAuth, no Clerk, no learning a new library.

> 🪄 `devSessionAuth()` is the friendly default: it passes through in dev with a stub session so you can test immediately, and **refuses to start in production** until you swap it for real auth (with a clear error pointing at the options).

#### 5. Set env vars

```bash
# .env.local
GITHUB_TOKEN=ghp_…         # get one at https://github.com/settings/personal-access-tokens/new
                            # — fine-grained, "Issues: Read & write" on your repo
```

Restart your dev server, press `Alt + A`, submit feedback → a GitHub Issue appears.

---

## When you go to production

`devSessionAuth()` refuses to start in `NODE_ENV=production` so you can't accidentally ship it. The error tells you the three options:

### Option 1 — Real auth library (recommended)

If you already use NextAuth / Clerk / Lucia / Auth.js, swap `devSessionAuth()` for your existing session check:

```ts
authorize: async (req) => {
  const session = await getServerSession(req)   // your existing auth
  return session ? { userId: session.user.id, projectId: session.user.projectId } : null
}
```

### Option 2 — Built-in signed cookies (no extra auth library)

If you don't have an auth library and don't want to learn one, `devSessionAuth` has a production-safe mode:

```ts
authorize: devSessionAuth({ secret: process.env.FEEDBACK_SECRET })
```

Issue the cookie at your `/login` route with the bundled helper:

```ts
import { setSessionCookieAppRouter } from 'react-visual-feedback/server'

export async function POST(req) {
  // verify the user (your password/OAuth/magic-link flow)
  if (await myVerify(req)) {
    return setSessionCookieAppRouter({
      session: { userId: 'alice', projectId: 'acme', role: 'developer' },
      secret: process.env.FEEDBACK_SECRET!,
      redirect: '/dashboard',
    })
  }
}
```

That's HMAC-signed, 7-day expiry, HttpOnly cookies. No external dependency.

### Option 3 — Explicit opt-in to no-auth (rare)

For internal-only tools or staging environments:

```ts
export default defineConfig({
  destinations: [...],
  auth: { mode: 'none' },   // origin + rate-limit still apply
})
```

`createFeedbackHandler` allows this when explicitly set; it just refuses the *accidental* no-auth.

---

## Path 3 — Direct-to-storage uploads (~10 minutes)

For production with real volume — screenshots and videos go straight to S3 / R2 / Supabase Storage from the browser. Your app server never sees the binary bytes.

Add to `feedback.config.ts`:

```ts
captureConfig: {
  upload: { strategy: 'signed-url', endpoint: '/api/feedback/upload-url' },
},
```

Add a second server route:

```ts
// app/api/feedback/upload-url/route.ts
import { withSecureDefaults, createUploadUrlHandler, devSessionAuth } from 'react-visual-feedback/server'

export const POST = withSecureDefaults({
  authorize: devSessionAuth(),
})(createUploadUrlHandler({
  provider: 'r2',
  bucket: process.env.R2_BUCKET!,
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY!,
  secretAccessKey: process.env.R2_SECRET_KEY!,
}))
```

---

## The full `connect` menu

```ts
import { connect } from 'react-visual-feedback'

connect.local()                              // browser only — always safe
connect.github({ repo })                     // env: GITHUB_TOKEN
connect.githubAction()                       // env: GITHUB_TOKEN — fire any workflow
connect.linear({ team })                     // env: LINEAR_API_KEY, LINEAR_TEAM_ID
connect.notion({ database })                 // env: NOTION_TOKEN
connect.hubspot()                            // env: HUBSPOT_TOKEN
connect.slack({ channel })                   // env: SLACK_WEBHOOK_URL OR SLACK_BOT_TOKEN
connect.jira({ project })                    // env: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
connect.sheets({ spreadsheet })              // env: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_KEY
connect.supabase()                           // env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
connect.supabasePublic({ url, anonKey })     // browser direct — requires INSERT-only RLS
connect.webhook({ url })                     // server-proxied (default safe)
connect.webhookDirect({ url })               // browser → URL directly
connect.cloud({ projectId, ingestToken })    // our hosted SKU (backend coming)
```

---

## Reference apps

| Stack | Path |
|---|---|
| Next.js App Router | [`example-nextjs/`](../example-nextjs/) |
| Next.js Pages Router | [`example-pages-router/`](../example-pages-router/) |
| Express / generic Node | [`example-express/`](../example-express/) |

Each one is a working, runnable reference using the connect API + devSessionAuth.

---

## CLI reference

```bash
npx rvf init               # interactive setup
npx rvf add <name>         # append a destination to feedback.config.ts
npx rvf list               # show every available destination
npx rvf --help
```

Examples:

```bash
npx rvf add hubspot        # adds connect.hubspot() to your config + appends HUBSPOT_TOKEN stub
npx rvf add slack          # adds connect.slack(...) + appends SLACK_WEBHOOK_URL stub
```

---

## Common questions

### "What if I forget `authorize` in production?"

`createFeedbackHandler` **refuses to construct** with this error:

```
createFeedbackHandler: production refusal — no `authorize` callback was provided.
This would expose the feedback endpoint to anyone. Either pass
`authorize: async (req) => { ... }` or set `auth: { mode: 'none' }` to opt-in
to an open endpoint (dev only — origin + rate-limit still apply).
```

### "Will the widget leak my GitHub token?"

**No.** If you accidentally pass a token like `ghp_…` to a client adapter, the constructor throws `FeedbackCredentialLeakError` at build time. Tokens only live in your server env.

### "I'm using SSR and the widget breaks on the server"

Wrap in a dynamic import:

```tsx
const FeedbackProvider = dynamic(
  () => import('react-visual-feedback').then((m) => m.FeedbackProvider),
  { ssr: false },
)
```

The Pages Router example shows this pattern.

### "How do I customize the modal layout?"

```ts
ui: { variant: 'two-column' }  // or 'centered' | 'drawer' | 'compact' | 'stepper' | 'workspace'
```

---

## TL;DR

```bash
# easiest path — beginner-friendly
npx rvf init
# follow the prompts, fill in the env vars it shows you

# or manually:
npm install react-visual-feedback
# 1. write feedback.config.ts (use `connect.X()`)
# 2. spread {...feedbackConfig} into <FeedbackProvider>
# 3. write one catch-all route with createFeedbackHandler + devSessionAuth
# 4. set env vars, press Alt+A
```

**The four things that make this beginner-friendly:**
1. **`npx rvf init`** writes the right files for your stack with the right token-acquisition links inline
2. **`connect.X()`** is one discoverable namespace — no remembering import paths
3. **`devSessionAuth()`** means you don't need an auth library to get started
4. **`createFeedbackHandler` refuses to ship insecurely** — you literally cannot leak the endpoint to production

For the full reference (every destination, env var, security note), see [`INTEGRATION.md`](./INTEGRATION.md).
