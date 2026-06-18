import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Chip } from '../../ui/primitives/Chip.jsx';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Input = styled.input`
  font-family: inherit;
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.text')};
  background: ${pickToken('color.surfaceMuted')};
  border: 1px solid ${pickToken('color.borderStrong')};
  border-radius: 6px;
  padding: 4px 8px;
  outline: none;
  min-width: 100px;
  max-width: 160px;
  &:focus { border-color: ${pickToken('color.accent')}; }
`;

/**
 * Inline-editable customer-value field. Click chip → inline input;
 * Enter commits, Esc cancels. Replaces window.prompt.
 */
export function CustomerRow({ item, isDeveloper, onChange }) {
  if (!isDeveloper) return null;
  const v = item.customerValue;
  const display = v === undefined || v === null || v === '' ? '—' : String(v);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setDraft(display === '—' ? '' : display);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, display]);

  if (!editing) {
    return (
      <Chip
        variant="accent"
        onClick={onChange ? () => setEditing(true) : undefined}
        aria-label="Customer value"
      >
        {display}
      </Chip>
    );
  }

  const commit = () => {
    if (onChange) onChange(item.id, draft.trim());
    setEditing(false);
  };
  const cancel = () => { setEditing(false); setDraft(''); };

  return (
    <Input
      ref={inputRef}
      value={draft}
      placeholder="Customer value"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter')  commit();
        if (e.key === 'Escape') cancel();
      }}
      onBlur={commit}
      aria-label="Customer value"
    />
  );
}
export default CustomerRow;
