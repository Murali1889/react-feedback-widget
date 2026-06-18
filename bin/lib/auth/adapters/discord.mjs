/**
 * Discord adapter — channel webhook URL.
 *
 * No OAuth, no app: the user creates a channel webhook in Discord's
 * client and pastes the URL. Verification is a GET on the same URL —
 * Discord echoes the webhook metadata back. User time target: ~90s.
 */
import { http } from '../helpers.mjs';

const WEBHOOK_RE = /^https:\/\/(?:[a-z]+\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export default {
  id: 'discord',
  headline: 'Connect a Discord channel so feedback posts there.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open Discord → pick a server → channel settings (gear icon)',
    'Integrations → Webhooks → New Webhook',
    'Pick the channel, click "Copy Webhook URL"',
    'Paste it here',
  ],

  async prerequisites() { return {}; },

  buildUrl() {
    return 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks';
  },

  pastePrompt: {
    message: 'Paste your Discord webhook URL:',
    validate: (v) => WEBHOOK_RE.test(v.trim())
      ? undefined
      : 'Expected https://discord.com/api/webhooks/<id>/<token>',
  },

  async verify({ token }) {
    const r = await http(token.trim(), {
      headers: { Accept: 'application/json' },
    });
    if (r.status === 404) {
      return { ok: false, message: 'Discord doesn\'t recognize that webhook (404). Was it deleted?' };
    }
    if (r.status === 401) {
      return { ok: false, message: 'Discord rejected the webhook token (401). Re-copy from the channel settings.' };
    }
    if (!r.ok) {
      return { ok: false, message: `Discord ${r.status}: ${r.body?.message || r.error || 'unknown error'}` };
    }
    if (!r.body?.id || !r.body?.channel_id) {
      return { ok: false, message: 'URL looks right but Discord didn\'t return webhook metadata.' };
    }
    return {
      ok: true,
      webhookName: r.body.name,
      channelId: r.body.channel_id,
    };
  },

  envEntries({ token }) {
    return {
      DISCORD_WEBHOOK_URL: token.trim(),
    };
  },

  successHint: 'Restart your dev server, press Alt+A, and submit feedback to land in discord.',
};
