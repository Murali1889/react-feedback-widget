/**
 * createNotionHandler — server-side handler for the notionDb() client adapter.
 *
 * Wrap with withSecureDefaults({ authorize }). Inserts a page into a
 * Notion database; the database must have a Title property (default
 * name "Name") and may optionally have a Severity (select) and Type
 * (select) property — missing properties are skipped silently.
 *
 * Env: NOTION_TOKEN, NOTION_DB_ID
 */

import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createNotionHandler');

function buildPageProperties(feedbackData, titleProperty) {
  const title = (feedbackData.feedback || 'Feedback').slice(0, 100);
  const props = {
    [titleProperty]: { title: [{ text: { content: title } }] },
  };
  if (feedbackData.severity) {
    props.Severity = { select: { name: String(feedbackData.severity) } };
  }
  if (feedbackData.type) {
    props.Type = { select: { name: String(feedbackData.type) } };
  }
  return props;
}

function buildChildren(feedbackData) {
  const body = feedbackData.aiTicket?.markdown || feedbackData.feedback || '';
  // Notion blocks have a 2000-char max per rich_text run; chunk safely.
  const chunks = body.match(/[\s\S]{1,1800}/g) || [''];
  return chunks.map((c) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: c } }] },
  }));
}

async function createPage({ token, databaseId, feedbackData, titleProperty }) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'notion-version': '2022-06-28',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: buildPageProperties(feedbackData, titleProperty),
      children: buildChildren(feedbackData),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`notion ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export function createNotionHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const token = config.token || process.env.NOTION_TOKEN;
    const databaseId = config.databaseId || process.env.NOTION_DB_ID;
    const titleProperty = config.titleProperty || 'Name';
    if (!token || !databaseId) {
      throw new Error('createNotionHandler: missing NOTION_TOKEN or NOTION_DB_ID');
    }

    if (res && typeof res === 'object' && res.authContext) {
      const feedbackData = req;
      const page = await createPage({ token, databaseId, feedbackData, titleProperty });
      return { data: { id: page.id, url: page.url } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};

    const page = await createPage({ token, databaseId, feedbackData, titleProperty });
    const result = { id: page.id, url: page.url };

    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}
