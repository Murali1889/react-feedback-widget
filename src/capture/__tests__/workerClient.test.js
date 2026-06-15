import { describe, it, expect } from 'vitest';
import { runOnMainThread } from '../workerClient.js';

describe('runOnMainThread fallback', () => {
  it('assembles a ticket synchronously when worker is disabled', async () => {
    const t = await runOnMainThread({
      item: { feedback: 'x', timestamp: '2026-01-01T00:00:00Z' },
      interactions: [], errors: [], routes: [], buildInfo: {}, flags: {},
    });
    expect(t.json.schemaVersion).toBe('1.0');
    expect(t.assembledOn).toBe('main');
  });
});
