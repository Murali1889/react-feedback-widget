/**
 * Notion adapter — internal integration token + DB-share polling.
 *
 * Notion intentionally exposes no API to discover all databases in a
 * workspace; an integration can only see databases that have been
 * explicitly shared with it via the "Add connections" menu on each DB.
 * This is the #1 beginner trap.
 *
 * Mitigation: after token verify we POLL /v1/search every 3s, with
 * blocking coaching on screen telling the user exactly which menu to
 * click, until a database appears. User time target: ~150s.
 */
import { http } from '../helpers.mjs';

const NOTION_VERSION = '2022-06-28';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;

export default {
  id: 'notion',
  headline: 'Connect Notion so feedback flows into a database you own.',
  envFile: { defaultsTo: '.env.local' },

  checklist: [
    'Open notion.so/my-integrations in your browser',
    'Click "New integration", name it "react-visual-feedback", click Submit',
    'Copy the "Internal Integration Secret" (starts with ntn_ or secret_)',
    'Paste it here — we\'ll walk you through sharing a database next',
  ],

  async prerequisites() { return {}; },

  buildUrl() { return 'https://www.notion.so/my-integrations'; },

  pastePrompt: {
    message: 'Paste your Notion integration secret:',
    validate: (v) => /^(ntn_|secret_)[A-Za-z0-9_-]{16,}$/.test(v.trim())
      ? undefined
      : 'Expected a token starting with ntn_ or secret_',
  },

  async verify({ token }) {
    const r = await http('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        Accept: 'application/json',
      },
    });
    if (r.status === 401) {
      return { ok: false, message: 'Notion rejected the token. Did you copy the full secret?' };
    }
    if (!r.ok) {
      return { ok: false, message: `Notion ${r.status}: ${r.body?.message || r.error || 'unknown error'}` };
    }
    if (!r.body?.bot?.workspace_name) {
      return { ok: false, message: 'Token works but Notion didn\'t return workspace info.' };
    }
    return { ok: true, workspaceName: r.body.bot.workspace_name };
  },

  /**
   * Post-verify: poll until at least one database is shared with the
   * integration. This is the step that cannot be eliminated.
   */
  async postVerify({ clack, token, verifyResult }) {
    clack.log.info(`Workspace: ${verifyResult.workspaceName}`);
    clack.note(
      [
        '1. Open the Notion page or database you want feedback to land in',
        '2. Click the ⋯ menu (top-right) → "Add connections"',
        '3. Search for "react-visual-feedback" → click it → confirm',
        '',
        'We\'re watching — as soon as you share a database, we\'ll pick it up.',
      ].join('\n'),
      'Share a database with the integration'
    );

    const s = clack.spinner();
    s.start('Waiting for you to share a database…');

    const databases = await pollForDatabases({ token, onTick: (n) => {
      if (n > 0) return;
      s.message('Waiting for you to share a database…');
    }});

    if (!databases.length) {
      s.stop('Timed out waiting');
      clack.log.error('No database shared in 90 seconds.');
      clack.log.warn('Re-run `rvf auth notion` after sharing a database with the integration.');
      return null;
    }
    s.stop(`Found ${databases.length} database${databases.length === 1 ? '' : 's'}`);

    let picked;
    if (databases.length === 1) {
      picked = databases[0];
    } else {
      const choice = await clack.select({
        message: 'Which database should feedback go to?',
        options: databases.map((d) => ({
          value: d.id,
          label: d.title,
          hint: d.id.slice(0, 8),
        })),
      });
      if (clack.isCancel(choice)) return null;
      picked = databases.find((d) => d.id === choice);
    }
    return { database: picked };
  },

  envEntries({ token, database }) {
    return {
      NOTION_TOKEN: token,
      NOTION_DB_ID: database.id,
    };
  },

  successHint: 'Try: rvf send-test notion',
};

/**
 * Poll Notion's /v1/search until at least one database returns, or
 * the timeout elapses. Returns [] on timeout.
 *
 * Exposed for tests so the loop can be exercised without real time.
 */
export async function pollForDatabases({ token, onTick, intervalMs = POLL_INTERVAL_MS, timeoutMs = POLL_TIMEOUT_MS, now = () => Date.now() } = {}) {
  const start = now();
  let tick = 0;
  while (now() - start < timeoutMs) {
    const r = await http('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { value: 'database', property: 'object' },
        page_size: 25,
      }),
    });
    if (r.ok && Array.isArray(r.body?.results) && r.body.results.length > 0) {
      return r.body.results.map((d) => ({
        id: d.id,
        title: extractTitle(d) || '(untitled database)',
      }));
    }
    onTick?.(++tick);
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  return [];
}

function extractTitle(db) {
  const t = db.title?.[0]?.plain_text;
  return t || null;
}
