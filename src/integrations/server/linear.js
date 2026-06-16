/**
 * createLinearHandler — server-side handler for the linearIssue() client adapter.
 *
 * Wrap with withSecureDefaults({ authorize }). Talks to the Linear GraphQL
 * API directly with `fetch` — no SDK required.
 *
 * Env: LINEAR_API_KEY (or LINEAR_OAUTH_TOKEN), LINEAR_TEAM_ID
 *
 * Maps severity -> Linear priority (1=Urgent, 2=High, 3=Medium, 4=Low).
 */

import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createLinearHandler');

const SEVERITY_TO_PRIORITY = { P0: 1, P1: 2, P2: 3, P3: 4 };

const CREATE_ISSUE_GQL = `mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { id identifier url }
  }
}`;

async function createIssue({ token, teamId, feedbackData }) {
  const title = (feedbackData.feedback || 'Feedback').slice(0, 80);
  const description = feedbackData.aiTicket?.markdown || feedbackData.feedback || '(no description)';
  const priority = SEVERITY_TO_PRIORITY[feedbackData.severity || feedbackData.priority] ?? 3;

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      authorization: token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: CREATE_ISSUE_GQL,
      variables: { input: { teamId, title, description, priority } },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`linear ${res.status}: ${text.slice(0, 300)}`);
  }
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`linear graphql: ${body.errors.map((e) => e.message).join('; ').slice(0, 300)}`);
  }
  const issue = body?.data?.issueCreate?.issue;
  if (!issue) throw new Error('linear: issueCreate returned no issue');
  return issue;
}

export function createLinearHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const token = config.token || process.env.LINEAR_API_KEY || process.env.LINEAR_OAUTH_TOKEN;
    const teamId = config.teamId || process.env.LINEAR_TEAM_ID;
    if (!token || !teamId) {
      throw new Error('createLinearHandler: missing LINEAR_API_KEY or LINEAR_TEAM_ID');
    }

    if (res && typeof res === 'object' && res.authContext) {
      const feedbackData = req;
      const issue = await createIssue({ token, teamId, feedbackData });
      return { data: { id: issue.identifier, url: issue.url } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};

    const issue = await createIssue({ token, teamId, feedbackData });
    const result = { id: issue.identifier, url: issue.url };

    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}
