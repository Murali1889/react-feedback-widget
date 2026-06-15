import React, { useState } from 'react';
import { Select } from '../../ui/primitives/Select.jsx';
import { Button } from '../../ui/primitives/Button.jsx';
import { createFeedbackHandoffText } from '../../lib/feedbackEvidence.js';

const FORMATS = [
  { value: 'short', label: 'Short' },
  { value: 'full', label: 'Full' },
  { value: 'jira', label: 'Jira-ready' },
  { value: 'slack', label: 'Slack-ready' },
];

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
        <Button variant="secondary" size="sm">{copied ? 'Copied' : 'Copy as…'}</Button>
      )}
    />
  );
}
export default HandoffRow;
