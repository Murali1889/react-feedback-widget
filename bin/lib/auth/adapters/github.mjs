/**
 * GitHub adapter — fine-grained PAT prefill flow.
 *
 * No OAuth app, no hosting, least-privilege token (Issues: write,
 * Metadata: read on a single repo). User time target: ~110s.
 *
 * The deep-link uses query params documented in GitHub Enterprise Cloud
 * docs (June 2026): `name`, `description`, `target_name`, `expires_in`,
 * and per-permission flags (`issues=write`, `metadata=read`).
 */
import { http } from '../helpers.mjs';

export default {
  id: 'github',
  headline: 'Connect GitHub so react-visual-feedback can file issues for you.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open the prefilled fine-grained PAT page in your browser',
    'Switch "Repository access" to "Only select repositories" and pick your repo',
    'Click "Generate token"',
    'Copy the token (starts with github_pat_) and paste it here',
  ],

  async prerequisites({ clack, sniffed, flags }) {
    const { text, isCancel } = clack;
    const repo = flags.repo || await text({
      message: 'GitHub repo (owner/repo):',
      placeholder: sniffed.ownerRepo || 'acme/widgets',
      initialValue: sniffed.ownerRepo,
      validate: (v) => /^[^/\s]+\/[^/\s]+$/.test(v.trim())
        ? undefined
        : 'Expected owner/repo, e.g. acme/widgets',
    });
    if (isCancel(repo)) return null;
    return { repo: repo.trim() };
  },

  buildUrl({ repo }) {
    const [owner] = repo.split('/');
    const params = new URLSearchParams({
      name: `react-visual-feedback (${repo})`,
      description: `Lets react-visual-feedback file issues in ${repo}`,
      target_name: owner,
      expires_in: '90',
      issues: 'write',
      metadata: 'read',
    });
    return `https://github.com/settings/personal-access-tokens/new?${params.toString()}`;
  },

  pastePrompt: {
    message: 'Paste the token (github_pat_...):',
    validate: (v) => v.startsWith('github_pat_')
      ? undefined
      : 'Expected a fine-grained token starting with github_pat_',
  },

  async verify({ token, prereqs }) {
    const r = await http(`https://api.github.com/repos/${prereqs.repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'rvf-cli',
        Accept: 'application/vnd.github+json',
      },
    });
    if (r.ok) return { ok: true };
    if (r.status === 404) {
      return { ok: false, message: `Token can't see ${prereqs.repo}. Did you pick the right repo in "Only select repositories"?` };
    }
    if (r.status === 401) {
      return { ok: false, message: 'GitHub rejected the token (401). Make sure you copied the full token.' };
    }
    if (r.status === 403 && r.body?.message?.includes('pending')) {
      return { ok: false, message: 'Your org requires admin approval for fine-grained PATs. Re-run `rvf auth github` once approved.' };
    }
    return { ok: false, message: `GitHub ${r.status}: ${r.body?.message || r.error || 'unknown error'}` };
  },

  envEntries({ token, prereqs }) {
    return {
      GITHUB_TOKEN: token,
      GITHUB_REPO: prereqs.repo,
    };
  },

  successHint: 'Try: rvf send-test github',
};
