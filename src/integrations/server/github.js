/**
 * createGithubHandler — server-side handler for the githubIssue() client adapter.
 *
 * Wrap with withSecureDefaults({ authorize }) — never call this directly
 * in production without that wrapper. The wrapper enforces origin /
 * CSRF / rate-limit / authorize / redaction; this handler just maps the
 * feedback payload onto a GitHub Issues POST.
 *
 * Env: GITHUB_TOKEN (PAT, fine-grained PAT, or App installation token),
 *      GITHUB_REPO ("owner/repo")
 *
 * Typical wiring (Next.js App Router):
 *
 *   import { withSecureDefaults, createGithubHandler, FeedbackAuthError }
 *     from 'react-visual-feedback/server';
 *   import { getSession } from '@/lib/auth';
 *
 *   export const POST = withSecureDefaults({
 *     authorize: async (req) => {
 *       const s = await getSession(req);
 *       if (!s) throw new FeedbackAuthError();
 *       return { userId: s.userId, projectId: s.projectId };
 *     },
 *   })(createGithubHandler({}));
 */

import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createGithubHandler');

function bodyFor(feedbackData) {
  const title = (feedbackData.feedback || 'Feedback').slice(0, 120);
  const severity = feedbackData.severity || feedbackData.priority || null;
  const aiMarkdown = feedbackData.aiTicket?.markdown;
  const fallbackBody = [
    feedbackData.feedback || '',
    feedbackData.url ? `\n\n— Reported on ${feedbackData.url}` : '',
    feedbackData.userName ? ` by ${feedbackData.userName}` : '',
  ].join('').trim();
  const body = aiMarkdown || fallbackBody || '(no description)';
  const labels = Array.isArray(feedbackData.labels) ? feedbackData.labels.slice(0, 10) : [];
  if (severity) labels.push(`severity:${severity}`);
  if (feedbackData.type) labels.push(`type:${feedbackData.type}`);
  return { title, body, labels };
}

async function createIssue({ token, repo, payload }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'react-visual-feedback',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`github ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export function createGithubHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const token = config.token || process.env.GITHUB_TOKEN;
    const repo = config.repo || process.env.GITHUB_REPO;
    if (!token || !repo) {
      throw new Error('createGithubHandler: missing GITHUB_TOKEN or GITHUB_REPO (run `npx rvf auth github`)');
    }

    // Wrapped path: withSecureDefaults invoked us with parsed feedback + ctx.
    if (res && typeof res === 'object' && res.authContext) {
      const feedbackData = req;
      const payload = bodyFor(feedbackData);
      const issue = await createIssue({ token, repo, payload });
      return { data: { id: String(issue.number), url: issue.html_url } };
    }

    // Raw path: tolerant body parse for hosts not using the wrapper.
    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};

    const payload = bodyFor(feedbackData);
    const issue = await createIssue({ token, repo, payload });
    const result = { id: String(issue.number), url: issue.html_url };

    if (res?.json) {
      res.status(200).json(result);
      return;
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}
