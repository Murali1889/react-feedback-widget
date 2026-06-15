import React from 'react';
import styled from 'styled-components';
import { Avatar } from '../../ui/primitives/Avatar.jsx';
import { Chip } from '../../ui/primitives/Chip.jsx';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Wrap = styled.div`display: flex; align-items: center; gap: 8px;`;
const Name = styled.span`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.text')};`;
const Unassigned = styled.span`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.textFaint')};`;

export function OwnerRow({ item, isDeveloper, onChange }) {
  if (!isDeveloper) return null;
  const owner = item.owner;
  if (!owner) {
    return (
      <Wrap>
        {onChange
          ? <Chip onClick={() => { const name = window.prompt('Owner name?'); if (name) onChange(item.id, { name }); }}>Unassigned</Chip>
          : <Unassigned>Unassigned</Unassigned>}
      </Wrap>
    );
  }
  return (
    <Wrap>
      <Avatar name={owner.name} size="sm" />
      <Name>{owner.name}</Name>
      {onChange && (
        <Chip onClick={() => onChange(item.id, null)} size="sm">Clear</Chip>
      )}
    </Wrap>
  );
}
export default OwnerRow;
