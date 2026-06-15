import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserSignalSection } from '../sections/UserSignalSection.jsx';
import { VisualSection } from '../sections/VisualSection.jsx';
import { LogsSection } from '../sections/LogsSection.jsx';
import { SourceSection } from '../sections/SourceSection.jsx';

const baseItem = {
  feedback: 'thing broken',
  screenshot: 'data:image/png;base64,abc',
  eventLogs: [{ type: 'console', level: 'error', message: 'TypeError' }, { type: 'network', status: 500 }],
  elementInfo: { selector: 'button.x', componentStack: ['Form', 'App'], sourceFile: 'src/Form.jsx:14' },
};

describe('Evidence sections', () => {
  it('UserSignal renders the full feedback text and summary', () => {
    render(<UserSignalSection item={baseItem} />);
    expect(screen.getByText('thing broken')).toBeInTheDocument();
    const summary = UserSignalSection.summary(baseItem);
    expect(summary).toMatch(/12 chars/);
  });

  it('Visual renders the screenshot img tag', () => {
    const { container } = render(<VisualSection item={baseItem} />);
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('Visual.summary describes media inventory', () => {
    expect(VisualSection.summary({ video: 'x' })).toMatch(/video/);
    expect(VisualSection.summary({ screenshot: 'x' })).toMatch(/screenshot/);
    expect(VisualSection.summary({})).toBe('none');
  });

  it('Logs renders error and failed network rows', () => {
    render(<LogsSection item={baseItem} />);
    expect(screen.getByText(/TypeError/)).toBeInTheDocument();
  });

  it('Logs.summary counts errors and failed reqs', () => {
    expect(LogsSection.summary(baseItem)).toMatch(/1 error.*1 failed req/);
  });

  it('Source renders component breadcrumb and file path', () => {
    render(<SourceSection item={baseItem} />);
    expect(screen.getByText('Form › App')).toBeInTheDocument();
    expect(screen.getByText('src/Form.jsx:14')).toBeInTheDocument();
  });

  it('Source.summary returns shortened source path', () => {
    expect(SourceSection.summary(baseItem)).toBe('src/Form.jsx:14');
  });
});
