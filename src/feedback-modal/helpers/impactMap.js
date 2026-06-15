/**
 * Impact map — surface files an AI/dev might need to touch alongside
 * the one the user reported on.
 *
 * If the host has published a codemap (npm run feedback:codemap →
 * public/feedback-codemap.json), we fetch it once and look up
 * - reverse imports (who uses this file)
 * - forward imports (what this file uses)
 * - sibling test files
 *
 * Without a codemap we fall back to plausible heuristics from the
 * source file path alone so the panel always has something useful
 * to show.
 */

let codemapCache = null;
let codemapAttempted = false;

async function loadCodemap() {
  if (codemapCache) return codemapCache;
  if (codemapAttempted) return null;
  codemapAttempted = true;
  if (typeof fetch === 'undefined' || typeof window === 'undefined') return null;
  try {
    const candidates = ['/feedback-codemap.json', '/codemap.json'];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { credentials: 'omit' });
        if (r.ok) {
          codemapCache = await r.json();
          return codemapCache;
        }
      } catch { /* try next */ }
    }
  } catch { /* swallow */ }
  return null;
}

function fileBaseFromPath(path) {
  if (!path) return null;
  const cleaned = path.replace(/^.*\/src\//, 'src/');
  return cleaned.split(':')[0];
}

function heuristicNeighbors(filePath) {
  if (!filePath) return [];
  const base = filePath.replace(/\.(jsx?|tsx?|mjs|cjs)$/, '');
  const ext = (filePath.match(/\.(jsx?|tsx?)$/) || [, 'jsx'])[1];
  const fileName = base.split('/').pop() || '';
  const dir = base.replace(/\/[^/]+$/, '');

  return [
    { kind: 'sibling', label: `${dir}/${fileName}.test.${ext}`, reason: 'Sibling test file' },
    { kind: 'sibling', label: `${dir}/${fileName}.stories.${ext}`, reason: 'Storybook stories' },
    { kind: 'sibling', label: `${dir}/${fileName}.module.css`, reason: 'Co-located styles' },
    { kind: 'parent',  label: `${dir}/index.${ext}`, reason: 'Folder barrel — likely re-exports this' },
  ];
}

/**
 * Returns { primary, related: Array<{kind, label, reason}>, source: 'codemap'|'heuristic'|'none' }
 */
export async function buildImpactMap(elementInfo) {
  const primary = fileBaseFromPath(elementInfo?.sourceFile);
  if (!primary) return { primary: null, related: [], source: 'none' };

  const codemap = await loadCodemap();
  if (codemap && codemap.files && codemap.files[primary]) {
    const entry = codemap.files[primary];
    const related = [];
    (entry.importedBy || []).slice(0, 8).forEach((f) =>
      related.push({ kind: 'importer', label: f, reason: 'Imports this — might need adjustment' }));
    (entry.imports || []).slice(0, 8).forEach((f) =>
      related.push({ kind: 'imports', label: f, reason: 'Used by this — might be root cause' }));
    (entry.tests || []).forEach((f) =>
      related.push({ kind: 'test', label: f, reason: 'Test file — expand coverage here' }));
    return { primary, related, source: 'codemap' };
  }

  return { primary, related: heuristicNeighbors(primary), source: 'heuristic' };
}
