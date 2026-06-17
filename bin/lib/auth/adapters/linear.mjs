/**
 * Linear adapter — personal API key via /settings/api.
 *
 * Auth quirk: Linear's GraphQL endpoint expects the raw key in the
 * Authorization header — NOT `Bearer <key>`. This trips up everyone.
 * User time target: ~75s.
 */
import { http } from '../helpers.mjs';

const VIEWER_QUERY = `query { viewer { id name } teams { nodes { id name key } } }`;

export default {
  id: 'linear',
  headline: 'Connect Linear so react-visual-feedback can file issues for you.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open Linear → Settings → API → Personal API keys',
    'Click "Create key", name it "react-visual-feedback"',
    'Copy the key (starts with lin_api_) and paste it here',
    'Pick a team from the list',
  ],

  async prerequisites() { return {}; },

  buildUrl() { return 'https://linear.app/settings/api'; },

  pastePrompt: {
    message: 'Paste your Linear API key (lin_api_...):',
    validate: (v) => v.startsWith('lin_api_')
      ? undefined
      : 'Expected a key starting with lin_api_',
  },

  async verify({ token }) {
    const r = await http('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: VIEWER_QUERY }),
    });
    if (r.status === 401 || r.status === 400) {
      return { ok: false, message: 'Linear rejected the key. Make sure you copied the full lin_api_ key.' };
    }
    if (!r.ok) {
      return { ok: false, message: `Linear ${r.status}: ${r.error || 'unknown error'}` };
    }
    if (r.body?.errors?.length) {
      return { ok: false, message: `Linear GraphQL: ${r.body.errors[0].message}` };
    }
    const teams = r.body?.data?.teams?.nodes || [];
    if (!teams.length) {
      return { ok: false, message: 'Key works, but you don\'t belong to any teams. Create one in Linear first.' };
    }
    return { ok: true, teams };
  },

  async pickTeam({ clack, verifyResult }) {
    const { select, isCancel } = clack;
    if (verifyResult.teams.length === 1) return verifyResult.teams[0];
    const picked = await select({
      message: 'Which team should feedback go to?',
      options: verifyResult.teams.map((t) => ({
        value: t.id,
        label: t.name,
        hint: t.key,
      })),
    });
    if (isCancel(picked)) return null;
    return verifyResult.teams.find((t) => t.id === picked);
  },

  envEntries({ token, team }) {
    return {
      LINEAR_API_KEY: token,
      LINEAR_TEAM_ID: team?.id || '',
    };
  },

  successHint: 'Try: rvf send-test linear',
};
