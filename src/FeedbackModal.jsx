import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { 
  X, Send, Paperclip, ChevronRight, 
  Monitor, Globe, Code, Layers, FileCode,
  Copy, Check, Video
} from 'lucide-react';
import { getTheme } from './theme.js';
import { formatPath } from './utils.js';



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
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.2)'};
  backdrop-filter: blur(8px);
  z-index: 99998;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.modalBg};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 20px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
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
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
  letter-spacing: -0.01em;
`;

const ModalSubtitle = styled.span`
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
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
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
`;

const PillContainer = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none; 
  &::-webkit-scrollbar { display: none; }
`;

const Pill = styled.button`
  border: none;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  white-space: nowrap;
  
  background: ${props => props.$active 
    ? (props.theme.mode === 'dark' ? '#3b82f6' : '#2563eb') 
    : props.theme.colors.hoverBg};
  
  color: ${props => props.$active 
    ? '#ffffff' 
    : props.theme.colors.textSecondary};

  &:hover {
    background: ${props => props.$active 
      ? (props.theme.mode === 'dark' ? '#2563eb' : '#1d4ed8') 
      : props.theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'};
  }
`;

const InputWrapper = styled.div`
  position: relative;
`;

const StyledTextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background-color: ${props => props.theme.colors.inputBg};
  color: ${props => props.theme.colors.textPrimary};
  font-family: inherit;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 1px ${props => props.theme.colors.border};
  transition: all 0.2s;

  &::placeholder {
    color: ${props => props.theme.colors.textTertiary};
  }

  &:focus {
    box-shadow: inset 0 0 0 2px ${props => props.theme.mode === 'dark' ? '#3b82f6' : '#2563eb'};
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff'};
  }
`;

// --- ATTACHMENT CARD ---
const AttachmentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: ${props => props.theme.colors.hoverBg};
  border: 1px solid ${props => props.theme.colors.border};
`;

const Thumbnail = styled.div`
  width: 56px;
  height: 40px;
  border-radius: 6px;
  background-image: url(${props => props.src});
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.textPrimary};
`;

const AttachmentInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const AttachmentName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.theme.colors.textPrimary};
`;

const AttachmentMeta = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

// --- TECHNICAL DRAWER (Grid Layout) ---
const DetailsDrawer = styled.div`
  margin: 0;
  background: ${props => props.theme.mode === 'dark' ? '#0f172a' : '#f8fafc'};
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const DrawerTrigger = styled.button`
  width: 100%;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    color: ${props => props.theme.colors.textPrimary};
    background: ${props => props.theme.colors.hoverBg};
  }
`;

const AnimatedChevronRight = styled(ChevronRight)`
  transition: transform 0.2s;
  transform: ${props => (props.$isOpen ? 'rotate(90deg)' : 'none')};
`;

const DrawerContent = styled.div`
  padding: 0 24px 20px 24px;
  animation: ${fadeIn} 0.2s ease;
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: auto minmax(80px, auto) 1fr;
  column-gap: 12px;
  row-gap: 8px;
  align-items: center;
  font-size: 12px;
`;

const IconWrapper = styled.div`
  color: ${props => props.theme.colors.textTertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
`;

const Label = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

const Value = styled.div`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: ${props => props.theme.colors.textPrimary};
  background: ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border};
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  word-break: break-all;
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${props => props.theme.colors.textTertiary};
  border-radius: 4px;
  display: flex;
  align-items: center;
  
  &:hover {
    color: ${props => props.theme.colors.textPrimary};
    background: ${props => props.theme.colors.hoverBg};
  }
`;

// --- FOOTER ---
const Footer = styled.div`
  padding: 16px 24px 24px 24px;
  display: flex;
  justify-content: flex-end;
  background: ${props => props.theme.colors.modalBg};
`;

