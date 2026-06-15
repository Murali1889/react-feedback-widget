import { useState, useEffect, useRef } from 'react';

export const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Bug' },
  { id: 'feature', label: 'Feature' },
  { id: 'improvement', label: 'Improvement' },
  { id: 'other', label: 'Other' },
];

export const PRIORITY_OPTIONS = [
  { id: 'P0', label: 'P0', hint: 'Critical' },
  { id: 'P1', label: 'P1', hint: 'High' },
  { id: 'P2', label: 'P2', hint: 'Medium' },
  { id: 'P3', label: 'P3', hint: 'Low' },
];

export const DEFAULT_SUGGESTED_LABELS = ['ui', 'a11y', 'perf', 'data', 'flow'];

/**
 * Shared state + submit + reset for all FeedbackModal variants. Each
 * layout (centered, drawer, compact, stepper, two-column) calls this
 * once and renders the returned bag however it wants.
 */
export function useFeedbackModalState({
  isOpen,
  onClose,
  onSubmit,
  onAsyncSubmit,
  screenshot,
  manualScreenshotProp = null,
  videoBlob,
  manualVideoProp = null,
  manualFileProp = null,
  eventLogs,
  userName,
  userEmail,
  userAvatar,
  elementInfo,
  clickPosition,
}) {
  const [feedbackType, setFeedbackType] = useState('bug');
  const [priority, setPriority] = useState('P2');
  const [labels, setLabels] = useState([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualScreenshot, setManualScreenshot] = useState(manualScreenshotProp);
  const [manualVideo, setManualVideo] = useState(manualVideoProp);
  const [manualFile, setManualFile] = useState(manualFileProp);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedIntegrations, setSelectedIntegrations] = useState({
    local: true, jira: false, sheets: false,
  });

  const descriptionRef = useRef(null);
  const screenshotInputRef = useRef(null);

  useEffect(() => {
    let url = null;
    if (videoBlob) url = URL.createObjectURL(videoBlob);
    else if (manualVideo) url = URL.createObjectURL(manualVideo);
    setVideoUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [videoBlob, manualVideo]);

  useEffect(() => {
    if (isOpen) {
      setFeedbackType('bug');
      setPriority('P2');
      setLabels([]);
      setDescription('');
      setIsSubmitting(false);
      setManualScreenshot(null);
      setManualVideo(null);
      setManualFile(null);
      setZoomedImage(null);
      setSelectedIntegrations({ local: true, jira: false, sheets: false });
      setTimeout(() => descriptionRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const toggleLabel = (label) => {
    setLabels((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  const toggleIntegration = (key) => {
    setSelectedIntegrations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFile = (file) => {
    if (!file) return;
    setManualScreenshot(null); setManualVideo(null); setManualFile(null);
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onloadend = () => setManualScreenshot(r.result);
      r.readAsDataURL(file);
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
      severity: priority,
      labels,
      screenshot: screenshot || manualScreenshot,
      videoBlob: videoBlob || manualVideo,
      attachment: manualFile,
      eventLogs: eventLogs || [],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      component: elementInfo?.reactComponent || elementInfo?.tagName,
      elementInfo,
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userName,
      userEmail,
      userAvatar: userAvatar || null,
      selectedIntegrations,
      dotPosition: clickPosition || null,
    };
    onClose();
    if (onAsyncSubmit) onAsyncSubmit(feedbackData);
    else if (onSubmit) onSubmit(feedbackData);
  };

  const activeMedia = screenshot || manualScreenshot || videoBlob || manualVideo;
  const activeImage = screenshot || manualScreenshot;

  return {
    description, setDescription,
    feedbackType, setFeedbackType,
    priority, setPriority,
    labels, toggleLabel,
    selectedIntegrations, toggleIntegration,
    manualScreenshot, manualVideo, manualFile,
    handleFile,
    zoomedImage, setZoomedImage,
    videoUrl,
    isSubmitting,
    activeMedia, activeImage,
    descriptionRef,
    screenshotInputRef,
    handleSubmit,
  };
}
