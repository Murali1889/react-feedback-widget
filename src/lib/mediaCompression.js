/**
 * Media compression — browser-side, pure helpers.
 *
 *   compressDataUrl(dataUrl, opts) → Promise<{ blob, dataUrl, fromBytes, toBytes, format }>
 *
 * The default `format: 'webp'` with `quality: 0.85` typically shrinks a
 * full-viewport PNG screenshot from ~1.2 MB to ~140 KB (~9× smaller)
 * with no perceptible quality loss for UI screenshots.
 *
 * Falls back to JPEG if the browser refuses WebP encoding for the input
 * (rare — every modern engine supports WebP toBlob since 2021), and
 * returns the original blob untouched if encoding fails or the output
 * would actually be LARGER than the input (small icons, already-tiny
 * images).
 *
 * Optional `maxDimension` caps the longest edge in pixels — useful when
 * a 4K capture is overkill for the issue tracker thumbnail.
 *
 * Returns the dataUrl too so callers using the inline strategy
 * (local() / localStorage) keep working without code changes.
 */

const DEFAULTS = {
  format: 'webp',
  quality: 0.85,
  maxDimension: null, // null = no resize
};

function estimateDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== 'string') return 0;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  // base64 → bytes: 4 chars per 3 bytes, minus padding
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`image load failed: ${e?.message || 'unknown'}`));
    img.src = src;
  });
}

import { compressInWorker } from './imageCompressorWorker.js';

async function blobToDataUrl(blob) {
  // Browser path
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  }
  // Node fallback (tests, isomorphic callers)
  if (typeof blob.arrayBuffer === 'function' && typeof Buffer !== 'undefined') {
    const buf = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type || 'application/octet-stream'};base64,${buf.toString('base64')}`;
  }
  throw new Error('blobToDataUrl: no FileReader or Buffer available');
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      // jsdom fallback — synthesise a Blob from a fake dataUrl
      try {
        const dataUrl = canvas.toDataURL(mime, quality);
        const bin = atob(dataUrl.split(',')[1] || '');
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
        resolve(new Blob([u8], { type: mime }));
      } catch (e) { reject(e); }
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error(`canvas.toBlob returned null for ${mime}`));
      resolve(blob);
    }, mime, quality);
  });
}

/**
 * Compress a data: URL (or http(s) URL) image.
 * Always resolves — on error returns the input unchanged.
 *
 * Strategy:
 *   1. If OffscreenCanvas + createImageBitmap are available, dispatch
 *      to the inline image worker (no main-thread block).
 *   2. Otherwise fall back to main-thread <Image> + <canvas>.
 *
 * Returns { blob, dataUrl, fromBytes, toBytes, format, encodedOn }
 * where `encodedOn: 'worker' | 'main' | 'passthrough'` makes the
 * acceleration measurable.
 *
 * When the caller doesn't need the inline data URL (multipart /
 * signed-URL strategy), pass `opts.skipDataUrl = true` to skip the
 * blob→dataUrl roundtrip — saves ~10-30ms for medium images.
 */
export async function compressDataUrl(dataUrl, opts = {}) {
  const { format, quality, maxDimension, skipDataUrl } = { ...DEFAULTS, ...opts };
  if (typeof dataUrl !== 'string' || !dataUrl) {
    return { blob: null, dataUrl: null, fromBytes: 0, toBytes: 0, format: null, encodedOn: 'passthrough' };
  }
  const fromBytes = estimateDataUrlBytes(dataUrl);

  // ── Fast path: OffscreenCanvas worker ─────────────────────────────────
  try {
    const workerPromise = compressInWorker({ dataUrl, format, quality, maxDimension });
    if (workerPromise) {
      const r = await workerPromise;
      if (r?.blob && r.blob.size > 0) {
        if (r.blob.size >= fromBytes) {
          return { blob: null, dataUrl, fromBytes, toBytes: fromBytes, format: 'passthrough', encodedOn: 'passthrough' };
        }
        const outDataUrl = skipDataUrl ? null : await blobToDataUrl(r.blob);
        return {
          blob: r.blob,
          dataUrl: outDataUrl,
          fromBytes,
          toBytes: r.blob.size,
          format: format,
          encodedOn: 'worker',
        };
      }
    }
  } catch {
    // worker failed — fall through to main-thread path
  }

  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    return { blob: null, dataUrl, fromBytes, toBytes: fromBytes, format: 'passthrough', encodedOn: 'passthrough' };
  }

  let img;
  try { img = await loadImage(dataUrl); }
  catch { return { blob: null, dataUrl, fromBytes, toBytes: fromBytes, format: 'passthrough', encodedOn: 'passthrough' }; }

  // Compute target dimensions
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (maxDimension && Math.max(w, h) > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: null, dataUrl, fromBytes, toBytes: fromBytes, format: 'passthrough', encodedOn: 'passthrough' };
  ctx.drawImage(img, 0, 0, w, h);

  // Try the requested format first, fall back to JPEG
  const candidates = format === 'webp'
    ? ['image/webp', 'image/jpeg']
    : format === 'jpeg'
      ? ['image/jpeg']
      : ['image/png'];

  for (const mime of candidates) {
    try {
      const blob = await canvasToBlob(canvas, mime, quality);
      if (!blob) continue;
      // If compression made it bigger (small icons), return original.
      if (blob.size >= fromBytes) {
        return { blob: null, dataUrl, fromBytes, toBytes: fromBytes, format: 'passthrough', encodedOn: 'passthrough' };
      }
      const newDataUrl = skipDataUrl ? null : await blobToDataUrl(blob);
      return {
        blob,
        dataUrl: newDataUrl,
        fromBytes,
        toBytes: blob.size,
        format: mime.split('/')[1],
        encodedOn: 'main',
      };
    } catch { /* try next */ }
  }

  return { blob: null, dataUrl, fromBytes, toBytes: fromBytes, format: 'passthrough', encodedOn: 'passthrough' };
}

/**
 * Compress an existing Blob (e.g. a screenshot already as a Blob).
 * Currently a passthrough for non-image / unknown types.
 */
export async function compressBlob(blob, opts = {}) {
  if (!blob || !(blob instanceof Blob)) return { blob, fromBytes: 0, toBytes: 0, format: 'passthrough' };
  if (!blob.type.startsWith('image/')) {
    // Video / audio / other — re-encoding in-browser is impractical;
    // pass through. The host can plumb their own preprocessor.
    return { blob, fromBytes: blob.size, toBytes: blob.size, format: blob.type.split('/')[1] || 'passthrough' };
  }
  const dataUrl = await blobToDataUrl(blob);
  const result = await compressDataUrl(dataUrl, opts);
  return { blob: result.blob || blob, fromBytes: result.fromBytes, toBytes: result.toBytes, format: result.format };
}
