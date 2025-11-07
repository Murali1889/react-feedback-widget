import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export const FeedbackModal = ({
  isOpen,
  onClose,
  elementInfo,
  screenshot,
  onSubmit,
  userName,
  userEmail,
  mode = 'dark'
}) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Focus textarea when opening
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      // Reset all states when closing
      setFeedback('');
      setIsSubmitting(false);
      setIsSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const feedbackData = {
      feedback: feedback.trim(),
      elementInfo,
      screenshot,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: new Date().toISOString(),
      userName: userName || 'Anonymous',
      userEmail: userEmail || null
    };

    try {
      await onSubmit(feedbackData);
      setIsSubmitted(true);
      setIsSubmitting(false);
      setError(null);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[React Feedback Widget] Submission failed:', err);
      setError(err?.message || 'Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  const themeClass = mode === 'dark' ? 'feedback-dark' : 'feedback-light';

  return createPortal(
    <>
      <div className={`feedback-backdrop ${themeClass}`} onClick={onClose} />
      <div className={`feedback-modal ${themeClass}`}>
        <div className="feedback-modal-content">
          <div className="feedback-header">
            <div className="feedback-title-wrapper">
              <h3 className="feedback-title">Share Your Feedback</h3>
              <p className="feedback-subtitle">Help us improve your experience</p>
            </div>
            <button onClick={onClose} className="feedback-close" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="feedback-body">
            {/* Left side - Screenshot */}
            {screenshot && (
              <div className="feedback-screenshot-container">
                <label className="feedback-screenshot-label">Screenshot Preview</label>
                <div className="feedback-screenshot">
                  <img
                    src={screenshot}
                    alt="Element screenshot"
                    className="feedback-screenshot-img"
                  />
                </div>
              </div>
            )}

            {/* Right side - Form */}
            <div className="feedback-form-container">
              <div className="feedback-form">
                <label className="feedback-label">
                  Your Feedback
                  <span className="feedback-required">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell us what you think... (Ctrl/Cmd + Enter to submit)"
                  className="feedback-textarea"
                  rows={12}
                  disabled={isSubmitting || isSubmitted}
                  aria-invalid={error ? 'true' : 'false'}
                />
                {error && (
                  <div className="feedback-error" role="alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="feedback-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="feedback-btn feedback-cancel"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!feedback.trim() || isSubmitting || isSubmitted}
                  className="feedback-btn feedback-submit"
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle size={16} />
                      Submitted!
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader size={16} className="feedback-loading" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};