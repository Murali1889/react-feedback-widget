import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/primitives/Button.jsx';

export function ConfirmButton({ onConfirm, confirmLabel = 'Confirm?', timeoutMs = 3000, children, ...rest }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setArmed(false);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleClick = useCallback((e) => {
    if (armed) {
      reset();
      onConfirm?.(e);
      return;
    }
    setArmed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(reset, timeoutMs);
  }, [armed, onConfirm, timeoutMs, reset]);

  return (
    <Button
      {...rest}
      variant={armed ? 'danger' : (rest.variant || 'secondary')}
      aria-live="polite"
      onClick={handleClick}
      onBlur={reset}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

export default ConfirmButton;
