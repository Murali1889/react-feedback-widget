import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, css } from 'styled-components';
import {
  X, Trash2, CheckCircle, AlertCircle, Play, Ban, ChevronDown,
  Filter, RefreshCw, Loader2, MessageSquare, Inbox, Eye, Archive, Download,
  PauseCircle, Bug, Lightbulb, Zap, Image, Video,
  Copy, Check, ZoomIn, Search, ExternalLink, FileCode, Layers, Monitor, Globe,
  Maximize2, Minimize2
} from 'lucide-react';
import { getTheme, fadeIn, slideInRight, scaleIn, spin, slideDown } from '../../theme.js';
import { formatPath } from '../../utils.js';
import { SessionReplay } from '../../SessionReplay.jsx';
import { LogEntry } from '../../components/LogEntry.jsx';
import { StatusBadge, StatusBadgeStyled, getIconComponent, normalizeStatusKey, getStatusData } from '../../components/StatusBadge.jsx';
import { StatusDropdown } from '../../components/StatusDropdown.jsx';
import { showError, showSuccess, showInfo } from '../../ErrorToast.jsx';

const FEEDBACK_STORAGE_KEY = 'react-feedback-data';

// Default statuses
const DEFAULT_STATUSES = {
  new: { key: 'new', label: 'New', color: '#8b5cf6', bgColor: '#ede9fe', textColor: '#6d28d9', icon: 'Inbox' },
  open: { key: 'open', label: 'Open', color: '#f59e0b', bgColor: '#fef3c7', textColor: '#92400e', icon: 'AlertCircle' },
  inProgress: { key: 'inProgress', label: 'In Progress', color: '#3b82f6', bgColor: '#dbeafe', textColor: '#1e40af', icon: 'Play' },
  underReview: { key: 'underReview', label: 'Under Review', color: '#06b6d4', bgColor: '#cffafe', textColor: '#0e7490', icon: 'Eye' },
  resolved: { key: 'resolved', label: 'Resolved', color: '#10b981', bgColor: '#d1fae5', textColor: '#065f46', icon: 'CheckCircle' },
  closed: { key: 'closed', label: 'Closed', color: '#64748b', bgColor: '#e2e8f0', textColor: '#334155', icon: 'Archive' }
};

// --- Styled Components ---

const DashboardBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${props => props.theme.colors.backdropBg};
  z-index: 9998;
  animation: ${fadeIn} 0.2s ease-out;
  backdrop-filter: blur(2px);
`;

const DashboardPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 600px;
  background-color: ${props => props.theme.colors.modalBg};
  z-index: 9999;
  box-shadow: -8px 0 32px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  animation: ${slideInRight} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DashboardHeader = styled.div`
  padding: 20px 24px;
  background: ${props => props.theme.colors.headerBg};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.textPrimary};
`;

const CountBadge = styled.span`
  background: ${props => props.theme.colors.btnPrimaryBg};
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  border-radius: 8px;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.hoverBg};
    color: ${props => props.theme.colors.textPrimary};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  height: 36px;
  padding: 0 12px 0 36px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.inputBg};
  color: ${props => props.theme.colors.textPrimary};
  font-size: 13px;
  outline: none;
  
  &:focus {
    border-color: ${props => props.theme.colors.borderFocus};
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  pointer-events: none;
  color: ${props => props.theme.colors.textTertiary};
  display: flex;
  align-items: center;
`;

const FilterSelect = styled.select`
  height: 36px;
  padding: 0 28px 0 12px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.inputBg};
  color: ${props => props.theme.colors.textPrimary};
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  
  &:focus {
    border-color: ${props => props.theme.colors.borderFocus};
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  background: ${props => props.theme.colors.contentBg};
  padding: 16px 24px;
`;

const FeedbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Card = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.$expanded ? props.theme.colors.borderFocus : props.theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: ${props => props.$expanded ? props.theme.colors.borderFocus : props.theme.colors.textTertiary};
    box-shadow: 0 4px 12px ${props => props.theme.colors.shadow};
  }
`;

const CardMain = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  padding: 16px;
  align-items: start;
`;

const Thumbnail = styled.div`
  width: 64px;
  height: 48px;
  border-radius: 6px;
  background: ${props => props.theme.colors.hoverBg};
  border: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: ${props => props.theme.colors.textTertiary};
  flex-shrink: 0;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CardContent = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const DateText = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.textSecondary};
