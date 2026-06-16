#!/usr/bin/env node
/**
 * rvf — react-visual-feedback CLI
 *
 *   npx rvf init               interactive setup
 *   npx rvf add <name>         append a destination to feedback.config.ts
 *   npx rvf list               show every available destination
 *   npx rvf --help
 *
 * Zero deps in this entry — uses Node built-ins + clack/prompts.
 */

import {
  intro, outro, multiselect, select, confirm, group, isCancel, cancel,
  log, note, spinner,
} from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';

const CWD = process.cwd();

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  gray: '\x1b[90m',
};
const paint = (txt, color) => `${color}${txt}${c.reset}`;

// ───────────────────────────────────────────────────────────────────────────
// Destination catalogue — every option surfaces here, with token acquisition
// URLs inline so beginners can click straight through.
// ───────────────────────────────────────────────────────────────────────────

const DESTINATIONS = [
  {
    id: 'local', call: 'connect.local()',
    blurb: 'browser localStorage — always include, no setup',
    secure: 'in-browser; never leaves the device',
    envVars: [],
    recommended: true,
  },
  {
    id: 'github', call: "connect.github({ repo: 'owner/repo' })",
    blurb: 'file feedback as GitHub Issues',
    secure: 'GITHUB_TOKEN lives in server env; widget refuses ghp_… client-side',
    envVars: [
      { k: 'GITHUB_TOKEN', hint: 'fine-grained PAT, "Issues: Read & write" on the target repo',
        url: 'https://github.com/settings/personal-access-tokens/new' },
    ],
  },
  {
    id: 'linear', call: 'connect.linear({ team: process.env.LINEAR_TEAM_ID })',
    blurb: 'file feedback as Linear Issues',
    secure: 'LINEAR_API_KEY in server env',
    envVars: [
      { k: 'LINEAR_API_KEY', hint: 'from Linear → Settings → API → Personal API keys',
        url: 'https://linear.app/settings/api' },
      { k: 'LINEAR_TEAM_ID', hint: 'team UUID; find via GraphQL: `query { teams { nodes { id name } } }`' },
    ],
  },
  {
    id: 'notion', call: 'connect.notion({ database: process.env.NOTION_DB_ID })',
    blurb: 'insert into a Notion database',
    secure: 'NOTION_TOKEN in server env; share the database with your integration',
    envVars: [
      { k: 'NOTION_TOKEN', hint: 'internal integration token; SHARE the DB with the integration',
        url: 'https://www.notion.so/my-integrations' },
      { k: 'NOTION_DB_ID', hint: 'database UUID from the DB URL' },
    ],
  },
  {
    id: 'hubspot', call: 'connect.hubspot()',
    blurb: 'create a HubSpot Service Hub ticket',
    secure: 'HUBSPOT_TOKEN in server env',
    envVars: [
      { k: 'HUBSPOT_TOKEN', hint: 'Private App access token, scope: tickets',
        url: 'https://developers.hubspot.com/docs/api/private-apps' },
    ],
  },
  {
    id: 'slack', call: "connect.slack({ channel: '#bugs' })",
    blurb: 'post a formatted message to Slack',
    secure: 'webhook URL or bot token in server env; severity → color bar',
    envVars: [
      { k: 'SLACK_WEBHOOK_URL', hint: 'incoming webhook (simpler) — get one at this URL',
        url: 'https://api.slack.com/messaging/webhooks' },
    ],
  },
  {
    id: 'jira', call: "connect.jira({ project: 'BUG' })",
    blurb: 'create a Jira ticket',
    secure: 'token in server env; severity → priority',
    envVars: [
      { k: 'JIRA_DOMAIN', hint: 'your-org.atlassian.net' },
      { k: 'JIRA_EMAIL', hint: 'Atlassian account email' },
      { k: 'JIRA_API_TOKEN', hint: 'from id.atlassian.com → Account → Security',
        url: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
      { k: 'JIRA_PROJECT_KEY', hint: 'short project key, e.g. BUG' },
    ],
  },
  {
    id: 'sheets', call: 'connect.sheets({ spreadsheet: process.env.GOOGLE_SHEETS_ID })',
    blurb: 'append rows to a Google Sheet',
    secure: 'service-account key in server env',
    envVars: [
      { k: 'GOOGLE_SHEETS_ID', hint: 'sheet id from the URL' },
      { k: 'GOOGLE_SERVICE_ACCOUNT_KEY', hint: 'JSON; share the sheet with its email' },
    ],
  },
  {
    id: 'supabase', call: 'connect.supabase()',
    blurb: 'insert into a Supabase table via your server',
    secure: 'service-role key in server env; widget refuses it client-side',
    envVars: [
      { k: 'SUPABASE_URL', hint: 'https://YOUR-PROJECT.supabase.co' },
      { k: 'SUPABASE_SERVICE_ROLE_KEY', hint: 'service-role secret; NEVER ship to browser' },
    ],
  },
];

const MODAL_VARIANTS = [
  { id: 'two-column', label: 'two-column', blurb: 'form left, evidence right — RECOMMENDED' },
  { id: 'workspace',  label: 'workspace',  blurb: 'step rail + impact map + annotation pins' },
  { id: 'stepper',    label: 'stepper',    blurb: '3-step wizard (Describe → Tag → Send)' },
  { id: 'drawer',     label: 'drawer',     blurb: 'slide-out from right edge' },
  { id: 'compact',    label: 'compact',    blurb: '320px chat-style card, bottom-right' },
  { id: 'centered',   label: 'centered',   blurb: 'classic centered modal' },
];

const FRAMEWORKS = {
  nextAppRouter: {
    label: 'Next.js (App Router)',
    routePath: 'app/api/feedback/[...rest]/route.ts',
    routePathSrc: 'src/app/api/feedback/[...rest]/route.ts',
    envFile: '.env.local',
    detect: () => detectNext() && (existsSync(join(CWD, 'app')) || existsSync(join(CWD, 'src/app'))),
  },
  nextPagesRouter: {
    label: 'Next.js (Pages Router)',
    routePath: 'pages/api/feedback/[...rest].ts',
    routePathSrc: 'src/pages/api/feedback/[...rest].ts',
    envFile: '.env.local',
    detect: () => detectNext() && (existsSync(join(CWD, 'pages')) || existsSync(join(CWD, 'src/pages'))),
  },
  vite: {
    label: 'Vite + React (no built-in server — wire to your Express/Hono)',
    routePath: null,
    envFile: '.env',
    detect: () => existsSync(join(CWD, 'vite.config.ts')) || existsSync(join(CWD, 'vite.config.js')) || existsSync(join(CWD, 'vite.config.mjs')),
  },
  express: {
    label: 'Express (or generic Node)',
    routePath: 'feedback-route.js',
    envFile: '.env',
    detect: () => {
      try {
        const pkg = JSON.parse(readFileSync(join(CWD, 'package.json'), 'utf8'));
        return !!(pkg.dependencies?.express || pkg.devDependencies?.express);
      } catch { return false; }
    },
  },
  unknown: {
    label: 'Unknown — generic React',
    routePath: null,
    envFile: '.env',
  },
};

function detectNext() {
  return existsSync(join(CWD, 'next.config.js')) ||
         existsSync(join(CWD, 'next.config.mjs')) ||
         existsSync(join(CWD, 'next.config.ts'));
}

function detectFramework() {
  for (const k of ['nextAppRouter', 'nextPagesRouter', 'express', 'vite']) {
    if (FRAMEWORKS[k].detect?.()) {
      return { kind: k, ...FRAMEWORKS[k] };
    }
  }
  return { kind: 'unknown', ...FRAMEWORKS.unknown };
}

function safeWrite(relPath, contents, { overwrite = false } = {}) {
  const abs = join(CWD, relPath);
  if (existsSync(abs) && !overwrite) return { wrote: false, reason: 'exists', path: relPath };
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents, 'utf8');
  return { wrote: true, path: relPath };
}

