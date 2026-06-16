import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUploadUrlHandler } from '../upload-url.js';

const AUTH_CTX = { authContext: { userId: 'u1', projectId: 'p1', role: 'developer' } };

let origFetch;
beforeEach(() => { origFetch = global.fetch; });
afterEach(() => { global.fetch = origFetch; });

describe('createUploadUrlHandler — s3/r2 provider', () => {
  it('signs N URLs for valid file requests', async () => {
    const handler = createUploadUrlHandler({
      provider: 's3',
      accessKeyId: 'AKIA0000',
      secretAccessKey: 'SSS',
      bucket: 'feedback',
      region: 'us-east-1',
      endpoint: 'https://s3.us-east-1.amazonaws.com',
    });
    const result = await handler(
      { files: [
          { name: 'screenshot', mimeType: 'image/webp', size: 18432 },
          { name: 'video',      mimeType: 'video/webm', size: 5_000_000 },
      ]},
      AUTH_CTX
    );
    expect(result.data.uploads).toHaveLength(2);
    const [a, b] = result.data.uploads;
    expect(a.name).toBe('screenshot');
    expect(a.url).toContain('X-Amz-Signature=');
    expect(a.finalUrl).toContain('screenshot.webp');
    expect(b.url).toContain('X-Amz-Signature=');
    expect(b.finalUrl).toContain('video.webm');
  });

  it('rejects mimetypes not in allowedMimes', async () => {
    const handler = createUploadUrlHandler({
      provider: 's3',
      accessKeyId: 'AKIA', secretAccessKey: 'S',
      bucket: 'b', endpoint: 'https://x.com',
    });
    await expect(handler({ files: [{ name: 'x', mimeType: 'application/x-malware', size: 100 }] }, AUTH_CTX))
      .rejects.toThrow(/not allowed/);
  });

  it('rejects files larger than maxBytesPerFile', async () => {
    const handler = createUploadUrlHandler({
      provider: 's3',
      accessKeyId: 'AKIA', secretAccessKey: 'S',
      bucket: 'b', endpoint: 'https://x.com',
      maxBytesPerFile: 100,
    });
    await expect(handler({ files: [{ name: 'x', mimeType: 'image/webp', size: 200 }] }, AUTH_CTX))
      .rejects.toThrow(/size/);
  });

  it('rejects requests with too many files', async () => {
    const handler = createUploadUrlHandler({
      provider: 's3',
      accessKeyId: 'AKIA', secretAccessKey: 'S',
      bucket: 'b', endpoint: 'https://x.com',
      maxFilesPerRequest: 2,
    });
    await expect(handler({ files: [
      { name: 'a', mimeType: 'image/webp', size: 1 },
      { name: 'b', mimeType: 'image/webp', size: 1 },
      { name: 'c', mimeType: 'image/webp', size: 1 },
    ] }, AUTH_CTX)).rejects.toThrow(/too many/);
  });

  it('scopes the storage path by authContext.projectId/userId', async () => {
    const handler = createUploadUrlHandler({
      provider: 's3',
      accessKeyId: 'AKIA', secretAccessKey: 'S',
      bucket: 'b', endpoint: 'https://x.com',
    });
    const result = await handler(
      { files: [{ name: 'a', mimeType: 'image/webp', size: 100 }] },
      { authContext: { userId: 'alice', projectId: 'acme' } }
    );
    expect(result.data.uploads[0].finalUrl).toMatch(/\/acme\/alice\//);
  });

  it('throws on unknown provider', async () => {
    const handler = createUploadUrlHandler({ provider: 'wat' });
    await expect(handler({ files: [{ name: 'a', mimeType: 'image/webp', size: 1 }] }, AUTH_CTX))
      .rejects.toThrow(/unknown provider/);
  });

  it('honors a custom signer function', async () => {
    const customSigner = vi.fn().mockResolvedValue({
      url: 'https://my-store/PUT',
      finalUrl: 'https://my-store/file',
      headers: { 'x-custom': 'v' },
      expiresAt: '2026-01-01T00:00:00Z',
    });
    const handler = createUploadUrlHandler({ provider: customSigner });
    const result = await handler(
      { files: [{ name: 'screenshot', mimeType: 'image/webp', size: 100 }] },
      AUTH_CTX
    );
    expect(customSigner).toHaveBeenCalled();
    expect(result.data.uploads[0].url).toBe('https://my-store/PUT');
  });
});

describe('createUploadUrlHandler — supabase provider', () => {
  it('hits the supabase signed-upload-URL REST endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: '/object/upload/sign/feedback/p1/u1/abc/screenshot.webp?token=t' }),
    });
    global.fetch = fetchMock;
    const handler = createUploadUrlHandler({
      provider: 'supabase',
      supabaseUrl: 'https://abc.supabase.co',
      serviceKey: 'srv',
      bucket: 'feedback',
    });
    const result = await handler(
      { files: [{ name: 'screenshot', mimeType: 'image/webp', size: 1024 }] },
      AUTH_CTX
    );
    expect(fetchMock).toHaveBeenCalled();
    expect(result.data.uploads[0].url).toContain('token=t');
    expect(result.data.uploads[0].finalUrl).toContain('object/public/feedback/');
  });
});
