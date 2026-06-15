import React from 'react';
import styled, { keyframes } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const SIZES = { xs: 12, sm: 16, md: 20, lg: 28 };

const rotate = keyframes`to { transform: rotate(360deg); }`;

const Ring = styled.span`
  display: ${({ $inline }) => ($inline ? 'inline-block' : 'block')};
  width: ${({ $size }) => `${SIZES[$size] || SIZES.sm}px`};
  height: ${({ $size }) => `${SIZES[$size] || SIZES.sm}px`};
  border-radius: 50%;
  border: 2px solid ${pickToken('color.borderStrong')};
  border-top-color: ${pickToken('color.accent')};
  animation: ${rotate} ${pickToken('motion.slow')} linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-top-color: ${pickToken('color.accent')};
  }
`;

export const Spinner = React.forwardRef(function Spinner(
  { size = 'sm', label = 'Loading', inline = false, ...rest },
  ref
) {
  const isHidden = rest['aria-hidden'] === 'true' || rest['aria-hidden'] === true;
  return (
    <Ring
      ref={ref}
      role={isHidden ? undefined : 'status'}
      aria-label={isHidden ? undefined : label}
      $size={size}
      $inline={inline}
      {...rest}
    />
  );
});

Spinner.displayName = 'Spinner';
export default Spinner;
