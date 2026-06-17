/**
 * Slack adapter — incoming webhook via app manifest prefill.
 *
 * We open Slack's "Create app from manifest" page with the manifest
 * already URL-encoded into the query string, so the user clicks Create
 * → Install → pick channel → copy webhook URL. Five clicks saved vs.
 * the bare /apps/new flow. User time target: ~90s.
 */
import { http } from '../helpers.mjs';

const WEBHOOK_RE = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/;

const MANIFEST = {
  display_information: {
    name: 'react-visual-feedback',
    description: 'Posts user feedback into a Slack channel',
  },
  features: {
    bot_user: { display_name: 'react-visual-feedback', always_online: true },
  },
  oauth_config: {
    scopes: {
      bot: ['incoming-webhook', 'chat:write'],
    },
  },
  settings: {
    org_deploy_enabled: false,
    socket_mode_enabled: false,
    token_rotation_enabled: false,
  },
};

export default {
  id: 'slack',
  headline: 'Connect Slack so feedback posts to a channel.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open the prefilled Slack app-create page in your browser',
    'Click "Create" → "Install to Workspace" → pick a channel',
    'Copy the webhook URL Slack shows you',
    'Paste it here',
  ],

  async prerequisites() { return {}; },

  buildUrl() {
    const json = JSON.stringify(MANIFEST);
    return `https://api.slack.com/apps?new_app=1&manifest_json=${encodeURIComponent(json)}`;
  },

  pastePrompt: {
    message: 'Paste your Slack incoming webhook URL:',
    validate: (v) => WEBHOOK_RE.test(v.trim())
      ? undefined
      : 'Expected https://hooks.slack.com/services/<T>/<B>/<secret>',
  },

  async verify({ token }) {
    const r = await http(token.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: ':white_check_mark: react-visual-feedback connected to this channel.',
      }),
    });
    if (r.ok && r.body === 'ok') return { ok: true };
    if (r.status === 404) {
      return { ok: false, message: 'Slack returned 404 — that webhook URL has been revoked.' };
    }
    if (r.status === 403) {
      return { ok: false, message: 'Slack rejected the webhook (403). The app may have been uninstalled.' };
    }
    if (typeof r.body === 'string' && r.body !== 'ok') {
      return { ok: false, message: `Slack: ${r.body}` };
    }
    return { ok: false, message: `Slack ${r.status}: ${r.error || 'unknown error'}` };
  },

  envEntries({ token }) {
    return {
      SLACK_WEBHOOK_URL: token.trim(),
    };
  },

  successHint: 'Try: rvf send-test slack',
};
