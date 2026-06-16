import { describe, it, expect } from 'vitest';
import { presignS3Put } from '../uploadSign/awsV4.js';

describe('presignS3Put', () => {
  // Pinned date so the signature is deterministic.
  const FIXED = new Date('2026-06-16T14:35:01Z');

  it('produces a URL with the required X-Amz query params', () => {
    const { url, headers, finalUrl, expiresAt } = presignS3Put({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      bucket: 'feedback',
      key: 'project-1/abc.webp',
      region: 'us-east-1',
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      contentType: 'image/webp',
      expiresSeconds: 300,
      now: FIXED,
    });
    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(url).toContain('X-Amz-Credential=');
    expect(url).toContain('X-Amz-Date=20260616T143501Z');
    expect(url).toContain('X-Amz-Expires=300');
    expect(url).toContain('X-Amz-SignedHeaders=host');
    expect(url).toContain('X-Amz-Signature=');
    expect(headers['content-type']).toBe('image/webp');
    expect(finalUrl).toContain('/feedback/project-1/abc.webp');
    expect(expiresAt).toMatch(/2026-06-16T14:40:01/);
  });

  it('signs differently for different keys (catches typos against fixtures)', () => {
    const base = {
      accessKeyId: 'AKIA0000', secretAccessKey: 'SSS',
      bucket: 'feedback', region: 'us-east-1',
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      now: FIXED,
    };
    const a = presignS3Put({ ...base, key: 'a.png' });
    const b = presignS3Put({ ...base, key: 'b.png' });
    const sigA = a.url.match(/X-Amz-Signature=([0-9a-f]+)/)[1];
    const sigB = b.url.match(/X-Amz-Signature=([0-9a-f]+)/)[1];
    expect(sigA).not.toBe(sigB);
  });

  it('honors a custom publicBaseUrl for the read URL', () => {
    const { finalUrl } = presignS3Put({
      accessKeyId: 'AKIA', secretAccessKey: 'SSS',
      bucket: 'feedback', key: 'p/x.webp', region: 'auto',
      endpoint: 'https://account.r2.cloudflarestorage.com',
      publicBaseUrl: 'https://cdn.example.com',
      now: FIXED,
    });
    expect(finalUrl).toBe('https://cdn.example.com/p/x.webp');
  });

  it('throws when credentials missing', () => {
    expect(() => presignS3Put({
      bucket: 'b', key: 'k', endpoint: 'https://x',
    })).toThrow(/credentials/);
  });

  it('encodes path segments safely', () => {
    const { url } = presignS3Put({
      accessKeyId: 'AKIA', secretAccessKey: 'SSS',
      bucket: 'feedback', key: 'projects/abc-123/my file.webp', region: 'us-east-1',
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      now: new Date('2026-01-01T00:00:00Z'),
    });
    expect(url).toContain('my%20file.webp');
    expect(url).toContain('projects/abc-123/');
  });
});
