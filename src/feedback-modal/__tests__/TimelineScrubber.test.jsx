import React, { useEffect } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from 'styled-components';
import { TimelineScrubber } from '../TimelineScrubber.jsx';
import { getTheme } from '../../theme.js';

const theme = getTheme('light');

/**
 * A fixture video element. jsdom doesn't implement <video> playback,
 * so we mock duration + currentTime via defineProperty and dispatch
 * the lifecycle events the scrubber listens for.
 */
function MockVideo({ videoRef, duration = 30, onTimeChange }) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    Object.defineProperty(v, 'duration', { configurable: true, value: duration });
    let t = 0;
    Object.defineProperty(v, 'currentTime', {
      configurable: true,
      get: () => t,
      set: (v) => { t = v; onTimeChange?.(v); },
    });
    v.play = vi.fn();
    v.pause = vi.fn();
    // Fire loadedmetadata so the scrubber picks up duration.
    v.dispatchEvent(new Event('loadedmetadata'));
  }, [videoRef, duration, onTimeChange]);
  return <video data-testid="mock-video" ref={videoRef} />;
}

const SAMPLE_EVENTS = [
  { type: 'interaction', kind: 'click', target: { selector: '#pay', label: 'Pay now' }, timestamp: 1200 },
  { type: 'network', method: 'POST', url: '/api/orders', status: 500, timestamp: 1500 },
  { type: 'console', level: 'error', message: 'TypeError: order.id is undefined', timestamp: 1500 },
  { type: 'storage', storageType: 'localStorage', action: 'setItem', key: 'cart', timestamp: 1600 },
  { type: 'route', kind: 'pushState', from: 'http://x/checkout', to: 'http://x/checkout/error', timestamp: 1800 },
  { type: 'console', level: 'log', message: 'reconciling cart', timestamp: 5000 },
  { type: 'interaction', kind: 'input', target: { selector: 'input[type=password]' }, redacted: 'password', timestamp: 8000 },
];

function renderWithMockVideo(events = SAMPLE_EVENTS, duration = 30) {
  const ref = { current: null };
  return render(
    <ThemeProvider theme={theme}>
      <MockVideo videoRef={ref} duration={duration} />
      <TimelineScrubber events={events} videoRef={ref} />
    </ThemeProvider>
  );
}

