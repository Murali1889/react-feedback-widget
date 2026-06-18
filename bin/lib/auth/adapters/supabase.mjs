/**
 * Supabase adapter — Personal Access Token via /account/tokens.
 *
 * After paste we list the user's projects through the Management API and
 * auto-fetch the service_role key for the picked project, so the user
 * only sees one prompt instead of three. User time target: ~90s.
 */
import { http } from '../helpers.mjs';

export default {
  id: 'supabase',
  headline: 'Connect Supabase so feedback can flow into your project.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open supabase.com → Account → Access Tokens',
    'Click "Generate new token", name it "react-visual-feedback"',
    'Copy the token (starts with sbp_) and paste it here',
    'Pick the project — we\'ll auto-fetch its keys',
  ],

  async prerequisites() { return {}; },

  buildUrl() { return 'https://supabase.com/dashboard/account/tokens'; },

  pastePrompt: {
    message: 'Paste your Supabase PAT (sbp_...):',
    validate: (v) => v.startsWith('sbp_')
      ? undefined
      : 'Expected a token starting with sbp_',
  },

  async verify({ token }) {
    const r = await http('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (r.status === 401) {
      return { ok: false, message: 'Supabase rejected the token. Re-generate at supabase.com/dashboard/account/tokens.' };
    }
    if (!r.ok) {
      return { ok: false, message: `Supabase ${r.status}: ${r.body?.message || r.error || 'unknown error'}` };
    }
    if (!Array.isArray(r.body) || r.body.length === 0) {
      return { ok: false, message: 'Token works, but you have no Supabase projects. Create one first.' };
    }
    return { ok: true, projects: r.body };
  },

  async pickProject({ clack, verifyResult }) {
    const { select, isCancel } = clack;
    const projects = verifyResult.projects;
    if (projects.length === 1) return projects[0];
    const picked = await select({
      message: 'Which Supabase project?',
      options: projects.map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.region,
      })),
    });
    if (isCancel(picked)) return null;
    return projects.find((p) => p.id === picked);
  },

  async fetchProjectKeys({ token, project }) {
    const r = await http(`https://api.supabase.com/v1/projects/${project.id}/api-keys`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!r.ok || !Array.isArray(r.body)) {
      return { ok: false, message: `Couldn't fetch keys for ${project.name}: ${r.status}` };
    }
    const serviceRole = r.body.find((k) => k.name === 'service_role' || k.api_key?.includes('service_role'));
    if (!serviceRole) {
      return { ok: false, message: 'No service_role key returned by Supabase Management API.' };
    }
    return {
      ok: true,
      url: `https://${project.id}.supabase.co`,
      serviceRoleKey: serviceRole.api_key,
    };
  },

  envEntries({ projectKeys }) {
    return {
      SUPABASE_URL: projectKeys.url,
      SUPABASE_SERVICE_ROLE_KEY: projectKeys.serviceRoleKey,
    };
  },

  successHint: 'Restart your dev server, press Alt+A, and submit feedback to land in supabase.',
};
