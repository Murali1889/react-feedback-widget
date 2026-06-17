/**
 * Auth orchestrator — runs an adapter through the shared paste flow.
 *
 * Every adapter implements: headline, checklist, prerequisites(),
 * buildUrl(), pastePrompt, verify(), envEntries(). The orchestrator
 * sequences them, handles --no-open / --token / --print-only flags,
 * upserts the resulting env vars, and warns if the env file isn't
 * gitignored.
 */
import * as clack from '@clack/prompts';
import { openBrowser, upsertEnv, isGitignored, sniffDefaults, pickEnvFile } from './helpers.mjs';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import process from 'node:process';

import github from './adapters/github.mjs';
import jira from './adapters/jira.mjs';
import linear from './adapters/linear.mjs';
import supabase from './adapters/supabase.mjs';
import discord from './adapters/discord.mjs';
import slack from './adapters/slack.mjs';
import notion from './adapters/notion.mjs';
import hubspot from './adapters/hubspot.mjs';
import sheets from './adapters/sheets.mjs';

export const ADAPTERS = { github, jira, linear, supabase, discord, slack, notion, hubspot, sheets };

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
};
const paint = (txt, color) => `${color}${txt}${c.reset}`;

/**
 * Run the auth flow for one destination.
 * @param {object} opts
 * @param {string} opts.destination - id from ADAPTERS
 * @param {object} opts.flags - parsed CLI flags: { envFile, noOpen, token, printOnly, ...adapterFlags }
 * @returns {Promise<{ ok: boolean, exitCode: number }>}
 */
export async function runAuth({ destination, flags = {} }) {
  const adapter = ADAPTERS[destination];
  if (!adapter) {
    console.log(paint(`Unknown destination: ${destination}`, c.red));
    console.log(`Available: ${Object.keys(ADAPTERS).join(', ')}`);
    return { ok: false, exitCode: 1 };
  }

  clack.intro(paint(`rvf auth ${destination}`, c.cyan + c.bold));
  clack.log.step(adapter.headline);

  const numbered = adapter.checklist.map((s, i) => `${i + 1}. ${s}`).join('\n');
  clack.note(numbered, 'What you\'ll do');

  const sniffed = sniffDefaults();
  const prereqs = await adapter.prerequisites({ clack, sniffed, flags });
  if (prereqs === null) {
    clack.cancel('Cancelled.');
    return { ok: false, exitCode: 0 };
  }

  let token;
  let verifyResult = { ok: true };
  let extras = {};

  if (adapter.flow === 'oauth-loopback') {
    if (flags.printOnly) {
      clack.log.info('Print-only mode is not supported for oauth-loopback adapters.');
      clack.outro(paint('Re-run without --print-only.', c.yellow));
      return { ok: false, exitCode: 1 };
    }
    const result = await adapter.runOAuth({ clack, flags, prereqs });
    if (!result?.ok) {
      clack.log.error(result?.message || 'OAuth flow failed.');
      clack.outro(paint('Re-run `rvf auth ' + destination + '` after fixing the issue.', c.yellow));
      return { ok: false, exitCode: 1 };
    }
    Object.assign(extras, result);
  } else {
    const url = adapter.buildUrl(prereqs);

    if (flags.printOnly) {
      clack.log.info(`Token URL: ${paint(url, c.cyan)}`);
      clack.outro('Print-only mode — paste the URL into your browser.');
      return { ok: true, exitCode: 0 };
    }

    const opened = openBrowser(url, { skip: flags.noOpen });
    if (opened) {
      clack.log.info(`Opened: ${paint(url, c.cyan)}`);
    } else {
      clack.log.info(`Open this URL: ${paint(url, c.cyan)}`);
    }

    token = flags.token;
    if (!token) {
      const pasted = await clack.password({
        message: adapter.pastePrompt.message,
        validate: adapter.pastePrompt.validate,
      });
      if (clack.isCancel(pasted)) {
        clack.cancel('Cancelled.');
        return { ok: false, exitCode: 0 };
      }
      token = pasted;
    }

    const s = clack.spinner();
    s.start('Verifying…');
    verifyResult = await adapter.verify({ token, prereqs });
    s.stop(verifyResult.ok ? 'Verified' : 'Verification failed');

    if (!verifyResult.ok) {
      clack.log.error(verifyResult.message || 'Provider rejected the token.');
      clack.outro(paint('Re-run `rvf auth ' + destination + '` after fixing the issue.', c.yellow));
      return { ok: false, exitCode: 1 };
    }
  }

  if (adapter.postVerify && adapter.flow !== 'oauth-loopback') {
    const extra = await adapter.postVerify({ clack, token, verifyResult, prereqs });
    if (extra === null) {
      clack.cancel('Cancelled.');
      return { ok: false, exitCode: 1 };
    }
    Object.assign(extras, extra);
  }
  if (adapter.pickTeam) {
    const team = await adapter.pickTeam({ clack, verifyResult });
    if (team === null) {
      clack.cancel('Cancelled.');
      return { ok: false, exitCode: 0 };
    }
    extras.team = team;
  }
  if (adapter.pickProject) {
    const project = await adapter.pickProject({ clack, verifyResult });
    if (project === null) {
      clack.cancel('Cancelled.');
      return { ok: false, exitCode: 0 };
    }
    extras.project = project;
    if (adapter.fetchProjectKeys) {
      const ks = clack.spinner();
      ks.start('Fetching project keys…');
      const keys = await adapter.fetchProjectKeys({ token, project });
      ks.stop(keys.ok ? 'Got keys' : 'Couldn\'t fetch keys');
      if (!keys.ok) {
        clack.log.error(keys.message);
        return { ok: false, exitCode: 1 };
      }
      extras.projectKeys = keys;
    }
  }

  const envKvs = adapter.envEntries({ token, prereqs, ...extras });
  const envPath = pickEnvFile({ flag: flags.envFile });
  const upsert = upsertEnv(envPath, envKvs, { blockId: destination });

  const relPath = envPath.replace(process.cwd() + '/', '');
  if (upsert.added.length) {
    clack.log.success(`Wrote ${upsert.added.join(', ')} to ${paint(relPath, c.cyan)}`);
  } else if (upsert.updated.length) {
    clack.log.success(`Updated ${upsert.updated.join(', ')} in ${paint(relPath, c.cyan)}`);
  }

  if (!isGitignored(envPath)) {
    clack.log.warn(`${basename(envPath)} isn't in .gitignore — add it before committing.`);
  }

  clack.outro(paint(adapter.successHint, c.green));
  return { ok: true, exitCode: 0 };
}

/**
 * List supported `rvf auth` destinations (used in --help).
 */
export function listAuthDestinations() {
  return Object.keys(ADAPTERS);
}
