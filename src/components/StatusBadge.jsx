import React from 'react';
import styled from 'styled-components';
import {
  Inbox, AlertCircle, Play, Eye, PauseCircle, CheckCircle, Archive, Ban,
  XCircle, HelpCircle, Lightbulb, Bug, Zap, MessageSquare
} from 'lucide-react';

// Icon mapping for custom statuses
const ICON_MAP = {
  Inbox, AlertCircle, Play, Eye, PauseCircle, CheckCircle, Archive, Ban,
  XCircle, HelpCircle, Lightbulb, Bug, Zap, MessageSquare
};

// Helper to get icon component from string or component
export const getIconComponent = (icon) => {
  if (!icon) return AlertCircle;
  if (typeof icon === 'string') {
    return ICON_MAP[icon] || AlertCircle;
  }
  return icon;
};

// Normalize status key to match available statuses
export const normalizeStatusKey = (status, availableStatuses) => {
  if (!status) return 'new';
  if (availableStatuses[status]) return status;
  const mappings = {
    'reported': 'new', 'submitted': 'new', 'pending': 'new', 'doing': 'inProgress',
    'in_progress': 'inProgress', 'review': 'underReview', 'under_review': 'underReview',
    'hold': 'onHold', 'on_hold': 'onHold', 'paused': 'onHold', 'done': 'resolved',
    'fixed': 'resolved', 'completed': 'resolved', 'archived': 'closed',
    'rejected': 'wontFix', 'wont_fix': 'wontFix', 'cancelled': 'wontFix'
  };
  const mapped = mappings[status.toLowerCase()];
  if (mapped && availableStatuses[mapped]) return mapped;
  return Object.keys(availableStatuses)[0] || 'new';
};

export const StatusBadgeStyled = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 6px;
  background-color: transparent;
  border: 1.5px solid ${props => props.$statusColor || props.$textColor};
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.$textColor};
  white-space: nowrap;
  min-width: 120px;
  box-sizing: border-box;

  svg {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: ${props => props.$statusColor || props.$textColor};
  }

  span {
    flex: 1;
    text-align: left;
  }
`;

export const StatusBadge = ({ status, statuses }) => {
  const statusKey = normalizeStatusKey(status, statuses);
  const statusData = statuses[statusKey];
  if (!statusData) return null;

  const IconComponent = getIconComponent(statusData.icon);

  return (
    <StatusBadgeStyled $statusColor={statusData.color} $textColor={statusData.textColor}>
      <IconComponent size={16} />
      <span>{statusData.label}</span>
    </StatusBadgeStyled>
  );
};
