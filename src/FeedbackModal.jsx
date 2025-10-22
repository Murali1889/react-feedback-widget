import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader, CheckCircle } from 'lucide-react';

export const FeedbackModal = ({
  isOpen,
  onClose,
  elementInfo,
  screenshot,
  onSubmit
}) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);

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
      timestamp: new Date().toISOString()
    };

    try {
      await onSubmit(feedbackData);
      setIsSubmitted(true);

      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setFeedback('');
      }, 1500);
    } catch (error) {
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

  return createPortal(
    <>
      <div className="feedback-backdrop" onClick={onClose} />
      <div className="feedback-modal">
        <div className="feedback-modal-content">
          <div className="feedback-header">
            <h3 className="feedback-title">Help Us Improve ❤️</h3>
            <button onClick={onClose} className="feedback-close">
              <X size={20} />
            </button>
          </div>

          <div className="feedback-body">
            {/* Left side - Screenshot */}
            {screenshot && (
              <div className="feedback-screenshot-container">
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
                <label className="feedback-label">Your Feedback</label>
                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the issue or suggestion..."
                  className="feedback-textarea"
                  rows={12}
                  disabled={isSubmitting || isSubmitted}
                />
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