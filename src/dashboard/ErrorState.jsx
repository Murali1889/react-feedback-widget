import React from 'react';
import styled from 'styled-components';
import { Button } from '../ui/primitives/Button.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';

const Wrap = styled.div`
  background: ${pickToken('color.dangerBg')};
  border: 1px solid ${pickToken('color.danger')};
  border-radius: ${pickToken('radius.md')};
  padding: 14px 16px;
  color: ${pickToken('color.danger')};
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.sm')};
  margin: 12px;
`;
const Msg = styled.div`margin-bottom: 8px;`;

export function ErrorState({ message, onRetry }) {
  return (
    <Wrap role="alert">
      <Stack direction="column" gap="3">
        <Msg>{message}</Msg>
        {onRetry && <div><Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button></div>}
      </Stack>
    </Wrap>
  );
}
export default ErrorState;
