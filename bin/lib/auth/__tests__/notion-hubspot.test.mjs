/**
 * Notion + HubSpot adapter tests — Phase 2.
 *
 * Notion's polling loop and HubSpot's scope-specific 403 message
 * are the load-bearing behaviors; both have dedicated tests below.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import notion, { pollForDatabases } from '../adapters/notion.mjs';
import hubspot from '../adapters/hubspot.mjs';

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

// ───────────────────────────────────────── notion

describe('notion adapter', () => {
  it('paste regex accepts both ntn_ and secret_ shapes', () => {
    expect(notion.pastePrompt.validate('ntn_AAAAAAAAAAAAAAAA')).toBeUndefined();
    expect(notion.pastePrompt.validate('secret_AAAAAAAAAAAAAAAA')).toBeUndefined();
    expect(notion.pastePrompt.validate('garbage')).toBeTruthy();
    expect(notion.pastePrompt.validate('ntn_short')).toBeTruthy();
  });

  it('verify sets Notion-Version header and uses Bearer', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return { status: 200, body: { bot: { workspace_name: 'Acme HQ' } } };
    });
    const r = await notion.verify({ token: 'ntn_x' });
    expect(captured.url).toBe('https://api.notion.com/v1/users/me');
    expect(captured.opts.headers.Authorization).toBe('Bearer ntn_x');
    expect(captured.opts.headers['Notion-Version']).toBeTruthy();
    expect(r.ok).toBe(true);
    expect(r.workspaceName).toBe('Acme HQ');
  });

  it('verify surfaces 401 distinctly', async () => {
    mockFetch(async () => ({ status: 401, body: { message: 'invalid' } }));
    const r = await notion.verify({ token: 'ntn_x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Notion rejected/);
  });

  it('envEntries returns NOTION_TOKEN + NOTION_DB_ID', () => {
    const e = notion.envEntries({ token: 'ntn_x', database: { id: 'db-uuid', title: 'Bugs' } });
    expect(e).toEqual({ NOTION_TOKEN: 'ntn_x', NOTION_DB_ID: 'db-uuid' });
  });
});

describe('notion polling', () => {
  it('returns databases as soon as one appears', async () => {
    let calls = 0;
    mockFetch(async (url) => {
      expect(url).toBe('https://api.notion.com/v1/search');
      calls++;
      return {
        status: 200,
        body: {
          results: [
            { id: 'db-1', object: 'database', title: [{ plain_text: 'Bugs' }] },
          ],
        },
      };
    });
    const dbs = await pollForDatabases({ token: 'ntn_x', intervalMs: 1, timeoutMs: 1000 });
    expect(dbs).toEqual([{ id: 'db-1', title: 'Bugs' }]);
    expect(calls).toBe(1);
  });

  it('keeps polling while results are empty, returns on first hit', async () => {
    let calls = 0;
    mockFetch(async () => {
      calls++;
      if (calls < 3) return { status: 200, body: { results: [] } };
      return {
        status: 200,
        body: { results: [{ id: 'db-2', object: 'database', title: [{ plain_text: 'Feedback' }] }] },
      };
    });
    const dbs = await pollForDatabases({ token: 'ntn_x', intervalMs: 1, timeoutMs: 1000 });
    expect(calls).toBe(3);
    expect(dbs[0].title).toBe('Feedback');
  });

  it('returns [] when timeout elapses with no databases', async () => {
    mockFetch(async () => ({ status: 200, body: { results: [] } }));
    let t = 0;
    const dbs = await pollForDatabases({
      token: 'ntn_x',
      intervalMs: 1,
      timeoutMs: 5,
      now: () => (t += 10),
    });
    expect(dbs).toEqual([]);
  });

  it('handles untitled databases without crashing', async () => {
    mockFetch(async () => ({
      status: 200,
      body: { results: [{ id: 'db-3', object: 'database', title: [] }] },
    }));
    const dbs = await pollForDatabases({ token: 'ntn_x', intervalMs: 1, timeoutMs: 1000 });
    expect(dbs[0].title).toBe('(untitled database)');
  });

  it('sends a Notion search request shaped correctly', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return { status: 200, body: { results: [{ id: 'x', title: [{ plain_text: 't' }] }] } };
    });
    await pollForDatabases({ token: 'ntn_x', intervalMs: 1, timeoutMs: 1000 });
    expect(captured.opts.method).toBe('POST');
    expect(captured.opts.headers.Authorization).toBe('Bearer ntn_x');
    const body = JSON.parse(captured.opts.body);
    expect(body.filter).toEqual({ value: 'database', property: 'object' });
  });
});

// ───────────────────────────────────────── hubspot

describe('hubspot adapter', () => {
  it('paste regex requires pat-<region>- shape', () => {
    expect(hubspot.pastePrompt.validate('garbage')).toBeTruthy();
    expect(hubspot.pastePrompt.validate('pat-na1-abc-def')).toBeUndefined();
    expect(hubspot.pastePrompt.validate('pat-eu1-xyz')).toBeUndefined();
    expect(hubspot.pastePrompt.validate('pat-')).toBeTruthy();
  });

  it('verify hits /crm/v3/objects/tickets with Bearer', async () => {
    let captured;
    mockFetch(async (url, opts) => {
      captured = { url, opts };
      return { status: 200, body: { results: [] } };
    });
    const r = await hubspot.verify({ token: 'pat-na1-x' });
    expect(captured.url).toBe('https://api.hubapi.com/crm/v3/objects/tickets?limit=1');
    expect(captured.opts.headers.Authorization).toBe('Bearer pat-na1-x');
    expect(r.ok).toBe(true);
  });

  it('verify 403 with "scope" word surfaces missing-tickets-scope hint', async () => {
    mockFetch(async () => ({
      status: 403,
      body: { message: 'Authorization failed; token does not have required scopes' },
    }));
    const r = await hubspot.verify({ token: 'pat-na1-x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/tickets/);
    expect(r.message).toMatch(/scope/i);
  });

  it('verify 403 without "scope" word falls through to generic', async () => {
    mockFetch(async () => ({ status: 403, body: { message: 'Forbidden by ACL' } }));
    const r = await hubspot.verify({ token: 'pat-na1-x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Forbidden by ACL/);
  });

  it('verify 401 distinct from 403', async () => {
    mockFetch(async () => ({ status: 401, body: {} }));
    const r = await hubspot.verify({ token: 'pat-na1-x' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/401/);
  });

  it('envEntries returns HUBSPOT_TOKEN + HUBSPOT_PIPELINE + HUBSPOT_STAGE', () => {
    const e = hubspot.envEntries({
      token: 'pat-na1-x',
      pipeline: { id: 'pip-1', label: 'Support' },
      stage: { id: 'stg-1', label: 'New' },
    });
    expect(e).toEqual({
      HUBSPOT_TOKEN: 'pat-na1-x',
      HUBSPOT_PIPELINE: 'pip-1',
      HUBSPOT_STAGE: 'stg-1',
    });
  });
});
