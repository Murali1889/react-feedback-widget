import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes, css } from 'styled-components';
import { StopCircle, PauseCircle, PlayCircle, X } from 'lucide-react';
import { getTheme } from './theme.js';

// --- Animations ---
const slideInBottom = keyframes`
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

// --- Styled Components ---
const OverlayContainer = styled.div`
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10001;
  animation: ${slideInBottom} 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const RecordingStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  min-width: 90px;
`;

const RecordingIndicator = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ef4444;
  ${props => props.$isRecording && css`animation: ${pulse} 1.5s infinite;`}
`;

const Timer = styled.div`
  font-family: 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 15px;
  font-weight: 500;
  color: ${props => props.theme.colors.textPrimary};
`;

const ControlButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${props => props.theme.colors.textPrimary};
  background-color: ${props => props.theme.colors.hoverBg};

  &:hover {
    transform: scale(1.1);
  }
  
  &.stop-btn {
    background-color: #ef4444;
    color: white;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled(ControlButton)`
  background-color: transparent;
  width: 36px;
  height: 36px;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Loader = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid ${props => props.theme.colors.border};
  border-top-color: ${props => props.theme.colors.textPrimary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;


// --- Timer Formatting ---
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};


// --- Component ---
export const RecordingOverlay = ({
  isRecording,
  isPaused,
  isInitializing,
  onStop,
  onPause,
  onResume,
  onCancel,
  mode = 'light'
}) => {
  const [time, setTime] = useState(0);
  const theme = getTheme(mode);

  // Reset timer when recording starts
  useEffect(() => {
    if (isRecording) {
      setTime(0);
    }
  }, [isRecording]);

  useEffect(() => {
    let interval;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  if (!isRecording && !isInitializing) {
    return null;
  }

  return createPortal(
    <ThemeProvider theme={theme}>
      <OverlayContainer>
        <RecordingStatus>
          <RecordingIndicator $isRecording={!isPaused && !isInitializing} />
          <Timer>{isInitializing ? '00:00' : formatTime(time)}</Timer>
        </RecordingStatus>

        {isInitializing ? (
          <Loader />
        ) : (
          <>
            {isPaused ? (
              <ControlButton onClick={(e) => { e.stopPropagation(); onResume(); }} title="Resume Recording">
                <PlayCircle size={24} />
              </ControlButton>
            ) : (
              <ControlButton onClick={(e) => { e.stopPropagation(); onPause(); }} title="Pause Recording">
                <PauseCircle size={24} />
              </ControlButton>
            )}

            <ControlButton className="stop-btn" onClick={(e) => { e.stopPropagation(); onStop(); }} title="Stop Recording">
              <StopCircle size={24} />
            </ControlButton>
            
            <CancelButton onClick={(e) => { e.stopPropagation(); onCancel(); }} title="Cancel Recording">
              <X size={20} />
            </CancelButton>
          </>
        )}
      </OverlayContainer>
    </ThemeProvider>,
    document.body
  );
};
