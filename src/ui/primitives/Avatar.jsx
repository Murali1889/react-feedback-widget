import React, { useState, Children } from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { TONES, toneFor } from './avatar-colors.js';

const SIZES = { xs: 20, sm: 28, md: 32, lg: 40 };

const Box = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${SIZES[$size]}px`};
  height: ${({ $size }) => `${SIZES[$size]}px`};
  border-radius: 50%;
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size }) => `${Math.round(SIZES[$size] * 0.42)}px`};
  font-weight: ${pickToken('font.weight.semibold')};
  overflow: hidden;
  position: relative;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  vertical-align: middle;
`;

const Img = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

function getInitials(name) {
  if (!name) return '?';
  const trimmed = String(name).trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = React.forwardRef(function Avatar(
  { name, src, size = 'md', tone, ...rest },
  ref
) {
  const [failed, setFailed] = useState(false);
  const idx = toneFor(name || '');
  const palette = tone === 'neutral'
    ? { bg: 'var(--c-canvas, #f7f7f3)', fg: 'var(--c-text-muted, #57534e)' }
    : TONES[idx];
  const showImg = src && !failed;
  return (
    <Box ref={ref} $size={size} $bg={palette.bg} $fg={palette.fg} data-tone={`t${idx}`} {...rest}>
      {showImg ? (
        <Img src={src} alt={name} role="img" onError={() => setFailed(true)} />
      ) : (
        getInitials(name)
      )}
    </Box>
  );
});
Avatar.displayName = 'Avatar';

const Stack = styled.span`
  display: inline-flex;
  align-items: center;
  & > * + * {
    margin-left: -8px;
    box-shadow: 0 0 0 2px ${pickToken('color.bg')};
    border-radius: 50%;
  }
`;

const MoreTile = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${SIZES[$size]}px`};
  height: ${({ $size }) => `${SIZES[$size]}px`};
  border-radius: 50%;
  background: ${pickToken('color.canvas')};
  color: ${pickToken('color.textMuted')};
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size }) => `${Math.round(SIZES[$size] * 0.36)}px`};
  font-weight: ${pickToken('font.weight.semibold')};
`;

export function AvatarStack({ max = 5, size = 'md', children }) {
  const arr = Children.toArray(children).filter(Boolean);
  const visible = arr.length > max ? arr.slice(0, max - 1) : arr;
  const overflow = arr.length - visible.length;
  return (
    <Stack>
      {visible.map((c, i) => React.cloneElement(c, { key: i, size }))}
      {overflow > 0 && <MoreTile $size={size}>+{overflow}</MoreTile>}
    </Stack>
  );
}

AvatarStack.displayName = 'AvatarStack';
export default Avatar;