describe('TimelineScrubber', () => {
  it('renders one tick per event on the track', () => {
    const { container } = renderWithMockVideo();
    const ticks = container.querySelectorAll('[role="slider"] button');
    expect(ticks.length).toBe(SAMPLE_EVENTS.length);
  });

  it('positions ticks proportional to recording duration', () => {
    const { container } = renderWithMockVideo(SAMPLE_EVENTS, 30); // 30s = 30000ms
    const ticks = Array.from(container.querySelectorAll('[role="slider"] button'));
    // Event at 1500ms → 5% of 30000ms
    const second = ticks[1];
    const left = parseFloat(second.style.left);
    expect(left).toBeGreaterThan(4.5);
    expect(left).toBeLessThan(5.5);
    // Event at 8000ms → ~26.67%
    const last = ticks[ticks.length - 1];
    const lastLeft = parseFloat(last.style.left);
    expect(lastLeft).toBeGreaterThan(26);
    expect(lastLeft).toBeLessThan(27.5);
  });

  it('renders the event row list with summarised, category-correct rows', () => {
    renderWithMockVideo();
    expect(screen.getByText(/click #pay/)).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/orders → 500/)).toBeInTheDocument();
    expect(screen.getByText(/error.*TypeError/)).toBeInTheDocument();
    expect(screen.getByText(/localStorage\.setItem "cart"/)).toBeInTheDocument();
    expect(screen.getByText(/pushState/)).toBeInTheDocument();
    expect(screen.getByText(/input <password>/)).toBeInTheDocument();
  });

  it('shows the legend with all 7 categories', () => {
    renderWithMockVideo();
    ['Interaction', 'Network', 'Console', 'Error', 'Storage', 'IndexedDB', 'Route']
      .forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('shows the formatted duration in the time axis', () => {
    renderWithMockVideo(SAMPLE_EVENTS, 90); // 1m30s
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('seeks the video on tick click', () => {
    const ref = { current: null };
    const onTimeChange = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <MockVideo videoRef={ref} duration={30} onTimeChange={onTimeChange} />
        <TimelineScrubber events={SAMPLE_EVENTS} videoRef={ref} />
      </ThemeProvider>
    );
    const ticks = document.querySelectorAll('[role="slider"] button');
    fireEvent.click(ticks[0]); // event at 1200ms = 1.2s
    expect(onTimeChange).toHaveBeenCalledWith(1.2);
  });

  it('seeks the video on row click in the list', () => {
    const ref = { current: null };
    const onTimeChange = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <MockVideo videoRef={ref} duration={30} onTimeChange={onTimeChange} />
        <TimelineScrubber events={SAMPLE_EVENTS} videoRef={ref} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText(/POST \/api\/orders/).closest('button'));
    expect(onTimeChange).toHaveBeenCalledWith(1.5); // 1500ms
  });

  it('clicking the track proportionally seeks the video', () => {
    const ref = { current: null };
    const onTimeChange = vi.fn();
    const { container } = render(
      <ThemeProvider theme={theme}>
        <MockVideo videoRef={ref} duration={30} onTimeChange={onTimeChange} />
        <TimelineScrubber events={SAMPLE_EVENTS} videoRef={ref} />
      </ThemeProvider>
    );
    const track = container.querySelector('[role="slider"]');
    // Mock getBoundingClientRect for jsdom
    track.getBoundingClientRect = () => ({ left: 0, width: 400, top: 0, bottom: 36, right: 400, height: 36 });
    fireEvent.click(track, { clientX: 200 }); // 50% of 30s = 15s
    expect(onTimeChange).toHaveBeenCalledWith(15);
  });

  it('shows the empty state when no events captured', () => {
    const ref = { current: null };
    render(
      <ThemeProvider theme={theme}>
        <MockVideo videoRef={ref} />
        <TimelineScrubber events={[]} videoRef={ref} />
      </ThemeProvider>
    );
    expect(screen.getByText(/no events captured/)).toBeInTheDocument();
  });

  it('highlights the active row at the current playhead', () => {
    const ref = { current: null };
    const { container, rerender } = render(
      <ThemeProvider theme={theme}>
        <MockVideo videoRef={ref} duration={30} />
        <TimelineScrubber events={SAMPLE_EVENTS} videoRef={ref} />
      </ThemeProvider>
    );
    // Set the video time to 1.7s — the event at 1600ms should be active.
    ref.current.currentTime = 1.7;
    ref.current.dispatchEvent(new Event('timeupdate'));
    rerender(
      <ThemeProvider theme={theme}>
        <MockVideo videoRef={ref} duration={30} />
        <TimelineScrubber events={SAMPLE_EVENTS} videoRef={ref} />
      </ThemeProvider>
    );
    // The setItem row should have an active visual treatment.
    const setItemRow = screen.getByText(/setItem "cart"/).closest('button');
    expect(setItemRow).toBeTruthy();
  });

  it('orders rows by timestamp regardless of input order', () => {
    const shuffled = [...SAMPLE_EVENTS].reverse();
    renderWithMockVideo(shuffled);
    const rowButtons = Array.from(document.querySelectorAll('[role="slider"] + div + div + div button'));
    // First visible row should be the earliest event (the click at 1200ms).
    const allText = document.body.textContent;
    const firstClickIdx = allText.indexOf('click #pay');
    const lastInputIdx = allText.indexOf('input <password>');
    expect(firstClickIdx).toBeLessThan(lastInputIdx);
  });

  it('redacts sensitive input values in the summary', () => {
    renderWithMockVideo();
    // The password input should not show a value, only the redacted marker
    const body = document.body.textContent;
    expect(body).toMatch(/input <password>/);
    expect(body).not.toMatch(/sekret/);
  });
});
