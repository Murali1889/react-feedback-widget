import { describe, it, expect, beforeEach } from 'vitest';
import { idbGet, idbSet, idbClear } from '../idbCache.js';

beforeEach(() => idbClear());

describe('idbCache', () => {
  it('stores and retrieves a string value', async () => {
    await idbSet('k', 'v');
    expect(await idbGet('k')).toBe('v');
  });
  it('returns null for missing key', async () => {
    expect(await idbGet('missing')).toBeNull();
  });
});
