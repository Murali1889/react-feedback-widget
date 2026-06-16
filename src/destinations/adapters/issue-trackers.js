import { timed } from '../contract.js';

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
    send: (feedback) => timed(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(feedback),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${endpoint} returned ${res.status}: ${text.slice(0, 200)}`);
      }
      const body = await res.json().catch(() => null);
      return { id: body?.id || null, url: body?.url || null };
    }),
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
 *       `https://api.github.com/repos/${process.env.GH_REPO!}/issues`,
 *       {
 *         method: 'POST',
 *         headers: {
 *           accept: 'application/vnd.github+json',
 *           authorization: `Bearer ${process.env.GH_TOKEN!}`,
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
    send: (feedback) => timed(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(feedback),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${endpoint} returned ${res.status}: ${text.slice(0, 200)}`);
      }
      const body = await res.json().catch(() => null);
      return { id: body?.id || null, url: body?.url || null };
    }),
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
    send: (feedback) => timed(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(feedback),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${endpoint} returned ${res.status}: ${text.slice(0, 200)}`);
      }
      const body = await res.json().catch(() => null);
      return { id: body?.id || null, url: body?.url || null };
    }),
  };
}
