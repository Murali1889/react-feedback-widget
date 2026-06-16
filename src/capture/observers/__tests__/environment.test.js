import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  snapshotEnvironment,
  mountDomMutationObserver,
} from '../environment.js';
import { createRingBuffer } from '../../ringBuffer.js';

describe('snapshotEnvironment', () => {
  it('returns a flat object with a11y/locale/document keys present', () => {
    const env = snapshotEnvironment();
    expect(env).toBeTypeOf('object');
    expect(env.a11y).toBeTypeOf('object');
    expect(env.locale).toBeTypeOf('object');
    expect(env.document).toBeTypeOf('object');
  });

  it('captures color scheme + reduced motion + locale + timezone', () => {
    const env = snapshotEnvironment();
    // jsdom's matchMedia is a stub — values are null/false but the
    // shape is what we're asserting against.
    expect(env.a11y).toHaveProperty('colorScheme');
    expect(env.a11y).toHaveProperty('reducedMotion');
    expect(typeof env.locale.timezone).toBe('string');
  });

  it('returns null for network when navigator.connection is absent (jsdom)', () => {
    const env = snapshotEnvironment();
    // jsdom doesn't implement navigator.connection — should not crash.
    expect(env.network === null || typeof env.network === 'object').toBe(true);
  });

  it('returns devicePixelRatio + online + cookieEnabled', () => {
    const env = snapshotEnvironment();
    expect(typeof env.devicePixelRatio).toBe('number');
    expect(typeof env.online).toBe('boolean');
    expect(typeof env.cookieEnabled).toBe('boolean');
  });
});

describe('mountDomMutationObserver', () => {
  let buffer;
  beforeEach(() => { buffer = createRingBuffer(16); document.body.innerHTML = ''; });

  it('records nodes added under documentElement', async () => {
    const unmount = mountDomMutationObserver(buffer);
    const el = document.createElement('div');
    el.id = 'pay';
    document.body.appendChild(el);
    // MutationObserver fires asynchronously
    await new Promise((r) => setTimeout(r, 10));
    const events = buffer.snapshot();
    const added = events.find((e) => e.kind === 'added');
    expect(added).toBeTruthy();
    expect(added.target).toMatch(/body/);
    unmount();
  });

  it('records attribute changes (not style/class)', async () => {
    const el = document.createElement('button');
    el.id = 'go';
    document.body.appendChild(el);
    const unmount = mountDomMutationObserver(buffer);
    el.setAttribute('aria-label', 'Go');
    el.setAttribute('class', 'btn');     // should be ignored
    el.setAttribute('style', 'color:red');// should be ignored
    await new Promise((r) => setTimeout(r, 10));
    const events = buffer.snapshot();
    const attrs = events.filter((e) => e.kind === 'attr').map((e) => e.attr);
    expect(attrs).toContain('aria-label');
    expect(attrs).not.toContain('class');
    expect(attrs).not.toContain('style');
    unmount();
  });

  it('skips feedback-* overlay mutations so the widget does not see itself', async () => {
    const unmount = mountDomMutationObserver(buffer);
    const overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    document.body.appendChild(overlay);
    // also append a child to it
    const child = document.createElement('span');
    overlay.appendChild(child);
    await new Promise((r) => setTimeout(r, 10));
    const events = buffer.snapshot();
    // We do expect to see "added div.feedback-overlay" because the
    // mutation's target is documentElement (which we don't filter).
    // But adding to the overlay itself produces target=feedback-overlay,
    // which our sampleSel filters → no event.
    const overlayChildEvents = events.filter((e) => /feedback-overlay/.test(e.target));
    expect(overlayChildEvents.length).toBe(0);
    unmount();
  });
});