const SubmitButton = styled.button`
  background: ${props => props.theme.mode === 'dark' ? '#3b82f6' : '#2563eb'};
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px ${props => props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.3)'};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: ${props => props.theme.mode === 'dark' ? '#2563eb' : '#1d4ed8'};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

// --- DATA ---
const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Report Bug', placeholder: 'What went wrong? Steps to reproduce...' },
  { id: 'feature', label: 'Feature Request', placeholder: 'What feature would make your life easier?' },
  { id: 'improvement', label: 'Improvement', placeholder: 'How can we make this experience better?' },
  { id: 'other', label: 'Other', placeholder: 'What is on your mind?' },
];

// --- COMPONENT ---

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
  mode = 'light'
}) => {
  const [feedbackType, setFeedbackType] = useState('bug');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const descriptionRef = useRef(null);
  const theme = getTheme(mode);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setFeedbackType(videoBlob ? 'bug' : 'bug'); // Default to bug report for video
      setDescription('');
      setShowDetails(false);
      setCopied(false);
      setTimeout(() => descriptionRef.current?.focus(), 150);
    }
  }, [isOpen, videoBlob]);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);

    const feedbackData = {
      feedback: description.trim(),
      type: feedbackType,
      
      // Conditionally add screenshot or video data
      screenshot: videoBlob ? null : screenshot,
      videoBlob: videoBlob || null,
      eventLogs: eventLogs || [],
      
      // Meta data
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
    };

    try {
      await onSubmit(feedbackData);
      // Parent component will handle closing
    } catch (error) {
      console.error("Feedback submission failed:", error);
      setIsSubmitting(false);
    }
  };

  const handleCopySource = () => {
    if (!elementInfo?.sourceFile) return;
    const path = `${elementInfo.sourceFile.fileName}:${elementInfo.sourceFile.lineNumber}`;
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  console.log('[FeedbackModal] Render check - isOpen:', isOpen, 'videoBlob:', videoBlob, 'screenshot:', screenshot);

  if (!isOpen) {
    console.log('[FeedbackModal] Not rendering - isOpen is false');
    return null;
  }

  console.log('[FeedbackModal] Rendering modal!');
  const currentType = FEEDBACK_TYPES.find(t => t.id === feedbackType);

  return createPortal(
    <ThemeProvider theme={theme}>
      <ModalBackdrop onClick={onClose} />
      <ModalContainer>
        
        {/* Header */}
        <ModalHeader>
          <TitleGroup>
            <ModalTitle>Send Feedback</ModalTitle>
            <ModalSubtitle>
              {videoBlob ? 'Describe the issue in the recording' : 'Help us improve your experience'}
            </ModalSubtitle>
          </TitleGroup>
          <CloseButton onClick={onClose} aria-label="Close"><X size={20} /></CloseButton>
        </ModalHeader>

        {/* Body */}
        <ModalBody>
          {/* Pills */}
          <PillContainer>
            {FEEDBACK_TYPES.map(type => (
              <Pill 
                key={type.id} 
                $active={feedbackType === type.id}
                onClick={() => setFeedbackType(type.id)}
              >
                {type.label}
              </Pill>
            ))}
          </PillContainer>

          {/* Text Area */}
          <InputWrapper>
            <StyledTextArea
              ref={descriptionRef}
              placeholder={currentType.placeholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </InputWrapper>

          {/* Attachments */}
          {screenshot && (
            <AttachmentCard>
              <Thumbnail src={screenshot} />
              <AttachmentInfo>
                <AttachmentName>Screenshot.png</AttachmentName>
                <AttachmentMeta>
                  <Paperclip size={10} /> 
                  Auto-attached from selection
                </AttachmentMeta>
              </AttachmentInfo>
            </AttachmentCard>
          )}

          {videoBlob && (
            <AttachmentCard>
              <Thumbnail>
                <Video size={24} />
              </Thumbnail>
              <AttachmentInfo>
                <AttachmentName>Session Recording</AttachmentName>
                <AttachmentMeta>
                  ~{(videoBlob.size / 1024 / 1024).toFixed(2)} MB - Includes console and network logs
                </AttachmentMeta>
              </AttachmentInfo>
            </AttachmentCard>
          )}

        </ModalBody>

        {/* Technical Details Drawer */}
        <DetailsDrawer>
          <DrawerTrigger onClick={() => setShowDetails(!showDetails)}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Code size={14} />
              <span>System Details</span>
            </div>
            <ChevronRight 
              size={14} 
              style={{ 
                transform: showDetails ? 'rotate(90deg)' : 'none', 
                transition: 'transform 0.2s' 
              }} 
            />
          </DrawerTrigger>
          
          {showDetails && (
            <DrawerContent>
              <DetailsGrid>
                {/* Component Name */}
                <IconWrapper><Layers size={12} /></IconWrapper>
                <Label>Component</Label>
                <Value>{elementInfo?.reactComponent || elementInfo?.tagName || 'Unknown'}</Value>

                {/* Source File with Copy */}
                {elementInfo?.sourceFile && (
                  <>
                    <IconWrapper><FileCode size={12} /></IconWrapper>
                    <Label>Source</Label>
                    <Value>
                      <span>
                        {formatPath(elementInfo.sourceFile.fileName)}
                        <span style={{ opacity: 0.5 }}>:{elementInfo.sourceFile.lineNumber}</span>
                      </span>
                      <IconButton onClick={handleCopySource} title="Copy path">
                        {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </IconButton>
                    </Value>
                  </>
                )}

                {/* URL */}
                <IconWrapper><Globe size={12} /></IconWrapper>
                <Label>URL</Label>
                <Value>{window.location.pathname}</Value>

                {/* Viewport */}
                <IconWrapper><Monitor size={12} /></IconWrapper>
                <Label>Viewport</Label>
                <Value>{window.innerWidth} × {window.innerHeight}</Value>
              </DetailsGrid>
            </DrawerContent>
          )}
        </DetailsDrawer>

        {/* Footer Actions */}
        <Footer>
           <SubmitButton onClick={handleSubmit} disabled={!description.trim() || isSubmitting}>
            {isSubmitting ? 'Sending...' : (
              <>Send Feedback <Send size={14} /></>
            )}
          </SubmitButton>
        </Footer>

      </ModalContainer>
    </ThemeProvider>,
    document.body
  );
};