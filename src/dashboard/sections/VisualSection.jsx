import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Img = styled.img`
  max-width: 100%;
  max-height: 360px;
  border-radius: ${pickToken('radius.md')};
  border: 1px solid ${pickToken('color.border')};
  cursor: zoom-in;
`;
const Player = styled.video`
  width: 100%; max-height: 360px;
  border-radius: ${pickToken('radius.md')};
  border: 1px solid ${pickToken('color.border')};
`;

export function VisualSection({ item }) {
  const hasVideo = !!(item.video || item.videoBlob);
  const hasScreenshot = !!item.screenshot;
  if (!hasVideo && !hasScreenshot) return null;
  return (
    <>
      {hasScreenshot && <Img src={item.screenshot} alt="Screenshot" />}
      {hasVideo && <Player controls src={typeof item.video === 'string' ? item.video : undefined} />}
    </>
  );
}
VisualSection.summary = (item) => {
  if (item.video || item.videoBlob) return '1 video';
  if (item.screenshot) return '1 screenshot';
  return 'none';
};
VisualSection.title = 'Visual';
VisualSection.id = 'visual';
VisualSection.shouldRender = (item) => !!(item.video || item.videoBlob || item.screenshot);
export default VisualSection;
