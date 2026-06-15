import React, { useId } from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: ${pickToken('font.sans')};
`;

const LabelRow = styled.label`
  font-size: ${pickToken('font.size.sm')};
  font-weight: ${pickToken('font.weight.medium')};
  color: ${pickToken('color.textMuted')};
`;

const InputBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${({ $invalid, theme }) => $invalid ? pickToken('color.danger')({ theme }) : pickToken('color.borderStrong')({ theme })};
  border-radius: ${pickToken('radius.md')};
  background: ${pickToken('color.surface')};
  padding: 0 12px;
  &:focus-within {
    outline: 3px solid ${({ $invalid, theme }) => $invalid ? pickToken('color.danger')({ theme }) + '44' : pickToken('color.focusRing')({ theme })};
    border-color: ${({ $invalid, theme }) => $invalid ? pickToken('color.danger')({ theme }) : pickToken('color.accent')({ theme })};
  }
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: ${pickToken('color.text')};
  font-family: inherit;
  font-size: ${pickToken('font.size.base')};
  padding: 11px 0;
  &::placeholder { color: ${pickToken('color.textFaint')}; }
`;

const StyledTextarea = styled.textarea`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  resize: vertical;
  min-height: 80px;
  color: ${pickToken('color.text')};
  font-family: inherit;
  font-size: ${pickToken('font.size.base')};
  padding: 11px 0;
  &::placeholder { color: ${pickToken('color.textFaint')}; }
`;

const Hint = styled.div`
  font-size: ${pickToken('font.size.sm')};
  color: ${({ $error, theme }) => $error ? pickToken('color.danger')({ theme }) : pickToken('color.textMuted')({ theme })};
`;

const Required = styled.span`
  color: ${pickToken('color.danger')};
  margin-left: 4px;
`;

export const Field = React.forwardRef(function Field(
  { label, helperText, error, required = false, multiline = false, prefix, suffix, rows = 3, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const errorText = error && typeof error !== 'boolean' ? error : null;
  const invalid = Boolean(error);
  const InputComp = multiline ? StyledTextarea : StyledInput;
  return (
    <Wrap>
      {label && (
        <LabelRow htmlFor={inputId}>
          {label}{required && <Required aria-hidden="true">*</Required>}
        </LabelRow>
      )}
      <InputBox $invalid={invalid}>
        {prefix}
        <InputComp
          id={inputId}
          ref={ref}
          aria-invalid={invalid || undefined}
          aria-describedby={(helperText || errorText) ? hintId : undefined}
          required={required}
          rows={multiline ? rows : undefined}
          {...rest}
        />
        {suffix}
      </InputBox>
      {(errorText || helperText) && (
        <Hint id={hintId} $error={invalid}>{errorText || helperText}</Hint>
      )}
    </Wrap>
  );
});

Field.displayName = 'Field';
export default Field;
