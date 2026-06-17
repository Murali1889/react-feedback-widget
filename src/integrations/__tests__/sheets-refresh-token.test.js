/**
 * Server-side test for SheetsRefreshTokenClient.
 *
 * Validates the CLI-onboarded OAuth flow at request time: env vars
 * → refresh token → access token (cached) → Sheets append.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSheetsHandler } from '../sheets.js';

const origEnv = { ...process.env };

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'CID';
  process.env.GOOGLE_CLIENT_SECRET = 'CS';
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = 'RT';
  process.env.GOOGLE_SPREADSHEET_ID = 'SP-1';
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...origEnv };
  global.fetch = undefined;
});

function mockSequence(responses) {
  let i = 0;
  global.fetch.mockImplementation(async (url, opts) => {
    const r = responses[i++];
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => r.body,
      text: async () => typeof r.body === 'string' ? r.body : JSON.stringify(r.body),
      _capturedUrl: url,
      _capturedOpts: opts,
    };
  });
}

describe('SheetsRefreshTokenClient via createSheetsHandler', () => {
  it('picks the refresh-token client when GOOGLE_OAUTH_REFRESH_TOKEN is set', async () => {
    mockSequence([
      // 1. token refresh
      { status: 200, body: { access_token: 'AT', expires_in: 3600 } },
      // 2. ensureHeaders read (returns no rows → triggers header write)
      { status: 200, body: { values: [['existing']] } },
      // 3. append row
      { status: 200, body: { updates: { updatedRange: 'Feedback!A2:Z2' } } },
    ]);

    const handler = createSheetsHandler({ __suppressInsecureWarning: true });
    const res = await handler(
      { body: { action: 'append', feedbackData: { id: 'fb-1', feedback: 'works' } } },
      null
    );
    const body = JSON.parse(await res.text());
    expect(body.success).toBe(true);

    // First call should be the token refresh
    const firstCallArgs = global.fetch.mock.calls[0];
    expect(firstCallArgs[0]).toBe('https://oauth2.googleapis.com/token');
    const tokenBody = firstCallArgs[1].body.toString();
    expect(tokenBody).toContain('grant_type=refresh_token');
    expect(tokenBody).toContain('refresh_token=RT');
    expect(tokenBody).toContain('client_id=CID');

    // Subsequent calls go to Sheets API with the access token
    const sheetsCallArgs = global.fetch.mock.calls[1];
    expect(sheetsCallArgs[0]).toMatch(/sheets\.googleapis\.com.*SP-1/);
    expect(sheetsCallArgs[1].headers.Authorization).toBe('Bearer AT');
  });

  it('throws a friendly error if GOOGLE_OAUTH_REFRESH_TOKEN is missing client id/secret', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const handler = createSheetsHandler({ __suppressInsecureWarning: true });
    const res = await handler({ body: { action: 'append', feedbackData: {} } }, null);
    const body = JSON.parse(await res.text());
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/GOOGLE_CLIENT_ID/);
  });

  it('caches the access token within the same handler instance', async () => {
    // We construct the client once via handler(), and the in-memory cache
    // lives on the client instance — verify via a single append that the
    // token refresh happens exactly once even though Sheets fetches twice.
    mockSequence([
      { status: 200, body: { access_token: 'AT-cached', expires_in: 3600 } },
      { status: 200, body: { values: [['existing']] } },
      { status: 200, body: { updates: { updatedRange: 'Feedback!A2:Z2' } } },
    ]);

    const handler = createSheetsHandler({ __suppressInsecureWarning: true });
    await handler({ body: { action: 'append', feedbackData: { id: 'fb-1' } } }, null);

    const tokenCalls = global.fetch.mock.calls
      .filter((c) => c[0] === 'https://oauth2.googleapis.com/token');
    expect(tokenCalls.length).toBe(1);
  });
});
