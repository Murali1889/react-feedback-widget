import { describe, it, expect } from 'vitest';
import { createRingBuffer } from '../ringBuffer.js';

describe('createRingBuffer', () => {
  it('returns an empty snapshot when nothing pushed', () => {
    const b = createRingBuffer(4);
    expect(b.snapshot()).toEqual([]);
    expect(b.size()).toBe(0);
  });

  it('keeps order for non-overflowing inserts', () => {
    const b = createRingBuffer(4);
    b.push('a'); b.push('b'); b.push('c');
    expect(b.snapshot()).toEqual(['a', 'b', 'c']);
  });

  it('evicts the oldest when capacity is exceeded', () => {
    const b = createRingBuffer(3);
    b.push('a'); b.push('b'); b.push('c'); b.push('d');
    expect(b.snapshot()).toEqual(['b', 'c', 'd']);
  });

  it('clear() empties the buffer', () => {
    const b = createRingBuffer(4);
    b.push('a'); b.push('b');
    b.clear();
    expect(b.snapshot()).toEqual([]);
    expect(b.size()).toBe(0);
  });

  it('size() reports current count, not capacity', () => {
    const b = createRingBuffer(10);
    b.push('a');
    expect(b.size()).toBe(1);
  });

  it('snapshot returns a shallow copy (callers cannot mutate internal state)', () => {
    const b = createRingBuffer(3);
    b.push('a');
    const snap = b.snapshot();
    snap.push('hack');
    expect(b.snapshot()).toEqual(['a']);
  });
});
