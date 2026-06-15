import React, { useContext } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CaptureProvider } from '../CaptureProvider.jsx';
import { CaptureContext } from '../CaptureContext.jsx';

function Probe() {
  const ctx = useContext(CaptureContext);
  return <pre>{ctx ? 'ctx' : 'none'}</pre>;
}

describe('CaptureProvider', () => {
  it('provides the context when mounted', () => {
    const { getByText } = render(<CaptureProvider config={{}}><Probe /></CaptureProvider>);
    expect(getByText('ctx')).toBeInTheDocument();
  });

  it('exposes getInteractions / getErrors / getRoutes', () => {
    let captured;
    function Read() {
      captured = useContext(CaptureContext);
      return null;
    }
    render(<CaptureProvider config={{}}><Read /></CaptureProvider>);
    expect(typeof captured.getInteractions).toBe('function');
    expect(typeof captured.getErrors).toBe('function');
    expect(typeof captured.getRoutes).toBe('function');
    expect(typeof captured.snapshotFiber).toBe('function');
  });
});
