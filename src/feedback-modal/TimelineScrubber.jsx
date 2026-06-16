import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  MousePointerClick, Globe, Terminal, Database, Compass, HardDrive, AlertTriangle, Pause, Play,
} from 'lucide-react';

/* ---------- color + label per event category ---------- */

const CATEGORIES = {
  interaction: { color: '#3b82f6', label: 'Interaction', Icon: MousePointerClick },
  network:     { color: '#a855f7', label: 'Network',     Icon: Globe },
  console:     { color: '#94a3b8', label: 'Console',     Icon: Terminal },
  error:       { color: '#ef4444', label: 'Error',       Icon: AlertTriangle },
  storage:     { color: '#10b981', label: 'Storage',     Icon: HardDrive },
  indexedDB:   { color: '#14b8a6', label: 'IndexedDB',   Icon: Database },
  route:       { color: '#6366f1', label: 'Route',       Icon: Compass },
};

function categoryOf(e) {
  if (!e || typeof e !== 'object') return 'console';
  if (e.type === 'interaction') return 'interaction';
  if (e.type === 'route') return 'route';
  if (e.type === 'network') return 'network';
  if (e.type === 'storage') return 'storage';
  if (e.type === 'indexedDB') return 'indexedDB';
  if (e.type === 'console') return e.level === 'error' ? 'error' : 'console';
  return 'console';
}

