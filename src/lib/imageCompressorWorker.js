/**
 * Image compression — OffscreenCanvas worker.
 *
 * The worker source is shipped as a string and instantiated from a Blob
 * URL so the bundle stays self-contained (no extra dist file, no CORS
 * issues, no need for the host to configure a worker path).
 *
 * The worker:
 *   1. fetches the data URL (or uses the binary directly if passed a Blob)
 *   2. decodes via createImageBitmap (off-thread, hardware-accelerated)
 *   3. draws onto an OffscreenCanvas at the (optionally resized) target
 *   4. encodes via canvas.convertToBlob with the requested mime + quality
 *   5. returns the resulting blob as a Transferable (no copy)
 *
 * Main thread never blocks. Idle CPU savings: ~30-100ms for typical UI
 * screenshots, much more for high-DPI captures.
 *
 * Falls back to main-thread compressDataUrl when OffscreenCanvas /
 * Worker / createImageBitmap aren't available.
 */

const WORKER_SOURCE = `
self.addEventListener('message', async (e) => {
  const { id, dataUrl, blob: inBlob, format, quality, maxDimension } = e.data;
  try {
    const blob = inBlob || await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    let w = bitmap.width, h = bitmap.height;
    if (maxDimension && Math.max(w, h) > maxDimension) {
      const s = maxDimension / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('worker: no 2d context');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const out = await canvas.convertToBlob({
      type: 'image/' + (format || 'webp'),
      quality: quality != null ? quality : 0.85,
    });
    self.postMessage({ id, ok: true, blob: out, format, w, h }, []);
  } catch (err) {
    self.postMessage({ id, ok: false, error: (err && err.message) || String(err) });
  }
});
`;

let workerInstance = null;
let workerUrl = null;
let nextId = 1;
const pending = new Map();

function supportsWorker() {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function'
  );
}

function spawn() {
  if (workerInstance) return workerInstance;
  if (!supportsWorker()) return null;
  try {
    if (!workerUrl) {
      const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
      workerUrl = URL.createObjectURL(blob);
    }
    workerInstance = new Worker(workerUrl);
    workerInstance.addEventListener('message', (e) => {
      const { id, ok, blob, error, w, h, format } = e.data || {};
      const cb = pending.get(id);
      if (!cb) return;
      pending.delete(id);
      if (ok) cb.resolve({ blob, w, h, format });
      else cb.reject(new Error(error || 'compression worker error'));
    });
    workerInstance.addEventListener('error', (e) => {
      // Reject all pending on hard worker failure.
      for (const [id, cb] of pending) cb.reject(new Error(`worker error: ${e?.message || 'unknown'}`));
      pending.clear();
    });
    return workerInstance;
  } catch {
    workerInstance = null;
    return null;
  }
}

/**
 * Returns Promise<{ blob, w, h }> or null if the worker can't be spawned.
 */
export function compressInWorker({ dataUrl, blob, format = 'webp', quality = 0.85, maxDimension = null }) {
  const w = spawn();
  if (!w) return null;
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    w.postMessage({ id, dataUrl, blob, format, quality, maxDimension });
  });
}

/** For test / lifecycle hygiene — release the worker. */
export function disposeImageWorker() {
  if (workerInstance) {
    try { workerInstance.terminate(); } catch {}
    workerInstance = null;
  }
  if (workerUrl) {
    try { URL.revokeObjectURL(workerUrl); } catch {}
    workerUrl = null;
  }
  for (const [, cb] of pending) cb.reject(new Error('worker disposed'));
  pending.clear();
}

export function isImageWorkerAvailable() {
  return supportsWorker();
}
