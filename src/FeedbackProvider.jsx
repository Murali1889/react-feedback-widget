import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useReducer
} from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import { FeedbackModal } from './FeedbackModal.jsx';
import { FeedbackDashboard, saveFeedbackToLocalStorage } from './FeedbackDashboard.jsx';
import { CanvasOverlay } from './CanvasOverlay.jsx';
import { RecordingOverlay } from './RecordingOverlay.jsx';
import recorder from './recorder.js';
import { getElementInfo, captureElementScreenshot, getReactComponentInfo } from './utils.js';
import { getTheme, FeedbackGlobalStyle } from './theme.js';

const FeedbackContext = createContext(null);

// Styled Components for FeedbackProvider
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.theme.colors.overlayBg};
  z-index: 999998;
  cursor: crosshair;
  pointer-events: none;
  transition: background 0.2s ease;
`;

const Highlight = styled.div`
  position: absolute;
  border: 2px solid ${props => props.theme.colors.highlightBorder};
  background: ${props => props.theme.colors.highlightBg};
  pointer-events: none;
  z-index: 999999;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 0 0 4px ${props => props.theme.colors.highlightShadow},
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 4px;
`;

const Tooltip = styled.div`
  position: fixed;
  background: ${props => props.theme.colors.tooltipBg};
  color: ${props => props.theme.colors.tooltipText};
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-weight: 500;
  pointer-events: none;
  z-index: 1000000;
  white-space: nowrap;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.3),
    0 4px 6px -2px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.15s ease;
  max-width: 300px;
`;

const TooltipComponent = styled.span`
  color: #10b981;
  font-weight: 600;
`;

const TooltipTag = styled.span`
  color: ${props => props.theme.colors.tooltipText};
  opacity: 0.7;
