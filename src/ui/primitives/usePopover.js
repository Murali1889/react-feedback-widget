import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal positioning hook: when `open` is true, measures the trigger
 * and computes a coord pair for absolute-positioning the floating
 * panel. Auto-flips placement near viewport edges. No focus
 * management — callers wire their own keyboard / outside-click
 * handling.
 */
export function usePopover({ placement = 'bottom', gap = 8 } = {}) {
  const triggerRef = useRef(null);
  const floatingRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, place: placement });

  const reposition = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect?.();
    const f = floatingRef.current?.getBoundingClientRect?.();
    if (!t) return;
    const fW = f?.width || 200;
    const fH = f?.height || 36;
    const vw = window.innerWidth || 1024;
    const vh = window.innerHeight || 768;
    let place = placement;
    let top = 0;
    let left = 0;
    switch (placement) {
      case 'top':
        top = t.top - fH - gap;
        left = t.left + t.width / 2 - fW / 2;
        if (top < 8) { place = 'bottom'; top = t.bottom + gap; }
        break;
      case 'left':
        top = t.top + t.height / 2 - fH / 2;
        left = t.left - fW - gap;
        if (left < 8) { place = 'right'; left = t.right + gap; }
        break;
      case 'right':
        top = t.top + t.height / 2 - fH / 2;
        left = t.right + gap;
        if (left + fW > vw - 8) { place = 'left'; left = t.left - fW - gap; }
        break;
      default: // bottom
        top = t.bottom + gap;
        left = t.left + t.width / 2 - fW / 2;
        if (top + fH > vh - 8) { place = 'top'; top = t.top - fH - gap; }
    }
    left = Math.max(8, Math.min(left, vw - fW - 8));
    top = Math.max(8, Math.min(top, vh - fH - 8));
    setCoords({ top, left, place });
  }, [placement, gap]);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onResize = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, reposition]);

  return { triggerRef, floatingRef, open, setOpen, coords, reposition };
}
