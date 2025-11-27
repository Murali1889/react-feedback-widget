import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import {
  X, Trash2, CheckCircle, AlertCircle, Play, Ban, ChevronDown,
  Filter, RefreshCw, Loader2, MessageSquare, Inbox, Eye, Archive, Download,
  PauseCircle, XCircle, HelpCircle, Lightbulb, Bug, Zap, Image, Layers, FileCode, Video,
  User, Mail, Globe, Monitor, Code, Copy, Check, ChevronRight, ZoomIn
} from 'lucide-react';
import { getTheme, fadeIn, slideInRight, scaleIn, dropdownSlideIn, pulse, spin, slideDown } from './theme.js';
import { formatPath } from './utils.js';
import { SessionReplay } from './SessionReplay.jsx';
import { StatusBadge, StatusBadgeStyled, getIconComponent, normalizeStatusKey, getStatusData } from './components/StatusBadge.jsx';


const FEEDBACK_STORAGE_KEY = 'react-feedback-data';

// Default status configurations with better naming and icons
const DEFAULT_STATUSES = {
  new: {
    key: 'new',
    label: 'New',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    textColor: '#6d28d9',
    icon: 'Inbox'
  },
  open: {
    key: 'open',
    label: 'Open',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    textColor: '#92400e',
    icon: 'AlertCircle'
  },
  inProgress: {
    key: 'inProgress',
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    textColor: '#1e40af',
    icon: 'Play'
  },
  underReview: {
    key: 'underReview',
    label: 'Under Review',
    color: '#06b6d4',
    bgColor: '#cffafe',
    textColor: '#0e7490',
    icon: 'Eye'
  },
  onHold: {
    key: 'onHold',
    label: 'On Hold',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    textColor: '#374151',
    icon: 'PauseCircle'
  },
  resolved: {
    key: 'resolved',
    label: 'Resolved',
    color: '#10b981',
    bgColor: '#d1fae5',
    textColor: '#065f46',
    icon: 'CheckCircle'
  },
  closed: {
    key: 'closed',
    label: 'Closed',
    color: '#64748b',
    bgColor: '#e2e8f0',
    textColor: '#334155',
    icon: 'Archive'
  },
  wontFix: {
    key: 'wontFix',
    label: "Won't Fix",
    color: '#ef4444',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
    icon: 'Ban'
  }
};

// Styled Components
const DashboardBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.colors.backdropBg};
  z-index: 9998;
  animation: ${fadeIn} 0.2s ease-out;
`;

const DashboardPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 800px;
  background-color: ${props => props.theme.colors.modalBg};
  z-index: 9999;
  box-shadow: ${props => props.theme.mode === 'dark'
    ? '-8px 0 32px rgba(0, 0, 0, 0.6)'
    : '-8px 0 32px rgba(0, 0, 0, 0.12)'};
  display: flex;
  flex-direction: column;
  animation: ${slideInRight} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DashboardHeader = styled.div`
  background: ${props => props.theme.mode === 'dark'
    ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
    : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'};
  border-bottom: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(148, 163, 184, 0.1)'
    : 'rgba(226, 232, 240, 0.8)'};
  padding-bottom: 16px;
`;

const HeaderContent = styled.div`
  padding: 24px 28px 16px 28px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const HeaderTitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.textPrimary};
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ItemCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  background: ${props => props.theme.mode === 'dark'
    ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'};
  color: white;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
`;

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 400;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(59, 130, 246, 0.15)'
    : 'rgba(59, 130, 246, 0.1)'};
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(59, 130, 246, 0.2)'};
  border-radius: 10px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.6 : 1};

  &:hover:not(:disabled) {
    background: ${props => props.theme.mode === 'dark'
      ? 'rgba(59, 130, 246, 0.25)'
      : 'rgba(59, 130, 246, 0.15)'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const CloseButton = styled.button`
  padding: 10px;
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(71, 85, 105, 0.3)'
    : 'rgba(241, 245, 249, 0.8)'};
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(148, 163, 184, 0.2)'
    : 'rgba(226, 232, 240, 0.8)'};
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.mode === 'dark'
      ? 'rgba(239, 68, 68, 0.2)'
      : 'rgba(239, 68, 68, 0.1)'};
    border-color: ${props => props.theme.mode === 'dark'
      ? 'rgba(239, 68, 68, 0.3)'
      : 'rgba(239, 68, 68, 0.2)'};
    transform: scale(1.05);
  }

  &:hover svg {
    color: #ef4444;
  }
