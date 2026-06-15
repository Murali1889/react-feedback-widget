import React, { useCallback } from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const PAD = { none: '0', sm: '12px', md: '18px', lg: '24px' };
const TONE_BG = {
  default: 'color.surface',
  canvas: 'color.canvas',
  accentTint: 'color.accentTint',
};

const StyledSurface = styled.div`
  background: ${({ $tone, theme }) => pickToken(TONE_BG[$tone] || TONE_BG.default)({ theme })};
  border: 1px solid ${pickToken('color.border')};
  border-radius: ${pickToken('radius.lg')};
  padding: ${({ $padding }) => PAD[$padding] || PAD.md};
  color: ${pickToken('color.text')};
  font-family: ${pickToken('font.sans')};

  &[data-selected="true"] {
    border-color: ${pickToken('color.accent')};
    box-shadow: 0 0 0 1px ${pickToken('color.accent')};
  }

  ${({ $interactive }) => $interactive && `
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
    &:hover { border-color: ${pickToken('color.borderStrong')}; }
    &:focus-visible {
      outline: 3px solid ${pickToken('color.focusRing')};
      outline-offset: 1px;
    }
  `}
`;

export const Surface = React.forwardRef(function Surface(
  { as = 'div', padding = 'md', tone = 'default', interactive = false, selected = false, onClick, role, children, onKeyDown, ...rest },
  ref
) {
  const handleKeyDown = useCallback((e) => {
    if (!interactive) {
      onKeyDown?.(e);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
    onKeyDown?.(e);
  }, [interactive, onClick, onKeyDown]);

  return (
    <StyledSurface
      as={as}
      ref={ref}
      $padding={padding}
      $tone={tone}
      $interactive={interactive}
      data-tone={tone}
      data-selected={selected ? 'true' : undefined}
      role={interactive ? (role || 'button') : role}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
      {...rest}
    >
      {children}
    </StyledSurface>
  );
});

Surface.displayName = 'Surface';
export default Surface;
