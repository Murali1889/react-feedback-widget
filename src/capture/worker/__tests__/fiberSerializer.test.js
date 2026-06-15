import { describe, it, expect } from 'vitest';
import { serializeFiberTree } from '../fiberSerializer.js';

describe('serializeFiberTree', () => {
  it('returns the tree shallow-cloned', () => {
    const t = { App: { props: { a: 1 }, state: null } };
    const out = serializeFiberTree(t);
    expect(out).toEqual(t);
    expect(out).not.toBe(t);
  });
  it('safely JSON-stringifies', () => {
    const t = { App: { props: { date: new Date(0).toISOString() }, state: null } };
    expect(() => JSON.stringify(serializeFiberTree(t))).not.toThrow();
  });
});