`;

const FilterTabs = styled.div`
  padding: 0 28px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const FilterTab = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid ${props => {
    if (props.$isActive) {
      if (props.$isAll) return props.theme.mode === 'dark' ? '#3b82f6' : '#3b82f6';
      return props.$statusColor || props.theme.colors.border;
    }
    return props.theme.colors.border;
  }};
  border-radius: 20px;
  background-color: ${props => {
    if (props.$isActive) {
      if (props.$isAll) return props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
      return props.$statusBg || props.theme.colors.hoverBg;
    }
    return 'transparent';
  }};
  color: ${props => {
    if (props.$isActive) {
      if (props.$isAll) return '#3b82f6';
      return props.$statusTextColor || props.theme.colors.textPrimary;
    }
    return props.theme.colors.textSecondary;
  }};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background-color: ${props => {
      if (props.$isAll) return props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)';
      return props.$statusBg || props.theme.colors.hoverBg;
    }};
    border-color: ${props => props.$statusColor || props.theme.colors.border};
  }
`;

const FilterCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: ${props => props.$isActive
    ? 'rgba(0, 0, 0, 0.1)'
    : props.theme.colors.hoverBg};
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
`;

const Content = styled.div`
  flex: 1;
  overflow: auto;
  background-color: ${props => props.theme.colors.contentBg};
  position: relative;
`;

const LoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(15, 23, 42, 0.9)'
    : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 100;
`;

const LoadingSpinner = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
  color: #3b82f6;
`;

const LoadingText = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.textSecondary};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
`;

const ErrorIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(239, 68, 68, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
`;

const ErrorTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
`;

const ErrorMessage = styled.p`
  margin: 0 0 20px 0;
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
  max-width: 300px;
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 40px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.theme.mode === 'dark'
    ? 'rgba(148, 163, 184, 0.1)'
    : 'rgba(148, 163, 184, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
`;

const EmptySubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const TableContainer = styled.div`
  min-height: 100%;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 40px 70px 1fr 120px ${props => props.$isDeveloper ? '40px' : ''};
  gap: 12px;
  padding: 12px 20px;
  background-color: ${props => props.theme.colors.headerBg};
  border-bottom: 2px solid ${props => props.theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const TableHeaderCell = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${props => props.theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$center ? 'center' : 'flex-start'};
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 40px 70px 1fr 120px ${props => props.$isDeveloper ? '40px' : ''};
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid ${props => props.$isExpanded
    ? 'transparent'
    : props.theme.colors.border};
  border-left: 3px solid transparent;
  background-color: ${props => props.$isExpanded
    ? (props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.04)')
    : 'transparent'};
  transition: all 0.15s ease;
  cursor: pointer;
  align-items: flex-start;
  border-left-color: ${props => props.$isExpanded ? '#3b82f6' : 'transparent'};

  &:hover {
    background-color: ${props => props.$isExpanded
    ? (props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.04)')
    : props.theme.colors.hoverBg};
    border-left-color: ${props => props.$isExpanded ? '#3b82f6' : props.theme.colors.borderFocus};
  }
`;

const ScreenshotCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScreenshotButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(59, 130, 246, 0.2)'
    : 'rgba(59, 130, 246, 0.1)'};
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(59, 130, 246, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #3b82f6;

  &:hover {
    background-color: #3b82f6;
    color: white;
  }
`;

const ScreenshotIndicator = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(59, 130, 246, 0.2)'
    : 'rgba(59, 130, 246, 0.1)'};
  border: 1px solid ${props => props.theme.mode === 'dark'
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(59, 130, 246, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
`;

const NoScreenshot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: ${props => props.theme.colors.hoverBg};
  border: 1px dashed ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.textTertiary};
`;

const DateCell = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

const FeedbackText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ${props => props.$expanded ? 'unset' : 'ellipsis'};
  white-space: ${props => props.$expanded ? 'normal' : 'nowrap'};
  font-weight: 400;
  line-height: 1.5;
`;

const StatusCell = styled.div`
  display: flex;
  justify-content: center;
`;



const ActionsCell = styled.div`
  display: flex;
  justify-content: center;
`;

const DeleteButton = styled.button`
  padding: 8px;
  background-color: transparent;
  border: none;
  color: ${props => props.theme.colors.textTertiary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark'
      ? 'rgba(239, 68, 68, 0.2)'
      : 'rgba(239, 68, 68, 0.1)'};
    color: #ef4444;
  }
`;

const ExpandedContent = styled.div`
  padding: 16px 20px;
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(59, 130, 246, 0.05)'
    : 'rgba(248, 250, 252, 1)'};
  border-left: 3px solid #3b82f6;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  animation: ${slideDown} 0.15s ease-out;
