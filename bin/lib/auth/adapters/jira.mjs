/**
 * Jira adapter — Atlassian personal API token via id.atlassian.com.
 *
 * Auth is HTTP Basic with base64(email:token). Email is sniffed from
 * `git config user.email`, site URL is asked once and stored.
 * User time target: ~90s.
 */
import { http } from '../helpers.mjs';

export default {
  id: 'jira',
  headline: 'Connect Jira so react-visual-feedback can file tickets for you.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open id.atlassian.com → Security → Create API token',
    'Name it "react-visual-feedback", click Create',
    'Copy the token and paste it here',
    'Then enter your site URL and the project key',
  ],

  async prerequisites({ clack, sniffed, flags }) {
    const { text, isCancel } = clack;
    const domain = flags.domain || await text({
      message: 'Jira site URL:',
      placeholder: 'acme.atlassian.net',
      validate: (v) => /^[a-z0-9-]+\.atlassian\.net$/i.test(v.trim().replace(/^https?:\/\//, ''))
        ? undefined
        : 'Expected a *.atlassian.net hostname (no https://)',
    });
    if (isCancel(domain)) return null;

    const email = flags.email || await text({
      message: 'Atlassian account email:',
      placeholder: sniffed.email || 'you@example.com',
      initialValue: sniffed.email,
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
        ? undefined
        : 'Expected an email address',
    });
    if (isCancel(email)) return null;

    const project = flags.project || await text({
      message: 'Project key (short uppercase, e.g. BUG):',
      placeholder: 'BUG',
      validate: (v) => /^[A-Z][A-Z0-9_]{1,9}$/.test(v.trim())
        ? undefined
        : 'Expected an uppercase project key like BUG or FEED',
    });
    if (isCancel(project)) return null;

    return {
      domain: domain.trim().replace(/^https?:\/\//, ''),
      email: email.trim(),
      project: project.trim(),
    };
  },

  buildUrl() {
    return 'https://id.atlassian.com/manage-profile/security/api-tokens';
  },

  pastePrompt: {
    message: 'Paste your Jira API token:',
    validate: (v) => v.length >= 16
      ? undefined
      : 'That doesn\'t look like a valid Atlassian API token',
  },

  async verify({ token, prereqs }) {
    const basic = Buffer.from(`${prereqs.email}:${token}`).toString('base64');
    const headers = { Authorization: `Basic ${basic}`, Accept: 'application/json' };

    const me = await http(`https://${prereqs.domain}/rest/api/3/myself`, { headers });
    if (me.status === 401) return { ok: false, message: 'Email or token rejected (401). Double-check both.' };
    if (!me.ok) return { ok: false, message: `Jira ${me.status}: ${me.body?.message || me.error || 'unknown error'}` };

    const proj = await http(`https://${prereqs.domain}/rest/api/3/project/${prereqs.project}`, { headers });
    if (proj.status === 404) {
      return { ok: false, message: `Project "${prereqs.project}" not found on ${prereqs.domain}.` };
    }
    if (!proj.ok) {
      return { ok: false, message: `Couldn't read project ${prereqs.project}: ${proj.body?.errorMessages?.[0] || proj.status}` };
    }
    return { ok: true };
  },

  envEntries({ token, prereqs }) {
    return {
      JIRA_DOMAIN: prereqs.domain,
      JIRA_EMAIL: prereqs.email,
      JIRA_API_TOKEN: token,
      JIRA_PROJECT_KEY: prereqs.project,
    };
  },

  successHint: 'Restart your dev server, press Alt+A, and submit feedback to land in jira.',
};
