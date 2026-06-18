import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDiscordHandler } from '../discord.js';

const FEEDBACK = {
  feedback: 'Pay button does nothing on /checkout',
  type: 'bug',
  severity: 'P1',
  url: 'https://shop.example.com/checkout',
  userName: 'alice',
  userEmail: 'alice@acme.com',
  aiTicket: { markdown: '# Bug\n\nFull repro here' },
};
const AUTH_CTX = { authContext: { userId: 'u1', projectId: 'p1', role: 'developer' } };

let origFetch;
beforeEach(() => { origFetch = global.fetch; });
afterEach(() => { global.fetch = origFetch; });

describe('createDiscordHandler', () => {
  it('POSTs an embed to the configured webhook URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'msg-1' }),
    });
    global.fetch = fetchMock;
    const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/123/abc' });
    const result = await handler(FEEDBACK, AUTH_CTX);
    expect(result.data.id).toBe('msg-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/discord\.com\/api\/webhooks\/123\/abc/);
    expect(url).toContain('wait=true');
    const body = JSON.parse(init.body);
    expect(body.embeds[0].title).toContain('Pay button');
    expect(body.embeds[0].description).toContain('Full repro');
    expect(body.embeds[0].color).toBe(0xea580c); // P1 → orange
    expect(body.embeds[0].fields.find((f) => f.name === 'Page').value).toContain('shop.example.com');
  });

  it('maps severities to embed colors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock;
    const cases = [
      ['P0', 0xdc2626], ['P1', 0xea580c], ['P2', 0xf59e0b], ['P3', 0x6b7280],
      ['critical', 0xdc2626], ['low', 0x6b7280],
    ];
    for (const [sev, expected] of cases) {
      const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/1/x' });
      await handler({ ...FEEDBACK, severity: sev }, AUTH_CTX);
      const body = JSON.parse(fetchMock.mock.calls.at(-1)[1].body);
      expect(body.embeds[0].color).toBe(expected);
    }
  });

  it('throws when DISCORD_WEBHOOK_URL missing', async () => {
    const handler = createDiscordHandler({});
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/DISCORD_WEBHOOK_URL/);
  });

  it('surfaces Discord error responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 404,
      text: async () => 'Unknown Webhook',
    });
    const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/1/x' });
    await expect(handler(FEEDBACK, AUTH_CTX)).rejects.toThrow(/discord 404/);
  });

  it('truncates long descriptions to Discord embed limits', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock;
    const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/1/x' });
    await handler({
      ...FEEDBACK,
      feedback: 'x'.repeat(500),
      aiTicket: { markdown: 'y'.repeat(5000) },
    }, AUTH_CTX);
    const body = JSON.parse(fetchMock.mock.calls.at(-1)[1].body);
    expect(body.embeds[0].title.length).toBeLessThanOrEqual(256);
    expect(body.embeds[0].description.length).toBeLessThanOrEqual(4096);
  });
});

describe('createDiscordHandler — binary uploads', () => {
  it('attaches an audio voice memo as files[0] via multipart', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'msg-9', attachments: [{ id: 'a1' }] }),
    });
    global.fetch = fetchMock;
    const audio = new Blob(['fake audio bytes'], { type: 'audio/webm' });
    const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/1/x' });
    const result = await handler({ ...FEEDBACK, audioBlob: audio }, AUTH_CTX);
    expect(result.data.attachments).toBe(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body;
    expect(fd.get('payload_json')).toBeTruthy();
    const file = fd.get('files[0]');
    expect(file).toBeTruthy();
    expect(file.type).toBe('audio/webm');
    expect(typeof file.name === 'string' ? file.name : '').toMatch(/\.webm$/);
  });

  it('attaches screenshot + video + audio + arbitrary file together (up to 10)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'msg-10', attachments: [{}, {}, {}, {}] }),
    });
    global.fetch = fetchMock;
    const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/1/x' });
    await handler({
      ...FEEDBACK,
      screenshot: new Blob(['s'], { type: 'image/png' }),
      videoBlob:  new Blob(['v'], { type: 'video/webm' }),
      audioBlob:  new Blob(['a'], { type: 'audio/webm' }),
      attachment: new Blob(['f'], { type: 'application/pdf' }),
    }, AUTH_CTX);
    const fd = fetchMock.mock.calls[0][1].body;
    expect(fd.get('files[0]')).toBeTruthy();
    expect(fd.get('files[1]')).toBeTruthy();
    expect(fd.get('files[2]')).toBeTruthy();
    expect(fd.get('files[3]')).toBeTruthy();
    const payload = JSON.parse(fd.get('payload_json'));
    expect(payload.embeds[0].image.url).toMatch(/^attachment:\/\/screenshot\./);
  });

  it('converts a data: URL screenshot into a Blob attachment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'msg-11' }),
    });
    global.fetch = fetchMock;
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/1/x' });
    await handler({ ...FEEDBACK, screenshot: pngDataUrl }, AUTH_CTX);
    const fd = fetchMock.mock.calls[0][1].body;
    const part = fd.get('files[0]');
    expect(part).toBeTruthy();
    expect(part.type).toBe('image/png');
  });

  it('falls back to JSON-only POST when no binaries present', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'msg-12' }),
    });
    global.fetch = fetchMock;
    const handler = createDiscordHandler({ webhookUrl: 'https://discord.com/api/webhooks/1/x' });
    await handler({ ...FEEDBACK }, AUTH_CTX);
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers['content-type']).toBe('application/json');
    expect(typeof init.body).toBe('string');
  });
});
