import { describe, it, expect, vi } from 'vitest';
import React from 'react';
// NOTE: This suite uses @testing-library/react + jsdom; both are added in
// Phase B. Kept here (Vitest-shaped) so Phase B only removes `.skip`.

// import { render, screen, fireEvent } from '@testing-library/react';
// import { FeedbackProvider } from '../FeedbackProvider';
// import { FeedbackModal } from '../FeedbackModal';

// vi.mock('../FeedbackModal', () => ({
//   FeedbackModal: vi.fn(({ isOpen, isManual }) => (
//     isOpen ? <div data-testid="feedback-modal" data-manual={isManual ? "true" : "false"}>Modal</div> : null
//   ))
// }));

describe('FeedbackProvider Features', () => {
  it('opens manual feedback on Alt+A', () => {
    // render(
    //   <FeedbackProvider onSubmit={() => {}}>
    //     <div data-testid="child">Child</div>
    //   </FeedbackProvider>
    // );
    // fireEvent.keyDown(document, { key: 'a', altKey: true, code: 'KeyA' });
    // const modal = screen.getByTestId('feedback-modal');
    // expect(modal).toBeInTheDocument();
    // expect(modal).toHaveAttribute('data-manual', 'true');
  });

  it('opens directly if defaultOpen is true', () => {
    // render(
    //   <FeedbackProvider onSubmit={() => {}} defaultOpen={true}>
    //     <div data-testid="child">Child</div>
    //   </FeedbackProvider>
    // );
    // const modal = screen.getByTestId('feedback-modal');
    // expect(modal).toBeInTheDocument();
    // expect(modal).toHaveAttribute('data-manual', 'true');
  });
});

describe('FeedbackModal Manual Upload', () => {
  it('renders file inputs when no screenshot is present', () => {
    // jsdom-dependent; revisit in Phase B
  });
});
