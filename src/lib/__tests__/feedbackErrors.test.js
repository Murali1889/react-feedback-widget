import { describe, it, expect } from 'vitest';
import {
  FeedbackAuthError,
  FeedbackForbiddenError,
  FeedbackValidationError,
  FeedbackRateLimitError,
  FeedbackPayloadTooLargeError,
} from '../feedbackErrors.js';

describe('Feedback error classes', () => {
  it('FeedbackAuthError has code "unauthorized" and is an Error', () => {
    const err = new FeedbackAuthError();
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('unauthorized');
    expect(err.name).toBe('FeedbackAuthError');
  });

  it('FeedbackForbiddenError has code "forbidden"', () => {
    expect(new FeedbackForbiddenError().code).toBe('forbidden');
  });

  it('FeedbackValidationError carries fields', () => {
    const err = new FeedbackValidationError('bad', { feedback: 'required' });
    expect(err.code).toBe('validation_failed');
    expect(err.fields).toEqual({ feedback: 'required' });
  });

  it('FeedbackRateLimitError carries retryAfter seconds', () => {
    const err = new FeedbackRateLimitError(60);
    expect(err.code).toBe('rate_limited');
    expect(err.retryAfter).toBe(60);
  });

  it('FeedbackPayloadTooLargeError has code "payload_too_large"', () => {
    expect(new FeedbackPayloadTooLargeError().code).toBe('payload_too_large');
  });

  it('errors accept and preserve a message', () => {
    const err = new FeedbackAuthError('token expired');
    expect(err.message).toBe('token expired');
  });
});
