import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Quote = styled.div`
  background: ${pickToken('color.canvas')};
  border-left: 3px solid ${pickToken('color.accent')};
  padding: 10px 12px;
  border-radius: 0 6px 6px 0;
  font-size: ${pickToken('font.size.base')};
  line-height: 1.5;
  color: ${pickToken('color.text')};
  white-space: pre-wrap;
`;

export function UserSignalSection({ item }) {
  return <Quote>{item.feedback || ''}</Quote>;
}
UserSignalSection.summary = (item) => {
  const t = item.feedback || '';
  const lines = t.split(/\n/).length;
  return `${t.length} chars${lines > 1 ? ` · ${lines} lines` : ''}`;
};
UserSignalSection.title = 'What the user said';
UserSignalSection.id = 'user-signal';
export default UserSignalSection;
