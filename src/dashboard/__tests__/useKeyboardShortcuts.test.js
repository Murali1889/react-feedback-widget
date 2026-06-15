import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts.js';

function fire(key) { document.dispatchEvent(new KeyboardEvent('keydown', { key })); }

describe('useKeyboardShortcuts', () => {
  it('fires the handler when enabled and key matches', () => {
    const fn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).toHaveBeenCalled();
  });

  it('does not fire when disabled', () => {
    const fn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ enabled: false, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).not.toHaveBeenCalled();
  });

  it('skips when active element is an input', () => {
    const fn = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('skips when active element is contentEditable', () => {
    const fn = vi.fn();
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();
    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts: { '/': fn } }));
    fire('/');
    expect(fn).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });
});
