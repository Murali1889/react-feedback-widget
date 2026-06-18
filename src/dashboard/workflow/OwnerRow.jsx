import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Avatar } from '../../ui/primitives/Avatar.jsx';
import { Chip } from '../../ui/primitives/Chip.jsx';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Wrap = styled.div`display: flex; align-items: center; gap: 8px; min-height: 28px;`;
const Name = styled.span`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.text')};`;
const Unassigned = styled.span`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.textFaint')};`;

const Input = styled.input`
  font-family: inherit;
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.text')};
  background: ${pickToken('color.surfaceMuted')};
  border: 1px solid ${pickToken('color.borderStrong')};
  border-radius: 6px;
  padding: 4px 8px;
  outline: none;
  min-width: 140px;
  &:focus { border-color: ${pickToken('color.accent')}; }
`;

/**
 * Inline-editable owner field. Click "Unassigned" → input field; Enter
 * commits, Esc cancels. Replaces window.prompt with something the
 * theme can style and screen readers can describe.
 */
export function OwnerRow({ item, isDeveloper, onChange, suggestions = [] }) {
  if (!isDeveloper) return null;
  const owner = item.owner;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const name = draft.trim();
    if (name && onChange) onChange(item.id, { name });
    setEditing(false);
    setDraft('');
  };
  const cancel = () => { setEditing(false); setDraft(''); };

  if (editing) {
    return (
      <Wrap>
        <Input
          ref={inputRef}
          list={suggestions.length ? 'rvf-owner-suggest' : undefined}
          value={draft}
          placeholder="Type a name…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  commit();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={commit}
          aria-label="Owner name"
        />
        {suggestions.length > 0 && (
          <datalist id="rvf-owner-suggest">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
      </Wrap>
    );
  }

  if (!owner) {
    return (
      <Wrap>
        {onChange
          ? <Chip onClick={() => setEditing(true)} aria-label="Assign owner">Unassigned</Chip>
          : <Unassigned>Unassigned</Unassigned>}
      </Wrap>
    );
  }
  return (
    <Wrap>
      <Avatar name={owner.name} size="sm" />
      <Name>{owner.name}</Name>
      {onChange && (
        <Chip onClick={() => onChange(item.id, null)} size="sm" aria-label="Clear owner">Clear</Chip>
      )}
    </Wrap>
  );
}
export default OwnerRow;
