import { describe, it, expect, vi } from 'vitest';
import { runResolveSourceMap } from '../sourcemap-resolver.js';

const tinyMap = JSON.stringify({
  version: 3,
  sources: ['src/Checkout.jsx'],
  mappings: 'AAAA',
  sourcesContent: ['line1\nline2\nline3'],
  file: 'app.bundle.js',
});

describe('runResolveSourceMap', () => {
  it('resolves frames marked needsServerResolution', async () => {
    const hook = vi.fn().mockResolvedValue(tinyMap);
    const item = {
      eventLogs: [],
      aiTicket: {
        json: {
          where: {
            unresolvedFrames: [{ file: 'app.bundle.js', line: 1, column: 0, needsServerResolution: true, bundleHash: 'h1' }],
          },
        },
      },
    };
    const out = await runResolveSourceMap(item, hook);
    expect(hook).toHaveBeenCalledWith({ bundleHash: 'h1', scriptUrl: 'app.bundle.js' });
    expect(out.aiTicket.json.where.file).toBe('src/Checkout.jsx');
  });

  it('returns item unchanged when no hook provided', async () => {
    const item = { aiTicket: { json: { where: { unresolvedFrames: [] } } } };
    expect(await runResolveSourceMap(item, undefined)).toBe(item);
  });

  it('swallows hook errors and leaves the frame unresolved', async () => {
    const hook = vi.fn().mockRejectedValue(new Error('boom'));
    const item = { aiTicket: { json: { where: { unresolvedFrames: [{ file: 'x.js', line: 1, column: 0, needsServerResolution: true, bundleHash: 'h' }] } } } };
    const out = await runResolveSourceMap(item, hook);
    expect(out.aiTicket.json.where.file).toBeUndefined();
  });
});
