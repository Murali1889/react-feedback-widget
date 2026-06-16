/**
 * createGithubActionHandler — server-side handler for the githubAction()
 * client adapter.
 *
 * Fires a repository_dispatch event so any workflow listening for
 * `on: repository_dispatch: types: [<eventType>]` runs with the
 * feedback payload available as `github.event.client_payload`.
 *
 * Wrap with withSecureDefaults({ authorize }).
 *
 * Env:
 *   GH_TOKEN          PAT or installation token with `Repository contents: Write`
 *                     OR `Actions: Write` on the target repo
 *   GH_REPO           "owner/repo"
 *   GH_ACTION_EVENT   event_type — default 'feedback'; pick anything,
 *                     just match it in your workflow's on.types
 */

import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createGithubActionHandler');

async function dispatch({ token, repo, eventType, payload }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'react-visual-feedback',
    },
    body: JSON.stringify({
      event_type: eventType,
      // GitHub caps client_payload at 10 top-level keys; bundle ours
      // under one key so we never run into it.
      client_payload: { feedback: payload },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`github ${res.status}: ${text.slice(0, 300)}`);
  }
  // 204 No Content on success — there's no workflow-run id until later.
  return { dispatched: true };
}

export function createGithubActionHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const token = config.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const repo = config.repo || process.env.GITHUB_REPO || process.env.GH_REPO;
    const eventType = config.eventType || process.env.GH_ACTION_EVENT || 'feedback';
    if (!token || !repo) {
      throw new Error('createGithubActionHandler: missing GH_TOKEN or GH_REPO');
    }

    if (res && typeof res === 'object' && res.authContext) {
      const feedbackData = req;
      const result = await dispatch({ token, repo, eventType, payload: feedbackData });
      return { data: { id: null, url: `https://github.com/${repo}/actions`, ...result } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};

    const result = await dispatch({ token, repo, eventType, payload: feedbackData });
    const out = { id: null, url: `https://github.com/${repo}/actions`, ...result };

    if (res?.json) { res.status(200).json(out); return; }
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}
