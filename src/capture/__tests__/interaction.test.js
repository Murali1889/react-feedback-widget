import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountInteractionObserver } from '../observers/interaction.js';
import { createRingBuffer } from '../ringBuffer.js';

let buffer, unmount;
beforeEach(() => { buffer = createRingBuffer(64); unmount = mountInteractionObserver(buffer); });
afterEach(() => { unmount(); document.body.innerHTML = ''; });

describe('interaction observer', () => {
  it('captures click with selector + label', () => {
    document.body.innerHTML = '<button class="go" aria-label="Place order">Go</button>';
    document.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const ev = buffer.snapshot().at(-1);
    expect(ev.type).toBe('click');
    expect(ev.target.selector).toContain('button.go');
    expect(ev.target.label).toBe('Place order');
  });

  it('captures input value for non-sensitive fields', () => {
    document.body.innerHTML = '<input name="city" value="">';
    const input = document.querySelector('input');
    input.value = 'Bangalore';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBe('Bangalore');
  });

  it('drops password values (HTML hint)', () => {
    document.body.innerHTML = '<input type="password" name="pwd" value="">';
    const input = document.querySelector('input');
    input.value = 'hunter2';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
    expect(ev.redacted).toBe('password-field');
  });

  it('drops cc-* autocomplete values', () => {
    document.body.innerHTML = '<input autocomplete="cc-number" value="">';
    const input = document.querySelector('input');
    input.value = '4242424242424242';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
    expect(ev.redacted).toBe('cc-autocomplete');
  });

  it('drops data-feedback-redact subtree values', () => {
    document.body.innerHTML = '<div data-feedback-redact="true"><input name="secret"></div>';
    const input = document.querySelector('input');
    input.value = 'top-secret';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
    expect(ev.redacted).toBe('host-marker');
  });

  it('drops values via host sensitiveSelectors', () => {
    unmount();
    buffer = createRingBuffer(32);
    unmount = mountInteractionObserver(buffer, { sensitiveSelectors: ['input[name="token"]'] });
    document.body.innerHTML = '<input name="token">';
    const input = document.querySelector('input');
    input.value = 'abc';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const ev = buffer.snapshot().find((e) => e.type === 'input');
    expect(ev.value).toBeUndefined();
  });

  it('does not interfere with host click handlers', () => {
    let hostHandlerCalled = false;
    document.body.innerHTML = '<button>x</button>';
    document.querySelector('button').addEventListener('click', () => { hostHandlerCalled = true; });
    document.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(hostHandlerCalled).toBe(true);
  });
});
