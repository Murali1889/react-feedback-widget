import { describe, it, expect } from 'vitest';
import { resolveStack } from '../sourcemaps.js';

const tinyMap = JSON.stringify({
  version: 3,
  sources: ['src/Checkout.jsx'],
  names: ['handleSubmit'],
  mappings: 'AAAA;AACA;AACA',
  sourcesContent: ['const x = 1;\nfunction handleSubmit(){}\nexport default handleSubmit;'],
  file: 'app.bundle.js',
});

describe('resolveStack', () => {
  it('returns needsServerResolution=true when fetch fails', async () => {
    const out = await resolveStack(
      [{ file: 'http://x/app.bundle.js', line: 1, column: 0 }],
      { fetchMap: async () => { throw new Error('no map'); } }
    );
    expect(out[0]).toMatchObject({ needsServerResolution: true });
  });

  it('returns resolved positions when fetch succeeds', async () => {
    const out = await resolveStack(
      [{ file: 'http://x/app.bundle.js', line: 1, column: 0 }],
      { fetchMap: async () => tinyMap }
    );
    expect(out[0].source).toBe('src/Checkout.jsx');
  });
});