`;

const FeedbackDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${props => props.theme.colors.textPrimary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: ${props => props.$expanded ? 'unset' : 2};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const ExpandedSection = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.hoverBg};
  padding: 16px;
  animation: ${slideDown} 0.2s ease-out;
`;

const MediaViewer = styled.div`
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  background: #000;
  
  img {
    width: 100%;
    max-height: 400px;
    object-fit: contain;
    display: block;
  }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  font-size: 12px;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailLabel = styled.span`
  color: ${props => props.theme.colors.textTertiary};
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.div`
  color: ${props => props.theme.colors.textPrimary};
  background: ${props => props.theme.colors.cardBg};
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
  font-family: monospace;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.theme.colors.textTertiary};
  gap: 12px;
`;

// Video Mode - Fullscreen video player with logs
const VideoModeBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 100000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const VideoModeContainer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100001;
  display: flex;
  flex-direction: column;
  padding: 20px;
`;

const VideoModeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
`;

const VideoModeTitle = styled.h2`
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const VideoModeCloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const VideoModeContent = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  min-height: 0;
  height: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 300px;
  }
`;

const VideoModePlayer = styled.div`
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
`;

const VideoModeLogsPanel = styled.div`
  background: ${props => props.theme.mode === 'dark' ? '#0d1117' : '#f8fafc'};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
  border: 1px solid ${props => props.theme.mode === 'dark' ? '#30363d' : '#e2e8f0'};
  min-height: 0;
  height: 100%;
`;

const VideoModeLogsHeader = styled.div`
  padding: 12px 16px;
  background: ${props => props.theme.mode === 'dark' ? '#161b22' : '#f1f5f9'};
  border-bottom: 1px solid ${props => props.theme.mode === 'dark' ? '#30363d' : '#e2e8f0'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const VideoModeLogsTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #7d8590;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const VideoModeLogsList = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  background: ${props => props.theme.mode === 'dark' ? '#0d1117' : '#f8fafc'};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  line-height: 1.5;
  min-height: 0;
  max-height: 100%;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.mode === 'dark' ? '#0d1117' : '#f1f5f9'};
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.mode === 'dark' ? '#30363d' : '#cbd5e1'};
    border-radius: 4px;
  }
`;

const ExpandButton = styled.button`
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${props => props.theme.colors.textSecondary};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.theme.colors.hoverBg};
    color: ${props => props.theme.colors.textPrimary};
  }
`;

// Helper to show type icon
const TypeIcon = ({ type }) => {
  switch(type) {
    case 'bug': return <Bug size={14} color="#ef4444" />;
    case 'feature': return <Lightbulb size={14} color="#22c55e" />;
    case 'improvement': return <Zap size={14} color="#3b82f6" />;
    default: return <MessageSquare size={14} color="#6b7280" />;
  }
};

