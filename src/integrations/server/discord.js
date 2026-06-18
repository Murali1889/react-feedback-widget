/**
 * createDiscordHandler — server-side handler for the discord() client adapter.
 *
 * Posts each feedback as a Discord webhook message with an embed.
 *
 * Required env (one of):
 *   DISCORD_WEBHOOK_URL   incoming webhook URL from channel → integrations → webhooks
 *
 * Severity maps to embed color: P0=red, P1=orange, P2=yellow, P3=grey.
 */

import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createDiscordHandler');

const SEVERITY_COLOR = {
  P0: 0xdc2626, P1: 0xea580c, P2: 0xf59e0b, P3: 0x6b7280,
  critical: 0xdc2626, high: 0xea580c, medium: 0xf59e0b, low: 0x6b7280,
};

async function postMessage({ webhookUrl, feedbackData }) {
  const title = (feedbackData.feedback || 'Feedback').slice(0, 256);
  const description = (feedbackData.aiTicket?.markdown || feedbackData.feedback || '').slice(0, 3800);
  const sev = feedbackData.severity || feedbackData.priority || 'P2';
  const color = SEVERITY_COLOR[sev] || 0x6b7280;

  const fields = [];
  if (feedbackData.url)        fields.push({ name: 'Page', value: feedbackData.url.slice(0, 1024), inline: false });
  if (feedbackData.userName)   fields.push({ name: 'Reporter', value: feedbackData.userName.slice(0, 256), inline: true });
  if (feedbackData.userEmail)  fields.push({ name: 'Email',    value: feedbackData.userEmail.slice(0, 256), inline: true });
  if (sev)                     fields.push({ name: 'Severity', value: String(sev),                inline: true });

  const body = {
    embeds: [{
      title,
      description,
      color,
      fields,
      timestamp: new Date().toISOString(),
    }],
  };

  const res = await fetch(`${webhookUrl}?wait=true`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`discord ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

export function createDiscordHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const webhookUrl = config.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('createDiscordHandler: missing DISCORD_WEBHOOK_URL');
    }

    if (res && typeof res === 'object' && res.authContext) {
      const msg = await postMessage({ webhookUrl, feedbackData: req });
      return { data: { id: msg?.id || null, url: null } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};
    const msg = await postMessage({ webhookUrl, feedbackData });
    const result = { id: msg?.id || null, url: null };

    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
}
