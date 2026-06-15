import { describe, it, expect, beforeEach } from 'vitest';
import { resolveBuildInfo } from '../buildInfo.js';

beforeEach(() => {
  delete globalThis.__feedbackBuildInfo;
  document.head.querySelectorAll('meta[name="feedback-build"]').forEach((m) => m.remove());
});

describe('resolveBuildInfo', () => {
  it('prefers explicit prop over everything else', () => {
    globalThis.__feedbackBuildInfo = { commit: 'globalCommit' };
    const meta = document.createElement('meta');
    meta.name = 'feedback-build'; meta.content = 'commit=metaCommit';
    document.head.appendChild(meta);
    expect(resolveBuildInfo({ commit: 'propCommit' }).commit).toBe('propCommit');
  });

  it('uses global when prop omitted', () => {
    globalThis.__feedbackBuildInfo = { commit: 'g1', branch: 'main' };
    expect(resolveBuildInfo()).toEqual(expect.objectContaining({ commit: 'g1', branch: 'main' }));
  });

  it('parses meta tag form-encoded content', () => {
    const meta = document.createElement('meta');
    meta.name = 'feedback-build';
    meta.content = 'commit=abc&branch=main&builtAt=2026-06-15T00:00Z';
    document.head.appendChild(meta);
    const info = resolveBuildInfo();
    expect(info.commit).toBe('abc');
    expect(info.branch).toBe('main');
    expect(info.builtAt).toBe('2026-06-15T00:00Z');
  });

  it('falls back to environment-only when nothing else is set', () => {
    const info = resolveBuildInfo();
    expect(info.environment).toBeTruthy();
  });

  it('ignores non-object global value', () => {
    globalThis.__feedbackBuildInfo = 'not an object';
    const info = resolveBuildInfo();
    expect(info.commit).toBeUndefined();
  });
});