// Helper for relative date formatting
const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const FeedbackDashboardLegacy = ({
  isOpen, onClose, data, isDeveloper = false, onStatusChange, mode = 'light',
  isLoading = false, onRefresh, title = 'Feedback', statuses, acceptableStatuses,
  showAllStatuses = true, error = null, integrations
}) => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [videoModeItem, setVideoModeItem] = useState(null); // Item for fullscreen video mode
  const [videoModeVisibleLogs, setVideoModeVisibleLogs] = useState([]); // Logs synced with video time
  const videoModeLogsRef = useRef(null);

  const useLocalStorage = data === undefined;
  const theme = getTheme(mode);

  // Merge statuses
  const mergedStatuses = useMemo(() => {
    if (acceptableStatuses && acceptableStatuses.length > 0) {
      const result = {};
      acceptableStatuses.forEach(key => {
        result[key] = statuses?.[key] || DEFAULT_STATUSES[key] || {
          key, label: key, color: '#6b7280', bgColor: '#f3f4f6', textColor: '#374151', icon: 'AlertCircle'
        };
      });
      return result;
    }
    return statuses || DEFAULT_STATUSES;
  }, [statuses, acceptableStatuses]);

  useEffect(() => {
    const loadData = () => {
      if (useLocalStorage) {
        try {
          const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
          setFeedbackList(stored ? JSON.parse(stored) : []);
        } catch(e) { console.error(e); }
      } else {
        setFeedbackList(data || []);
      }
    };
    if (isOpen) loadData();
  }, [isOpen, data, useLocalStorage]);

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
    else if (useLocalStorage) {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      setFeedbackList(stored ? JSON.parse(stored) : []);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this feedback?")) return;
    const updated = feedbackList.filter(item => item.id !== id);
    if (useLocalStorage) {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
    }
    setFeedbackList(updated);
  };

  const filteredItems = useMemo(() => {
    return feedbackList.filter(item => {
      const matchesStatus = filterStatus === 'all' || normalizeStatusKey(item.status, mergedStatuses) === filterStatus;
      
      if (!matchesStatus) return false;
      if (!searchQuery) return true;

      const q = searchQuery.toLowerCase();
      const feedbackText = (item.feedback || item.description || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const user = (item.userName || '').toLowerCase();

      return feedbackText.includes(q) || id.includes(q) || type.includes(q) || user.includes(q);
    });
  }, [feedbackList, filterStatus, searchQuery, mergedStatuses]);

  if (!isOpen) return null;

  return createPortal(
    <ThemeProvider theme={theme}>
      <DashboardBackdrop onClick={onClose} />
      <DashboardPanel>
        <DashboardHeader>
          <HeaderTop>
            <TitleGroup>
              <HeaderTitle>{title}</HeaderTitle>
              <CountBadge>{feedbackList.length}</CountBadge>
            </TitleGroup>
            <ActionsGroup>
              <ActionButton onClick={handleRefresh} title="Refresh">
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </ActionButton>
              <ActionButton onClick={onClose} title="Close">
                <X size={20} />
              </ActionButton>
            </ActionsGroup>
          </HeaderTop>
          
          <FilterBar>
            <div style={{position: 'relative', flex: 1}}>
               <SearchIconWrapper><Search size={14} /></SearchIconWrapper>
               <SearchInput 
                 placeholder="Search feedback, ID, type..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
            </div>
            <FilterSelect 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              {Object.values(mergedStatuses).map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </FilterSelect>
          </FilterBar>
        </DashboardHeader>

        <Content>
          {filteredItems.length === 0 ? (
            <EmptyState>
              <Inbox size={48} strokeWidth={1} />
              <span>No feedback found</span>
            </EmptyState>
          ) : (
            <FeedbackList>
              {filteredItems.map(item => {
                const isExpanded = expandedId === item.id;
                const statusKey = normalizeStatusKey(item.status, mergedStatuses);
                const statusData = mergedStatuses[statusKey];

                return (
                  <Card 
                    key={item.id} 
                    $expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <CardMain>
                      <Thumbnail>
                        {(item.video || item.videoRef) ? <Video size={24} /> : (item.screenshot ? <img src={item.screenshot} alt="" /> : <MessageSquare size={24} />)}
                      </Thumbnail>
                      
                      <CardContent>
                        <CardHeader>
                          <TypeIcon type={item.type} />
                          <span style={{fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: theme.colors.textPrimary}}>
                            {item.type || 'Feedback'}
                          </span>
                          <span style={{fontSize: 12, color: theme.colors.textTertiary}}>•</span>
                          <DateText>{formatRelativeDate(item.timestamp)}</DateText>
                        </CardHeader>
                        <FeedbackDescription $expanded={isExpanded}>
                          {item.feedback || item.description || 'No description'}
                        </FeedbackDescription>
                      </CardContent>

                      <CardActions onClick={e => e.stopPropagation()}>
                        {isDeveloper ? (
                          <StatusDropdown 
                            currentStatus={item.status}
                            onStatusChange={(id, s) => onStatusChange ? onStatusChange({id: item.id, status: s}) : null}
                            itemId={item.id}
                            statuses={mergedStatuses}
                            theme={theme}
                          />
                        ) : (
                          <StatusBadgeStyled 
                            $statusColor={statusData?.color}
                            $textColor={statusData?.textColor}
                            $statusBg={statusData?.bgColor}
                          >
                            {statusData?.label}
                          </StatusBadgeStyled>
                        )}
                        {isExpanded && isDeveloper && (
                          <ActionButton onClick={() => handleDelete(item.id)} title="Delete">
                            <Trash2 size={14} color="#ef4444" />
                          </ActionButton>
                        )}
                      </CardActions>
                    </CardMain>

                    {isExpanded && (
                      <ExpandedSection onClick={e => e.stopPropagation()}>
                        {(item.screenshot || item.video || item.videoRef) && (
                          <MediaViewer style={{ position: 'relative' }}>
                             {(item.video || item.videoRef) ? (
                               <>
                                 <SessionReplayWrapper item={item} mode={mode} />
                                 <ExpandButton
                                   onClick={() => setVideoModeItem(item)}
                                   title="Open in Video Mode"
                                   style={{
                                     position: 'absolute',
                                     top: 8,
                                     right: 8,
                                     background: 'rgba(0,0,0,0.6)',
                                     color: 'white',
                                     padding: 6,
                                     borderRadius: 6
                                   }}
                                 >
                                   <Maximize2 size={16} />
                                 </ExpandButton>
                               </>
                             ) : (
                               <img src={item.screenshot} alt="Evidence" />
                             )}
                          </MediaViewer>
                        )}

                        {/* Developer view - show technical details */}
                        {isDeveloper && (
                          <DetailGrid>
                            <DetailItem>
                              <DetailLabel>Page</DetailLabel>
                              <DetailValue>
                                <Globe size={12} /> {new URL(item.url || 'http://localhost').pathname}
                              </DetailValue>
                            </DetailItem>
                            <DetailItem>
                              <DetailLabel>Component</DetailLabel>
                              <DetailValue>
                                <Layers size={12} /> {item.elementInfo?.reactComponent || item.component || 'Unknown'}
                              </DetailValue>
                            </DetailItem>
                            <DetailItem>
                              <DetailLabel>Browser</DetailLabel>
                              <DetailValue>
                                <Monitor size={12} /> {item.userAgent?.split(') ')[0]?.slice(-30) || 'Unknown'}...
                              </DetailValue>
                            </DetailItem>
                            {item.elementInfo?.sourceFile?.fileName && (
                              <DetailItem>
                                <DetailLabel>Source</DetailLabel>
                                <DetailValue style={{cursor: 'pointer'}} onClick={() => navigator.clipboard.writeText(item.elementInfo?.sourceFile?.fileName)}>
                                  <FileCode size={12} />
                                  {formatPath(item.elementInfo?.sourceFile?.fileName || '')}
                                  <Copy size={10} style={{marginLeft: 'auto'}}/>
                                </DetailValue>
                              </DetailItem>
                            )}
                          </DetailGrid>
                        )}
                      </ExpandedSection>
                    )}
                  </Card>
                );
              })}
            </FeedbackList>
          )}
        </Content>
      </DashboardPanel>

      {/* Video Mode - Fullscreen video with logs */}
      {videoModeItem && createPortal(
        <ThemeProvider theme={theme}>
          <VideoModeBackdrop onClick={() => setVideoModeItem(null)} />
          <VideoModeContainer>
            <VideoModeHeader>
              <VideoModeTitle>
                <Video size={20} />
                {videoModeItem.feedback?.slice(0, 50) || 'Video Recording'}
                {videoModeItem.feedback?.length > 50 && '...'}
              </VideoModeTitle>
              <VideoModeCloseBtn onClick={() => setVideoModeItem(null)}>
                <Minimize2 size={16} />
                Exit Video Mode
              </VideoModeCloseBtn>
            </VideoModeHeader>

            <VideoModeContent>
              <VideoModePlayer>
                <SessionReplayWrapper
                  item={videoModeItem}
                  mode="dark"
                  fullHeight={true}
                  showLogsButton={false}
                  onTimeUpdate={(time, logs) => {
                    setVideoModeVisibleLogs(logs);
                    // Auto-scroll logs
                    if (videoModeLogsRef.current) {
                      videoModeLogsRef.current.scrollTop = videoModeLogsRef.current.scrollHeight;
                    }
                  }}
                />
              </VideoModePlayer>

              <VideoModeLogsPanel>
                <VideoModeLogsHeader>
                  <VideoModeLogsTitle>
                    <span style={{ color: '#3fb950' }}>❯</span>
                    Console & Network Logs
                  </VideoModeLogsTitle>
                  <span style={{
                    background: '#238636',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    {videoModeVisibleLogs.length} / {videoModeItem.eventLogs?.length || 0}
                  </span>
                </VideoModeLogsHeader>

                <VideoModeLogsList ref={videoModeLogsRef}>
                  {videoModeVisibleLogs.length === 0 ? (
                    <div style={{
                      padding: 40,
                      textAlign: 'center',
                      color: '#484f58'
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>❯_</div>
                      <div>No logs yet - play the video to see logs</div>
                    </div>
                  ) : (
                    videoModeVisibleLogs.map((log, idx) => (
                      <LogEntry key={idx} log={log} theme={theme} />
                    ))
                  )}
                </VideoModeLogsList>
              </VideoModeLogsPanel>
            </VideoModeContent>
          </VideoModeContainer>
        </ThemeProvider>,
        document.body
      )}
    </ThemeProvider>,
    document.body
  );
};

// Restore SessionReplayWrapper helpers
const MAX_VIDEO_SIZE_MB = 500;
const VIDEO_DB_NAME = 'FeedbackVideoDB';
const VIDEO_STORE_NAME = 'videos';

const openVideoDatabase = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(VIDEO_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME, { keyPath: 'id' });
    };
});

const getVideoFromIndexedDB = async (id) => {
  try {
    console.log('Getting video from IndexedDB, id:', id);
    const db = await openVideoDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE_NAME], 'readonly');
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        console.log('IndexedDB get result:', result ? 'found' : 'not found',
          result ? 'blob size: ' + result.blob?.size : '');
        resolve(result ? result.blob : null);
      };
      request.onerror = (e) => {
        console.error('IndexedDB get error:', e);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
    });
  } catch (e) {
    console.error('getVideoFromIndexedDB error:', e);
    return null;
  }
};

