/**
 * createWebhookHandler — server-side handler for the webhookProxied()
 * client adapter.
 *
 * Forwards the feedback payload to any URL of your choice with optional
 * signing. Useful when:
 *   - You need to attach a credential (Slack incoming webhook,
 *     Zapier hook, Discord) and don't want it in the browser bundle
 *   - You want to sign the payload with HMAC so the receiver can
 *     verify it came from your server
 *
 * Env: WEBHOOK_URL (required), WEBHOOK_HEADERS (JSON object, optional),
 *      WEBHOOK_HMAC_SECRET (optional — adds X-Feedback-Signature header)
 */

import { warnIfInsecureFactory } from './_shared.js';
import { createHmac } from 'node:crypto';

const warnIfInsecure = warnIfInsecureFactory('createWebhookHandler');

async function signAndForward({ url, headers, hmacSecret, feedbackData }) {
  const body = JSON.stringify(feedbackData);
  const finalHeaders = { 'content-type': 'application/json', ...(headers || {}) };
  if (hmacSecret) {
    const sig = createHmac('sha256', hmacSecret).update(body).digest('hex');
    finalHeaders['x-feedback-signature'] = `sha256=${sig}`;
  }
  const res = await fetch(url, { method: 'POST', headers: finalHeaders, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`webhook ${res.status}: ${text.slice(0, 300)}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json().catch(() => ({}));
  }
  return {};
}

function parseHeadersEnv() {
  const raw = process.env.WEBHOOK_HEADERS;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function createWebhookHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const url = config.url || process.env.WEBHOOK_URL;
    const headers = config.headers || parseHeadersEnv();
    const hmacSecret = config.hmacSecret || process.env.WEBHOOK_HMAC_SECRET;
    if (!url) {
      throw new Error('createWebhookHandler: missing WEBHOOK_URL');
    }

    if (res && typeof res === 'object' && res.authContext) {
      const feedbackData = req;
      const out = await signAndForward({ url, headers, hmacSecret, feedbackData });
      return { data: { id: out?.id || null, url: out?.url || null } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};

    const out = await signAndForward({ url, headers, hmacSecret, feedbackData });
    const result = { id: out?.id || null, url: out?.url || null };

    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}
