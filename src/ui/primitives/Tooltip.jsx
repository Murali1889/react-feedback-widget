import React, { cloneElement, useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { usePopover } from './usePopover.js';

const Bubble = styled.div`
  position: fixed;
  z-index: 9999;
  background: ${pickToken('color.text')};
  color: ${pickToken('color.bg')};
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.xs')};
  padding: 6px 10px;
  border-radius: ${pickToken('radius.sm')};
  pointer-events: none;
  box-shadow: ${pickToken('shadow.2')};
  white-space: nowrap;
`;

export function Tooltip({ content, placement = 'top', delay = 300, children }) {
  const tooltipId = useId();
  const { triggerRef, floatingRef, open, setOpen, coords } = usePopover({ placement });
  const timerRef = useRef(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), reduced ? 0 : delay);
  }, [delay, setOpen, reduced]);
  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setOpen(false);
  }, [setOpen]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const child = React.Children.only(children);
  const ref = (node) => {
    triggerRef.current = node;
    const r = child.ref;
    if (typeof r === 'function') r(node);
    else if (r && typeof r === 'object') r.current = node;
  };
  const cloned = cloneElement(child, {
    ref,
    onMouseEnter: (e) => { show(); child.props.onMouseEnter?.(e); },
    onMouseLeave: (e) => { hide(); child.props.onMouseLeave?.(e); },
    onFocus: (e) => { show(); child.props.onFocus?.(e); },
    onBlur: (e) => { hide(); child.props.onBlur?.(e); },
    onKeyDown: (e) => {
      if (e.key === 'Escape') hide();
      child.props.onKeyDown?.(e);
    },
    'aria-describedby': open ? tooltipId : child.props['aria-describedby'],
  });

  return (
    <>
      {cloned}
      {open && typeof document !== 'undefined' && createPortal(
        <Bubble ref={floatingRef} role="tooltip" id={tooltipId} style={{ top: coords.top, left: coords.left }}>
          {content}
        </Bubble>,
        document.body,
      )}
    </>
  );
}

Tooltip.displayName = 'Tooltip';
export default Tooltip;