`;

const ExpandedLayout = styled.div`
  display: flex;
  gap: 16px;
`;

const ExpandedMedia = styled.div`
  flex-shrink: 0;
`;

const ExpandedDetails = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};

  svg {
    flex-shrink: 0;
    color: ${props => props.theme.colors.textTertiary};
  }

  span {
    color: ${props => props.theme.colors.textPrimary};
    font-weight: 500;
  }
`;

const DetailLabel = styled.span`
  color: ${props => props.theme.colors.textTertiary} !important;
  font-weight: 400 !important;
`;

const ComponentStack = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${props => props.theme.colors.textSecondary};
  flex-wrap: wrap;
`;

const ComponentTag = styled.span`
  background: ${props => props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'};
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
`;

const SourceLink = styled.div`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: ${props => props.theme.mode === 'dark' ? '#93c5fd' : '#2563eb'};
  background: ${props => props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'};
  padding: 6px 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'};

  &:hover {
    background: ${props => props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.12)'};
  }
`;

const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  background: ${props => {
    switch(props.$type) {
      case 'bug': return props.theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)';
      case 'feature': return props.theme.mode === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)';
      case 'improvement': return props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
      default: return props.theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)';
    }
  }};
  color: ${props => {
    switch(props.$type) {
      case 'bug': return '#ef4444';
      case 'feature': return '#22c55e';
      case 'improvement': return '#3b82f6';
      default: return props.theme.colors.textSecondary;
    }
  }};
`;

const InfoCard = styled.div`
  background: ${props => props.theme.mode === 'dark' ? '#1e293b' : '#fff'};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 20px;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${props => props.theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
`;

const FullFeedbackText = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textPrimary};
  font-size: 14px;
  line-height: 1.7;
`;

const ScreenshotWrapper = styled.div`
  position: relative;
  width: 160px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.cardBg};
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    border-color: ${props => props.theme.colors.borderFocus};
  }

  &:hover .zoom-overlay {
    opacity: 1;
  }
`;

const ZoomOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
`;

const ScreenshotPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const TechnicalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
`;

const TechnicalItem = styled.div`
  padding: 12px;
  background-color: ${props => props.theme.colors.hoverBg};
  border-radius: 8px;
`;

const TechnicalLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: ${props => props.theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

// Modal Components
const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 10000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: ${props => props.theme.mode === 'dark' ? '#1e293b' : 'white'};
  border-radius: 16px;
  padding: 28px;
  width: 90%;
  max-width: 480px;
  z-index: 10001;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
  animation: ${scaleIn} 0.2s ease-out;
`;

const ModalTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.textPrimary};
`;

const ModalSubtitle = styled.p`
  margin: 0 0 20px 0;
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
`;

const StatusChangePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: ${props => props.theme.colors.hoverBg};
  border-radius: 12px;
  margin-bottom: 20px;
`;

const StatusArrow = styled.div`
  color: ${props => props.theme.colors.textTertiary};
  font-size: 18px;
`;

const CommentLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
  margin-bottom: 8px;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  font-size: 14px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 10px;
  resize: vertical;
  font-family: inherit;
  outline: none;
  background-color: ${props => props.theme.colors.inputBg};
  color: ${props => props.theme.colors.textPrimary};
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${props => props.theme.colors.textTertiary};
  }

  &:focus {
    border-color: #3b82f6;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
`;

const ModalButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: ${props => props.$primary ? '#3b82f6' : props.theme.colors.hoverBg};
  color: ${props => props.$primary ? 'white' : props.theme.colors.textPrimary};

  &:hover {
    background-color: ${props => props.$primary ? '#2563eb' : props.theme.colors.border};
    transform: translateY(-1px);
  }
`;

// Screenshot Modal
const ScreenshotModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.95);
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ScreenshotCloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const ScreenshotImage = styled.img`
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  animation: ${scaleIn} 0.3s ease-out;
`;

const DeleteModalContainer = styled(ModalContainer)`
  max-width: 400px;
`;

const DeleteModalTitle = styled(ModalTitle)`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ef4444;
`;

const DeleteModalSubtitle = styled(ModalSubtitle)`
  font-size: 14px;
  line-height: 1.6;
`;

const DeleteModalActions = styled(ModalActions)`
  margin-top: 24px;
`;

const DeleteConfirmButton = styled(ModalButton)`
  background-color: #ef4444;
  color: white;
  &:hover {
    background-color: #dc2626;
  }
`;

