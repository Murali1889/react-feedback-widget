import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadViaSignedUrl } from '../signedUrlUpload.js';

let origFetch;
beforeEach(() => { origFetch = global.fetch; });
afterEach(() => { global.fetch = origFetch; });

const tinyBlob = (mime, size = 1024) => new Blob([new Uint8Array(size)], { type: mime });

describe('uploadViaSignedUrl', () => {
  it('returns the payload unchanged when no binaries are present', async () => {
    const payload = { feedback: 'hi' };
    const r = await uploadViaSignedUrl(payload);
    expect(r).toEqual(payload);
  });

  it('requests signed URLs and PUTs blobs in parallel, replaces binary fields with URLs', async () => {
    const fetchMock = vi.fn()
      // upload-url request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { uploads: [
            { name: 'screenshot', url: 'https://store/A', finalUrl: 'https://cdn/A', headers: { 'content-type': 'image/webp' } },
            { name: 'videoBlob',  url: 'https://store/B', finalUrl: 'https://cdn/B', headers: { 'content-type': 'video/webm' } },
          ]},
        }),
      })
      // PUT screenshot
      .mockResolvedValueOnce({ ok: true })
      // PUT video
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock;

    const payload = {
      feedback: 'broken',
      screenshot: tinyBlob('image/webp', 2048),
      videoBlob:  tinyBlob('video/webm', 4096),
    };
    const r = await uploadViaSignedUrl(payload);
    expect(r.screenshot.url).toBe('https://cdn/A');
    expect(r.screenshot.mimeType).toBe('image/webp');
    expect(r.screenshot.size).toBe(2048);
    expect(r.videoBlob.url).toBe('https://cdn/B');
    expect(r.uploadedVia).toBe('signed-url');
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 request + 2 PUTs
  });

  it('converts a data: URL screenshot into a Blob and uploads it', async () => {
    const dataUrl = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJZwCdAEO/bcAAA==';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: [
          { name: 'screenshot', url: 'https://store/A', finalUrl: 'https://cdn/A' },
        ]}),
      })
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock;
    const r = await uploadViaSignedUrl({ feedback: 'x', screenshot: dataUrl });
    expect(r.screenshot.url).toBe('https://cdn/A');
  });

  it('returns the payload unchanged if upload-url request fails (fallback to multipart)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const payload = { feedback: 'x', screenshot: tinyBlob('image/webp') };
    const r = await uploadViaSignedUrl(payload);
    expect(r.screenshot).toBe(payload.screenshot); // unchanged
    expect(r.uploadedVia).toBeUndefined();
  });

  it('records per-file PUT errors without dropping the original blob', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: [
          { name: 'screenshot', url: 'https://store/A', finalUrl: 'https://cdn/A' },
        ]}),
      })
      .mockResolvedValueOnce({ ok: false, status: 502, text: async () => 'bad gateway' });
    global.fetch = fetchMock;
    const original = tinyBlob('image/webp');
    const r = await uploadViaSignedUrl({ feedback: 'x', screenshot: original });
    expect(r.screenshotUploadError).toMatch(/502/);
    expect(r.uploadedVia).toBe('signed-url');
  });
});
