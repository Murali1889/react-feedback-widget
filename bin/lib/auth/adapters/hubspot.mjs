/**
 * HubSpot adapter — Private App token, pipeline+stage auto-pick.
 *
 * HubSpot has no deep-link that prefills the scope picker, so the
 * checklist is explicit about ticking the `tickets` scope. After
 * verify we fetch /crm/v3/pipelines/tickets and auto-pick if there's
 * only one of each. User time target: ~150s.
 */
import { http } from '../helpers.mjs';

export default {
  id: 'hubspot',
  headline: 'Connect HubSpot so feedback files Service Hub tickets.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open the HubSpot Private Apps page in your browser',
    'Click "Create a private app" → name it "react-visual-feedback"',
    'Click the "Scopes" tab → tick:  tickets  (both Read and Write)',
    'Click "Create app" → "Continue creating"',
    'Copy the access token (starts with pat-) and paste it here',
  ],

  async prerequisites() { return {}; },

  buildUrl() { return 'https://app.hubspot.com/private-apps'; },

  pastePrompt: {
    message: 'Paste your HubSpot access token (pat-...):',
    validate: (v) => /^pat-[a-z0-9]+-/.test(v.trim())
      ? undefined
      : 'Expected a Private App token starting with pat- (e.g. pat-na1-…)',
  },

  async verify({ token }) {
    const r = await http('https://api.hubapi.com/crm/v3/objects/tickets?limit=1', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (r.status === 401) {
      return { ok: false, message: 'HubSpot rejected the token (401). Re-copy from the Private Apps page.' };
    }
    if (r.status === 403) {
      const detail = r.body?.message || '';
      return {
        ok: false,
        message: detail.includes('scope')
          ? 'Missing the `tickets` scope. Go back to the Scopes tab and tick it (Read + Write).'
          : `HubSpot 403: ${detail || 'permission denied — does the token have the tickets scope?'}`,
      };
    }
    if (!r.ok) {
      return { ok: false, message: `HubSpot ${r.status}: ${r.body?.message || r.error || 'unknown error'}` };
    }
    return { ok: true };
  },

  /**
   * Post-verify: fetch pipelines, auto-pick if singular, else prompt.
   */
  async postVerify({ clack, token }) {
    const ps = clack.spinner();
    ps.start('Fetching your ticket pipelines…');
    const r = await http('https://api.hubapi.com/crm/v3/pipelines/tickets', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    ps.stop(r.ok ? 'Got pipelines' : 'Couldn\'t fetch pipelines');

    if (!r.ok || !Array.isArray(r.body?.results)) {
      clack.log.error(`Couldn't fetch pipelines: ${r.body?.message || r.status}`);
      return null;
    }
    const pipelines = r.body.results;
    if (!pipelines.length) {
      clack.log.error('No ticket pipelines in this HubSpot portal. Create one in Settings first.');
      return null;
    }

    let pipeline;
    if (pipelines.length === 1) {
      pipeline = pipelines[0];
      clack.log.info(`Pipeline: ${pipeline.label}`);
    } else {
      const choice = await clack.select({
        message: 'Which pipeline should new tickets land in?',
        options: pipelines.map((p) => ({ value: p.id, label: p.label, hint: p.id })),
      });
      if (clack.isCancel(choice)) return null;
      pipeline = pipelines.find((p) => p.id === choice);
    }

    const stages = pipeline.stages || [];
    if (!stages.length) {
      clack.log.error(`Pipeline "${pipeline.label}" has no stages. Add one in Settings first.`);
      return null;
    }

    let stage;
    if (stages.length === 1) {
      stage = stages[0];
      clack.log.info(`Initial stage: ${stage.label}`);
    } else {
      const choice = await clack.select({
        message: 'Initial stage for new tickets:',
        options: stages.map((s) => ({ value: s.id, label: s.label, hint: s.id })),
        initialValue: stages[0].id,
      });
      if (clack.isCancel(choice)) return null;
      stage = stages.find((s) => s.id === choice);
    }

    return { pipeline, stage };
  },

  envEntries({ token, pipeline, stage }) {
    return {
      HUBSPOT_TOKEN: token,
      HUBSPOT_PIPELINE: pipeline.id,
      HUBSPOT_STAGE: stage.id,
    };
  },

  successHint: 'Restart your dev server, press Alt+A, and submit feedback to land in hubspot.',
};
