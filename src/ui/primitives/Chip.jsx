import React from 'react';
import styled, { css } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const SIZES = { sm: { height: '22px', font: 'xs', pad: '0 8px', dot: '5px' },
                md: { height: '26px', font: 'xs', pad: '0 10px', dot: '6px' } };

const variantStyles = ({ $variant, theme }) => {
  switch ($variant) {
    case 'accent': return css`
      background: ${pickToken('color.accentTint')({ theme })};
      color: ${pickToken('color.accentText')({ theme })};
      border-color: transparent;
    `;
    case 'success': return css`
      background: ${pickToken('color.successBg')({ theme })};
      color: ${pickToken('color.success')({ theme })};
      border-color: transparent;
    `;
    case 'warning': return css`
      background: ${pickToken('color.warningBg')({ theme })};
      color: ${pickToken('color.warning')({ theme })};
      border-color: transparent;
    `;
    case 'danger': return css`
      background: ${pickToken('color.dangerBg')({ theme })};
      color: ${pickToken('color.danger')({ theme })};
      border-color: transparent;
    `;
    default: return css`
      background: ${pickToken('color.canvas')({ theme })};
      color: ${pickToken('color.textMuted')({ theme })};
      border-color: ${pickToken('color.border')({ theme })};
    `;
  }
};

const StyledChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: ${({ $size }) => SIZES[$size].height};
  padding: ${({ $size }) => SIZES[$size].pad};
  border: 1px solid;
  border-radius: ${pickToken('radius.pill')};
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size, theme }) => pickToken(`font.size.${SIZES[$size].font}`)({ theme })};
  font-weight: ${pickToken('font.weight.medium')};
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  ${variantStyles}
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
`;

const Dot = styled.span`
  width: ${({ $size }) => SIZES[$size].dot};
  height: ${({ $size }) => SIZES[$size].dot};
  border-radius: 50%;
  background: currentColor;
`;

const Remove = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin-left: 2px;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  opacity: 0.7;
  cursor: pointer;
  font-size: 14px;
  &:hover { opacity: 1; }
`;

export const Chip = React.forwardRef(function Chip(
  { variant = 'neutral', size = 'md', dot = false, onRemove, onClick, children, ...rest },
  ref
) {
  const clickable = Boolean(onClick);
  return (
    <StyledChip
      ref={ref}
      $variant={variant}
      $size={size}
      $clickable={clickable}
      data-variant={variant}
      data-size={size}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      {...rest}
    >
      {dot && <Dot $size={size} data-role="chip-dot" />}
      <span>{children}</span>
      {onRemove && (
        <Remove
          type="button"
          aria-label={`Remove ${typeof children === 'string' ? children : 'filter'}`}
          onClick={(e) => { e.stopPropagation(); onRemove(e); }}
        >×</Remove>
      )}
    </StyledChip>
  );
});

Chip.displayName = 'Chip';
export default Chip;