const ExpandedGrid = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
`;

const DetailsColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

const MediaColumn = styled.div`
  flex-shrink: 0;
`;



import { StatusDropdown } from './components/StatusDropdown.jsx';

// Main Dashboard Component
export const FeedbackDashboard = ({
  isOpen,
  onClose,
  data,
  isDeveloper = false,
  isUser = true,
  onStatusChange,
  mode = 'light',
  isLoading = false,
  onRefresh,
  title = 'Feedback',
  statuses,
  acceptableStatuses,
  showAllStatuses = true,
  error = null,
  userName,
  userEmail
}) => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [screenshotModal, setScreenshotModal] = useState({ isOpen: false, image: null });
  const [statusChangeModal, setStatusChangeModal] = useState({
    isOpen: false,
    feedbackId: null,
    newStatus: null,
    oldStatus: null,
    comment: ''
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, feedbackId: null });

  const useLocalStorage = data === undefined;
  const theme = getTheme(mode);

  // Build statuses: acceptableStatuses controls what's shown, statuses provides config
  const mergedStatuses = useMemo(() => {
    // If acceptableStatuses is provided, ONLY show those statuses
    if (acceptableStatuses && Array.isArray(acceptableStatuses) && acceptableStatuses.length > 0) {
      const result = {};
      acceptableStatuses.forEach(key => {
        // Use config from statuses prop if provided, otherwise create a basic config
        if (statuses && statuses[key]) {
          result[key] = statuses[key];
        } else if (DEFAULT_STATUSES[key]) {
          result[key] = DEFAULT_STATUSES[key];
        } else {
          // Create a fallback config for unknown status keys
          result[key] = {
            key: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            color: '#6b7280',
            bgColor: '#f3f4f6',
            textColor: '#374151',
            icon: 'AlertCircle'
          };
        }
      });
      return result;
    }

    // If only statuses is provided (no acceptableStatuses), use those
    if (statuses && Object.keys(statuses).length > 0) {
      return statuses;
    }

    // Fallback to defaults
    return DEFAULT_STATUSES;
  }, [statuses, acceptableStatuses]);

  // Load feedback
  useEffect(() => {
    if (isOpen) {
      console.log('[FeedbackDashboard] Opening dashboard...');
      if (useLocalStorage) {
        console.log('[FeedbackDashboard] Loading from localStorage');
        loadFeedback();
      } else {
        console.log('[FeedbackDashboard] Using provided data:', data?.length, 'items');
        setFeedbackList(data || []);
      }
    }
  }, [isOpen, data, useLocalStorage]);

  const loadFeedback = () => {
    try {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[FeedbackDashboard] Loaded from localStorage:', parsed.length, 'items');
        setFeedbackList(parsed);
      } else {
        console.log('[FeedbackDashboard] No data in localStorage');
        setFeedbackList([]);
      }
    } catch (err) {
      console.error('[FeedbackDashboard] Failed to load feedback:', err);
      setFeedbackList([]);
    }
  };

  const saveFeedback = (updatedList) => {
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedList));
      setFeedbackList(updatedList);
      console.log('[FeedbackDashboard] Saved to localStorage:', updatedList.length, 'items');
    } catch (err) {
      console.error('[FeedbackDashboard] Failed to save feedback:', err);
    }
  };

  const handleRefresh = () => {
    console.log('[FeedbackDashboard] Refresh clicked');
    if (onRefresh) {
      onRefresh();
    } else if (useLocalStorage) {
      loadFeedback();
    }
  };

  const openStatusChangeModal = (id, newStatus, oldStatus) => {
    console.log('[FeedbackDashboard] Opening status change modal:', { id, from: oldStatus, to: newStatus });
    setStatusChangeModal({
      isOpen: true,
      feedbackId: id,
      newStatus,
      oldStatus,
      comment: ''
    });
  };

  const closeStatusChangeModal = () => {
    setStatusChangeModal({
      isOpen: false,
      feedbackId: null,
      newStatus: null,
      oldStatus: null,
      comment: ''
    });
  };

  const confirmStatusChange = () => {
    const { feedbackId, newStatus, comment } = statusChangeModal;
    console.log('[FeedbackDashboard] Confirming status change:', { feedbackId, newStatus, comment });

    const updated = feedbackList.map(item =>
      item.id === feedbackId ? { ...item, status: newStatus } : item
    );

    if (useLocalStorage) {
      saveFeedback(updated);
    } else {
      setFeedbackList(updated);
    }

    if (onStatusChange && typeof onStatusChange === 'function') {
      onStatusChange({ id: feedbackId, status: newStatus, comment });
    }

    closeStatusChangeModal();
  };

  const deleteFeedback = (id) => {
    console.log('[FeedbackDashboard] Deleting feedback:', id);
    const updated = feedbackList.filter(item => item.id !== id);
    if (useLocalStorage) {
      saveFeedback(updated);
    } else {
      setFeedbackList(updated);
    }
    if (expandedRow?.id === id) {
      setExpandedRow(null);
    }
  };
  const openDeleteModal = (id) => {
    setDeleteModal({ isOpen: true, feedbackId: id });
  };
  
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, feedbackId: null });
  };
  
  const confirmDelete = () => {
    if (deleteModal.feedbackId) {
      deleteFeedback(deleteModal.feedbackId);
    }
    closeDeleteModal();
  };

  const formatShortDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[date.getMonth()]}`;
    } catch {
      return 'N/A';
    }
  };

  const toggleRow = (item) => {
    setExpandedRow(expandedRow?.id === item.id ? null : item);
  };

  // Filter feedback
  const filteredFeedback = useMemo(() => {
    if (filterStatus === 'all') return feedbackList;
    return feedbackList.filter(item => {
      const itemStatus = normalizeStatusKey(item.status || 'new', mergedStatuses);
      return itemStatus === filterStatus;
    });
  }, [feedbackList, filterStatus, mergedStatuses]);

  // Get status counts
  const statusCounts = useMemo(() => {
    return feedbackList.reduce((acc, item) => {
      const status = normalizeStatusKey(item.status || 'new', mergedStatuses);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [feedbackList, mergedStatuses]);

  // Get statuses to show in filter
  const visibleStatuses = useMemo(() => {
    if (showAllStatuses) return mergedStatuses;
    return Object.fromEntries(
      Object.entries(mergedStatuses).filter(([key]) => statusCounts[key] > 0)
    );
  }, [mergedStatuses, statusCounts, showAllStatuses]);

  const handleDownloadAll = async () => {
    // 1. Import jszip and file-saver
    const JSZip = (await import('jszip')).default;
    const saveAs = (await import('file-saver')).default;

    // 2. Create a zip instance
    const zip = new JSZip();

    // 3. Get data from local storage
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const feedbackItems = stored ? JSON.parse(stored) : [];
    
    if (feedbackItems.length === 0) {
      alert('No feedback data to download.');
      return;
    }

    // 4. Add files to zip
    for (const item of feedbackItems) {
      const folderName = `feedback-${item.id}`;
      
      // Separate media from the rest of the data
      const { screenshot, video, ...metadata } = item;
      
      // Add metadata as a JSON file
      zip.file(`${folderName}/details.json`, JSON.stringify(metadata, null, 2));

      // Function to convert data URL to blob
      const dataURLToBlob = async (dataURL) => {
        const res = await fetch(dataURL);
        return await res.blob();
      };

      if (screenshot) {
        try {
          const screenshotBlob = await dataURLToBlob(screenshot);
          zip.file(`${folderName}/screenshot.png`, screenshotBlob);
        } catch (e) {
          console.error(`Failed to process screenshot for feedback ${item.id}`, e);
        }
      }
      
      if (video) {
        try {
          const videoBlob = await dataURLToBlob(video);
          zip.file(`${folderName}/recording.webm`, videoBlob);
        } catch (e) {
          console.error(`Failed to process video for feedback ${item.id}`, e);
        }
      }
    }

    // 5. Generate and download zip
    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'feedback-export.zip');
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <ThemeProvider theme={theme}>
      <DashboardBackdrop onClick={onClose} />
      <DashboardPanel>
        <DashboardHeader>
          <HeaderContent>
            <HeaderTitleSection>
              <HeaderTitle>
                {title}
                <ItemCountBadge>{feedbackList.length}</ItemCountBadge>
              </HeaderTitle>
              <HeaderSubtitle>
                {filteredFeedback.length === feedbackList.length
                  ? `Showing all feedback`
                  : `Showing ${filteredFeedback.length} of ${feedbackList.length}`}
              </HeaderSubtitle>
            </HeaderTitleSection>
            <HeaderActions>
              <RefreshButton onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
                {isLoading ? 'Loading...' : 'Refresh'}
              </RefreshButton>
              <RefreshButton onClick={handleDownloadAll} disabled={isLoading || feedbackList.length === 0}>
                <Download size={16} />
                Download All
              </RefreshButton>
              <CloseButton onClick={onClose}>
                <X size={20} color={theme.colors.textSecondary} />
              </CloseButton>
            </HeaderActions>
          </HeaderContent>

          <FilterTabs>
            <FilterTab
              $isAll
              $isActive={filterStatus === 'all'}
              onClick={() => setFilterStatus('all')}
            >
              All
              <FilterCount $isActive={filterStatus === 'all'}>
                {feedbackList.length}
              </FilterCount>
            </FilterTab>
            {Object.entries(visibleStatuses).map(([key, rawStatusData]) => {
              // Skip invalid/undefined status entries
              if (!rawStatusData || typeof rawStatusData !== 'object') return null;
              const count = statusCounts[key] || 0;
              const statusData = getStatusData(key, visibleStatuses);
              const IconComponent = getIconComponent(statusData.icon);
              return (
                <FilterTab
                  key={key}
                  $isActive={filterStatus === key}
                  $statusColor={statusData.color}
                  $statusBg={statusData.bgColor}
                  $statusTextColor={statusData.textColor}
                  onClick={() => setFilterStatus(key)}
                >
                  <IconComponent size={14} />
                  {statusData.label}
                  {count > 0 && (
                    <FilterCount $isActive={filterStatus === key}>
                      {count}
                    </FilterCount>
                  )}
                </FilterTab>
              );
            })}
          </FilterTabs>
        </DashboardHeader>

        <Content>
          {isLoading && (
            <LoadingContainer>
              <LoadingSpinner size={40} />
              <LoadingText>Loading feedback...</LoadingText>
            </LoadingContainer>
          )}

          {error && !isLoading && (
            <ErrorContainer>
              <ErrorIcon>
                <AlertCircle size={28} color="#ef4444" />
              </ErrorIcon>
              <ErrorTitle>Failed to load feedback</ErrorTitle>
              <ErrorMessage>{error}</ErrorMessage>
              <RetryButton onClick={handleRefresh}>
                <RefreshCw size={16} />
                Try Again
              </RetryButton>
            </ErrorContainer>
          )}

          {!isLoading && !error && feedbackList.length === 0 && (
            <EmptyState>
              <EmptyIcon>
                <Inbox size={36} color={theme.colors.textTertiary} />
              </EmptyIcon>
              <EmptyTitle>No feedback yet</EmptyTitle>
              <EmptySubtitle>
                Press Alt + Q to start giving feedback
              </EmptySubtitle>
            </EmptyState>
          )}

          {!isLoading && !error && feedbackList.length > 0 && filteredFeedback.length === 0 && (
            <EmptyState>
              <EmptyIcon>
                <Filter size={36} color={theme.colors.textTertiary} />
              </EmptyIcon>
              <EmptyTitle>No matching feedback</EmptyTitle>
              <EmptySubtitle>
                Try selecting a different filter
              </EmptySubtitle>
            </EmptyState>
          )}

          {!isLoading && !error && filteredFeedback.length > 0 && (
            <TableContainer>
              <TableHeader $isDeveloper={isDeveloper}>
                <TableHeaderCell></TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Feedback</TableHeaderCell>
                <TableHeaderCell $center>Status</TableHeaderCell>
                {isDeveloper && <TableHeaderCell $center></TableHeaderCell>}
              </TableHeader>

              {filteredFeedback.map((item) => {
                const statusKey = normalizeStatusKey(item.status || 'new', mergedStatuses);
                const statusData = getStatusData(statusKey, mergedStatuses);
                const isExpanded = expandedRow?.id === item.id;
                const IconComponent = getIconComponent(statusData.icon);

                return (
                  <div key={item.id}>
                    <TableRow
                      $isDeveloper={isDeveloper}
                      $isExpanded={isExpanded}
                      onClick={() => toggleRow(item)}
                    >
                      <ScreenshotCell>
                        {item.video ? (
                           <ScreenshotIndicator>
                             <Video size={16} />
                           </ScreenshotIndicator>
                        ) : item.screenshot ? (
                          <ScreenshotIndicator>
                            <Image size={16} />
                          </ScreenshotIndicator>
                        ) : (
                          <NoScreenshot>
                            <MessageSquare size={14} />
                          </NoScreenshot>
                        )}
                      </ScreenshotCell>

                      <DateCell>
                        {formatShortDate(item.timestamp || item.createdAt)}
                      </DateCell>

                      <FeedbackText $expanded={isExpanded}>
                        {item.feedback || item.description || 'No description'}
                      </FeedbackText>

                      <StatusCell>
                        {isDeveloper ? (
                          <StatusDropdown
                            currentStatus={item.status}
                            onStatusChange={(id, newStatus) =>
                              openStatusChangeModal(id, newStatus, statusKey)
                            }
                            itemId={item.id}
                            statuses={mergedStatuses}
                            acceptableStatuses={acceptableStatuses}
                            theme={theme}
                          />
                        ) : (
                          <StatusBadgeStyled
                            $statusColor={statusData.color}
                            $textColor={statusData.textColor}
                            $statusBg={statusData.bgColor}
                          >
                            <IconComponent size={16} />
                            <span>{statusData.label}</span>
                          </StatusBadgeStyled>
                        )}
                      </StatusCell>

                      {isDeveloper && (
                        <ActionsCell>
                          <DeleteButton
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(item.id)
                            }}
                          >
                            <Trash2 size={16} />
                          </DeleteButton>
                        </ActionsCell>
                      )}
                    </TableRow>

                    {isExpanded && (
                       <ExpandedContent>
                         {item.video ? (
                            <SessionReplay
                              videoSrc={item.video}
                              eventLogs={item.eventLogs || []}
                              mode={mode}
                            />
                         ) : (
                            <ExpandedLayout>
                              {item.screenshot && (
                                <ExpandedMedia>
                                  <ScreenshotWrapper onClick={() => setScreenshotModal({ isOpen: true, image: item.screenshot })}>
                                    <ScreenshotPreview
                                      src={item.screenshot}
                                      alt="Feedback screenshot"
                                    />
                                    <ZoomOverlay className="zoom-overlay">
                                      <ZoomIn size={24} />
                                    </ZoomOverlay>
                                  </ScreenshotWrapper>
                                </ExpandedMedia>
                              )}
                              <ExpandedDetails>
                                {/* Primary: Type + Source (what devs need most) */}
                                <DetailRow>
                                  {item.type && (
                                    <TypeBadge $type={item.type}>
                                      {item.type === 'bug' && <Bug size={10} />}
                                      {item.type === 'feature' && <Lightbulb size={10} />}
                                      {item.type === 'improvement' && <Zap size={10} />}
                                      {item.type}
                                    </TypeBadge>
                                  )}
                                  {item.elementInfo?.sourceFile && (
                                    <SourceLink onClick={() => {
                                      const path = `${item.elementInfo.sourceFile.fileName}:${item.elementInfo.sourceFile.lineNumber}`;
                                      navigator.clipboard.writeText(path);
                                    }}>
                                      <FileCode size={12} />
                                      {formatPath(item.elementInfo.sourceFile.fileName)}:{item.elementInfo.sourceFile.lineNumber}
                                      <Copy size={10} />
                                    </SourceLink>
                                  )}
                                </DetailRow>
                              </ExpandedDetails>
                            </ExpandedLayout>
                         )}
                       </ExpandedContent>
                    )}
                  </div>
                );
              })}
            </TableContainer>
          )}
        </Content>
      </DashboardPanel>

      {/* Status Change Modal */}
      {statusChangeModal.isOpen && (
        <>
          <ModalBackdrop onClick={closeStatusChangeModal} />
          <ModalContainer theme={theme} onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Update Status</ModalTitle>
            <ModalSubtitle>Add an optional note about this change</ModalSubtitle>

            <StatusChangePreview>
              <StatusBadge status={statusChangeModal.oldStatus} statuses={mergedStatuses} />
              <StatusArrow>→</StatusArrow>
              <StatusBadge status={statusChangeModal.newStatus} statuses={mergedStatuses} />
            </StatusChangePreview>

            <div>
              <CommentLabel>Note (optional)</CommentLabel>
              <CommentTextarea
                value={statusChangeModal.comment}
                onChange={(e) => setStatusChangeModal({
                  ...statusChangeModal,
                  comment: e.target.value
                })}
                placeholder="Add a note about this status change..."
              />
            </div>

            <ModalActions>
              <ModalButton onClick={closeStatusChangeModal}>Cancel</ModalButton>
              <ModalButton $primary onClick={confirmStatusChange}>
                Confirm
              </ModalButton>
            </ModalActions>
          </ModalContainer>
        </>
      )}

      {/* Screenshot Modal */}
      {screenshotModal.isOpen && (
        <ScreenshotModalBackdrop
          onClick={() => setScreenshotModal({ isOpen: false, image: null })}
        >
          <ScreenshotCloseButton
            onClick={() => setScreenshotModal({ isOpen: false, image: null })}
          >
            <X size={24} color="white" />
          </ScreenshotCloseButton>
          <ScreenshotImage
            src={screenshotModal.image}
            alt="Screenshot"
            onClick={(e) => e.stopPropagation()}
          />
        </ScreenshotModalBackdrop>
      )}
       {deleteModal.isOpen && (
        <>
          <ModalBackdrop onClick={closeDeleteModal} />
          <DeleteModalContainer theme={theme} onClick={(e) => e.stopPropagation()}>
            <DeleteModalTitle>
              <AlertCircle size={24} />
              Delete Feedback
            </DeleteModalTitle>
            <DeleteModalSubtitle>
              Are you sure you want to permanently delete this feedback? This action cannot be undone.
            </DeleteModalSubtitle>
            <DeleteModalActions>
              <ModalButton onClick={closeDeleteModal}>Cancel</ModalButton>
              <DeleteConfirmButton onClick={confirmDelete}>Delete</DeleteConfirmButton>
            </DeleteModalActions>
          </DeleteModalContainer>
        </>
      )}
    </ThemeProvider>,
    document.body
  );
};

