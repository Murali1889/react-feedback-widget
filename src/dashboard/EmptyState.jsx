import React from 'react';
import styled from 'styled-components';
import { Button } from '../ui/primitives/Button.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';

const Wrap = styled.div`
  display: flex; align-items: center; justify-content: center;
  text-align: center; padding: 40px 24px;
  color: ${pickToken('color.textMuted')};
  font-family: ${pickToken('font.sans')};
`;
const Headline = styled.div`
  font-size: ${pickToken('font.size.md')};
  color: ${pickToken('color.text')};
  font-weight: 500;
  margin-bottom: 6px;
`;
const Sub = styled.div`
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.textMuted')};
  margin-bottom: 16px;
`;

export function EmptyState({ variant = 'no-data', onClearFilters }) {
  if (variant === 'filtered-empty') {
    return (
      <Wrap>
        <Stack direction="column" align="center" gap="3">
          <Headline>No feedback matches these filters.</Headline>
          <Sub>Try clearing one or more filters to see more results.</Sub>
          {onClearFilters && <Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>}
        </Stack>
      </Wrap>
    );
  }
  return (
    <Wrap>
      <Stack direction="column" align="center" gap="3">
        <Headline>No feedback yet.</Headline>
        <Sub>Press <kbd>Alt+Q</kbd> to collect feedback from the current page.</Sub>
      </Stack>
    </Wrap>
  );
}
export default EmptyState;
