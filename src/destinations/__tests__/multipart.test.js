import { describe, it, expect } from 'vitest';
import { buildMultipartFromPayload, readMultipartRequest } from '../multipart.js';

const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg==';

describe('buildMultipartFromPayload', () => {
  it('returns null when no binary fields are present', () => {
    const fd = buildMultipartFromPayload({ feedback: 'hello', type: 'bug' });
    expect(fd).toBe(null);
  });

  it('extracts a Blob screenshot into a part + JSON metadata', () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' });
    const fd = buildMultipartFromPayload({ feedback: 'broken', screenshot: blob });
    expect(fd).not.toBeNull();
    expect(fd.get('screenshot')).toBeTruthy();
    const metadataPart = fd.get('feedback');
    expect(metadataPart).toBeTruthy();
  });

  it('converts a data: URL screenshot into a Blob part', async () => {
    const fd = buildMultipartFromPayload({ feedback: 'broken', screenshot: ONE_PIXEL_PNG });
    expect(fd).not.toBeNull();
    const part = fd.get('screenshot');
    expect(part).toBeTruthy();
    expect(part.size).toBeGreaterThan(0);
  });

  it('extracts a videoBlob', () => {
    const vid = new Blob([new Uint8Array(512)], { type: 'video/webm' });
    const fd = buildMultipartFromPayload({ feedback: 'broken', videoBlob: vid });
    expect(fd).not.toBeNull();
    const part = fd.get('video');
    expect(part).toBeTruthy();
    expect(part.size).toBe(512);
  });

  it('extracts an attachment file', () => {
    const file = new Blob([new Uint8Array(256)], { type: 'application/zip' });
    const fd = buildMultipartFromPayload({ feedback: 'broken', attachment: file });
    expect(fd.get('attachment')).toBeTruthy();
  });

  it('feedback metadata in the form is the original minus the binaries', async () => {
    const blob = new Blob([new Uint8Array([0xff])], { type: 'image/jpeg' });
    const payload = {
      feedback: 'pay button broken',
      severity: 'P1',
      labels: ['ui'],
      screenshot: blob,
      videoBlob: new Blob([new Uint8Array(1)], { type: 'video/webm' }),
    };
    const fd = buildMultipartFromPayload(payload);
    const text = await fd.get('feedback').text();
    const reconstructed = JSON.parse(text);
    expect(reconstructed.feedback).toBe('pay button broken');
    expect(reconstructed.severity).toBe('P1');
    expect(reconstructed.labels).toEqual(['ui']);
    expect(reconstructed.screenshot).toBeUndefined();
    expect(reconstructed.videoBlob).toBeUndefined();
  });
});

describe('readMultipartRequest', () => {
  it('parses a Web Request with multipart/form-data', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' });
    const fd = buildMultipartFromPayload({
      feedback: 'broken',
      severity: 'P0',
      screenshot: blob,
    });
    const req = new Request('http://localhost/api/feedback/github', {
      method: 'POST', body: fd,
    });
    const parsed = await readMultipartRequest(req);
    expect(parsed.feedback.feedback).toBe('broken');
    expect(parsed.feedback.severity).toBe('P0');
    expect(parsed.screenshot).toBeTruthy();
    expect(parsed.screenshot.size).toBeGreaterThan(0);
    expect(parsed.video).toBeUndefined();
  });
});
