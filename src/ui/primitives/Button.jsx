import React from 'react';
import styled, { css } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { Spinner } from './Spinner.jsx';

const SIZES = {
  sm: { height: '32px', padding: '0 12px', font: 'sm' },
  md: { height: '40px', padding: '0 18px', font: 'sm' },
  lg: { height: '48px', padding: '0 22px', font: 'base' },
};

const variantStyles = ({ $variant, theme }) => {
  switch ($variant) {
    case 'secondary': return css`
      background: ${pickToken('color.surface')({ theme })};
      color: ${pickToken('color.text')({ theme })};
      border-color: ${pickToken('color.borderStrong')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.canvas')({ theme })}; }
    `;
    case 'ghost': return css`
      background: transparent;
      color: ${pickToken('color.text')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.canvas')({ theme })}; }
    `;
    case 'danger': return css`
      background: ${pickToken('color.surface')({ theme })};
      color: ${pickToken('color.danger')({ theme })};
      border-color: ${pickToken('color.borderStrong')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.dangerBg')({ theme })}; }
    `;
    default: return css`
      background: ${pickToken('color.accent')({ theme })};
      color: #ffffff;
      box-shadow: 0 1px 2px ${pickToken('color.accentRing')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.accentHover')({ theme })}; }
    `;
  }
};

const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: ${({ $size }) => SIZES[$size].height};
  padding: ${({ $size }) => SIZES[$size].padding};
  border: 1px solid transparent;
  border-radius: ${pickToken('radius.md')};
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size, theme }) => pickToken(`font.size.${SIZES[$size].font}`)({ theme })};
  font-weight: ${pickToken('font.weight.medium')};
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, transform 80ms ease;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  ${variantStyles}
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const HiddenLabel = styled.span`
  visibility: hidden;
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;
const SpinnerWrap = styled.span`
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
const Relative = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export const Button = React.forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    fullWidth = false,
    disabled = false,
    type = 'button',
    children,
    ...rest
  },
  ref
) {
  return (
    <StyledButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      {...rest}
    >
      {loading ? (
        <Relative>
          <SpinnerWrap><Spinner size={size === 'sm' ? 'xs' : 'sm'} aria-hidden="true" /></SpinnerWrap>
          <HiddenLabel>
            {leftIcon}<span>{children}</span>{rightIcon}
          </HiddenLabel>
        </Relative>
      ) : (
        <>
          {leftIcon}<span>{children}</span>{rightIcon}
        </>
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';
export default Button;
