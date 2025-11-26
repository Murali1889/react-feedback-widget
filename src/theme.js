import styled, { keyframes, createGlobalStyle } from 'styled-components';

// Theme definitions
export const lightTheme = {
  mode: 'light',
  colors: {
    overlayBg: 'rgba(0, 0, 0, 0.03)',
    backdropBg: 'rgba(0, 0, 0, 0.6)',
    modalBg: '#ffffff',
    modalBorder: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    border: '#d1d5db',
    borderFocus: '#3b82f6',
    inputBg: '#ffffff',
    inputDisabledBg: '#f9fafb',
    btnCancelBg: '#f3f4f6',
    btnCancelHover: '#e5e7eb',
    btnCancelText: '#374151',
    btnPrimaryBg: '#3b82f6',
    btnPrimaryHover: '#2563eb',
    btnPrimaryText: '#ffffff',
    btnDisabledBg: '#9ca3af',
    highlightBorder: '#3b82f6',
    highlightBg: 'rgba(59, 130, 246, 0.1)',
    highlightShadow: 'rgba(59, 130, 246, 0.25)',
    tooltipBg: '#1f2937',
    tooltipText: '#ffffff',
    errorBg: '#fef2f2',
    errorBorder: '#fca5a5',
    errorText: '#dc2626',
    screenshotBorder: '#e5e7eb',
    screenshotBg: '#f9fafb',
    shadow: 'rgba(0, 0, 0, 0.1)',
    closeHoverBg: '#f3f4f6',
    hoverBg: '#f3f4f6',
    cardBg: '#ffffff',
    headerBg: '#f9fafb',
    contentBg: '#f9fafb',
  }
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    overlayBg: 'rgba(0, 0, 0, 0.2)',
    backdropBg: 'rgba(0, 0, 0, 0.8)',
    modalBg: '#1f2937',
    modalBorder: '#374151',
    textPrimary: '#f9fafb',
    textSecondary: '#d1d5db',
    textTertiary: '#9ca3af',
    border: '#4b5563',
    borderFocus: '#60a5fa',
    inputBg: '#111827',
    inputDisabledBg: '#374151',
    btnCancelBg: '#374151',
    btnCancelHover: '#4b5563',
    btnCancelText: '#d1d5db',
    btnPrimaryBg: '#3b82f6',
    btnPrimaryHover: '#2563eb',
    btnPrimaryText: '#ffffff',
    btnDisabledBg: '#4b5563',
    highlightBorder: '#60a5fa',
    highlightBg: 'rgba(96, 165, 250, 0.15)',
    highlightShadow: 'rgba(96, 165, 250, 0.3)',
    tooltipBg: '#374151',
    tooltipText: '#f9fafb',
    errorBg: '#7f1d1d',
    errorBorder: '#dc2626',
    errorText: '#fca5a5',
    screenshotBorder: '#374151',
    screenshotBg: '#111827',
    shadow: 'rgba(0, 0, 0, 0.4)',
    closeHoverBg: '#374151',
    hoverBg: '#374151',
    cardBg: '#111827',
    headerBg: '#111827',
    contentBg: '#0f172a',
  }
};

// Helper function to get theme
export const getTheme = (mode) => mode === 'dark' ? darkTheme : lightTheme;

// Keyframe animations
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -45%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

export const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInRight = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
`;

export const pulseRing = keyframes`
  0% {
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.7);
  }
  50% {
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 12px rgba(102, 126, 234, 0);
  }
  100% {
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0);
  }
`;

export const dropdownSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Global styles for feedback mode
export const FeedbackGlobalStyle = createGlobalStyle`
  body.feedback-mode-active {
    cursor: crosshair !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media print {
    .feedback-overlay,
    .feedback-backdrop,
    .feedback-modal,
    .feedback-tooltip,
    .feedback-highlight {
      display: none !important;
    }
  }
`;

// Note: Status options are now managed in FeedbackDashboard.jsx
// See DEFAULT_STATUSES export from FeedbackDashboard for customization
