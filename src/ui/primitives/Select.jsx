import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { usePopover } from './usePopover.js';

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 32px 0 14px;
  border: 1px solid ${pickToken('color.borderStrong')};
  border-radius: ${pickToken('radius.md')};
  background: ${pickToken('color.surface')};
  color: ${pickToken('color.text')};
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.base')};
  cursor: pointer;
  position: relative;
  width: ${({ $width }) => $width || 'auto'};
  text-align: left;
  &::after {
    content: '▾';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${pickToken('color.textMuted')};
    font-size: 11px;
  }
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Popover = styled.ul`
  position: fixed;
  z-index: 9999;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: ${pickToken('color.surface')};
  border: 1px solid ${pickToken('color.border')};
  border-radius: ${pickToken('radius.md')};
  box-shadow: ${pickToken('shadow.2')};
  min-width: 200px;
  max-height: 320px;
  overflow-y: auto;
  font-family: ${pickToken('font.sans')};
`;

const OptionRow = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: ${pickToken('radius.sm')};
  font-size: ${pickToken('font.size.base')};
  color: ${pickToken('color.text')};
  cursor: pointer;
  &[data-active="true"] { background: ${pickToken('color.canvas')}; }
  &[data-selected="true"] { color: ${pickToken('color.accentText')}; }
  &[data-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
`;

const Check = styled.span`
  width: 14px;
  display: inline-flex;
  justify-content: center;
`;

function isSelected(value, optionValue, multiple) {
  if (multiple) return Array.isArray(value) && value.includes(optionValue);
  return value === optionValue;
}

export const Select = React.forwardRef(function Select(
  {
    options = [],
    value,
    onChange,
    multiple = false,
    placeholder = 'Select',
    disabled = false,
    width,
    align: _align = 'left',
    renderTrigger,
  },
  ref
) {
  const { triggerRef, floatingRef, open, setOpen, coords } = usePopover({ placement: 'bottom' });
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const t = triggerRef.current;
      const f = floatingRef.current;
      if (t && !t.contains(e.target) && f && !f.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open, setOpen, triggerRef, floatingRef]);

  const handleSelect = useCallback((opt) => {
    if (opt.disabled) return;
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const next = arr.includes(opt.value) ? arr.filter((v) => v !== opt.value) : [...arr, opt.value];
      onChange?.(next);
    } else {
      onChange?.(opt.value);
      setOpen(false);
    }
  }, [multiple, value, onChange, setOpen]);

  const handleKeyDown = useCallback((e) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(options.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)); return; }
    if (e.key === 'Enter')     { e.preventDefault(); if (activeIndex >= 0) handleSelect(options[activeIndex]); return; }
  }, [open, options, activeIndex, handleSelect, setOpen]);

  const selectedOpt = multiple ? null : options.find((o) => o.value === value) || null;
  const triggerContent = renderTrigger
    ? renderTrigger(open, multiple ? options.filter((o) => isSelected(value, o.value, true)) : selectedOpt)
    : (selectedOpt ? selectedOpt.label : (multiple && Array.isArray(value) && value.length ? `${value.length} selected` : placeholder));

  return (
    <span ref={rootRef} style={{ display: 'inline-block' }}>
      {renderTrigger ? (
        <span ref={(node) => { triggerRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
              role="button" tabIndex={disabled ? -1 : 0} aria-expanded={open}
              onClick={() => !disabled && setOpen((o) => !o)} onKeyDown={handleKeyDown}>
          {triggerContent}
        </span>
      ) : (
        <Trigger
          type="button"
          ref={(node) => { triggerRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
          $width={width}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
        >
          {triggerContent}
        </Trigger>
      )}
      {open && typeof document !== 'undefined' && createPortal(
        <Popover ref={floatingRef} role="listbox" aria-multiselectable={multiple} style={{ top: coords.top, left: coords.left }}>
          {options.map((opt, i) => {
            const selected = isSelected(value, opt.value, multiple);
            return (
              <OptionRow
                key={opt.value}
                role="option"
                aria-selected={selected}
                data-selected={selected ? 'true' : undefined}
                data-active={i === activeIndex ? 'true' : undefined}
                data-disabled={opt.disabled ? 'true' : undefined}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(opt)}
              >
                {multiple && <Check>{selected ? '✓' : ''}</Check>}
                {opt.icon}
                <span>{opt.label}</span>
                {opt.description && <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{opt.description}</span>}
              </OptionRow>
            );
          })}
        </Popover>,
        document.body,
      )}
    </span>
  );
});

Select.displayName = 'Select';
export default Select;
