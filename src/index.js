// No CSS import needed - using styled-components

export { FeedbackProvider, useFeedback } from './FeedbackProvider';
export { SimpleFeedbackButton } from './SimpleFeedbackButton';
export { FeedbackModal } from './FeedbackModal';
export { FeedbackDashboard, saveFeedbackToLocalStorage, DEFAULT_STATUSES } from './FeedbackDashboard';
export { FeedbackCommandCenter } from './dashboard/FeedbackCommandCenter.jsx';
export { FeedbackErrorBoundary } from './capture/FeedbackErrorBoundary.jsx';
export { FeedbackTrigger } from './FeedbackTrigger';
export { CanvasOverlay } from './CanvasOverlay';
export { FeedbackDots } from './FeedbackDots';
export { MobileTrigger } from './MobileTrigger';
export { UpdatesModal } from './UpdatesModal';
export { SubmissionQueue } from './SubmissionQueue';
export * from './utils';

// Export theme utilities for advanced users
export { getTheme, lightTheme, darkTheme } from './theme';

// Export status utilities for custom status handling
export {
  StatusBadge,
  getIconComponent,
  normalizeStatusKey,
  getStatusData
} from './components/StatusBadge';
export { StatusDropdown } from './components/StatusDropdown';

// Export integration utilities for client-side use
export {
  IntegrationClient,
  useIntegrations,
  DEFAULT_SHEET_COLUMNS,
  DEFAULT_JIRA_FIELDS,
  DEFAULT_JIRA_STATUS_MAPPING,
  INTEGRATION_TYPES,
  getSheetHeaders
} from './integrations/index';

// Export Apps Script template generator
export { getAppsScriptTemplate } from './integrations/sheets';
