import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeedbackProvider } from '../../FeedbackProvider.jsx';

describe('Phase C backward compatibility', () => {
  it('FeedbackProvider without captureConfig does not mount capture observers', () => {
    const before = document.addEventListener.bind(document);
    let captureClickMounts = 0;
    document.addEventListener = (type, ...rest) => {
      // 'click' / 'pointerdown' / 'focusin' / 'input' are unique to the
      // interaction observer; the existing widget only patches 'keydown'
      // for the Alt+A shortcut. Counting click is the right proxy for
      // "interaction observer mounted".
      if (['click', 'pointerdown', 'focusin', 'input'].includes(type)) captureClickMounts += 1;
      return before(type, ...rest);
    };
    render(<FeedbackProvider><div>x</div></FeedbackProvider>);
    expect(captureClickMounts).toBe(0);
    document.addEventListener = before;
  });

  it('with captureConfig={}, render is clean and does not error', () => {
    expect(() => render(<FeedbackProvider captureConfig={{}}><div>x</div></FeedbackProvider>)).not.toThrow();
  });
});
