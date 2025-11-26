import React from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import { MessageSquare, Video } from 'lucide-react';
import { getTheme, pulseRing } from './theme.js';

// Styled Components
const Container = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
`;

const BaseButton = styled.button`
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const MainButton = styled(BaseButton)`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.7);
  animation: ${pulseRing} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  &:hover {
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.5);
    animation: none;
  }
`;

const SecondaryButton = styled(BaseButton)`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;


/**
 * Floating feedback button - triggers screenshot feedback mode
 */
export const FeedbackTrigger = ({ onFeedback, onRecord, showRecordButton = false, mode = 'light' }) => {
  const theme = getTheme(mode);

  return createPortal(
    <ThemeProvider theme={theme}>
      <Container>
        {showRecordButton && (
          <SecondaryButton
            onClick={() => onRecord?.()}
            aria-label="Record Video Feedback"
            title="Record Video Feedback"
          >
            <Video size={24} />
          </SecondaryButton>
        )}
        <MainButton
          onClick={() => onFeedback?.()}
          aria-label="Give Feedback"
          title="Give Feedback (Alt + Q)"
        >
          <MessageSquare size={28} strokeWidth={2.5} />
        </MainButton>
      </Container>
    </ThemeProvider>,
    document.body
  );
};
