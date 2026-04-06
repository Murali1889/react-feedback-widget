import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import {
  X, Send, Paperclip, ChevronRight,
  Monitor, Globe, Code, Layers, FileCode,
  Copy, Check, Video, Upload, Image, Trash2, FileText,
  Database, ExternalLink, MessageSquare
} from 'lucide-react';
import { getTheme } from './theme.js';
import { formatPath } from './utils.js';
import { showError } from './ErrorToast.jsx';



// --- ANIMATIONS ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translate(-50%, -40%) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

// --- STYLED COMPONENTS ---

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)'};
  backdrop-filter: blur(4px);
  z-index: 99998;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.modalBg};
  border-radius: 16px;
  box-shadow: 
    0 20px 60px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0,0,0,0.05);
  z-index: 99999;
  animation: ${slideUp} 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  @media (max-width: 640px) {
    width: 100vw;
    bottom: 0;
    top: auto;
    transform: translate(-50%, 0);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

// --- HEADER ---
const ModalHeader = styled.div`
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  color: ${props => props.theme.colors.textSecondary};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${props => props.theme.colors.hoverBg};
    color: ${props => props.theme.colors.textPrimary};
  }
`;

// --- BODY & FORM ---
const ModalBody = styled.div`
  padding: 0 20px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
`;

const TypeSelector = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const TypePill = styled.button`
  border: 1px solid ${props => props.$active ? 'transparent' : props.theme.colors.border};
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => props.$active 
    ? (props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') 
    : 'transparent'};
  
  color: ${props => props.$active 
    ? (props.theme.mode === 'dark' ? '#60a5fa' : '#2563eb') 
    : props.theme.colors.textSecondary};
    
  border-color: ${props => props.$active 
    ? (props.theme.mode === 'dark' ? '#60a5fa' : '#bfdbfe') 
    : props.theme.colors.border};

  &:hover {
    background: ${props => props.$active ? '' : props.theme.colors.hoverBg};
  }
`;

const StyledTextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: 10px;
  background-color: ${props => props.theme.colors.inputBg};
  color: ${props => props.theme.colors.textPrimary};
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, background-color 0.2s;

  &::placeholder {
    color: ${props => props.theme.colors.textTertiary};
  }

  &:focus {
    border-color: ${props => props.theme.mode === 'dark' ? '#3b82f6' : '#93c5fd'};
    background-color: ${props => props.theme.colors.cardBg};
  }

  &:hover:not(:focus) {
    border-color: ${props => props.theme.colors.textTertiary};
  }
`;

const MediaPreview = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  max-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img, video {
    max-width: 100%;
    max-height: 160px;
    object-fit: contain;
  }
`;

const RemoveMediaButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  border: none;
  border-radius: 4px;
  padding: 4px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(239, 68, 68, 0.8);
  }
`;

const EmptyMediaSlot = styled.div`
  border: 1px dashed ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: ${props => props.theme.colors.hoverBg};
  opacity: 0.6;

  &:hover {
    opacity: 1;
    border-color: ${props => props.theme.colors.borderFocus};
  }
`;

const Footer = styled.div`
  padding: 16px 20px;
  background: ${props => props.theme.colors.headerBg};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const IntegrationRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const IntegrationIcon = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${props => props.$active ? 'transparent' : props.theme.colors.border};
  background: ${props => props.$active 
    ? (props.$type === 'jira' ? '#0052CC' : props.$type === 'sheets' ? '#34A853' : props.theme.colors.textSecondary)
    : 'transparent'};
  color: ${props => props.$active ? 'white' : props.theme.colors.textTertiary};
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;

  &:hover {
    border-color: ${props => props.$active ? 'transparent' : props.theme.colors.textSecondary};
    color: ${props => props.$active ? 'white' : props.theme.colors.textSecondary};
  }
`;

const SubmitButton = styled.button`
  background: ${props => props.theme.colors.btnPrimaryBg};
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.btnPrimaryHover};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Jira Icon SVG
const JiraIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

// Google Sheets Icon SVG
const SheetsIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 3H4.5C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zM9 17H6v-2h3v2zm0-4H6v-2h3v2zm0-4H6V7h3v2zm9 8h-6v-2h6v2zm0-4h-6v-2h6v2zm0-4h-6V7h6v2z"/>
  </svg>
);

const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Bug' },
  { id: 'feature', label: 'Feature' },
  { id: 'improvement', label: 'Improvement' },
  { id: 'other', label: 'Other' },
];

