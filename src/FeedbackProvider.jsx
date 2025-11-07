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
import { FeedbackDashboard, saveFeedbackToLocalStorage } from './FeedbackDashboard.jsx';
import { getElementInfo, captureElementScreenshot } from './utils.js';

const FeedbackContext = createContext(null);

export const FeedbackProvider = ({
  children,
  onSubmit,
  isActive: controlledIsActive,
  onActiveChange,
  dashboard = false,
  dashboardData,
  isDeveloper = false,
  isUser = true,
  userName,
  userEmail,
  onStatusChange,
  mode = 'light'
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
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

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
    // Ctrl + Q to activate feedback mode
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      if (!isActive) {
        setIsActive(true);
      }
      return;
    }

    // Ctrl + Shift + Q to open dashboard (only if dashboard prop is enabled)
    if (dashboard && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      setIsDashboardOpen(true);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isActive) {
        setIsActive(false);
        setIsModalOpen(false);
      }
      if (isDashboardOpen) {
        setIsDashboardOpen(false);
      }
    }
  }, [isActive, isDashboardOpen, dashboard]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Add/remove body class and disable page interactions when feedback mode is active
  useEffect(() => {
    if (isActive) {
      document.body.classList.add('feedback-mode-active');
    } else {
      document.body.classList.remove('feedback-mode-active');
    }

    return () => {
      document.body.classList.remove('feedback-mode-active');
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      setHoveredElement(null);
      setSelectedElement(null);
      setIsModalOpen(false); // Close modal when isActive becomes false
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
      // If dashboard is enabled, use localStorage
      if (dashboard) {
        const result = saveFeedbackToLocalStorage(feedbackData);
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Also call onSubmit if provided
      if (onSubmit && typeof onSubmit === 'function') {
        await onSubmit(feedbackData);
      }

      setIsModalOpen(false);
      setIsActive(false);
      setSelectedElement(null);
      setScreenshot(null);
      setHoveredElement(null);
    } catch (error) {
      throw error;
    }
  }, [onSubmit, dashboard]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedElement(null);
    setScreenshot(null);
  }, []);

  const themeClass = mode === 'dark' ? 'feedback-dark' : 'feedback-light';

  return (
    <FeedbackContext.Provider value={{ isActive, setIsActive, setIsDashboardOpen }}>
      {children}

      {isActive && createPortal(
        <>
          <div ref={overlayRef} className={`feedback-overlay ${themeClass}`} />

          {hoveredElement && (
            <>
              <div
                ref={highlightRef}
                className={`feedback-highlight ${themeClass}`}
                style={highlightStyle}
              />
              <div className={`feedback-tooltip ${themeClass}`} style={tooltipStyle}>
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
        userName={userName}
        userEmail={userEmail}
        mode={mode}
      />

      {dashboard && (
        <FeedbackDashboard
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          data={dashboardData}
          isDeveloper={isDeveloper}
          isUser={isUser}
          onStatusChange={onStatusChange}
        />
      )}
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