import { describe, it, expect, afterEach } from 'vitest';
import { selectorPath, labelFor } from '../selectorPath.js';

afterEach(() => { document.body.innerHTML = ''; });

describe('selectorPath', () => {
  it('returns id selector when element has id', () => {
    const el = document.createElement('div');
    el.id = 'main';
    document.body.appendChild(el);
    expect(selectorPath(el)).toBe('#main');
  });

  it('returns tag.class path', () => {
    document.body.innerHTML = '<main><button class="submit primary">Go</button></main>';
    const btn = document.querySelector('button');
    expect(selectorPath(btn)).toContain('button.submit');
  });

  it('uses data-testid when available', () => {
    document.body.innerHTML = '<div data-testid="checkout-form"><button>x</button></div>';
    const btn = document.querySelector('button');
    expect(selectorPath(btn)).toContain('[data-testid="checkout-form"]');
  });
});

describe('labelFor', () => {
  it('uses aria-label', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-label', 'Close dialog');
    expect(labelFor(el)).toBe('Close dialog');
  });

  it('uses associated <label>', () => {
    document.body.innerHTML = '<label for="email">Email</label><input id="email" />';
    const input = document.querySelector('input');
    expect(labelFor(input)).toBe('Email');
  });

  it('uses button text', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Place order';
    expect(labelFor(btn)).toBe('Place order');
  });

  it('uses image alt', () => {
    const img = document.createElement('img');
    img.alt = 'logo';
    expect(labelFor(img)).toBe('logo');
  });
});