export const FeedbackModal = ({
  isOpen,
  onClose,
  elementInfo,
  screenshot,
  videoBlob,
  eventLogs,
  onSubmit,
  userName,
  userEmail,
  userAvatar,
  mode = 'light',
  integrations = null,
  onAsyncSubmit,
  clickPosition
}) => {
  const [feedbackType, setFeedbackType] = useState('bug');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualScreenshot, setManualScreenshot] = useState(null);
  const [manualVideo, setManualVideo] = useState(null);
  const [manualFile, setManualFile] = useState(null);

  const [selectedIntegrations, setSelectedIntegrations] = useState({
    local: true,
    jira: false,
    sheets: false
  });
  
  const [videoUrl, setVideoUrl] = useState(null);
  
  const descriptionRef = useRef(null);
  const screenshotInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const theme = getTheme(mode);
  
  const hasJira = integrations?.jira?.enabled;
  const hasSheets = integrations?.sheets?.enabled;

  // Memoize video URL to prevent re-rendering on typing
  useEffect(() => {
    let url = null;
    if (videoBlob) {
      url = URL.createObjectURL(videoBlob);
    } else if (manualVideo) {
      url = URL.createObjectURL(manualVideo);
    }
    
    setVideoUrl(url);

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [videoBlob, manualVideo]);

  useEffect(() => {
    if (isOpen) {
      setFeedbackType('bug');
      setDescription('');
      setIsSubmitting(false);
      setManualScreenshot(null);
      setManualVideo(null);
      setManualFile(null);
      setSelectedIntegrations({
        local: true,
        jira: false,
        sheets: false
      });
      setTimeout(() => descriptionRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleFile = (file) => {
    if (!file) return;
    setManualScreenshot(null);
    setManualVideo(null);
    setManualFile(null);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setManualScreenshot(reader.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setManualVideo(file);
    } else {
      setManualFile(file);
    }
  };

  const handleSubmit = () => {
    if (!description.trim() || isSubmitting) return;

    const feedbackData = {
      feedback: description.trim(),
      type: feedbackType,
      screenshot: screenshot || manualScreenshot,
      videoBlob: videoBlob || manualVideo,
      attachment: manualFile,
      eventLogs: eventLogs || [],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      component: elementInfo?.reactComponent || elementInfo?.tagName,
      elementInfo: elementInfo,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      userName: userName,
      userEmail: userEmail,
      userAvatar: userAvatar || null,
      selectedIntegrations: selectedIntegrations,
      dotPosition: clickPosition || null,
    };

    console.log('[FeedbackModal] Submitting with dotPosition:', feedbackData.dotPosition, 'selector:', feedbackData.elementInfo?.selector);

    // Close modal immediately and submit async
    onClose();

    // Use async submit if available, otherwise fall back to regular submit
    if (onAsyncSubmit) {
      onAsyncSubmit(feedbackData);
    } else if (onSubmit) {
      onSubmit(feedbackData);
    }
  };

  const toggleIntegration = (key) => {
    setSelectedIntegrations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!isOpen) return null;

  const activeMedia = screenshot || manualScreenshot || videoBlob || manualVideo;

  return createPortal(
    <ThemeProvider theme={theme}>
      <ModalBackdrop onClick={onClose} />
      <ModalContainer>
        <ModalHeader>
          <TitleGroup>
            <MessageSquare size={18} color={theme.colors.textSecondary} />
            <ModalTitle>Send Feedback</ModalTitle>
          </TitleGroup>
          <CloseButton onClick={onClose}><X size={16} /></CloseButton>
        </ModalHeader>

        <ModalBody>
           <StyledTextArea
              ref={descriptionRef}
              placeholder="What's on your mind?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />

            {activeMedia ? (
              <MediaPreview>
                 {screenshot || manualScreenshot ? (
                   <img src={screenshot || manualScreenshot} alt="Preview" />
                 ) : (
                   <video src={videoUrl} controls />
                 )}
                 {!screenshot && !videoBlob && (
                    <RemoveMediaButton onClick={() => {
                      setManualScreenshot(null);
                      setManualVideo(null);
                    }}>
                      <Trash2 size={14} />
                    </RemoveMediaButton>
                 )}
              </MediaPreview>
            ) : (
              <EmptyMediaSlot onClick={() => screenshotInputRef.current?.click()}>
                 <Image size={16} />
                 <span>Attach Screenshot or Video</span>
                 <input 
                   type="file" 
                   ref={screenshotInputRef} 
                   accept="image/*,video/*" 
                   style={{display:'none'}} 
                   onChange={(e) => handleFile(e.target.files[0])}
                 />
              </EmptyMediaSlot>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: 500 }}>Category:</span>
               <TypeSelector>
                  {FEEDBACK_TYPES.map(type => (
                    <TypePill 
                      key={type.id} 
                      $active={feedbackType === type.id}
                      onClick={() => setFeedbackType(type.id)}
                    >
                      {type.label}
                    </TypePill>
                  ))}
               </TypeSelector>
            </div>
        </ModalBody>

        <Footer>
          <IntegrationRow>
             {/* Integration Toggles */}
             {hasJira && (
               <IntegrationIcon 
                 $active={selectedIntegrations.jira} 
                 $type="jira"
                 onClick={() => toggleIntegration('jira')}
                 title="Send to Jira"
               >
                 <JiraIcon />
               </IntegrationIcon>
             )}
             {hasSheets && (
               <IntegrationIcon 
                 $active={selectedIntegrations.sheets} 
                 $type="sheets"
                 onClick={() => toggleIntegration('sheets')}
                 title="Send to Sheets"
               >
                 <SheetsIcon />
               </IntegrationIcon>
             )}
          </IntegrationRow>
          
          <SubmitButton onClick={handleSubmit} disabled={!description.trim()}>
            Send Feedback
            <Send size={14} />
          </SubmitButton>
        </Footer>
      </ModalContainer>
    </ThemeProvider>,
    document.body
  );
};
