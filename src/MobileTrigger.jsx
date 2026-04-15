import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { Camera } from 'lucide-react';
import { getTheme } from './theme.js';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const TriggerButton = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: ${p => p.theme.colors.btnPrimaryBg};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 99990;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  animation: ${fadeIn} 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active {
    transform: scale(0.92);
  }
`;

// Accept context functions as props to avoid circular import
export const MobileTrigger = ({ mode = 'light', onScreenshot, isActive }) => {
  const theme = getTheme(mode);

  if (isActive) return null;

  return createPortal(
    <ThemeProvider theme={theme}>
      <TriggerButton onClick={onScreenshot} aria-label="Take screenshot feedback">
        <Camera size={22} />
      </TriggerButton>
    </ThemeProvider>,
    document.body
  );
};
