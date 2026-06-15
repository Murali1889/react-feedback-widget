import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' };
const JUSTIFY = {
  start: 'flex-start', center: 'center', end: 'flex-end',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
};

const StyledStack = styled.div`
  display: flex;
  flex-direction: ${({ $direction }) => $direction};
  ${({ $gap, theme }) => $gap !== undefined ? `gap: ${pickToken(`space.${$gap}`)({ theme })};` : ''}
  ${({ $align }) => $align ? `align-items: ${ALIGN[$align] || $align};` : ''}
  ${({ $justify }) => $justify ? `justify-content: ${JUSTIFY[$justify] || $justify};` : ''}
  ${({ $wrap }) => $wrap ? 'flex-wrap: wrap;' : ''}
`;

export const Stack = React.forwardRef(function Stack(
  { as = 'div', direction = 'column', gap, align, justify, wrap = false, children, ...rest },
  ref
) {
  return (
    <StyledStack
      as={as}
      ref={ref}
      $direction={direction}
      $gap={gap}
      $align={align}
      $justify={justify}
      $wrap={wrap}
      {...rest}
    >
      {children}
    </StyledStack>
  );
});

Stack.displayName = 'Stack';
export default Stack;
