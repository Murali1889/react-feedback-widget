import { SourceMapConsumer } from 'source-map-js';
import { idbGet, idbSet } from './idbCache.js';

async function fetchAdjacent(bundleUrl) {
  const res = await fetch(bundleUrl);
  if (!res.ok) throw new Error(`script fetch ${res.status}`);
  const text = await res.text();
  const m = text.match(/\/\/# sourceMappingURL=(\S+)/);
  if (!m) throw new Error('no sourceMappingURL');
  const mapUrl = new URL(m[1], bundleUrl).toString();
  const mr = await fetch(mapUrl);
  if (!mr.ok) throw new Error(`map fetch ${mr.status}`);
  return mr.text();
}

function bundleHashFor(url) {
  let h = 0;
  for (let i = 0; i < url.length; i += 1) h = (h * 31 + url.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(16)}`;
}

export async function resolveStack(frames, opts = {}) {
  const fetchMap = opts.fetchMap || fetchAdjacent;
  const out = [];
  const consumerCache = new Map();
  for (const f of frames) {
    if (!f?.file) { out.push(f); continue; }
    const hash = bundleHashFor(f.file);
    let mapText = consumerCache.has(hash) ? null : await idbGet(`map:${hash}`);
    if (!consumerCache.has(hash)) {
      try {
        if (!mapText) {
          mapText = await fetchMap(f.file);
          await idbSet(`map:${hash}`, mapText);
        }
        consumerCache.set(hash, new SourceMapConsumer(JSON.parse(mapText)));
      } catch (e) {
        out.push({ ...f, bundleHash: hash, needsServerResolution: true });
        continue;
      }
    }
    const c = consumerCache.get(hash);
    const pos = c.originalPositionFor({ line: f.line, column: f.column });
    if (!pos?.source) { out.push({ ...f, bundleHash: hash, needsServerResolution: true }); continue; }
    const sourcesContent = c.sourcesContent || [];
    const sourceIdx = c.sources?.indexOf?.(pos.source);
    out.push({
      ...f,
      bundleHash: hash,
      source: pos.source,
      line: pos.line,
      column: pos.column,
      name: pos.name,
      sourcesContent: sourceIdx != null ? sourcesContent[sourceIdx] : null,
    });
  }
  return out;
}

export { bundleHashFor };
