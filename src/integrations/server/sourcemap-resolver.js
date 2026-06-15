import { SourceMapConsumer } from 'source-map-js';

export async function runResolveSourceMap(item, hook) {
  if (typeof hook !== 'function') return item;
  const where = item?.aiTicket?.json?.where;
  const frames = where?.unresolvedFrames;
  if (!Array.isArray(frames) || frames.length === 0) return item;
  let resolvedOne = null;
  for (const frame of frames) {
    if (!frame?.needsServerResolution) continue;
    try {
      const mapText = await hook({ bundleHash: frame.bundleHash, scriptUrl: frame.file });
      if (!mapText) continue;
      const c = new SourceMapConsumer(typeof mapText === 'string' ? JSON.parse(mapText) : mapText);
      const pos = c.originalPositionFor({ line: frame.line, column: frame.column });
      if (!pos?.source) continue;
      const idx = c.sources?.indexOf?.(pos.source);
      resolvedOne = {
        file: pos.source,
        line: pos.line,
        column: pos.column,
        name: pos.name,
        sourcesContent: idx != null ? c.sourcesContent?.[idx] : null,
      };
      break;
    } catch {
      // ignore, try next frame
    }
  }
  if (!resolvedOne) return item;
  return {
    ...item,
    aiTicket: {
      ...item.aiTicket,
      json: {
        ...item.aiTicket.json,
        where: {
          ...where,
          file: resolvedOne.file,
          line: resolvedOne.line,
          column: resolvedOne.column,
          name: resolvedOne.name,
          codeSnippetSource: resolvedOne.sourcesContent,
        },
      },
    },
  };
}
