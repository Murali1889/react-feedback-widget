/**
 * Shared helpers for `rvf auth <destination>`.
 *
 * Every adapter uses the same primitives: open a deep-link in the user's
 * browser, idempotently upsert env vars into .env.local, and warn loudly
 * if .env.local isn't gitignored.
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const PLATFORM_OPENER = {
  darwin: 'open',
  win32: 'start',
  linux: 'xdg-open',
};

/**
 * Open a URL in the user's default browser. Best-effort: returns true on
 * spawn success, false otherwise. Never blocks — caller prints the URL
 * separately so the user can copy/paste if the open fails silently.
 */
export function openBrowser(url, { skip = false } = {}) {
  if (skip) return false;
  const opener = PLATFORM_OPENER[process.platform];
  if (!opener) return false;
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn(opener, [url], { stdio: 'ignore', detached: true }).unref();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Read an env file into a {KEY: 'value'} map. Comments and blank lines
 * are preserved as a separate `raw` string we round-trip on write.
 */
export function parseEnv(absPath) {
  if (!existsSync(absPath)) return { map: {}, raw: '' };
  const raw = readFileSync(absPath, 'utf8');
  const map = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return { map, raw };
}

/**
 * Idempotently merge {KEY: value, ...} into an env file. Existing keys
 * are replaced in place (preserving comments around them); new keys are
 * appended under a `# rvf:auth:<destination>` block.
 *
 * Returns { wrote, added: [...], updated: [...], path }.
 */
export function upsertEnv(absPath, kvs, { blockId } = {}) {
  const existing = existsSync(absPath) ? readFileSync(absPath, 'utf8') : '';
  let next = existing;
  const added = [];
  const updated = [];

  for (const [k, v] of Object.entries(kvs)) {
    const re = new RegExp(`^(\\s*${k}\\s*=).*$`, 'm');
    if (re.test(next)) {
      next = next.replace(re, `$1${v}`);
      updated.push(k);
    } else {
      added.push([k, v]);
    }
  }

  if (added.length) {
    const header = blockId ? `\n# rvf:auth:${blockId} — added by react-visual-feedback\n` : '\n';
    const body = added.map(([k, v]) => `${k}=${v}`).join('\n');
    next = next + header + body + '\n';
  }

  if (next === existing) return { wrote: false, added: [], updated, path: absPath };

  writeFileSync(absPath, next, 'utf8');
  try { chmodSync(absPath, 0o600); } catch { /* best-effort on win32 */ }

  return { wrote: true, added: added.map(([k]) => k), updated, path: absPath };
}

/**
 * Detect whether a given env file is covered by .gitignore. Conservative:
 * returns true only if we can confirm a matching rule.
 */
export function isGitignored(absEnvPath, repoRoot = process.cwd()) {
  const giPath = join(repoRoot, '.gitignore');
  if (!existsSync(giPath)) return false;
  const gi = readFileSync(giPath, 'utf8');
  const target = absEnvPath.split('/').pop();
  const patterns = gi.split('\n').map((s) => s.trim()).filter((l) => l && !l.startsWith('#'));
  return patterns.some((p) => {
    if (p === target || p === '*' || p === '/' + target) return true;
    if (p === '.env*' && target.startsWith('.env')) return true;
    if (p === '.env' && target === '.env') return true;
    if (p === '.env.local' && target === '.env.local') return true;
    if (p === '*.env' && target.endsWith('.env')) return true;
    return false;
  });
}

/**
 * Sniff sane defaults from the local environment so the user doesn't
 * have to type things we already know.
 */
export function sniffDefaults() {
  const out = {};
  try {
    out.email = execSync('git config --get user.email', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch { /* nope */ }
  try {
    const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = remote.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
    if (m) out.ownerRepo = `${m[1]}/${m[2]}`;
  } catch { /* nope */ }
  try {
    if (existsSync(join(process.cwd(), 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
      if (pkg.name) out.packageName = pkg.name;
    }
  } catch { /* nope */ }
  return out;
}

/**
 * Pick which env file to write to. Honors --env-file flag, else falls
 * back to .env.local when present / Next/Vite-shaped, else .env.
 */
export function pickEnvFile({ flag, cwd = process.cwd() } = {}) {
  if (flag) return join(cwd, flag);
  if (existsSync(join(cwd, '.env.local'))) return join(cwd, '.env.local');
  if (existsSync(join(cwd, 'next.config.js')) ||
      existsSync(join(cwd, 'next.config.mjs')) ||
      existsSync(join(cwd, 'next.config.ts'))) return join(cwd, '.env.local');
  return join(cwd, '.env');
}

/**
 * Tiny fetch wrapper that surfaces useful provider errors instead of
 * bare "fetch failed". Returns { ok, status, body, error }.
 */
export async function http(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text();
    return { ok: res.ok, status: res.status, body, headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: e.message || String(e) };
  }
}
