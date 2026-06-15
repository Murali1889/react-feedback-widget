import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeedbackDashboard, DEFAULT_STATUSES, saveFeedbackToLocalStorage } from '../../FeedbackDashboard.jsx';

describe('FeedbackDashboard backward compat', () => {
  it('side-effect exports survive the wrapper', () => {
    expect(typeof DEFAULT_STATUSES).toBe('object');
    expect(typeof saveFeedbackToLocalStorage).toBe('function');
  });

  it('renders without warnings when given current prop shape', () => {
    const { container } = render(
      <FeedbackDashboard
        isOpen={true}
        onClose={() => {}}
        data={[{ id: '1', feedback: 'hi', status: 'new' }]}
        isDeveloper={false}
        mode="light"
      />
    );
    expect(container.textContent).toMatch(/Feedback/);
  });
});
