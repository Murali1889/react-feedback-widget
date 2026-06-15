import styled, { keyframes, css } from 'styled-components';

export const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
export const slideInRight = keyframes`from { transform: translateX(100%); } to { transform: translateX(0); }`;
export const slideUpFade = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;
export const popIn = keyframes`from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); }`;

export const FieldLabel = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${p => p.theme.colors.textSecondary};
  margin-bottom: 8px;
  opacity: 0.85;
`;

export const FieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 90px;
  padding: 12px 14px;
  border: 2px solid ${p => p.theme.colors.border};
  border-radius: 10px;
  background-color: ${p => p.theme.colors.inputBg};
  color: ${p => p.theme.colors.textPrimary};
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, background-color 0.2s;

  &::placeholder { color: ${p => p.theme.colors.textTertiary}; }
  &:focus { border-color: ${p => p.theme.mode === 'dark' ? '#3b82f6' : '#93c5fd'}; background-color: ${p => p.theme.colors.cardBg}; }
  &:hover:not(:focus) { border-color: ${p => p.theme.colors.textTertiary}; }
`;

export const PillRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const Pill = styled.button`
  position: relative;
  border: 1px solid ${p => p.$active
    ? (p.theme.mode === 'dark' ? '#60a5fa' : '#3b82f6')
    : p.theme.colors.border};
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1),
              background-color 0.18s, border-color 0.18s, color 0.18s, box-shadow 0.18s;
  background: ${p => p.$active
    ? (p.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff')
    : 'transparent'};
  color: ${p => p.$active
    ? (p.theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8')
    : p.theme.colors.textSecondary};
  box-shadow: ${p => p.$active
    ? `0 0 0 3px ${p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.18)' : 'rgba(59, 130, 246, 0.12)'}`
    : 'none'};

  &:hover {
    background: ${p => p.$active
      ? (p.theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.24)' : '#dbeafe')
      : p.theme.colors.hoverBg};
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${p => p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.3)'};
  }
`;

export const SubmitButton = styled.button`
  background: ${p => p.theme.mode === 'dark' ? '#3b82f6' : '#2563eb'};
  color: white;
  border: none;
  padding: 10px 22px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.18s, box-shadow 0.18s;
  box-shadow: 0 4px 14px -4px rgba(37, 99, 235, 0.45);
  &:hover:not(:disabled) {
    background: ${p => p.theme.mode === 'dark' ? '#2563eb' : '#1d4ed8'};
    transform: translateY(-1px);
    box-shadow: 0 8px 20px -6px rgba(37, 99, 235, 0.55);
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
`;

export const SecondaryButton = styled.button`
  background: transparent;
  color: ${p => p.theme.colors.textSecondary};
  border: 1px solid ${p => p.theme.colors.border};
  padding: 9px 18px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.18s ease;
  &:hover {
    background: ${p => p.theme.colors.hoverBg};
    color: ${p => p.theme.colors.textPrimary};
  }
`;

export const CloseX = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  color: ${p => p.theme.colors.textSecondary};
  transition: background 0.2s, color 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover { background: ${p => p.theme.colors.hoverBg}; color: ${p => p.theme.colors.textPrimary}; }
`;

export const MediaThumb = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.theme.colors.border};
  cursor: zoom-in;
  transition: border-color 0.18s, box-shadow 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;

  ${p => p.$size === 'large' && css`max-height: 320px;`}
  ${p => p.$size === 'medium' && css`max-height: 200px;`}
  ${p => p.$size === 'small' && css`max-height: 80px;`}

  &:hover { border-color: ${p => p.theme.mode === 'dark' ? '#475569' : '#cbd5e1'}; box-shadow: 0 6px 20px -8px rgba(15,23,42,0.18); }

  img, video {
    display: block;
    width: 100%;
    max-height: inherit;
    object-fit: contain;
  }
`;

export const ZoomedBackdrop = styled.div`
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 100001;
  cursor: zoom-out;
  animation: ${fadeIn} 0.18s ease-out;
  img { max-width: 92vw; max-height: 92vh; border-radius: 8px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
`;
