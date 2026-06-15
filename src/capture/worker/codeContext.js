export function extractSnippet(source, line, opts = {}) {
  const context = opts.context ?? 10;
  const maxChars = opts.maxChars ?? 200;
  if (!source || typeof source !== 'string' || !Number.isFinite(line) || line < 1) {
    return { lines: [] };
  }
  const all = source.split('\n');
  const start = Math.max(1, line - context);
  const end = Math.min(all.length, line + context);
  const lines = [];
  for (let i = start; i <= end; i += 1) {
    let text = all[i - 1] || '';
    if (text.length > maxChars) text = text.slice(0, maxChars) + '…';
    lines.push({ line: i, text, highlight: i === line });
  }
  return { lines };
}
