/**
 * Client-side flow for the signed-URL upload strategy.
 *
 *   const next = await uploadViaSignedUrl(payload, {
 *     endpoint: '/api/feedback/upload-url'
 *   })
 *
 * The returned `next` is the original payload with binary fields
 * (screenshot dataUrl / videoBlob / attachment) replaced by the
 * resulting public/signed read URLs. Submissions sent downstream
 * carry only metadata + URLs — never base64 binary, never multipart
 * traffic to the host's app server.
 *
 * Flow:
 *   1. inventory binaries on the payload
 *   2. POST { files: [{ name, mimeType, size }, …] } to endpoint
 *   3. PUT each binary to its signed URL in parallel
 *   4. replace each binary field with { url: finalUrl, mimeType, size, uploadedAt }
 *
 * Falls back to returning the original payload (no change) if the
 * upload-URL request fails — the next layer (proxyPost) will then
 * use multipart instead. Failure never blocks submission.
 */

function dataUrlToBlob(dataUrl) {
  try {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/data:([^;]+)/) || [null, 'application/octet-stream'])[1];
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime });
  } catch { return null; }
}

function isBlobLike(v) {
  if (!v) return false;
  if (typeof Blob !== 'undefined' && v instanceof Blob) return true;
  return typeof v === 'object' && typeof v.size === 'number' && typeof v.type === 'string';
}

function inventoryBinaries(payload) {
  const entries = [];
  // Prefer the pre-encoded Blob if FeedbackProvider's compression step
  // produced one — saves the dataUrl base64 round-trip.
  if (payload?.screenshotBlob && isBlobLike(payload.screenshotBlob)) {
    const b = payload.screenshotBlob;
    entries.push({ key: 'screenshot', blob: b, mimeType: b.type || 'image/webp', size: b.size });
  } else if (payload?.screenshot) {
    let blob = null;
    if (isBlobLike(payload.screenshot)) blob = payload.screenshot;
    else if (typeof payload.screenshot === 'string' && payload.screenshot.startsWith('data:image/')) {
      blob = dataUrlToBlob(payload.screenshot);
    }
    if (blob) entries.push({ key: 'screenshot', blob, mimeType: blob.type || 'image/webp', size: blob.size });
  }
  if (payload?.videoBlob && isBlobLike(payload.videoBlob)) {
    entries.push({ key: 'videoBlob', blob: payload.videoBlob, mimeType: payload.videoBlob.type || 'video/webm', size: payload.videoBlob.size });
  }
  if (payload?.attachment && isBlobLike(payload.attachment)) {
    entries.push({ key: 'attachment', blob: payload.attachment, mimeType: payload.attachment.type || 'application/octet-stream', size: payload.attachment.size });
  }
  return entries;
}

export async function uploadViaSignedUrl(payload, opts = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const endpoint = opts.endpoint || '/api/feedback/upload-url';
  const entries = inventoryBinaries(payload);
  if (entries.length === 0) return payload;

  // 1. Ask the host server for signed URLs.
  let signed;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        files: entries.map((e) => ({ name: e.key, mimeType: e.mimeType, size: e.size })),
      }),
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error(`upload-url ${res.status}`);
    const body = await res.json();
    signed = body?.data?.uploads || body?.uploads;
    if (!Array.isArray(signed) || signed.length !== entries.length) {
      throw new Error('upload-url returned unexpected shape');
    }
  } catch {
    // Fall back: return payload unchanged so proxyPost uses multipart instead.
    return payload;
  }

  // 2. PUT each binary in parallel.
  const next = { ...payload };
  const uploads = entries.map(async (e, i) => {
    const sig = signed[i];
    try {
      const res = await fetch(sig.url, {
        method: 'PUT',
        headers: sig.headers || {},
        body: e.blob,
      });
      if (!res.ok) throw new Error(`PUT ${sig.url.slice(0, 80)} returned ${res.status}`);
      // After upload, drop the binary AND the stand-in Blob so neither
      // gets re-serialized downstream.
      if (e.key === 'screenshot') delete next.screenshotBlob;
      next[e.key] = {
        url: sig.finalUrl,
        mimeType: e.mimeType,
        size: e.size,
        uploadedAt: new Date().toISOString(),
      };
    } catch (err) {
      // One file failed — leave the original on the payload so the
      // next layer (proxyPost multipart) carries it instead.
      next[`${e.key}UploadError`] = err?.message || String(err);
    }
  });
  await Promise.all(uploads);

  // Tag the payload so downstream sees how it was uploaded.
  next.uploadedVia = 'signed-url';
  return next;
}
