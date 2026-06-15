import { describe, it, expect } from 'vitest';
import { extractSnippet } from '../codeContext.js';

const SRC = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');

describe('extractSnippet', () => {
  it('extracts ±N lines around the target line', () => {
    const out = extractSnippet(SRC, 10, { context: 3 });
    expect(out.lines.map((l) => l.text)).toEqual(['line 7','line 8','line 9','line 10','line 11','line 12','line 13']);
    expect(out.lines.find((l) => l.line === 10).highlight).toBe(true);
  });
  it('clamps near the start', () => {
    const out = extractSnippet(SRC, 1, { context: 5 });
    expect(out.lines[0].line).toBe(1);
  });
  it('clamps near the end', () => {
    const out = extractSnippet(SRC, 30, { context: 5 });
    expect(out.lines.at(-1).line).toBe(30);
  });
  it('returns empty when source missing', () => {
    expect(extractSnippet(null, 10).lines).toEqual([]);
  });
  it('truncates very long lines', () => {
    const long = Array.from({ length: 5 }, () => 'x'.repeat(500)).join('\n');
    const out = extractSnippet(long, 3, { context: 1, maxChars: 50 });
    expect(out.lines.every((l) => l.text.length <= 60)).toBe(true);
  });
});