function appendEnv(envFile, blocks) {
  const abs = join(CWD, envFile);
  let existing = '';
  if (existsSync(abs)) existing = readFileSync(abs, 'utf8');
  const toAdd = blocks
    .filter((b) => !existing.includes(`# rvf:${b.id}`))
    .map((b) => `\n# rvf:${b.id} — added by react-visual-feedback init\n${b.lines.join('\n')}\n`)
    .join('');
  if (!toAdd) return { wrote: false };
  writeFileSync(abs, existing + toAdd, 'utf8');
  return { wrote: true, file: envFile };
}

// ───────────────────────────────────────────────────────────────────────────
// Code generation
// ───────────────────────────────────────────────────────────────────────────

function buildConfigTs({ destIds, variant }) {
  const destLines = destIds
    .map((id) => DESTINATIONS.find((d) => d.id === id))
    .filter(Boolean)
    .map((d) => `    ${d.call},`)
    .join('\n');

  return `import { defineConfig, connect } from 'react-visual-feedback'

/**
 * Feedback config — single source of truth for both browser and server.
 *
 * Add a destination by adding one line. Set its env var in .env.local.
 * That's the whole integration.
 *
 * Type \`connect.\` in your editor to see every available destination.
 */
export default defineConfig({
  destinations: [
${destLines}
  ],
  ui: { variant: '${variant}' },
})
`;
}

