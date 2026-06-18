import { timed } from '../contract.js';
import { proxyPost } from '../proxyPost.js';

/**
 * linearIssue({ endpoint, teamId }) — POSTs to a host-owned route that
 * holds the Linear API key and creates an issue.
 *
 * Server handler template (Next.js app router):
 *
 *   // app/api/feedback/linear/route.ts
 *   import { LinearClient } from '@linear/sdk';
 *   const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY! });
 *   export async function POST(req: Request) {
 *     const body = await req.json();
 *     const issue = await linear.createIssue({
 *       teamId: process.env.LINEAR_TEAM_ID!,
 *       title: (body.feedback || 'Feedback').slice(0, 80),
 *       description: body.aiTicket?.markdown || body.feedback || '',
 *       priority: { P0: 1, P1: 2, P2: 3, P3: 4 }[body.severity] || 3,
 *       labelIds: [],
 *     });
 *     return Response.json({ id: issue._issue?.id, url: issue._issue?.url });
 *   }
 */
export function linearIssue({ endpoint = '/api/feedback/linear' } = {}) {
  return {
    name: 'linear',
    mode: 'server-proxied',
    describe: () => 'linear',
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}

/**
 * githubIssue({ endpoint, repo }) — POSTs to a host-owned route that
 * holds the GitHub token and opens an issue.
 *
 * Server handler template (Next.js app router):
 *
 *   // app/api/feedback/github/route.ts
 *   export async function POST(req: Request) {
 *     const body = await req.json();
 *     const res = await fetch(
 *       `https://api.github.com/repos/${process.env.GITHUB_REPO!}/issues`,
 *       {
 *         method: 'POST',
 *         headers: {
 *           accept: 'application/vnd.github+json',
 *           authorization: `Bearer ${process.env.GITHUB_TOKEN!}`,
 *         },
 *         body: JSON.stringify({
 *           title: (body.feedback || 'Feedback').slice(0, 120),
 *           body: body.aiTicket?.markdown || body.feedback || '',
 *           labels: body.labels || [],
 *         }),
 *       }
 *     );
 *     const issue = await res.json();
 *     return Response.json({ id: String(issue.number), url: issue.html_url });
 *   }
 */
export function githubIssue({ endpoint = '/api/feedback/github' } = {}) {
  return {
    name: 'github',
    mode: 'server-proxied',
    describe: () => 'github issues',
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}

/**
 * githubAction({ endpoint }) — server-proxied; triggers any GitHub
 * Actions workflow listening for repository_dispatch events.
 *
 * Why this matters: GitHub Actions is the universal automation surface.
 * Wiring feedback → Action lets a host run ANYTHING from the report:
 *   - file an Issue with the AI ticket Markdown as the body
 *   - ping Slack / PagerDuty
 *   - auto-create a draft PR with a failing test scaffold
 *   - run smoke tests / replay the captured interaction trail
 *   - mirror to internal trackers we don't ship adapters for
 *
 * Server handler template (Next.js App Router):
 *
 *   // app/api/feedback/githubAction/route.ts
 *   export async function POST(req: Request) {
 *     const body = await req.json();
 *     const res = await fetch(
 *       `https://api.github.com/repos/${process.env.GITHUB_REPO!}/dispatches`,
 *       {
 *         method: 'POST',
 *         headers: {
 *           accept: 'application/vnd.github+json',
 *           authorization: `Bearer ${process.env.GITHUB_TOKEN!}`,
 *           'x-github-api-version': '2022-11-28',
 *         },
 *         body: JSON.stringify({
 *           event_type: process.env.GH_ACTION_EVENT || 'feedback',
 *           client_payload: body,
 *         }),
 *       }
 *     );
 *     // GitHub responds 204 No Content on success — there's no
 *     // workflow-run id to return until later.
 *     return Response.json({ id: null, url: null, dispatched: res.ok });
 *   }
 *
 * Host's workflow file:
 *
 *   # .github/workflows/feedback.yml
 *   on:
 *     repository_dispatch:
 *       types: [feedback]
 *   jobs:
 *     handle:
 *       runs-on: ubuntu-latest
 *       steps:
 *         - uses: actions/checkout@v4
 *         - run: echo "${{ toJSON(github.event.client_payload) }}"
 *         # then file an Issue, ping Slack, whatever
 */
export function githubAction({ endpoint = '/api/feedback/githubAction' } = {}) {
  return {
    name: 'githubAction',
    mode: 'server-proxied',
    describe: () => 'github actions',
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}

/**
 * notionDb({ endpoint, databaseId }) — POSTs to a host-owned route that
 * holds the Notion integration token and inserts a page in a database.
 *
 * Server handler template:
 *
 *   // app/api/feedback/notion/route.ts
 *   export async function POST(req: Request) {
 *     const body = await req.json();
 *     const res = await fetch('https://api.notion.com/v1/pages', {
 *       method: 'POST',
 *       headers: {
 *         authorization: `Bearer ${process.env.NOTION_TOKEN!}`,
 *         'notion-version': '2022-06-28',
 *         'content-type': 'application/json',
 *       },
 *       body: JSON.stringify({
 *         parent: { database_id: process.env.NOTION_DB_ID! },
 *         properties: {
 *           Title: { title: [{ text: { content: (body.feedback || '').slice(0, 80) } }] },
 *           Severity: { select: { name: body.severity || 'P2' } },
 *         },
 *         children: [{
 *           object: 'block', type: 'paragraph',
 *           paragraph: { rich_text: [{ text: { content: body.aiTicket?.markdown || body.feedback || '' } }] },
 *         }],
 *       }),
 *     });
 *     const page = await res.json();
 *     return Response.json({ id: page.id, url: page.url });
 *   }
 */
export function notionDb({ endpoint = '/api/feedback/notion' } = {}) {
  return {
    name: 'notion',
    mode: 'server-proxied',
    describe: () => 'notion db',
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}

/**
 * hubspot({ endpoint }) — creates a HubSpot Service Hub ticket.
 *
 * Server env: HUBSPOT_TOKEN (Private App, scope: tickets).
 * Optional: HUBSPOT_PIPELINE, HUBSPOT_STAGE.
 */
export function hubspot({ endpoint = '/api/feedback/hubspot' } = {}) {
  return {
    name: 'hubspot',
    mode: 'server-proxied',
    describe: () => 'hubspot',
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}

/**
 * discord({ endpoint }) — posts a feedback embed to a Discord channel webhook.
 *
 * Server env: DISCORD_WEBHOOK_URL (channel → integrations → webhooks → copy URL).
 * Severity → embed color (P0 red / P1 orange / P2 yellow / P3 grey).
 */
export function discord({ endpoint = '/api/feedback/discord' } = {}) {
  return {
    name: 'discord',
    mode: 'server-proxied',
    describe: () => 'discord',
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}

/**
 * slack({ endpoint }) — posts a formatted Slack message.
 *
 * Server env (one of):
 *   SLACK_WEBHOOK_URL   — incoming webhook (simpler)
 *   SLACK_BOT_TOKEN + SLACK_CHANNEL  — chat.postMessage (richer; gives permalink)
 */
export function slack({ endpoint = '/api/feedback/slack' } = {}) {
  return {
    name: 'slack',
    mode: 'server-proxied',
    describe: () => 'slack',
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}
