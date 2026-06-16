/**
 * Multipart builder — converts a feedback payload with Blob/dataUrl
 * media into a FormData ready for fetch().
 *
 *   const fd = buildMultipartFromPayload(feedback)
 *   await fetch(endpoint, { method: 'POST', body: fd })
 *
 * Field layout in the FormData:
 *
 *   feedback     — JSON metadata (everything except binaries)
 *   screenshot   — Blob (when present)
 *   video        — Blob (when present)
 *   attachment   — Blob (when present)
 *
 * The server-side router detects content-type: multipart/form-data and
 * reconstructs the metadata + binary parts before dispatch.
 *
 * Falls back gracefully: if no binary is present, returns null so the
 * caller can keep using a JSON POST.
 */

function isBlobLike(v) {
  if (!v) return false;
  if (typeof Blob !== 'undefined' && v instanceof Blob) return true;
  return typeof v === 'object' && typeof v.size === 'number' && typeof v.type === 'string';
}

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

function extToMime(mime) {
  if (!mime) return 'bin';
  const m = mime.split('/')[1];
  return (m && m.split(';')[0]) || 'bin';
}

/**
 * Build a FormData if the payload carries any binary; return null otherwise.
 */
export function buildMultipartFromPayload(payload) {
  if (typeof FormData === 'undefined' || !payload) return null;

  // Pull out binaries — they get separate parts in the FormData.
  const out = new FormData();
  let attached = 0;

  const metadata = { ...payload };

  // Screenshot — prefer the pre-encoded Blob (set by FeedbackProvider's
  // compression step) over re-decoding the data URL. This skips a
  // 10-30ms base64 round-trip for typical screenshots.
  const ssBlob = metadata.screenshotBlob;
  const ss = metadata.screenshot;
  if (isBlobLike(ssBlob)) {
    out.append('screenshot', ssBlob, `screenshot.${extToMime(ssBlob.type)}`);
    delete metadata.screenshotBlob;
    delete metadata.screenshot;
    attached += 1;
  } else if (isBlobLike(ss)) {
    out.append('screenshot', ss, `screenshot.${extToMime(ss.type)}`);
    delete metadata.screenshot;
    attached += 1;
  } else if (typeof ss === 'string' && ss.startsWith('data:')) {
    const blob = dataUrlToBlob(ss);
    if (blob) {
      out.append('screenshot', blob, `screenshot.${extToMime(blob.type)}`);
      delete metadata.screenshot;
      attached += 1;
    }
  }

  // Video blob from MediaRecorder
  const vid = metadata.videoBlob;
  if (isBlobLike(vid)) {
    out.append('video', vid, `recording.${extToMime(vid.type) || 'webm'}`);
    delete metadata.videoBlob;
    attached += 1;
  }

  // Arbitrary file attachment
  const att = metadata.attachment;
  if (isBlobLike(att)) {
    const name = (att && att.name) || `attachment.${extToMime(att.type)}`;
    out.append('attachment', att, name);
    delete metadata.attachment;
    attached += 1;
  }

  if (attached === 0) return null;

  out.append('feedback', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'feedback.json');
  return out;
}

/**
 * Server-side helper — read FormData from a Request and return
 *   { feedback: parsedMetadata, screenshot, video, attachment }
 *
 * Lives here (not server-only) because Web Request FormData parsing
 * is isomorphic. The router calls this when content-type is multipart.
 */
export async function readMultipartRequest(req) {
  const fd = typeof req.formData === 'function' ? await req.formData() : null;
  if (!fd) throw new Error('readMultipartRequest: request does not expose formData()');
  const out = {};
  const feedbackField = fd.get('feedback');
  if (feedbackField) {
    let json;
    if (typeof feedbackField === 'string') json = feedbackField;
    else if (typeof feedbackField.text === 'function') json = await feedbackField.text();
    else json = await new Response(feedbackField).text();
    try { out.feedback = JSON.parse(json); } catch { out.feedback = {}; }
  }
  for (const name of ['screenshot', 'video', 'attachment']) {
    const part = fd.get(name);
    if (part && typeof part !== 'string') out[name] = part;
  }
  return out;
}
