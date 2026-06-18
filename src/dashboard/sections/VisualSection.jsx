import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Wrap = styled.div`
  display: flex; flex-direction: column; gap: 12px;
`;
const Img = styled.img`
  display: block;
  width: 100%; max-height: 480px;
  object-fit: contain;
  background: ${pickToken('color.canvas')};
  border-radius: ${pickToken('radius.md')};
  border: 1px solid ${pickToken('color.border')};
  cursor: zoom-in;
  image-rendering: pixelated;       /* don't blur tiny test images */
  min-height: 80px;                 /* always visibly tall */
`;
const Player = styled.video`
  display: block;
  width: 100%; max-height: 480px;
  background: #000;
  border-radius: ${pickToken('radius.md')};
  border: 1px solid ${pickToken('color.border')};
`;
const AudioPlayer = styled.audio`
  width: 100%;
`;
const Meta = styled.div`
  display: flex; gap: 10px; flex-wrap: wrap;
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textMuted')};
`;

/**
 * Open the IndexedDB store and pull the video blob the modal saved
 * under feedbackId. Returns null on any failure so the UI just hides
 * the player section.
 */
async function loadVideoFromIndexedDB(id) {
  if (typeof indexedDB === 'undefined' || !id) return null;
  return new Promise((resolve) => {
    const req = indexedDB.open('FeedbackVideoDB', 1);
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      try {
        const db = req.result;
        if (!db.objectStoreNames.contains('videos')) { db.close(); resolve(null); return; }
        const tx = db.transaction(['videos'], 'readonly');
        const get = tx.objectStore('videos').get(String(id));
        get.onsuccess = () => { resolve(get.result?.blob || null); db.close(); };
        get.onerror = () => { resolve(null); db.close(); };
      } catch { resolve(null); }
    };
    req.onupgradeneeded = () => resolve(null);
  });
}

function fmtBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return n + 'B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + 'KB';
  return (n / (1024 * 1024)).toFixed(1) + 'MB';
}

export function VisualSection({ item }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // Resolve the video source: inline data URL / Blob / IndexedDB ref
  useEffect(() => {
    let revoke = null;
    const directSrc = typeof item?.video === 'string' ? item.video : null;
    if (directSrc) { setVideoUrl(directSrc); return; }
    if (item?.videoBlob instanceof Blob) {
      const u = URL.createObjectURL(item.videoBlob);
      revoke = u; setVideoUrl(u);
      return () => { URL.revokeObjectURL(revoke); };
    }
    if (item?.videoRef) {
      let cancelled = false;
      loadVideoFromIndexedDB(item.videoRef).then((blob) => {
        if (cancelled || !blob) return;
        const u = URL.createObjectURL(blob);
        revoke = u; setVideoUrl(u);
      });
      return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
    }
    setVideoUrl(null);
  }, [item?.video, item?.videoBlob, item?.videoRef]);

  // Resolve audio: live Blob (just-recorded) OR IndexedDB ref (persisted).
  useEffect(() => {
    let revoke = null;
    if (item?.audioBlob instanceof Blob) {
      const u = URL.createObjectURL(item.audioBlob);
      revoke = u; setAudioUrl(u);
      return () => { URL.revokeObjectURL(revoke); };
    }
    const ref = item?.audioBlob?.audioRef;
    if (ref) {
      let cancelled = false;
      loadVideoFromIndexedDB(ref).then((blob) => {
        if (cancelled || !blob) return;
        const u = URL.createObjectURL(blob);
        revoke = u; setAudioUrl(u);
      });
      return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
    }
    setAudioUrl(null);
  }, [item?.audioBlob]);

  const hasScreenshot = !!item?.screenshot;
  const hasVideo = !!videoUrl;
  const hasAudio = !!(item?.audioBlob);
  const audioSrc = audioUrl;

  if (!hasScreenshot && !hasVideo && !hasAudio) return null;
  return (
    <Wrap>
      {hasScreenshot && (
        <div>
          <Img src={item.screenshot} alt="Captured screenshot"
               onClick={() => window.open(item.screenshot, '_blank')}
               title="Click to open full size" />
          <Meta>
            <span>screenshot</span>
            <span>·</span>
            <span>click to open full size</span>
          </Meta>
        </div>
      )}
      {hasVideo && (
        <div>
          <Player controls src={videoUrl} />
          <Meta>
            <span>video</span>
            {item.videoSize && <><span>·</span><span>{fmtBytes(item.videoSize)}</span></>}
            {item.videoType && <><span>·</span><span>{item.videoType}</span></>}
          </Meta>
        </div>
      )}
      {hasAudio && audioSrc && (
        <div>
          <AudioPlayer controls src={audioSrc} />
          <Meta>
            <span>voice memo</span>
            {item.audioBlob?.size && <><span>·</span><span>{fmtBytes(item.audioBlob.size)}</span></>}
          </Meta>
        </div>
      )}
      {hasAudio && !audioSrc && (
        <Meta>
          <span>📎 voice memo: {item.audioBlob?.name || 'audio'}</span>
          {item.audioBlob?.size && <><span>·</span><span>{fmtBytes(item.audioBlob.size)}</span></>}
          <span style={{ opacity: 0.6 }}>(persisted as metadata — original blob in IndexedDB)</span>
        </Meta>
      )}
    </Wrap>
  );
}
VisualSection.summary = (item) => {
  const bits = [];
  if (item.screenshot) bits.push('screenshot');
  if (item.video || item.videoBlob || item.videoRef) bits.push('video');
  if (item.audioBlob) bits.push('audio');
  return bits.join(' · ') || 'none';
};
VisualSection.title = 'Visual';
VisualSection.id = 'visual';
VisualSection.shouldRender = (item) =>
  !!(item.video || item.videoBlob || item.videoRef || item.screenshot || item.audioBlob);
VisualSection.openByDefault = true;
export default VisualSection;