function buildNextAppRouterRoute(isSrcDir) {
  const configImport = isSrcDir
    ? '../../../../../feedback.config'
    : '../../../../feedback.config';
  return `import { createFeedbackHandler, devSessionAuth } from 'react-visual-feedback/server'
import feedbackConfig from '${configImport}'

/**
 * Catch-all feedback route.
 *
 * Auto-dispatches to the right server handler based on the URL's last
 * path segment ↔ adapter.name from feedback.config.ts.
 *
 *   POST /api/feedback/github    →  GitHub Issues
 *   POST /api/feedback/linear    →  Linear
 *   POST /api/feedback/hubspot   →  HubSpot ticket
 *   POST /api/feedback/slack     →  Slack message
 *   …etc, one route per destination in your config.
 *
 * devSessionAuth() is a friendly default for development:
 *   - In dev: passes through with a stub session
 *   - In prod without a secret: REFUSES with a helpful error
 *   - With { secret }: opt-in to built-in signed-cookie sessions
 *
 * For production, swap to your real auth (NextAuth / Clerk / your
 * session lib). Read the devSessionAuth JSDoc for examples.
 */
export const POST = createFeedbackHandler({
  ...feedbackConfig,
  authorize: devSessionAuth(),
})
`;
}

function buildNextPagesRoute() {
  return `import type { NextApiRequest, NextApiResponse } from 'next'
import { createFeedbackHandler, devSessionAuth } from 'react-visual-feedback/server'
import feedbackConfig from '../../../../feedback.config'

const handler = createFeedbackHandler({
  ...feedbackConfig,
  authorize: devSessionAuth(),
})

export default async function feedback(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res)
}
`;
}

function buildExpressRoute() {
  return `// Mount this in your Express app:
//   import feedbackRoute from './feedback-route.js'
//   app.use('/api/feedback', feedbackRoute)
import express from 'express'
import { createFeedbackHandler, devSessionAuth } from 'react-visual-feedback/server'
import feedbackConfig from './feedback.config.js'

const router = express.Router()
router.use(express.json({ limit: '10mb' }))

const handler = createFeedbackHandler({
  ...feedbackConfig,
  authorize: devSessionAuth(),
})

router.post('*', async (req, res) => {
  // createFeedbackHandler returns a Web Response — translate to Express
  const webRes = await handler(req, res)
  if (webRes instanceof Response) {
    const text = await webRes.text()
    res.status(webRes.status).set(Object.fromEntries(webRes.headers)).send(text)
  }
})

export default router
`;
}

// ───────────────────────────────────────────────────────────────────────────
// Commands
// ───────────────────────────────────────────────────────────────────────────

