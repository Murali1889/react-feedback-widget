import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountRouteObserver } from '../observers/route.js';
import { createRingBuffer } from '../ringBuffer.js';

let buffer, unmount;
beforeEach(() => { buffer = createRingBuffer(20); unmount = mountRouteObserver(buffer); });
afterEach(() => { unmount(); window.history.replaceState({}, '', '/'); });

describe('route observer', () => {
  it('captures pushState', () => {
    window.history.pushState({}, '', '/checkout');
    const snap = buffer.snapshot();
    expect(snap.at(-1)).toMatchObject({ type: 'route', to: '/checkout' });
  });
  it('captures replaceState', () => {
    window.history.replaceState({}, '', '/x');
    expect(buffer.snapshot().at(-1).to).toBe('/x');
  });
  it('captures popstate', () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(buffer.snapshot().at(-1)).toMatchObject({ type: 'route' });
  });
  it('captures hashchange', () => {
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: 'a', newURL: 'b' }));
    expect(buffer.snapshot().at(-1)).toMatchObject({ type: 'route' });
  });
});
