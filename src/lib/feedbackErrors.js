/**
 * Error classes for the Feedback library.
 * Isomorphic: usable in browser and Node.
 */

class FeedbackError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class FeedbackAuthError extends FeedbackError {
  constructor(message = 'unauthorized') {
    super(message, 'unauthorized');
  }
}

export class FeedbackForbiddenError extends FeedbackError {
  constructor(message = 'forbidden') {
    super(message, 'forbidden');
  }
}

export class FeedbackValidationError extends FeedbackError {
  constructor(message = 'validation_failed', fields = {}) {
    super(message, 'validation_failed');
    this.fields = fields;
  }
}

export class FeedbackRateLimitError extends FeedbackError {
  constructor(retryAfter = 60, message = 'rate_limited') {
    super(message, 'rate_limited');
    this.retryAfter = retryAfter;
  }
}

export class FeedbackPayloadTooLargeError extends FeedbackError {
  constructor(message = 'payload_too_large') {
    super(message, 'payload_too_large');
  }
}
