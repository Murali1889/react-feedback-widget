/**
 * createHubspotHandler — server-side handler for the hubspot() client adapter.
 *
 * Creates a HubSpot Service Hub ticket per feedback submission.
 *
 * Required env:
 *   HUBSPOT_TOKEN          Private App access token, scope: `tickets`
 *                          https://developers.hubspot.com/docs/api/private-apps
 *
 * Optional env:
 *   HUBSPOT_PIPELINE       pipeline ID; defaults to HubSpot's default Support pipeline
 *   HUBSPOT_STAGE          stage ID inside that pipeline; defaults to "new"
 *
 * Severity maps to hs_ticket_priority: P0/critical → HIGH, P1/high → HIGH,
 * P2/medium → MEDIUM, P3/low → LOW.
 */

import { warnIfInsecureFactory, buildEvidenceNote } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createHubspotHandler');

const PRIORITY = {
  P0: 'HIGH',   P1: 'HIGH',     P2: 'MEDIUM', P3: 'LOW',
  critical: 'HIGH', high: 'HIGH', medium: 'MEDIUM', low: 'LOW',
};

async function createTicket({ token, pipeline, stage, feedbackData }) {
  const subject = (feedbackData.feedback || 'Feedback').slice(0, 120);
  const content = (feedbackData.aiTicket?.markdown || feedbackData.feedback || '(no description)')
    + buildEvidenceNote(feedbackData);
  const sev = feedbackData.severity || feedbackData.priority;
  const priority = PRIORITY[sev] || 'MEDIUM';

  const body = {
    properties: {
      subject,
      content,
      hs_ticket_priority: priority,
    },
  };
  if (pipeline) body.properties.hs_pipeline = pipeline;
  if (stage) body.properties.hs_pipeline_stage = stage;

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/tickets', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`hubspot ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export function createHubspotHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const token = config.token || process.env.HUBSPOT_TOKEN;
    const pipeline = config.pipeline || process.env.HUBSPOT_PIPELINE || null;
    const stage = config.stage || process.env.HUBSPOT_STAGE || null;
    if (!token) {
      throw new Error('createHubspotHandler: missing HUBSPOT_TOKEN');
    }

    if (res && typeof res === 'object' && res.authContext) {
      const ticket = await createTicket({ token, pipeline, stage, feedbackData: req });
      const portal = ticket?.properties?.hs_object_id
        ? `https://app.hubspot.com/contacts/_/tickets/${ticket.properties.hs_object_id}`
        : null;
      return { data: { id: String(ticket.id), url: portal } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};
    const ticket = await createTicket({ token, pipeline, stage, feedbackData });
    const result = { id: String(ticket.id), url: null };

    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
}
