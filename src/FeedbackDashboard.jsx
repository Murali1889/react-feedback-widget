import React from 'react';
import { FeedbackCommandCenter } from './dashboard/FeedbackCommandCenter.jsx';

// Re-exports preserved for backward compatibility:
export {
  DEFAULT_STATUSES,
  saveFeedbackToLocalStorage,
} from './dashboard/legacy/FeedbackDashboardLegacy.jsx';

/**
 * Backward-compat wrapper. The 1068-line legacy implementation still
 * lives in src/dashboard/legacy/FeedbackDashboardLegacy.jsx for its
 * side-effect exports (saveFeedbackToLocalStorage, DEFAULT_STATUSES).
 * FeedbackDashboard now renders the Command Center workspace.
 * Public props unchanged.
 */
export const FeedbackDashboard = (props) => {
  return <FeedbackCommandCenter {...props} />;
};

export default FeedbackDashboard;
