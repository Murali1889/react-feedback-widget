// No CSS import needed - using styled-components

export { FeedbackProvider, useFeedback } from './FeedbackProvider';
export { FeedbackModal } from './FeedbackModal';
export { FeedbackDashboard, saveFeedbackToLocalStorage, DEFAULT_STATUSES } from './FeedbackDashboard';
export { FeedbackTrigger } from './FeedbackTrigger';
export { CanvasOverlay } from './CanvasOverlay';
export * from './utils';

// Export theme utilities for advanced users
export { getTheme, lightTheme, darkTheme } from './theme';
