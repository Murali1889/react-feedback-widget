import React, { useState, useEffect, useRef } from 'react';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { getTheme } from './theme.js';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Terminal, X } from 'lucide-react';
import { LogEntry } from './components/LogEntry.jsx';

// --- Utils ---
function isDataURL(str) {
  return str && typeof str === 'string' && str.startsWith('data:');
}

function isBlobOrHttpURL(str) {
  return str && typeof str === 'string' && (str.startsWith('blob:') || str.startsWith('http://') || str.startsWith('https://'));
}

function dataURLtoBlob(dataURL) {
  try {
    const base64Marker = ';base64,';
    const base64Index = dataURL.indexOf(base64Marker);
    if (base64Index === -1) return null;

    const mimeMatch = dataURL.substring(0, base64Index).match(/^data:(.*)/);
    if (!mimeMatch) return null;

    const mime = mimeMatch[1];
    let base64 = dataURL.substring(base64Index + base64Marker.length);
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    base64 = base64.replace(/\s/g, '');

    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("Failed to convert data URL to blob", e);
    return null;
  }
}

const formatTime = (seconds) => {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const floor = Math.floor(seconds);
  const min = Math.floor(floor / 60);
  const sec = (floor % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
};

// --- Animations ---
const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const slideOut = keyframes`
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
`;

// --- Styled Components ---

const ReplayContainer = styled.div`
  position: relative;
  background-color: ${props => props.theme.colors.contentBg};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
`;

const VideoSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const VideoWrapper = styled.div`
  position: relative;
  background: #000;
  aspect-ratio: 16 / 9;
  max-height: 280px;
`;

const VideoPlayer = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.03)'};
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ControlButton = styled.button`
  background: transparent;
  color: ${props => props.$active ? '#3b82f6' : props.theme.colors.textSecondary};
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: ${props => props.theme.colors.textPrimary};
    background: ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const PlayButton = styled(ControlButton)`
  width: 32px;
  height: 32px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;

  &:hover {
    background: #2563eb;
    color: white;
  }
`;

const ProgressContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 8px;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'};
  border-radius: 2px;
  cursor: pointer;
  position: relative;

  &:hover {
    height: 6px;
  }
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  position: relative;
  transition: width 0.1s linear;

  &::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    background: #3b82f6;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.15s;
  }

  ${ProgressBar}:hover &::after {
    opacity: 1;
  }
`;

const TimeDisplay = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: ${props => props.theme.colors.textSecondary};
  white-space: nowrap;
`;

const LogsToggle = styled(ControlButton)`
  position: relative;
  width: auto;
  padding: 0 8px;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
`;

const LogsBadge = styled.span`
  background: ${props => props.$hasLogs ? '#3b82f6' : props.theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
  color: ${props => props.$hasLogs ? 'white' : props.theme.colors.textSecondary};
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 8px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
`;

// Logs Panel (slide-out from right)
const LogsPanel = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${props => props.$width || '320px'};
  max-width: 90%;
  background: ${props => props.theme.mode === 'dark' ? '#0f172a' : '#ffffff'};
  border-left: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  z-index: 10;
  animation: ${props => props.$closing ? slideOut : slideIn} 0.2s ease-out forwards;
  box-shadow: -4px 0 20px rgba(0,0,0,0.1);
`;

const LogsPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
`;

const LogsTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LogCount = styled.span`
  font-size: 10px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'};
  color: #3b82f6;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
    color: ${props => props.theme.colors.textPrimary};
  }
`;

const LogsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  line-height: 1.5;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'};
    border-radius: 3px;
  }
`;

const EmptyLogs = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.theme.colors.textTertiary};
  font-size: 12px;
  gap: 8px;
