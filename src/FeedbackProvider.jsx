import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
import { createPortal } from 'react-dom';
import { FeedbackModal } from './FeedbackModal.jsx';
import { getElementInfo, captureElementScreenshot } from './utils.js';

const FeedbackContext = createContext(null);

export const FeedbackProvider = ({
  children,
  onSubmit,
  isActive: controlledIsActive,
  onActiveChange
}) => {
  const [internalIsActive, setInternalIsActive] = useState(false);

  // Determine if component is controlled
  const isControlled = controlledIsActive !== undefined;
  const isActive = isControlled ? controlledIsActive : internalIsActive;

  // Handle state changes
  const setIsActive = useCallback((newValue) => {
    if (isControlled) {
      // If controlled, call the callback
      if (onActiveChange) {
        onActiveChange(typeof newValue === 'function' ? newValue(isActive) : newValue);
      }
    } else {
      // If uncontrolled, update internal state
      setInternalIsActive(newValue);
    }
  }, [isControlled, onActiveChange, isActive]);

  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [highlightStyle, setHighlightStyle] = useState({});
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const overlayRef = useRef(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    if (!onSubmit || typeof onSubmit !== 'function') {
      // onSubmit function is required
    }
  }, [onSubmit]);

  const isValidElement = useCallback((element) => {
    if (!element || element === document.body || element === document.documentElement) {
      return false;
    }

    if (element.closest('.feedback-overlay, .feedback-modal, .feedback-backdrop, .feedback-tooltip, .feedback-highlight')) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      return false;
    }

    return true;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isActive) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!isValidElement(element) || element === hoveredElement) return;

    setHoveredElement(element);

    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    setHighlightStyle({
      left: rect.left + scrollX,
      top: rect.top + scrollY,
      width: rect.width,
      height: rect.height,
    });

    const tooltipX = Math.min(e.clientX + 10, window.innerWidth - 200);
    const tooltipY = e.clientY - 40;

    setTooltipStyle({
      left: tooltipX,
      top: Math.max(tooltipY, 10),
    });
  }, [isActive, hoveredElement, isValidElement]);

  const handleElementClick = useCallback(async (e) => {
    if (!isActive || !hoveredElement) return;

    e.preventDefault();
    e.stopPropagation();

    setIsCapturing(true);
    setSelectedElement(hoveredElement);

    try {
      const screenshotData = await captureElementScreenshot(hoveredElement);
      setScreenshot(screenshotData);
      setIsModalOpen(true);
    } catch (error) {
      setIsModalOpen(true);
    } finally {
      setIsCapturing(false);
      setHoveredElement(null);
    }
  }, [isActive, hoveredElement]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      if (!isActive) {
        setIsActive(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isActive) {
        setIsActive(false);
        setIsModalOpen(false);
      }
    }
  }, [isActive]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!isActive) {
      setHoveredElement(null);
      setSelectedElement(null);
      return;
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleElementClick, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleElementClick, true);
    };
  }, [isActive, handleMouseMove, handleElementClick]);

  const handleFeedbackSubmit = useCallback(async (feedbackData) => {
    try {
      await onSubmit(feedbackData);
      setIsModalOpen(false);
      setIsActive(false);
      setSelectedElement(null);
      setScreenshot(null);
      setHoveredElement(null);
    } catch (error) {
      throw error;
    }
  }, [onSubmit]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedElement(null);
    setScreenshot(null);
  }, []);

  return (
    <FeedbackContext.Provider value={{ isActive, setIsActive }}>
      {children}

      {isActive && createPortal(
        <>
          <div ref={overlayRef} className="feedback-overlay" />

          {hoveredElement && (
            <>
              <div
                ref={highlightRef}
                className="feedback-highlight"
                style={highlightStyle}
              />
              <div className="feedback-tooltip" style={tooltipStyle}>
                {hoveredElement.tagName.toLowerCase()}
                {hoveredElement.id && `#${hoveredElement.id}`}
                {isCapturing && ' (Capturing...)'}
              </div>
            </>
          )}
        </>,
        document.body
      )}

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        elementInfo={selectedElement ? getElementInfo(selectedElement) : null}
        screenshot={screenshot}
        onSubmit={handleFeedbackSubmit}
      />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
};