// Helper to save feedback to localStorage
const MAX_FEEDBACK_ITEMS = 50;
const MAX_VIDEO_SIZE_MB = 10; // Max video size in MB for localStorage

// Convert Blob to base64 data URL
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const saveFeedbackToLocalStorage = async (feedbackData) => {
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    let existing = stored ? JSON.parse(stored) : [];

    // Proactively trim the list to make space before adding the new item
    if (existing.length >= MAX_FEEDBACK_ITEMS) {
      existing = existing.slice(0, MAX_FEEDBACK_ITEMS - 1);
    }

    // Process feedbackData - convert videoBlob to base64 if present
    let processedData = { ...feedbackData };

    if (feedbackData.videoBlob && feedbackData.videoBlob instanceof Blob) {
      const videoSizeMB = feedbackData.videoBlob.size / (1024 * 1024);

      if (videoSizeMB <= MAX_VIDEO_SIZE_MB) {
        try {
          const videoBase64 = await blobToBase64(feedbackData.videoBlob);
          processedData.video = videoBase64;
          processedData.videoSize = feedbackData.videoBlob.size;
          processedData.videoType = feedbackData.videoBlob.type;
          console.log(`[FeedbackDashboard] Video converted to base64: ${videoSizeMB.toFixed(2)} MB`);
        } catch (videoError) {
          console.warn('[FeedbackDashboard] Failed to convert video:', videoError);
          processedData.notes = (processedData.notes || '') + ' Video conversion failed.';
        }
      } else {
        console.warn(`[FeedbackDashboard] Video too large (${videoSizeMB.toFixed(2)} MB). Max allowed: ${MAX_VIDEO_SIZE_MB} MB`);
        processedData.notes = (processedData.notes || '') + ` Video omitted - too large (${videoSizeMB.toFixed(2)} MB).`;
      }
      // Remove the blob object as it can't be serialized
      delete processedData.videoBlob;
    }

    const newFeedback = {
      id: Date.now().toString(),
      ...processedData,
      status: 'new',
      timestamp: new Date().toISOString()
    };

    const updated = [newFeedback, ...existing];

    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
    console.log(`[FeedbackDashboard] Saved new feedback. Total items now: ${updated.length}`);

    return { success: true, data: newFeedback };
  } catch (error) {
    // If the quota is exceeded even after trimming, it's likely the new item itself is too large.
    // As a fallback, we try to save it again without the screenshot/video data.
    if (error.name === 'QuotaExceededError') {
      console.warn('[FeedbackDashboard] Quota exceeded. Attempting to save feedback without media.');
      try {
        const { screenshot, video, videoBlob, ...feedbackWithoutMedia } = feedbackData;

        const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
        let existing = stored ? JSON.parse(stored) : [];

        if (existing.length >= MAX_FEEDBACK_ITEMS) {
          existing = existing.slice(0, MAX_FEEDBACK_ITEMS - 1);
        }

        const newFeedback = {
          id: Date.now().toString(),
          ...feedbackWithoutMedia,
          status: 'new',
          timestamp: new Date().toISOString(),
          notes: 'Media omitted due to storage limitations.'
        };

        const updated = [newFeedback, ...existing];
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));

        console.log(`[FeedbackDashboard] Saved new feedback without media. Total items now: ${updated.length}`);
        return { success: true, data: newFeedback };

      } catch (fallbackError) {
        console.error('[FeedbackDashboard] Fallback save failed:', fallbackError);
        return { success: false, error: fallbackError.message };
      }
    }

    console.error('[FeedbackDashboard] Failed to save feedback:', error);
    return { success: false, error: error.message };
  }
};

// Export default statuses for customization
export { DEFAULT_STATUSES };