`;

// --- Main Component ---

export const SessionReplay = ({
  videoSrc,
  eventLogs = [],
  mode = 'light',
  // Customization props
  showLogsButton = true,
  logsPanelWidth = '320px',
  defaultLogsOpen = false
}) => {
  const theme = getTheme(mode);
  const videoRef = useRef(null);
  const logsContainerRef = useRef(null);
  const progressRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [videoObjectUrl, setVideoObjectUrl] = useState(null);
  const [isLogsPanelOpen, setIsLogsPanelOpen] = useState(defaultLogsOpen);
  const [isPanelClosing, setIsPanelClosing] = useState(false);

  // Create object URL from video source
  useEffect(() => {
    if (!videoSrc) return;

    if (isBlobOrHttpURL(videoSrc)) {
      setVideoObjectUrl(videoSrc);
      return;
    }

    if (isDataURL(videoSrc)) {
      const blob = dataURLtoBlob(videoSrc);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setVideoObjectUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setVideoObjectUrl(null);
      };
    }

    setVideoObjectUrl(videoSrc);
  }, [videoSrc]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoObjectUrl) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoObjectUrl]);

  // Filter logs based on video time
  useEffect(() => {
    const timeInMs = currentTime * 1000;
    const logs = eventLogs.filter(log => log.timestamp <= timeInMs);
    setVisibleLogs(logs);
  }, [currentTime, eventLogs]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsContainerRef.current && isLogsPanelOpen) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [visibleLogs.length, isLogsPanelOpen]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    }
  };

  const handleProgressClick = (e) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleRewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleCloseLogsPanel = () => {
    setIsPanelClosing(true);
    setTimeout(() => {
      setIsLogsPanelOpen(false);
      setIsPanelClosing(false);
    }, 200);
  };

  const handleToggleLogs = () => {
    if (isLogsPanelOpen) {
      handleCloseLogsPanel();
    } else {
      setIsLogsPanelOpen(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <ThemeProvider theme={theme}>
      <ReplayContainer>
        <VideoSection>
          <VideoWrapper>
            <VideoPlayer ref={videoRef} src={videoObjectUrl} muted={isMuted} />
          </VideoWrapper>
          <Controls>
            <PlayButton onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </PlayButton>
            <ControlButton onClick={handleRewind} title="Restart">
              <RotateCcw size={14} />
            </ControlButton>

            <ProgressContainer>
              <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
              <ProgressBar ref={progressRef} onClick={handleProgressClick}>
                <ProgressFill style={{ width: `${progress}%` }} />
              </ProgressBar>
              <TimeDisplay>{formatTime(duration)}</TimeDisplay>
            </ProgressContainer>

            <ControlButton onClick={handleMuteToggle} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </ControlButton>
            <ControlButton onClick={handleFullscreen} title="Fullscreen">
              <Maximize2 size={14} />
            </ControlButton>

            {showLogsButton && eventLogs.length > 0 && (
              <LogsToggle
                onClick={handleToggleLogs}
                $active={isLogsPanelOpen}
                title="Toggle console logs"
              >
                <Terminal size={14} />
                <LogsBadge $hasLogs={visibleLogs.length > 0}>
                  {visibleLogs.length}
                </LogsBadge>
              </LogsToggle>
            )}
          </Controls>
        </VideoSection>

        {isLogsPanelOpen && (
          <LogsPanel $width={logsPanelWidth} $closing={isPanelClosing}>
            <LogsPanelHeader>
              <LogsTitle>
                <Terminal size={14} />
                Console & Network
              </LogsTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogCount>{visibleLogs.length} / {eventLogs.length}</LogCount>
                <CloseButton onClick={handleCloseLogsPanel} title="Close">
                  <X size={16} />
                </CloseButton>
              </div>
            </LogsPanelHeader>
            <LogsContainer ref={logsContainerRef}>
              {visibleLogs.length === 0 ? (
                <EmptyLogs>
                  <Terminal size={24} strokeWidth={1.5} />
                  No logs yet
                </EmptyLogs>
              ) : (
                visibleLogs.map((log, i) => (
                  <LogEntry key={i} log={log} theme={theme} />
                ))
              )}
            </LogsContainer>
          </LogsPanel>
        )}
      </ReplayContainer>
    </ThemeProvider>
  );
};
