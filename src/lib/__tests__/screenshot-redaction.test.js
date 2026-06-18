/**
 * @vitest-environment jsdom
 *
 * Screenshot PII redaction tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { maskPiiInClonedDoc } from '../screenshot-redaction.js';

function mkDoc(html) {
  document.body.innerHTML = html;
  return document;
}

describe('maskPiiInClonedDoc', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('wipes input[type=password] value and styles it as redacted', () => {
    const doc = mkDoc(`<input id="pw" type="password" value="secret123">`);
    const result = maskPiiInClonedDoc(doc);
    expect(result.masked).toBe(1);
    const el = doc.getElementById('pw');
    expect(el.value).toBe('••••••');
    expect(el.style.background).toBeTruthy();
    expect(el.style.color).toBe('transparent');
  });

  it('masks credit-card autocomplete fields', () => {
    const doc = mkDoc(`
      <input id="ccn" autocomplete="cc-number" value="4242424242424242">
      <input id="ccc" autocomplete="cc-csc" value="123">
      <input id="ccx" autocomplete="cc-exp" value="01/30">
    `);
    const result = maskPiiInClonedDoc(doc);
    expect(result.masked).toBe(3);
    expect(doc.getElementById('ccn').value).toBe('••••••');
    expect(doc.getElementById('ccc').value).toBe('••••••');
    expect(doc.getElementById('ccx').value).toBe('••••••');
  });

  it('masks one-time-code fields (OTP)', () => {
    const doc = mkDoc(`<input id="otp" autocomplete="one-time-code" value="847291">`);
    expect(maskPiiInClonedDoc(doc).masked).toBe(1);
    expect(doc.getElementById('otp').value).toBe('••••••');
  });

  it('masks inputs named card/cvv/cvc (case-insensitive)', () => {
    const doc = mkDoc(`
      <input id="a" name="cardNumber" value="4242">
      <input id="b" name="CVV" value="123">
      <input id="c" name="cvc_code" value="456">
    `);
    expect(maskPiiInClonedDoc(doc).masked).toBe(3);
  });

  it('replaces non-input [data-feedback-redact] with a same-shape placeholder', () => {
    const doc = mkDoc(`
      <div id="parent">
        <span id="secret" data-feedback-redact>my home address</span>
        <span id="ok">visible</span>
      </div>
    `);
    maskPiiInClonedDoc(doc);
    const parent = doc.getElementById('parent');
    expect(parent.querySelector('[data-feedback-redacted]')).toBeTruthy();
    expect(parent.querySelector('#secret')).toBeNull();
    expect(parent.querySelector('#ok')).toBeTruthy();
    expect(parent.querySelector('#ok').textContent).toBe('visible');
  });

  it('does not double-mask the same element across overlapping selectors', () => {
    const doc = mkDoc(
      `<input id="dup" type="password" autocomplete="one-time-code" data-feedback-redact value="x">`
    );
    const result = maskPiiInClonedDoc(doc);
    expect(result.masked).toBe(1);
  });

  it('leaves non-PII content untouched', () => {
    const doc = mkDoc(`
      <p>Hello world</p>
      <input type="text" value="alice@example.com">
      <input type="email" name="email" value="alice@example.com">
    `);
    expect(maskPiiInClonedDoc(doc).masked).toBe(0);
    expect(doc.querySelector('p').textContent).toBe('Hello world');
    expect(doc.querySelector('input[type="text"]').value).toBe('alice@example.com');
  });

  it('returns {masked: 0} for falsy input', () => {
    expect(maskPiiInClonedDoc(null)).toEqual({ masked: 0 });
    expect(maskPiiInClonedDoc(undefined)).toEqual({ masked: 0 });
    expect(maskPiiInClonedDoc({})).toEqual({ masked: 0 });
  });

  it('survives a thrown selector', () => {
    // Ensure one bad selector doesn't abort the rest. (querySelectorAll
    // never actually throws on a valid selector list, but the catch
    // path should still mean no crash.)
    expect(() => maskPiiInClonedDoc(document)).not.toThrow();
  });
});
