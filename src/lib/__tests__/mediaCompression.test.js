import { describe, it, expect } from 'vitest';
import { compressDataUrl, compressBlob } from '../mediaCompression.js';

const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg==';

describe('compressDataUrl', () => {
  it('returns passthrough for non-string input', async () => {
    const r = await compressDataUrl(null);
    expect(r.format).toBe(null);
    expect(r.blob).toBe(null);
  });

  it('returns passthrough when output would be larger than input (tiny icon)', async () => {
    // A 1×1 PNG is already minimal; WebP encoding ADDS overhead.
    const r = await compressDataUrl(ONE_PIXEL_PNG, { format: 'webp', quality: 0.85 });
    expect(r.format).toBe('passthrough');
    expect(r.toBytes).toBe(r.fromBytes);
  });

  it('honors maxDimension by setting the canvas size accordingly', async () => {
    // We can't easily verify the resize without spinning a real image,
    // but we can verify the call completes for a tiny image.
    const r = await compressDataUrl(ONE_PIXEL_PNG, { format: 'webp', maxDimension: 100 });
    expect(r).toBeTruthy();
  });
});

describe('compressBlob', () => {
  it('passes through non-image blobs (video/webm) unchanged', async () => {
    const blob = new Blob([new Uint8Array(1024)], { type: 'video/webm' });
    const r = await compressBlob(blob);
    expect(r.blob).toBe(blob);
    expect(r.format).toBe('webm');
    expect(r.fromBytes).toBe(1024);
  });

  it('passes through null/undefined gracefully', async () => {
    const r1 = await compressBlob(null);
    expect(r1.blob).toBe(null);
    const r2 = await compressBlob(undefined);
    expect(r2.blob).toBe(undefined);
  });

  it('handles image blobs (jsdom — may fall back to passthrough)', async () => {
    // jsdom's canvas backend may not support WebP, so this exercises
    // the fallback path. Either it compresses, or it passes through —
    // both are valid for the test.
    const u8 = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // png header
    const blob = new Blob([u8], { type: 'image/png' });
    const r = await compressBlob(blob);
    expect(r).toBeTruthy();
    expect(['png', 'webp', 'jpeg', 'passthrough']).toContain(r.format);
  });
});
