import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHubspotHandler } from '../hubspot.js';
import { createSlackHandler } from '../slack.js';

const FEEDBACK = {
  feedback: 'Pay button does nothing on /checkout',
  type: 'bug',
  severity: 'P1',
  url: 'https://shop.example.com/checkout',
  userName: 'alice',
  aiTicket: { markdown: '# Bug\n\nFull repro here' },
};
const AUTH_CTX = { authContext: { userId: 'u1', projectId: 'p1', role: 'developer' } };

let origFetch;
beforeEach(() => { origFetch = global.fetch; });
afterEach(() => { global.fetch = origFetch; });

describe('createHubspotHandler', () => {
  it('POSTs to /crm/v3/objects/tickets with severity → priority mapping', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ id: '99', properties: { hs_object_id: '99' } }),
    });
    global.fetch = fetchMock;
    const handler = createHubspotHandler({ token: 'pat-xxx' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('99');
    expect(result.data.url).toContain('app.hubspot.com');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.hubapi.com/crm/v3/objects/tickets');
    expect(init.headers.authorization).toBe('Bearer pat-xxx');
    const body = JSON.parse(init.body);
    expect(body.properties.subject).toContain('Pay button');
    expect(body.properties.hs_ticket_priority).toBe('HIGH'); // P1 → HIGH
    expect(body.properties.content).toContain('Full repro');
  });

  it('throws when HUBSPOT_TOKEN missing', async () => {
    const handler = createHubspotHandler({});
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/HUBSPOT_TOKEN/);
  });

  it('maps severities correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ id: '1' }),
    });
    global.fetch = fetchMock;
    for (const [sev, expected] of [
      ['P0', 'HIGH'], ['P1', 'HIGH'], ['P2', 'MEDIUM'], ['P3', 'LOW'],
      ['critical', 'HIGH'], ['low', 'LOW'],
    ]) {
      const handler = createHubspotHandler({ token: 't' });
      await handler({ ...FEEDBACK, severity: sev }, AUTH_CTX);
      const body = JSON.parse(fetchMock.mock.calls.at(-1)[1].body);
      expect(body.properties.hs_ticket_priority).toBe(expected);
    }
  });

  it('honors HUBSPOT_PIPELINE + HUBSPOT_STAGE', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: '1' }) });
    global.fetch = fetchMock;
    const handler = createHubspotHandler({ token: 't', pipeline: 'pipe-1', stage: 'stage-1' });
    await handler(FEEDBACK, AUTH_CTX);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.properties.hs_pipeline).toBe('pipe-1');
    expect(body.properties.hs_pipeline_stage).toBe('stage-1');
  });
});

describe('createSlackHandler — incoming webhook mode', () => {
  it('POSTs message blocks to SLACK_WEBHOOK_URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock;
    const handler = createSlackHandler({ webhookUrl: 'https://hooks.slack.com/services/AAA/BBB/CCC' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBeNull(); // webhook doesn't return a permalink
    expect(fetchMock.mock.calls[0][0]).toContain('hooks.slack.com');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.attachments[0].color).toBe('#ea580c'); // P1 → orange
    expect(body.attachments[0].blocks[0].text.text).toContain('Pay button');
  });
});

describe('createSlackHandler — bot token mode', () => {
  it('POSTs to chat.postMessage with channel + token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ts: '1700000000.000100', permalink: 'https://acme.slack.com/archives/C0/p1700000000' }),
    });
    global.fetch = fetchMock;
    const handler = createSlackHandler({ botToken: 'xoxb-…', channel: 'C12345' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('1700000000.000100');
    expect(result.data.url).toContain('slack.com/archives');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect(init.headers.authorization).toBe('Bearer xoxb-…');
    const body = JSON.parse(init.body);
    expect(body.channel).toBe('C12345');
  });

  it('surfaces Slack error responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: 'channel_not_found' }),
    });
    global.fetch = fetchMock;
    const handler = createSlackHandler({ botToken: 'xoxb-…', channel: 'C-bogus' });
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/channel_not_found/);
  });

  it('throws when neither webhook nor bot token configured', async () => {
    const handler = createSlackHandler({});
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN/);
  });

  it('throws when bot token is set but channel is missing', async () => {
    const handler = createSlackHandler({ botToken: 'xoxb-…' });
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/SLACK_CHANNEL/);
  });
});
