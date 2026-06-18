import React from 'react';
import { FeedbackCommandCenter } from './dashboard/FeedbackCommandCenter.jsx';

// Backward-compatible re-exports — DEFAULT_STATUSES + saveFeedbackToLocalStorage
// used to live in dashboard/legacy/FeedbackDashboardLegacy.jsx, now extracted
// into a focused lib/ module so the 1068-line legacy file can be retired.
export {
  DEFAULT_STATUSES,
  saveFeedbackToLocalStorage,
  FEEDBACK_STORAGE_KEY,
} from './lib/feedbackStorage.js';

/**
 * FeedbackDashboard — Alt+Q entry point. Always renders the
 * Command Center workspace.
 */
export const FeedbackDashboard = (props) => {
  return <FeedbackCommandCenter {...props} />;
};

export default FeedbackDashboard;
