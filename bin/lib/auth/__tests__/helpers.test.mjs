/**
 * Helper unit tests — focused on the things that touch the file
 * system or environment and can silently regress.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { upsertEnv, parseEnv, isGitignored, pickEnvFile } from '../helpers.mjs';

function mkTmp() {
  return mkdtempSync(join(tmpdir(), 'rvf-auth-test-'));
}

describe('upsertEnv', () => {
  let dir;
  beforeEach(() => { dir = mkTmp(); });

  it('creates the file when missing and writes new keys', () => {
    const p = join(dir, '.env.local');
    const r = upsertEnv(p, { GITHUB_TOKEN: 'github_pat_x' }, { blockId: 'github' });
    expect(r.wrote).toBe(true);
    expect(r.added).toEqual(['GITHUB_TOKEN']);
    const text = readFileSync(p, 'utf8');
    expect(text).toContain('# rvf:auth:github');
    expect(text).toContain('GITHUB_TOKEN=github_pat_x');
  });

  it('updates existing keys in place', () => {
    const p = join(dir, '.env.local');
    writeFileSync(p, 'GITHUB_TOKEN=old_value\nOTHER=keep_me\n');
    const r = upsertEnv(p, { GITHUB_TOKEN: 'github_pat_new' });
    expect(r.updated).toEqual(['GITHUB_TOKEN']);
    expect(r.added).toEqual([]);
    const text = readFileSync(p, 'utf8');
    expect(text).toContain('GITHUB_TOKEN=github_pat_new');
    expect(text).toContain('OTHER=keep_me');
    expect(text).not.toContain('old_value');
  });

  it('is idempotent — second call with same values writes nothing', () => {
    const p = join(dir, '.env.local');
    upsertEnv(p, { K: 'v' });
    const before = readFileSync(p, 'utf8');
    const r = upsertEnv(p, { K: 'v' });
    expect(r.wrote).toBe(false);
    expect(readFileSync(p, 'utf8')).toBe(before);
  });

  it('chmod 600 on POSIX', () => {
    if (process.platform === 'win32') return;
    const p = join(dir, '.env.local');
    upsertEnv(p, { K: 'v' });
    const mode = statSync(p).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe('parseEnv', () => {
  let dir;
  beforeEach(() => { dir = mkTmp(); });

  it('parses key=value lines and ignores comments + blanks', () => {
    const p = join(dir, '.env');
    writeFileSync(p, '# top\nFOO=bar\n\nBAZ=qux\n');
    const { map } = parseEnv(p);
    expect(map).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('returns empty map for missing file', () => {
    const { map, raw } = parseEnv(join(dir, 'missing'));
    expect(map).toEqual({});
    expect(raw).toBe('');
  });
});

describe('isGitignored', () => {
  let dir;
  beforeEach(() => { dir = mkTmp(); });

  it('returns true when .env.local is explicitly listed', () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n.env.local\n');
    expect(isGitignored(join(dir, '.env.local'), dir)).toBe(true);
  });

  it('returns true for .env* glob pattern', () => {
    writeFileSync(join(dir, '.gitignore'), '.env*\n');
    expect(isGitignored(join(dir, '.env.local'), dir)).toBe(true);
  });

  it('returns false when no gitignore exists', () => {
    expect(isGitignored(join(dir, '.env.local'), dir)).toBe(false);
  });

  it('returns false when gitignore has no matching rule', () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
    expect(isGitignored(join(dir, '.env.local'), dir)).toBe(false);
  });
});

describe('pickEnvFile', () => {
  let dir;
  beforeEach(() => { dir = mkTmp(); });

  it('honors --env-file flag', () => {
    const r = pickEnvFile({ flag: '.env.development', cwd: dir });
    expect(r).toBe(join(dir, '.env.development'));
  });

  it('prefers existing .env.local', () => {
    writeFileSync(join(dir, '.env.local'), '');
    expect(pickEnvFile({ cwd: dir })).toBe(join(dir, '.env.local'));
  });

  it('uses .env.local when Next is detected', () => {
    writeFileSync(join(dir, 'next.config.js'), '');
    expect(pickEnvFile({ cwd: dir })).toBe(join(dir, '.env.local'));
  });

  it('falls back to .env otherwise', () => {
    expect(pickEnvFile({ cwd: dir })).toBe(join(dir, '.env'));
  });
});