function summarize(e) {
  switch (e.type) {
    case 'interaction': {
      const t = e.target || {};
      const label = t.label ? ` "${t.label.slice(0, 30)}${t.label.length > 30 ? '…' : ''}"` : '';
      const sel = t.selector ? ` ${t.selector}` : '';
      if (e.kind === 'input') {
        return e.redacted ? `input <${e.redacted}>${sel}` : `input "${(e.value || '').slice(0, 20)}"${sel}`;
      }
      if (e.kind === 'keydown') return `key ${e.key}${sel}`;
      return `${e.kind}${sel}${label}`;
    }
    case 'route':
      return `${e.kind} → ${(e.to || '').replace(/^https?:\/\/[^/]+/, '')}`;
    case 'network': {
      const status = e.status != null ? ` → ${e.status}` : (e.source === 'fetch' ? '' : '');
      return `${(e.method || 'GET').toUpperCase()} ${e.url}${status}`;
    }
    case 'console':
      return `${e.level} ${(e.message || '').slice(0, 80)}${(e.message || '').length > 80 ? '…' : ''}`;
    case 'storage':
      return `${e.storageType}.${e.action}${e.key ? ` "${e.key}"` : ''}`;
    case 'indexedDB':
      return `idb ${e.action || ''} ${e.database || ''}${e.store ? '/' + e.store : ''}`;
    default:
      return e.type || 'event';
  }
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatMsExact(ms) {
  const seconds = ms / 1000;
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  const ds = Math.floor((seconds - whole) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${ds}`;
}

/* ---------- styled ---------- */

const Wrap = styled.div`
  display: flex; flex-direction: column;
  gap: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;

const Heading = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: ${p => p.theme.colors.textTertiary};

  .count {
    margin-left: auto;
    letter-spacing: 0.01em;
    text-transform: none;
    font-weight: 500;
    color: ${p => p.theme.colors.textTertiary};
  }
`;

const TrackOuter = styled.div`
  position: relative;
  background: ${p => p.theme.mode === 'dark' ? '#0f172a' : '#f1f5f9'};
  border-radius: 8px;
  height: 36px;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  box-shadow:
    inset 0 1px 2px rgba(15, 23, 42, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.5);
`;

const TrackProgress = styled.div`
  position: absolute;
  top: 0; bottom: 0; left: 0;
  background: linear-gradient(90deg,
    rgba(99, 102, 241, 0.12),
    rgba(59, 130, 246, 0.14));
  border-right: 2px solid ${p => p.theme.mode === 'dark' ? '#60a5fa' : '#3b82f6'};
  pointer-events: none;
  transition: width 0.05s linear;
`;

const Tick = styled.button`
  position: absolute;
  top: 50%;
  width: 8px;
  height: 18px;
  margin-left: -4px;
  margin-top: -9px;
  border: 2px solid ${p => p.theme.mode === 'dark' ? '#0f172a' : '#ffffff'};
  border-radius: 3px;
  background: ${p => p.$color};
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s ease, height 0.12s ease, box-shadow 0.18s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  z-index: 1;

  &:hover {
    transform: scaleY(1.25);
    height: 22px;
    margin-top: -11px;
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.3);
    z-index: 2;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
  }
`;

const TimeAxis = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10px;
  color: ${p => p.theme.colors.textTertiary};
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 10px;
  color: ${p => p.theme.colors.textTertiary};

  .item { display: inline-flex; align-items: center; gap: 4px; }
  .dot {
    width: 8px; height: 8px;
    border-radius: 2px;
  }
`;

const RowList = styled.div`
  display: flex; flex-direction: column;
  max-height: 220px;
  overflow-y: auto;
  border-radius: 10px;
  border: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.cardBg};

  /* Slim scrollbar */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: ${p => p.theme.mode === 'dark' ? '#334155' : '#cbd5e1'};
    border-radius: 3px;
  }
`;

const Row = styled.button`
  display: grid;
  grid-template-columns: 44px 16px 1fr;
  align-items: start;
  gap: 8px;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${p => p.theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'};
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  color: ${p => p.theme.colors.textPrimary};
  transition: background 0.14s;

  &:last-child { border-bottom: none; }
  &:hover { background: ${p => p.theme.colors.hoverBg}; }
  ${p => p.$active && css`
    background: ${p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.1)' : '#eff6ff'};
  `}

  .ts {
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 10px;
    color: ${p => p.theme.colors.textTertiary};
  }
  .icon {
    display: inline-flex; align-items: center; justify-content: center;
    margin-top: 1px;
  }
  .body {
    word-break: break-word;
    line-height: 1.4;
  }
`;

const Empty = styled.div`
  padding: 16px;
  text-align: center;
  color: ${p => p.theme.colors.textTertiary};
  font-size: 12px;
`;

/* ---------- component ---------- */

export const TimelineScrubber = ({ events = [], videoRef }) => {
  const trackRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);

  // Subscribe to the video's metadata + time updates.
  useEffect(() => {
    const v = videoRef?.current;
    if (!v) return;
    const onMeta = () => {
      const d = Number.isFinite(v.duration) ? v.duration * 1000 : 0;
      setDuration(d);
    };
    const onTime = () => setCurrentMs(v.currentTime * 1000);
    const onSeek = () => setCurrentMs(v.currentTime * 1000);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeked', onSeek);
    onMeta();
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('seeked', onSeek);
    };
  }, [videoRef]);

  // Sort events by timestamp; bound to recording length if known.
  const sortedEvents = useMemo(() => {
    return (events || [])
      .filter((e) => Number.isFinite(e?.timestamp))
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events]);

  const lastTimestamp = sortedEvents.length ? sortedEvents[sortedEvents.length - 1].timestamp : 0;
  // Use video duration if known, else fall back to the last event timestamp + a buffer.
  const effectiveDuration = duration > 0 ? duration : Math.max(lastTimestamp + 1000, 5000);

  const activeIndex = useMemo(() => {
    // Highlight the most recent event at or before currentMs.
    let idx = -1;
    for (let i = 0; i < sortedEvents.length; i += 1) {
      if (sortedEvents[i].timestamp <= currentMs) idx = i;
      else break;
    }
    return idx;
  }, [sortedEvents, currentMs]);

  const seekTo = (ms) => {
    const v = videoRef?.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(effectiveDuration / 1000, ms / 1000));
    setCurrentMs(ms);
    try { v.play?.(); } catch { /* user gesture may be required */ }
  };

  const handleTrackClick = (e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(pct * effectiveDuration);
  };

  if (!sortedEvents.length) {
    return (
      <Wrap>
        <Heading>📼 Recorded timeline <span className="count">no events captured</span></Heading>
        <Empty>
          The recording finished without any captured events.
          Clicks, network calls, console output, storage writes, and route changes
          show up here when present.
        </Empty>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Heading>
        📼 Recorded timeline
        <span className="count">{sortedEvents.length} event{sortedEvents.length === 1 ? '' : 's'}</span>
      </Heading>

      <TrackOuter ref={trackRef} onClick={handleTrackClick} role="slider"
        aria-valuemin={0} aria-valuemax={effectiveDuration} aria-valuenow={currentMs}
        aria-label="Recording timeline scrubber">
        <TrackProgress style={{ width: `${(currentMs / effectiveDuration) * 100}%` }} />
        {sortedEvents.map((e, i) => {
          const cat = categoryOf(e);
          const pct = Math.min(100, Math.max(0, (e.timestamp / effectiveDuration) * 100));
          return (
            <Tick key={i}
              $color={CATEGORIES[cat].color}
              style={{ left: `${pct}%` }}
              title={`${formatMsExact(e.timestamp)} — ${summarize(e)}`}
              onClick={(ev) => { ev.stopPropagation(); seekTo(e.timestamp); }} />
          );
        })}
      </TrackOuter>

      <TimeAxis>
        <span>0:00</span>
        <span>{formatMs(effectiveDuration)}</span>
      </TimeAxis>

      <Legend>
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <span key={key} className="item">
            <span className="dot" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
      </Legend>

      <RowList>
        {sortedEvents.map((e, i) => {
          const cat = categoryOf(e);
          const C = CATEGORIES[cat];
          const Icon = C.Icon;
          return (
            <Row key={i} $active={i === activeIndex} onClick={() => seekTo(e.timestamp)}>
              <span className="ts">{formatMsExact(e.timestamp)}</span>
              <span className="icon" style={{ color: C.color }}>
                <Icon size={12} strokeWidth={2} />
              </span>
              <span className="body">{summarize(e)}</span>
            </Row>
          );
        })}
      </RowList>
    </Wrap>
  );
};

export default TimelineScrubber;
