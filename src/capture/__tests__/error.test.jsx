import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { mountErrorObserver } from '../observers/error.js';
import { FeedbackErrorBoundary } from '../FeedbackErrorBoundary.jsx';
import { createRingBuffer } from '../ringBuffer.js';

let buffer, unmount;
beforeEach(() => { buffer = createRingBuffer(20); unmount = mountErrorObserver(buffer); });
afterEach(() => { unmount(); });

describe('error observer', () => {
  it('captures window error event', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', filename: 'a.js', lineno: 1 }));
    const snap = buffer.snapshot();
    expect(snap.at(-1)).toMatchObject({ type: 'error', message: 'boom' });
  });

  it('captures unhandledrejection', () => {
    const ev = new Event('unhandledrejection');
    Object.defineProperty(ev, 'reason', { value: new Error('rejected') });
    window.dispatchEvent(ev);
    expect(buffer.snapshot().at(-1).message).toContain('rejected');
  });

  it('caps at the buffer capacity', () => {
    for (let i = 0; i < 30; i += 1) {
      window.dispatchEvent(new ErrorEvent('error', { message: `e${i}`, filename: 'a', lineno: i }));
    }
    expect(buffer.size()).toBeLessThanOrEqual(20);
  });
});

describe('FeedbackErrorBoundary', () => {
  it('passes children through when no error', () => {
    const { getByText } = render(
      <FeedbackErrorBoundary buffer={buffer}><span>ok</span></FeedbackErrorBoundary>
    );
    expect(getByText('ok')).toBeInTheDocument();
  });

  it('catches a render error and writes to the buffer', () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom() { throw new Error('render-boom'); }
    render(
      <FeedbackErrorBoundary buffer={buffer} fallback={<span>oops</span>}><Boom /></FeedbackErrorBoundary>
    );
    expect(buffer.snapshot().at(-1)).toMatchObject({ type: 'error', message: 'render-boom' });
    consoleErr.mockRestore();
  });
});
