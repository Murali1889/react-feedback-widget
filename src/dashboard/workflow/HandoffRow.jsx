import React, { useState } from 'react';
import styled from 'styled-components';
import { Select } from '../../ui/primitives/Select.jsx';
import { pickToken } from '../../ui/ThemeContext.jsx';
import { createFeedbackHandoffText } from '../../lib/feedbackEvidence.js';

const FORMATS = [
  { value: 'short', label: 'Short' },
  { value: 'full', label: 'Full' },
  { value: 'jira', label: 'Jira-ready' },
  { value: 'slack', label: 'Slack-ready' },
];

// Plain span styled like the Button — avoids nested-interactive a11y
// violation (Select's renderTrigger wrapper already provides the
// role="button" + tabIndex + click handler).
const ButtonLike = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  height: 32px;
  padding: 0 14px;
  border: 1px solid ${pickToken('color.borderStrong')};
  border-radius: ${pickToken('radius.md')};
  background: ${pickToken('color.surface')};
  color: ${pickToken('color.text')};
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.sm')};
  font-weight: 500;
  cursor: pointer;
  user-select: none;
`;

export function HandoffRow({ item }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async (format) => {
    const text = createFeedbackHandoffText(item, { format });
    try {
      await navigator.clipboard?.writeText?.(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <Select
      options={FORMATS}
      onChange={doCopy}
      placeholder="Copy as…"
      renderTrigger={() => (
        <ButtonLike>{copied ? 'Copied' : 'Copy as…'}</ButtonLike>
      )}
    />
  );
}
export default HandoffRow;
