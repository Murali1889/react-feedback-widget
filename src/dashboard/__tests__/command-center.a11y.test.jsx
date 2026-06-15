import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { FeedbackCommandCenter } from '../FeedbackCommandCenter.jsx';

const items = [
  { id: '1', feedback: 'hello world', type: 'bug', status: 'new', severity: 'high', timestamp: new Date().toISOString(), userName: 'M' },
];

describe('FeedbackCommandCenter a11y', () => {
  it('passes axe on a default render', async () => {
    const { container } = render(<FeedbackCommandCenter isOpen onClose={() => {}} data={items} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