const saveVideoToIndexedDB = async (id, videoBlob) => {
  try {
    console.log('Opening IndexedDB for save, id:', id, 'blob size:', videoBlob?.size);
    const db = await openVideoDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.put({ id, blob: videoBlob, timestamp: Date.now() });
      request.onsuccess = () => {
        console.log('IndexedDB save success for id:', id);
        resolve(true);
      };
      request.onerror = (e) => {
        console.error('IndexedDB save error:', e);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
    });
  } catch (e) {
    console.error('saveVideoToIndexedDB error:', e);
    return false;
  }
};

const deleteVideoFromIndexedDB = async (id) => {
  try {
    const db = await openVideoDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch { return false; }
};

const SessionReplayWrapper = ({ item, mode, fullHeight = false, showLogsButton = true, onTimeUpdate = null }) => {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const urlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      // Cleanup previous URL
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }

      try {
        if (item.videoRef) {
          const blob = await getVideoFromIndexedDB(item.videoRef);
          if (cancelled) return;
          if (blob) {
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setVideoUrl(url);
          } else {
            setError('Video not found');
          }
        } else if (item.video) {
          setVideoUrl(item.video);
        } else {
          setError('No video data');
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load video');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [item.id, item.videoRef, item.video]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        color: '#94a3b8',
        height: fullHeight ? '100%' : 'auto'
      }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 8 }}>Loading video...</span>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        color: '#ef4444',
        fontSize: 13,
        height: fullHeight ? '100%' : 'auto'
      }}>
        {error || 'Video unavailable'}
      </div>
    );
  }

  return (
    <SessionReplay
      videoSrc={videoUrl}
      eventLogs={item.eventLogs || []}
      mode={mode}
      fullHeight={fullHeight}
      showLogsButton={showLogsButton}
      onTimeUpdate={onTimeUpdate}
    />
  );
};

