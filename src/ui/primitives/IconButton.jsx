import React, { useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const SIZES = { sm: 28, md: 32 };

const variantStyles = ({ $variant, theme }) => {
  switch ($variant) {
    case 'subtle': return css`
      background: ${pickToken('color.canvas')({ theme })};
      color: ${pickToken('color.text')({ theme })};
    `;
    case 'accent': return css`
      background: ${pickToken('color.accentTint')({ theme })};
      color: ${pickToken('color.accentText')({ theme })};
    `;
    default: return css`
      background: transparent;
      color: ${pickToken('color.textMuted')({ theme })};
      &:hover:not(:disabled) {
        background: ${pickToken('color.canvas')({ theme })};
        color: ${pickToken('color.text')({ theme })};
      }
    `;
  }
};

const StyledIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${SIZES[$size] || SIZES.md}px`};
  height: ${({ $size }) => `${SIZES[$size] || SIZES.md}px`};
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${pickToken('radius.md')};
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  ${variantStyles}
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
  &[data-active="true"] {
    background: ${pickToken('color.accentTint')};
    color: ${pickToken('color.accentText')};
  }
`;

export const IconButton = React.forwardRef(function IconButton(
  {
    icon,
    variant = 'default',
    size = 'md',
    disabled = false,
    active = false,
    type = 'button',
    ...rest
  },
  ref
) {
  const ariaLabel = rest['aria-label'];
  const warned = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && !ariaLabel && !warned.current) {
      warned.current = true;
      console.error('[react-visual-feedback/ui] <IconButton> requires aria-label or a non-empty `tooltip` prop.');
    }
  }, [ariaLabel]);
  return (
    <StyledIconButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      disabled={disabled}
      data-active={active ? 'true' : undefined}
      {...rest}
    >
      {icon}
    </StyledIconButton>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
