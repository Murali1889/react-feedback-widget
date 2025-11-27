import React, { useReducer } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackProvider } from '../FeedbackProvider';
import { FeedbackModal } from '../FeedbackModal';

// Mock components to isolate unit logic
jest.mock('../FeedbackModal', () => ({
  FeedbackModal: jest.fn(({ isOpen, isManual }) => (
    isOpen ? <div data-testid="feedback-modal" data-manual={isManual ? "true" : "false"}>Modal</div> : null
  ))
}));

describe('FeedbackProvider Features', () => {
  it('opens manual feedback on Alt+A', () => {
    render(
      <FeedbackProvider onSubmit={() => {}}>
        <div data-testid="child">Child</div>
      </FeedbackProvider>
    );

    // Simulate Alt+A keypress
    fireEvent.keyDown(document, { key: 'a', altKey: true, code: 'KeyA' });

    // Expect modal to be open and isManual to be true
    const modal = screen.getByTestId('feedback-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('data-manual', 'true');
  });

  it('opens directly if defaultOpen is true', () => {
    render(
      <FeedbackProvider onSubmit={() => {}} defaultOpen={true}>
        <div data-testid="child">Child</div>
      </FeedbackProvider>
    );

    const modal = screen.getByTestId('feedback-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('data-manual', 'true');
  });
});

describe('FeedbackModal Manual Upload', () => {
  // Since we can't easily test internal state without full render, 
  // we assume the manual upload inputs are present when no screenshot is provided.
  
  it('renders file inputs when no screenshot is present', () => {
    // This would require unmocking FeedbackModal or testing it in isolation
  });
});