`;

const initialState = {
  internalIsActive: false,
  hoveredElement: null,
  hoveredComponentInfo: null,
  selectedElement: null,
  highlightStyle: {},
  tooltipStyle: {},
  isModalOpen: false,
  screenshot: null,
  isCapturing: false,
  isDashboardOpen: false,
  isCanvasActive: false,
  isRecordingActive: false,
  isRecording: false,
  isInitializing: false,
  isPaused: false,
  videoBlob: null,
  eventLogs: [],
};

function feedbackReducer(state, action) {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'START_HOVERING':
      return { ...state, hoveredElement: action.payload.element, hoveredComponentInfo: action.payload.componentInfo, highlightStyle: action.payload.highlightStyle, tooltipStyle: action.payload.tooltipStyle };
    case 'STOP_HOVERING':
      return { ...state, hoveredElement: null, hoveredComponentInfo: null };
    case 'START_CAPTURE':
      return { ...state, isCapturing: true, selectedElement: action.payload };
    case 'COMPLETE_CAPTURE':
      return { ...state, isCapturing: false, screenshot: action.payload, isModalOpen: true, hoveredElement: null, hoveredComponentInfo: null };
    case 'CANCEL_CAPTURE':
      return { ...state, isCapturing: false, hoveredElement: null, hoveredComponentInfo: null };
    case 'OPEN_DASHBOARD':
      return { ...state, isDashboardOpen: true };
    case 'CLOSE_DASHBOARD':
      return { ...state, isDashboardOpen: false };
    case 'START_RECORDING_INIT':
      return { ...state, isInitializing: true };
    case 'START_RECORDING_SUCCESS':
      return { ...state, isInitializing: false, isRecordingActive: true, isRecording: true, isPaused: false };
    case 'START_RECORDING_FAILURE':
      return { ...state, isInitializing: false, isRecording: false, isRecordingActive: false };
    case 'PAUSE_RECORDING':
      return { ...state, isPaused: true };
    case 'RESUME_RECORDING':
      return { ...state, isPaused: false };
    case 'CANCEL_RECORDING':
      return { ...state, isRecordingActive: false, isRecording: false, isInitializing: false, isPaused: false, videoBlob: null, eventLogs: [] };
    case 'STOP_RECORDING':
      return { ...state, isRecordingActive: false, isRecording: false, isInitializing: false, isPaused: false, videoBlob: action.payload.blob, eventLogs: action.payload.events, isModalOpen: action.payload.blob && action.payload.blob.size > 0 };
    case 'RESET_MODAL':
      return { ...state, isModalOpen: false, selectedElement: null, screenshot: null, hoveredElement: null, hoveredComponentInfo: null, isCanvasActive: false, videoBlob: null, eventLogs: [] };
    default:
      return state;
  }
}

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
  const [state, dispatch] = useReducer(feedbackReducer, initialState);
  const {
    internalIsActive,
    hoveredElement,
    hoveredComponentInfo,
    selectedElement,
    highlightStyle,
    tooltipStyle,
    isModalOpen,
    screenshot,
    isCapturing,
    isDashboardOpen,
    isCanvasActive,
    isRecordingActive,
    isRecording,
    isInitializing,
    isPaused,
    videoBlob,
    eventLogs,
  } = state;

  // Determine if component is controlled
  const isControlled = controlledIsActive !== undefined;
  const isActive = isControlled ? controlledIsActive : internalIsActive;

  // Handle state changes
  const setIsActive = useCallback((newValue) => {
    if (isControlled) {
      if (onActiveChange) {
        onActiveChange(typeof newValue === 'function' ? newValue(isActive) : newValue);
      }
    } else {
      dispatch({ type: 'SET_STATE', payload: { internalIsActive: newValue } });
    }
  }, [isControlled, onActiveChange, isActive]);

  const overlayRef = useRef(null);
  const highlightRef = useRef(null);

  const theme = getTheme(mode);

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

    const componentInfo = getReactComponentInfo(element);
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    dispatch({
      type: 'START_HOVERING',
      payload: {
        element,
        componentInfo,
        highlightStyle: {
          left: rect.left + scrollX,
          top: rect.top + scrollY,
          width: rect.width,
          height: rect.height,
        },
        tooltipStyle: {
          left: Math.min(e.clientX + 10, window.innerWidth - 300),
          top: Math.max(e.clientY - 40, 10),
        }
      }
    });
  }, [isActive, hoveredElement, isValidElement]);

  const handleElementClick = useCallback(async (e) => {
    if (!isActive || !hoveredElement) return;

    e.preventDefault();
    e.stopPropagation();

    console.log('[Feedback] Element clicked:', hoveredElement.tagName, hoveredElement.id || hoveredElement.className);

    dispatch({ type: 'START_CAPTURE', payload: hoveredElement });

    try {
      console.log('[Feedback] Starting screenshot capture...');
      const screenshotData = await captureElementScreenshot(hoveredElement);
      console.log('[Feedback] Screenshot captured:', screenshotData ? `${screenshotData.length} bytes` : 'null');
      dispatch({ type: 'COMPLETE_CAPTURE', payload: screenshotData });
    } catch (error) {
      console.error('[Feedback] Screenshot error:', error);
      dispatch({ type: 'COMPLETE_CAPTURE', payload: null });
    }
  }, [isActive, hoveredElement]);

  const handleKeyDown = useCallback((e) => {
    if (e.altKey && !e.shiftKey && (e.key.toLowerCase() === 'q' || e.keyCode === 81 || e.code === 'KeyQ')) {
      e.preventDefault();
      if (!isActive) {
        setIsActive(true);
        dispatch({ type: 'SET_STATE', payload: { isCanvasActive: false } });
      }
      return;
    }

    if (dashboard && e.altKey && e.shiftKey && (e.key.toLowerCase() === 'q' || e.keyCode === 81 || e.code === 'KeyQ')) {
      e.preventDefault();
      dispatch({ type: 'OPEN_DASHBOARD' });
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isActive) {
        setIsActive(false);
        dispatch({ type: 'RESET_MODAL' });
      }
      if (isDashboardOpen) {
        dispatch({ type: 'CLOSE_DASHBOARD' });
      }
    }
  }, [isActive, isDashboardOpen, dashboard, setIsActive]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
      dispatch({ type: 'STOP_HOVERING' });
      dispatch({ type: 'SET_STATE', payload: { selectedElement: null } });
      return;
    }

    if (!isCanvasActive && !isModalOpen) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleElementClick, true);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('click', handleElementClick, true);
      };
    }
  }, [isActive, isCanvasActive, isModalOpen, handleMouseMove, handleElementClick]);

  const handleFeedbackSubmit = useCallback(async (feedbackData) => {
    try {
      if (dashboard) {
        const result = await saveFeedbackToLocalStorage(feedbackData);
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      if (onSubmit && typeof onSubmit === 'function') {
        await onSubmit(feedbackData);
      }

      setIsActive(false);
      dispatch({ type: 'RESET_MODAL' });
    } catch (error) {
      throw error;
    }
  }, [onSubmit, dashboard, setIsActive]);

  const handleCloseModal = useCallback(() => {
    setIsActive(false);
    dispatch({ type: 'RESET_MODAL' });
  }, [setIsActive]);

  const handleCanvasComplete = useCallback(async (canvasScreenshot, feedbackText) => {
    setIsActive(false);
    dispatch({ type: 'SET_STATE', payload: { isCanvasActive: false } });

    const feedbackData = {
      feedback: feedbackText,
      elementInfo: null,
      screenshot: canvasScreenshot,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timestamp: new Date().toISOString(),
      userName: userName || 'Anonymous',
      userEmail: userEmail || null
    };

    try {
      if (dashboard) {
        const result = await saveFeedbackToLocalStorage(feedbackData);
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      if (onSubmit && typeof onSubmit === 'function') {
        await onSubmit(feedbackData);
      }
      
      dispatch({ type: 'STOP_HOVERING' });
      dispatch({ type: 'SET_STATE', payload: { selectedElement: null, screenshot: null } });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }, [dashboard, onSubmit, userName, userEmail, setIsActive]);

  const handleCanvasCancel = useCallback(() => {
    setIsActive(false);
    dispatch({ type: 'SET_STATE', payload: { isCanvasActive: false } });
  }, [setIsActive]);

  const handleStartRecording = useCallback(async () => {
    try {
      dispatch({ type: 'START_RECORDING_INIT' });
      await recorder.start();
      dispatch({ type: 'START_RECORDING_SUCCESS' });
    } catch (error) {
      console.error("Could not start recording:", error);
      dispatch({ type: 'START_RECORDING_FAILURE' });
      alert("Could not start recording. Please ensure you have granted screen and microphone permissions.");
    }
  }, []);

  const handlePauseRecording = useCallback(() => {
    recorder.pause();
    dispatch({ type: 'PAUSE_RECORDING' });
  }, []);

  const handleResumeRecording = useCallback(() => {
    recorder.resume();
    dispatch({ type: 'RESUME_RECORDING' });
  }, []);
  
  const handleCancelRecording = useCallback(async () => {
    await recorder.stop();
    dispatch({ type: 'CANCEL_RECORDING' });
  }, []);

  const handleStopRecording = useCallback(async () => {
    const { videoBlob: blob, events } = await recorder.stop();
    dispatch({ type: 'STOP_RECORDING', payload: { blob, events } });
    if (!blob || blob.size === 0) {
      alert('Recording failed: No video data was captured.');
    }
  }, []);

  const setIsDashboardOpen = useCallback((value) => {
    if (value) {
      dispatch({ type: 'OPEN_DASHBOARD' });
    } else {
      dispatch({ type: 'CLOSE_DASHBOARD' });
    }
  }, []);

  const getTooltipContent = () => {
    if (!hoveredElement) return null;
    const tagName = hoveredElement.tagName.toLowerCase();
    const id = hoveredElement.id ? `#${hoveredElement.id}` : '';
    const componentName = hoveredComponentInfo?.componentName;
    return { tagName, id, componentName };
  };

  const tooltipContent = getTooltipContent();

  console.log('[FeedbackProvider] Rendering - isModalOpen:', isModalOpen, 'videoBlob:', videoBlob);

  return (
    <FeedbackContext.Provider value={{ isActive, setIsActive, setIsDashboardOpen, startRecording: handleStartRecording }}>
      <ThemeProvider theme={theme}>
        <FeedbackGlobalStyle />
        {children}

        {isActive && !isCanvasActive && !isModalOpen && createPortal(
          <>
            <Overlay ref={overlayRef} />

            {hoveredElement && (
              <>
                <Highlight
                  ref={highlightRef}
                  style={highlightStyle}
                />
                <Tooltip style={tooltipStyle}>
                  {tooltipContent?.componentName && (
                    <>
                      <TooltipComponent>&lt;{tooltipContent.componentName}&gt;</TooltipComponent>
                      {' '}
                    </>
                  )}
                  <TooltipTag>
                    {tooltipContent?.tagName}
                    {tooltipContent?.id}
                  </TooltipTag>
                  {isCapturing && ' (Capturing...)'}
                </Tooltip>
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
          videoBlob={videoBlob}
          eventLogs={eventLogs}
          onSubmit={handleFeedbackSubmit}
          userName={userName}
          userEmail={userEmail}
          mode={mode}
        />

        <CanvasOverlay
          isActive={isCanvasActive}
          onComplete={handleCanvasComplete}
          onCancel={handleCanvasCancel}
          mode={mode}
        />

        <RecordingOverlay
          isRecording={isRecording}
          isInitializing={isInitializing}
          isPaused={isPaused}
          onStop={handleStopRecording}
          onPause={handlePauseRecording}
          onResume={handleResumeRecording}
          onCancel={handleCancelRecording}
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
            userName={userName}
            userEmail={userEmail}
            mode={mode}
          />
        )}
      </ThemeProvider>
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
