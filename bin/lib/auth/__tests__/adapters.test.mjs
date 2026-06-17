/**
 * Adapter contract tests — every Phase 1 adapter must pass these.
 *
 * Each adapter has the same shape: a paste-regex that rejects garbage,
 * a buildUrl() that produces a real deep-link, a verify() that hits
 * the right endpoint with the right headers, and an envEntries() that
 * returns the right keys. All HTTP calls are mocked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import github from '../adapters/github.mjs';
import jira from '../adapters/jira.mjs';
import linear from '../adapters/linear.mjs';
import supabase from '../adapters/supabase.mjs';
import discord from '../adapters/discord.mjs';
import slack from '../adapters/slack.mjs';

function mockFetch(impl) {
  global.fetch = vi.fn(async (url, opts) => {
    const r = await impl(url, opts);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: new Map([['content-type', r.contentType || 'application/json']]),
      json: async () => r.body,
      text: async () => typeof r.body === 'string' ? r.body : JSON.stringify(r.body),
    };
  });
}

beforeEach(() => { global.fetch = undefined; });

// ───────────────────────────────────────── github

describe('github adapter', () => {
  it('paste regex rejects classic PATs', () => {
    expect(github.pastePrompt.validate('ghp_abc123')).toMatch(/github_pat_/);
    expect(github.pastePrompt.validate('github_pat_11ABCDE')).toBeUndefined();
  });

  it('buildUrl encodes target_name, expires_in, scopes', () => {
    const url = github.buildUrl({ repo: 'acme/widgets' });
    expect(url).toContain('target_name=acme');
    expect(url).toContain('expires_in=90');
    expect(url).toContain('issues=write');
    expect(url).toContain('metadata=read');
  });

  it('verify hits GET /repos/{owner}/{repo} with Bearer + user-agent', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return { status: 200, body: { full_name: 'acme/widgets' } };
    });
    const r = await github.verify({ token: 'github_pat_x', prereqs: { repo: 'acme/widgets' } });
    expect(r.ok).toBe(true);
    expect(captured.url).toBe('https://api.github.com/repos/acme/widgets');
    expect(captured.opts.headers.Authorization).toBe('Bearer github_pat_x');
    expect(captured.opts.headers['User-Agent']).toBe('rvf-cli');
  });

  it('verify surfaces 404 as "did you pick the right repo"', async () => {
    mockFetch(async () => ({ status: 404, body: { message: 'Not Found' } }));
    const r = await github.verify({ token: 'github_pat_x', prereqs: { repo: 'acme/widgets' } });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/right repo/);
  });

  it('envEntries returns GITHUB_TOKEN + GITHUB_REPO', () => {
    const e = github.envEntries({ token: 'github_pat_x', prereqs: { repo: 'acme/widgets' } });
    expect(e).toEqual({ GITHUB_TOKEN: 'github_pat_x', GITHUB_REPO: 'acme/widgets' });
  });
});

// ───────────────────────────────────────── jira

describe('jira adapter', () => {
  it('paste regex requires reasonable length', () => {
    expect(jira.pastePrompt.validate('short')).toBeTruthy();
    expect(jira.pastePrompt.validate('a'.repeat(24))).toBeUndefined();
  });

  it('verify uses Basic auth with email:token base64', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = captured || { url, opts };
      return { status: 200, body: { accountId: 'x' } };
    });
    await jira.verify({
      token: 'mytoken',
      prereqs: { domain: 'acme.atlassian.net', email: 'm@acme.com', project: 'BUG' },
    });
    const expected = 'Basic ' + Buffer.from('m@acme.com:mytoken').toString('base64');
    expect(captured.opts.headers.Authorization).toBe(expected);
    expect(captured.url).toBe('https://acme.atlassian.net/rest/api/3/myself');
  });

  it('verify surfaces 401 distinctly', async () => {
    mockFetch(async () => ({ status: 401, body: { message: 'unauth' } }));
    const r = await jira.verify({
      token: 'x', prereqs: { domain: 'acme.atlassian.net', email: 'm@acme.com', project: 'BUG' },
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/401/);
  });

  it('verify surfaces project 404 distinctly', async () => {
    let n = 0;
    mockFetch(async () => {
      n++;
      return n === 1 ? { status: 200, body: {} } : { status: 404, body: {} };
    });
    const r = await jira.verify({
      token: 'x', prereqs: { domain: 'acme.atlassian.net', email: 'm@acme.com', project: 'GHOST' },
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/GHOST/);
  });

  it('envEntries returns all four jira keys', () => {
    const e = jira.envEntries({
      token: 'x', prereqs: { domain: 'acme.atlassian.net', email: 'm@acme.com', project: 'BUG' },
    });
    expect(e.JIRA_DOMAIN).toBe('acme.atlassian.net');
    expect(e.JIRA_EMAIL).toBe('m@acme.com');
    expect(e.JIRA_API_TOKEN).toBe('x');
    expect(e.JIRA_PROJECT_KEY).toBe('BUG');
  });
});

// ───────────────────────────────────────── linear

describe('linear adapter', () => {
  it('paste regex requires lin_api_ prefix', () => {
    expect(linear.pastePrompt.validate('garbage')).toBeTruthy();
    expect(linear.pastePrompt.validate('lin_api_abc123')).toBeUndefined();
  });

  it('verify sends raw key (NOT Bearer) — Linear quirk', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return {
        status: 200,
        body: { data: { viewer: { id: 'u' }, teams: { nodes: [{ id: 't', name: 'Engineering', key: 'ENG' }] } } },
      };
    });
    const r = await linear.verify({ token: 'lin_api_x' });
    expect(captured.opts.headers.Authorization).toBe('lin_api_x');
    expect(captured.opts.headers.Authorization).not.toMatch(/^Bearer/);
    expect(r.ok).toBe(true);
    expect(r.teams).toHaveLength(1);
  });

  it('verify surfaces no-teams scenario', async () => {
    mockFetch(async () => ({
      status: 200,
      body: { data: { viewer: { id: 'u' }, teams: { nodes: [] } } },
    }));
    const r = await linear.verify({ token: 'lin_api_x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/teams/);
  });

  it('verify surfaces GraphQL errors', async () => {
    mockFetch(async () => ({
      status: 200,
      body: { errors: [{ message: 'Permission denied' }] },
    }));
    const r = await linear.verify({ token: 'lin_api_x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Permission denied/);
  });

  it('envEntries returns LINEAR_API_KEY + LINEAR_TEAM_ID', () => {
    const e = linear.envEntries({ token: 'lin_api_x', team: { id: 't1' } });
    expect(e).toEqual({ LINEAR_API_KEY: 'lin_api_x', LINEAR_TEAM_ID: 't1' });
  });
});

// ───────────────────────────────────────── supabase

describe('supabase adapter', () => {
  it('paste regex requires sbp_ prefix', () => {
    expect(supabase.pastePrompt.validate('garbage')).toBeTruthy();
    expect(supabase.pastePrompt.validate('sbp_abcdef')).toBeUndefined();
  });

  it('verify lists projects through Management API', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return { status: 200, body: [{ id: 'p1', name: 'Acme', region: 'us-east-1' }] };
    });
    const r = await supabase.verify({ token: 'sbp_x' });
    expect(captured.url).toBe('https://api.supabase.com/v1/projects');
    expect(captured.opts.headers.Authorization).toBe('Bearer sbp_x');
    expect(r.ok).toBe(true);
    expect(r.projects).toHaveLength(1);
  });

  it('verify surfaces no-projects scenario', async () => {
    mockFetch(async () => ({ status: 200, body: [] }));
    const r = await supabase.verify({ token: 'sbp_x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no Supabase projects/);
  });

  it('fetchProjectKeys returns SUPABASE_URL and service_role key', async () => {
    mockFetch(async () => ({
      status: 200,
      body: [
        { name: 'anon', api_key: 'eyJanon...' },
        { name: 'service_role', api_key: 'eyJservice...' },
      ],
    }));
    const r = await supabase.fetchProjectKeys({ token: 'sbp_x', project: { id: 'p1', name: 'Acme' } });
    expect(r.ok).toBe(true);
    expect(r.url).toBe('https://p1.supabase.co');
    expect(r.serviceRoleKey).toBe('eyJservice...');
  });
});

// ───────────────────────────────────────── discord

describe('discord adapter', () => {
  it('paste regex accepts webhook URL and rejects garbage', () => {
    const ok = 'https://discord.com/api/webhooks/123456789/abc-DEF_xyz';
    expect(discord.pastePrompt.validate(ok)).toBeUndefined();
    expect(discord.pastePrompt.validate('https://example.com/foo')).toBeTruthy();
  });

  it('verify hits the same URL and reads metadata', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return { status: 200, body: { id: '123', channel_id: '456', name: 'Bug Reports' } };
    });
    const url = 'https://discord.com/api/webhooks/123456789/abc-DEF_xyz';
    const r = await discord.verify({ token: url });
    expect(captured.url).toBe(url);
    expect(r.ok).toBe(true);
    expect(r.channelId).toBe('456');
  });

  it('verify surfaces 404 as webhook deleted', async () => {
    mockFetch(async () => ({ status: 404, body: { message: 'Unknown Webhook' } }));
    const url = 'https://discord.com/api/webhooks/123456789/abc-DEF_xyz';
    const r = await discord.verify({ token: url });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/deleted/);
  });

  it('envEntries returns DISCORD_WEBHOOK_URL', () => {
    const e = discord.envEntries({ token: 'https://discord.com/api/webhooks/1/x' });
    expect(e.DISCORD_WEBHOOK_URL).toBe('https://discord.com/api/webhooks/1/x');
  });
});

// ───────────────────────────────────────── slack

describe('slack adapter', () => {
  it('paste regex accepts hooks.slack.com URL', () => {
    const ok = 'https://hooks.slack.com/services/T01ABC/B02DEF/abcXYZ123';
    expect(slack.pastePrompt.validate(ok)).toBeUndefined();
    expect(slack.pastePrompt.validate('https://hooks.slack.com/wrong')).toBeTruthy();
  });

  it('buildUrl includes prefilled manifest JSON', () => {
    const url = slack.buildUrl();
    expect(url).toContain('new_app=1');
    expect(url).toContain('manifest_json=');
    const manifest = JSON.parse(decodeURIComponent(url.split('manifest_json=')[1]));
    expect(manifest.display_information.name).toBe('react-visual-feedback');
    expect(manifest.oauth_config.scopes.bot).toContain('incoming-webhook');
  });

  it('verify POSTs a test message and accepts "ok"', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return { status: 200, body: 'ok', contentType: 'text/plain' };
    });
    const url = 'https://hooks.slack.com/services/T01/B02/secret';
    const r = await slack.verify({ token: url });
    expect(captured.url).toBe(url);
    expect(captured.opts.method).toBe('POST');
    expect(r.ok).toBe(true);
  });

  it('verify surfaces Slack error strings', async () => {
    mockFetch(async () => ({ status: 200, body: 'no_service', contentType: 'text/plain' }));
    const r = await slack.verify({ token: 'https://hooks.slack.com/services/T/B/x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no_service/);
  });

  it('envEntries returns SLACK_WEBHOOK_URL', () => {
    const e = slack.envEntries({ token: 'https://hooks.slack.com/services/T/B/x' });
    expect(e.SLACK_WEBHOOK_URL).toBe('https://hooks.slack.com/services/T/B/x');
  });
});
