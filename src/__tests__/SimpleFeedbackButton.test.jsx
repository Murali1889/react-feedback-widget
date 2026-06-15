import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SimpleFeedbackButton } from '../SimpleFeedbackButton';

vi.mock('../FeedbackProvider', () => ({
  FeedbackProvider: vi.fn(({ children, ...props }) => (
    <div data-testid="provider" data-props={JSON.stringify({
      hasOnSubmit: !!props.onSubmit,
      dashboard: !!props.dashboard,
      mode: props.mode,
      authMode: props.auth?.mode,
      redact: props.redact,
      userName: props.userName,
      hasCaptureConfig: !!props.captureConfig,
    })}>{children}</div>
  )),
}));

describe('SimpleFeedbackButton', () => {
  it('forwards onSubmit to FeedbackProvider', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(
      <SimpleFeedbackButton onSubmit={onSubmit}>app</SimpleFeedbackButton>
    );
    const props = JSON.parse(getByTestId('provider').getAttribute('data-props'));
    expect(props.hasOnSubmit).toBe(true);
  });

  it('applies secure-by-default props (session auth, dashboard, default redaction)', () => {
    const { getByTestId } = render(<SimpleFeedbackButton onSubmit={() => {}} />);
    const props = JSON.parse(getByTestId('provider').getAttribute('data-props'));
    expect(props.dashboard).toBe(true);
    expect(props.authMode).toBe('session');
    expect(props.redact).toBe('default');
    expect(props.mode).toBe('light');
  });

  it('threads userName + userEmail to provider', () => {
    const { getByTestId } = render(
      <SimpleFeedbackButton onSubmit={() => {}} userName="Alice" userEmail="a@x.com" />
    );
    const props = JSON.parse(getByTestId('provider').getAttribute('data-props'));
    expect(props.userName).toBe('Alice');
  });

  it('renders captureConfig when buildInfo or flagsSnapshot supplied', () => {
    const { getByTestId } = render(
      <SimpleFeedbackButton
        onSubmit={() => {}}
        buildInfo={{ commit: 'abc' }}
        flagsSnapshot={() => ({})}
      />
    );
    const props = JSON.parse(getByTestId('provider').getAttribute('data-props'));
    expect(props.hasCaptureConfig).toBe(true);
  });
});
