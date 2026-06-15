import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { tokens } from './ui/tokens.js';

/**
 * Map the new semantic tokens onto the long-standing legacy color
 * names so existing styled-components keep working without any
 * change. New code should reach for theme.tokens.color.* directly
 * via the UIThemeProvider (see src/ui/ThemeContext.jsx).
 */
function mapToLegacy(t) {
  return {
    // Surfaces and backgrounds
    overlayBg: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.03)',
    backdropBg: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)',
    modalBg: t.color.surface,
    modalBorder: t.color.border,
    cardBg: t.color.surface,
    headerBg: t.color.canvas,
    contentBg: t.color.canvas,
    hoverBg: t.color.canvas,
    closeHoverBg: t.color.canvas,
    screenshotBg: t.color.canvas,
    screenshotBorder: t.color.border,

    // Text
    textPrimary: t.color.text,
    textSecondary: t.color.textMuted,
    textTertiary: t.color.textFaint,

    // Borders + focus
    border: t.color.borderStrong,
    borderFocus: t.color.accent,

    // Inputs
    inputBg: t.color.surface,
    inputDisabledBg: t.color.canvas,

    // Buttons
    btnCancelBg: t.color.canvas,
    btnCancelHover: t.color.border,
    btnCancelText: t.color.text,
    btnPrimaryBg: t.color.accent,
    btnPrimaryHover: t.color.accentHover,
    btnPrimaryText: '#ffffff',
    btnDisabledBg: t.color.borderStrong,

    // Selection highlight
    highlightBorder: t.color.accent,
    highlightBg: t.color.accentTint,
    highlightShadow: t.color.accentRing,

    // Tooltip
    tooltipBg: t.color.text,
    tooltipText: t.color.bg,

    // Error state
    errorBg: t.color.dangerBg,
    errorBorder: t.color.danger,
    errorText: t.color.danger,

    // Generic shadow alias
    shadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',

    // Feedback dots
    dotBorder: t.color.surface,
    dotPopoverBg: t.color.surface,
    dotPopoverBorder: t.color.border,
    dotPopoverShadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)',
    dotMiniCardBg: t.color.surface,
    dotMiniCardBorder: t.color.border,
    dotMiniCardShadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.12)',
    dotToolbarBg: t.color.surface,
    dotToolbarBorder: t.color.border,
    dotToolbarShadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.12)',
    dotClusterBg: t.color.accent,
    dotClusterText: '#ffffff',
    dotFocusRing: t.color.accent,
  };
}

export const lightTheme = { mode: 'light', colors: mapToLegacy(tokens.light) };
export const darkTheme  = { mode: 'dark',  colors: mapToLegacy(tokens.dark)  };

export const getTheme = (mode) => mode === 'dark' ? darkTheme : lightTheme;

// --- keyframes (unchanged below this line) ---
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translate(-50%, -45%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

export const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const slideInRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
`;

export const spin = keyframes`to { transform: rotate(360deg); }`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.8); }
`;

export const pulseRing = keyframes`
  0%   { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.7); }
  50%  { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 12px rgba(102, 126, 234, 0); }
  100% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0); }
`;

export const dropdownSlideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const FeedbackGlobalStyle = createGlobalStyle`
  body.feedback-mode-active {
    cursor: crosshair !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  @media print {
    .feedback-overlay, .feedback-backdrop, .feedback-modal,
    .feedback-tooltip, .feedback-highlight { display: none !important; }
  }
`;

export const dotPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  50%      { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
`;
