/**
 * createDiscordHandler — server-side handler for the discord() client adapter.
 *
 * Posts each feedback as a Discord webhook message with an embed.
 *
 * Binary attachments — screenshot, video, voice memo, arbitrary file —
 * are uploaded alongside the embed as multipart `files[N]` parts.
 * Discord allows up to 10 files per webhook message; we send whatever
 * the user actually captured.
 *
 * Required env:
 *   DISCORD_WEBHOOK_URL   incoming webhook URL (channel → integrations
 *                         → webhooks → copy URL)
 *
 * Severity maps to embed color: P0=red, P1=orange, P2=yellow, P3=grey.
 */

import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createDiscordHandler');

const SEVERITY_COLOR = {
  P0: 0xdc2626, P1: 0xea580c, P2: 0xf59e0b, P3: 0x6b7280,
  critical: 0xdc2626, high: 0xea580c, medium: 0xf59e0b, low: 0x6b7280,
};

const MAX_FILES = 10;
const EMBED_DESCRIPTION_LIMIT = 4096;
const EMBED_TITLE_LIMIT = 256;

function isBlobLike(v) {
  return v && typeof v === 'object' && typeof v.size === 'number' &&
         typeof v.type === 'string' && typeof v.arrayBuffer === 'function';
}

function dataUrlToBlob(dataUrl) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/i.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isB64 = !!m[2];
  const payload = m[3];
  const bytes = isB64
    ? Buffer.from(payload, 'base64')
    : Buffer.from(decodeURIComponent(payload), 'utf8');
  return new Blob([bytes], { type: mime });
}

function extFromMime(mime) {
  if (!mime) return 'bin';
  if (mime.includes('webm'))   return 'webm';
  if (mime.includes('mp4'))    return 'mp4';
  if (mime.includes('mpeg'))   return 'mp3';
  if (mime.includes('ogg'))    return 'ogg';
  if (mime.includes('jpeg'))   return 'jpg';
  if (mime.includes('png'))    return 'png';
  if (mime.includes('gif'))    return 'gif';
  if (mime.includes('pdf'))    return 'pdf';
  if (mime.includes('json'))   return 'json';
  return (mime.split('/')[1] || 'bin').split(';')[0];
}

/**
 * Pull every binary off feedbackData into an ordered [name, blob] list,
 * preserving useful filenames so Discord displays them as playable /
 * viewable media.
 */
function collectAttachments(feedbackData) {
  const out = [];
  // Screenshot — may be a Blob, a data URL, or already a string URL.
  const ss = feedbackData.screenshot;
  if (isBlobLike(ss)) {
    out.push(['screenshot.' + extFromMime(ss.type), ss]);
  } else if (typeof ss === 'string' && ss.startsWith('data:')) {
    const blob = dataUrlToBlob(ss);
    if (blob) out.push(['screenshot.' + extFromMime(blob.type), blob]);
  }
  if (isBlobLike(feedbackData.videoBlob)) {
    out.push(['recording.' + extFromMime(feedbackData.videoBlob.type), feedbackData.videoBlob]);
  }
  if (isBlobLike(feedbackData.audioBlob)) {
    const name = feedbackData.audioBlob.name || ('voice-memo.' + extFromMime(feedbackData.audioBlob.type));
    out.push([name, feedbackData.audioBlob]);
  }
  if (isBlobLike(feedbackData.attachment)) {
    const name = feedbackData.attachment.name || ('attachment.' + extFromMime(feedbackData.attachment.type));
    out.push([name, feedbackData.attachment]);
  }
  return out.slice(0, MAX_FILES);
}

function buildEmbed(feedbackData) {
  const title = (feedbackData.feedback || 'Feedback').slice(0, EMBED_TITLE_LIMIT);
  const description = (feedbackData.aiTicket?.markdown || feedbackData.feedback || '').slice(0, EMBED_DESCRIPTION_LIMIT);
  const sev = feedbackData.severity || feedbackData.priority || 'P2';
  const color = SEVERITY_COLOR[sev] || 0x6b7280;

  const fields = [];
  if (feedbackData.url)        fields.push({ name: 'Page', value: feedbackData.url.slice(0, 1024), inline: false });
  if (feedbackData.userName)   fields.push({ name: 'Reporter', value: feedbackData.userName.slice(0, 256), inline: true });
  if (feedbackData.userEmail)  fields.push({ name: 'Email',    value: feedbackData.userEmail.slice(0, 256), inline: true });
  if (sev)                     fields.push({ name: 'Severity', value: String(sev),                inline: true });

  return {
    title,
    description,
    color,
    fields,
    timestamp: new Date().toISOString(),
  };
}

async function postMessage({ webhookUrl, feedbackData }) {
  const embed = buildEmbed(feedbackData);
  const attachments = collectAttachments(feedbackData);

  // Tell Discord the embed image is one of our uploaded files — that
  // way the screenshot renders inline in the embed instead of below.
  const screenshotPart = attachments.find(([n]) => n.startsWith('screenshot.'));
  if (screenshotPart) embed.image = { url: `attachment://${screenshotPart[0]}` };

  // No binaries → cheaper JSON path
  if (!attachments.length) {
    const res = await fetch(`${webhookUrl}?wait=true`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`discord ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json().catch(() => ({}));
  }

  // Multipart with files
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ embeds: [embed] }));
  attachments.forEach(([name, blob], i) => {
    form.append(`files[${i}]`, blob, name);
  });

  const res = await fetch(`${webhookUrl}?wait=true`, {
    method: 'POST',
    body: form,
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
      return { data: { id: msg?.id || null, url: null, attachments: msg?.attachments?.length || 0 } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};
    const msg = await postMessage({ webhookUrl, feedbackData });
    const result = { id: msg?.id || null, url: null, attachments: msg?.attachments?.length || 0 };

    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
}