export const saveFeedbackToLocalStorage = async (feedbackData) => {
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    let existing = stored ? JSON.parse(stored) : [];
    const feedbackId = Date.now().toString();
    let processedData = { ...feedbackData };

    console.log('Saving feedback, has videoBlob:', !!feedbackData.videoBlob,
      'size:', feedbackData.videoBlob?.size,
      'type:', feedbackData.videoBlob?.type);

    if (feedbackData.videoBlob && feedbackData.videoBlob instanceof Blob) {
      const sizeMB = feedbackData.videoBlob.size / (1024 * 1024);
      console.log('Video size:', sizeMB.toFixed(2), 'MB');

      if (sizeMB <= MAX_VIDEO_SIZE_MB) {
        const saved = await saveVideoToIndexedDB(feedbackId, feedbackData.videoBlob);
        console.log('Video saved to IndexedDB:', saved);

        if (saved) {
          processedData.videoRef = feedbackId;
          processedData.videoSize = feedbackData.videoBlob.size;
          processedData.videoType = feedbackData.videoBlob.type;
        }
      } else {
        console.warn('Video too large:', sizeMB, 'MB, max:', MAX_VIDEO_SIZE_MB, 'MB');
      }
      delete processedData.videoBlob;
      delete processedData.video;
    }

    const newFeedback = {
      id: feedbackId,
      ...processedData,
      status: 'new',
      timestamp: new Date().toISOString()
    };

    console.log('Saving feedback with videoRef:', newFeedback.videoRef);
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([newFeedback, ...existing].slice(0, 50)));
    window.dispatchEvent(new CustomEvent('feedback-data-updated'));
    return { success: true, data: newFeedback };
  } catch (e) {
    console.error('Error saving feedback:', e);
    return { success: false, error: e.message };
  }
};

export { DEFAULT_STATUSES };