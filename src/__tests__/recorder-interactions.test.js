import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionRecorder } from '../recorder.js';

/**
 * Guardrails for the interaction + route timeline that lands on
 * `recorder.events` between start() and stop(). We exercise the
 * patch / unpatch directly rather than spinning up a real
 * MediaRecorder — the media stream is mocked at the navigator
 * layer in other tests.
 */
describe('SessionRecorder interaction + route capture', () => {
  let r;

  beforeEach(() => {
    r = new SessionRecorder();
    r.startTime = Date.now();
    r._patchInteractions();
    r._patchRoutes();
  });

  afterEach(() => {
    r._unpatchInteractions();
    r._unpatchRoutes();
  });

  it('captures clicks with a target selector', () => {
    const btn = document.createElement('button');
    btn.id = 'pay';
    btn.textContent = 'Pay now';
    document.body.appendChild(btn);
    btn.click();
    const ev = r.events.find((e) => e.kind === 'click');
    expect(ev).toBeTruthy();
    expect(ev.target.selector).toBe('#pay');
    expect(ev.target.label).toBe('Pay now');
    expect(typeof ev.timestamp).toBe('number');
    document.body.removeChild(btn);
  });

  it('redacts password input values', () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.value = 'sekret';
    document.body.appendChild(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const ev = r.events.find((e) => e.kind === 'input');
    expect(ev.redacted).toBe('password');
    expect(ev.value).toBeUndefined();
    document.body.removeChild(input);
  });

  it('keeps non-sensitive input values (truncated)', () => {
    const input = document.createElement('input');
    input.value = 'hello world';
    document.body.appendChild(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const ev = r.events.find((e) => e.kind === 'input');
    expect(ev.value).toBe('hello world');
    document.body.removeChild(input);
  });

  it('captures notable keydowns only (Enter / Tab / Escape / arrows)', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const keys = r.events.filter((e) => e.kind === 'keydown').map((e) => e.key);
    expect(keys).toEqual(['Enter']);
  });

  it('captures pushState / replaceState / hashchange routes', () => {
    history.pushState({}, '', '/a');
    history.replaceState({}, '', '/b');
    window.dispatchEvent(new Event('hashchange'));
    const routes = r.events.filter((e) => e.type === 'route');
    expect(routes.map((r) => r.kind)).toEqual(['pushState', 'replaceState', 'hashchange']);
  });

  it('unpatch restores the original click/route handlers', () => {
    r._unpatchInteractions();
    r._unpatchRoutes();
    const before = r.events.length;
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.click();
    history.pushState({}, '', '/c');
    expect(r.events.length).toBe(before);
    document.body.removeChild(btn);
  });
});