function parseFlag(flags, name) {
  const idx = flags.findIndex((f) => f === `--${name}` || f.startsWith(`--${name}=`));
  if (idx === -1) return undefined;
  const f = flags[idx];
  if (f.includes('=')) return f.split('=').slice(1).join('=');
  return flags[idx + 1];
}

async function cmdInit(flags = []) {
  const fw = detectFramework();
  const nonInteractive = flags.includes('--yes') || flags.includes('-y');

  let destIds, variant, confirmEnvStubs;

  if (nonInteractive) {
    const destsRaw = parseFlag(flags, 'destinations') || parseFlag(flags, 'dests') || 'local';
    destIds = destsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const invalid = destIds.filter((id) => !DESTINATIONS.find((d) => d.id === id));
    if (invalid.length) {
      console.log(paint(`✗ Unknown destinations: ${invalid.join(', ')}`, c.red));
      console.log(`  Available: ${DESTINATIONS.map((d) => d.id).join(', ')}`);
      process.exit(1);
    }
    variant = parseFlag(flags, 'variant') || 'two-column';
    if (!MODAL_VARIANTS.find((v) => v.id === variant)) {
      console.log(paint(`✗ Unknown variant: ${variant}`, c.red));
      console.log(`  Available: ${MODAL_VARIANTS.map((v) => v.id).join(', ')}`);
      process.exit(1);
    }
    confirmEnvStubs = !flags.includes('--no-env');
    console.log(paint('react-visual-feedback init (non-interactive)', c.cyan + c.bold));
    console.log(`  Framework: ${paint(fw.label, c.cyan)}`);
    console.log(`  Destinations: ${paint(destIds.join(', '), c.green)}`);
    console.log(`  Variant: ${paint(variant, c.green)}`);
  } else {
    intro(paint('react-visual-feedback init', c.cyan + c.bold));
    log.step(`Detected: ${paint(fw.label, c.cyan)}`);

    const answers = await group(
      {
        destinations: () => multiselect({
          message: 'Which destinations should this widget submit to?',
          options: DESTINATIONS.map((d) => ({
            value: d.id,
            label: `${d.id}${d.recommended ? ' ★' : ''}`,
            hint: d.blurb,
          })),
          initialValues: ['local'],
          required: true,
        }),
        variant: () => select({
          message: 'Default modal layout:',
          options: MODAL_VARIANTS.map((v) => ({ value: v.id, label: v.label, hint: v.blurb })),
          initialValue: 'two-column',
        }),
        confirmEnvStubs: () => confirm({
          message: `Append env var stubs to ${fw.envFile}?`,
          initialValue: true,
        }),
      },
      {
        onCancel: () => {
          cancel('Setup cancelled.');
          process.exit(0);
        },
      }
    );
    ({ destinations: destIds, variant, confirmEnvStubs } = answers);
  }

  const s = nonInteractive ? { start: () => {}, stop: () => {} } : spinner();
  s.start('Writing files…');

  const isSrcDir = existsSync(join(CWD, 'src'));
  const configPath = 'feedback.config.ts';
  const configRes = safeWrite(configPath, buildConfigTs({ destIds, variant }));

  let routeRes = { wrote: false, path: null };
  if (fw.kind === 'nextAppRouter') {
    const routePath = isSrcDir ? fw.routePathSrc : fw.routePath;
    routeRes = safeWrite(routePath, buildNextAppRouterRoute(isSrcDir));
  } else if (fw.kind === 'nextPagesRouter') {
    const routePath = isSrcDir ? fw.routePathSrc : fw.routePath;
    routeRes = safeWrite(routePath, buildNextPagesRoute());
  } else if (fw.kind === 'express') {
    routeRes = safeWrite(fw.routePath, buildExpressRoute());
  }

  let envRes = { wrote: false };
  if (confirmEnvStubs) {
    const blocks = destIds
      .map((id) => DESTINATIONS.find((d) => d.id === id))
      .filter((d) => d?.envVars.length)
      .map((d) => ({
        id: d.id,
        lines: d.envVars.flatMap((e) => [
          `# ${e.hint}`,
          e.url ? `# → ${e.url}` : null,
          `# ${e.k}=`,
        ].filter(Boolean)),
      }));
    envRes = appendEnv(fw.envFile, blocks);
  }

  s.stop('Files written');

  if (nonInteractive) {
    console.log('\n  Files written:');
    if (configRes.wrote)    console.log(`  ${paint('✓', c.green)} ${configRes.path}`);
    else                    console.log(`  ${paint('·', c.gray)} ${configRes.path} (already exists)`);
    if (routeRes.wrote)     console.log(`  ${paint('✓', c.green)} ${routeRes.path}`);
    else if (routeRes.path) console.log(`  ${paint('·', c.gray)} ${routeRes.path} (already exists)`);
    if (envRes.wrote)       console.log(`  ${paint('✓', c.green)} ${envRes.file} (env stubs appended)`);
    console.log(`\n  ${paint('Done.', c.green)}`);
    return;
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const written = [];
  if (configRes.wrote)        written.push(`${paint('✓', c.green)} ${configRes.path}`);
  else                         written.push(`${paint('·', c.gray)} ${configRes.path} ${paint('(already exists)', c.gray)}`);
  if (routeRes.wrote)         written.push(`${paint('✓', c.green)} ${routeRes.path}`);
  else if (routeRes.path)     written.push(`${paint('·', c.gray)} ${routeRes.path} ${paint('(already exists)', c.gray)}`);
  else                         written.push(`${paint('-', c.yellow)} ${paint('no server route written — wire to your stack manually', c.gray)}`);
  if (envRes.wrote)           written.push(`${paint('✓', c.green)} ${envRes.file} ${paint('(env stubs appended)', c.gray)}`);

  note(written.join('\n'), 'Files');

  // ── Env vars to fill in ────────────────────────────────────────────────
  const envLines = destIds
    .map((id) => DESTINATIONS.find((d) => d.id === id))
    .filter((d) => d?.envVars.length)
    .flatMap((d) => [
      paint(`  # ${d.id}`, c.bold),
      ...d.envVars.flatMap((e) => [
        `  ${paint(e.k, c.green)} ${paint('= <fill me in>', c.dim)}`,
        `    ${paint('# ' + e.hint, c.gray)}`,
        e.url ? `    ${paint('# ' + e.url, c.cyan)}` : null,
      ].filter(Boolean)),
    ]);
  if (envLines.length) note(envLines.join('\n'), 'Set these env vars');

  // ── Client snippet ─────────────────────────────────────────────────────
  note(
    `${paint('  // app/layout.tsx (or wherever your provider lives)', c.gray)}
  ${paint('import feedbackConfig from \'./feedback.config\'', c.dim)}
  ${paint('import { FeedbackProvider } from \'react-visual-feedback\'', c.dim)}

  ${paint('<FeedbackProvider {...feedbackConfig}>', c.bold)}
  ${paint('  {children}', c.bold)}
  ${paint('</FeedbackProvider>', c.bold)}`,
    'Add this to your root layout'
  );

  // ── Shortcuts ──────────────────────────────────────────────────────────
  note(
    `${paint('  Alt+A', c.cyan)}  open the feedback modal
  ${paint('  Alt+Q', c.cyan)}  open the dashboard
  ${paint('  Alt+W', c.cyan)}  start screen recording`,
    'Keyboard shortcuts'
  );

  outro(paint('Done. Press Alt+A to file your first feedback. ✨', c.green + c.bold));
}

async function cmdAdd(name) {
  const d = DESTINATIONS.find((x) => x.id === name);
  if (!d) {
    console.log(paint(`Unknown destination: ${name}`, c.red));
    console.log(`Available: ${DESTINATIONS.map((d) => d.id).join(', ')}`);
    console.log(`Run ${paint('npx rvf list', c.cyan)} to see them all.`);
    process.exit(1);
  }

  const configPath = join(CWD, 'feedback.config.ts');
  if (!existsSync(configPath)) {
    console.log(paint('No feedback.config.ts found. Run `npx rvf init` first.', c.yellow));
    process.exit(1);
  }

  intro(paint(`Add ${d.id}`, c.cyan + c.bold));

  let src = readFileSync(configPath, 'utf8');
  if (src.includes(d.call.split('(')[0] + '(')) {
    log.info(`${d.id} is already in feedback.config.ts.`);
    outro('Nothing to do.');
    return;
  }

  // Append to destinations[] before the closing ']'
  if (!/destinations:\s*\[/.test(src)) {
    log.warn('feedback.config.ts is in an unexpected shape — add the destination manually.');
    process.exit(1);
  }
  src = src.replace(/(destinations:\s*\[)([\s\S]*?)(\n\s*\],?)/,
    (_, head, mid, tail) => `${head}${mid}\n    ${d.call},${tail}`);

  writeFileSync(configPath, src, 'utf8');
  log.success(`Appended ${paint(d.id, c.green)} to feedback.config.ts`);

  const fw = detectFramework();
  if (d.envVars.length) {
    const block = {
      id: d.id,
      lines: d.envVars.flatMap((e) => [`# ${e.hint}`, e.url ? `# → ${e.url}` : null, `# ${e.k}=`].filter(Boolean)),
    };
    const envRes = appendEnv(fw.envFile, [block]);
    if (envRes.wrote) log.success(`Appended env stubs to ${envRes.file}`);
  }

  const envLines = d.envVars.flatMap((e) => [
    `  ${paint(e.k, c.green)} = ${paint('<fill me in>', c.dim)}`,
    `    ${paint('# ' + e.hint, c.gray)}`,
    e.url ? `    ${paint('# ' + e.url, c.cyan)}` : null,
  ].filter(Boolean));
  if (envLines.length) note(envLines.join('\n'), 'Set these env vars');

  outro(paint('Done.', c.green));
}

function cmdList() {
  console.log(`\n${paint('━━━ Destinations', c.bold + c.cyan)}\n`);
  for (const d of DESTINATIONS) {
    const tag = d.recommended ? paint(' ★', c.cyan) : '';
    console.log(`  ${paint(d.id.padEnd(12), c.bold)}${tag} ${paint(d.blurb, c.gray)}`);
    if (d.envVars.length) {
      console.log(`     ${paint('env:', c.dim)} ${d.envVars.map((e) => e.k).join(', ')}`);
    }
    console.log();
  }
}

function helpText() {
  return `
${paint('react-visual-feedback CLI', c.cyan + c.bold)}

  ${paint('npx rvf init', c.green)}              ${paint('— interactive setup (config + route + env stubs)', c.gray)}
  ${paint('npx rvf init --yes', c.green)}        ${paint('— non-interactive (for CI / scripts)', c.gray)}
       ${paint('--destinations=local,github   --variant=two-column   --no-env', c.gray)}
  ${paint('npx rvf add <name>', c.green)}        ${paint('— add a destination to feedback.config.ts', c.gray)}
  ${paint('npx rvf list', c.green)}              ${paint('— list every available destination', c.gray)}
  ${paint('npx rvf --help', c.green)}            ${paint('— show this', c.gray)}

  ${paint('Destinations:', c.bold)} ${DESTINATIONS.map((d) => d.id).join(', ')}
`;
}

const [, , cmd, ...rest] = process.argv;
const sub = rest[0];

try {
  switch (cmd) {
    case 'init':   await cmdInit(rest); break;
    case 'add':    if (!sub) { console.log(helpText()); process.exit(0); } await cmdAdd(sub); break;
    case 'list':   cmdList(); break;
    case '--help':
    case '-h':
    case undefined: console.log(helpText()); break;
    default:
      console.log(paint(`Unknown command: ${cmd}\n`, c.red));
      console.log(helpText());
      process.exit(1);
  }
} catch (e) {
  if (isCancel?.(e)) { cancel('Cancelled.'); process.exit(0); }
  console.error(paint(`✗ ${e.message || e}`, c.red));
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
}
