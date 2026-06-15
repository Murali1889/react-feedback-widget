import React from 'react';

export class FeedbackErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    try {
      this.props.buffer?.push({
        type: 'error',
        source: 'react',
        message: error?.message || String(error),
        name: error?.name || 'Error',
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
        ts: Date.now(),
      });
    } catch {}
  }
  render() {
    if (this.state.hasError && this.props.fallback !== undefined) return this.props.fallback;
    return this.props.children;
  }
}

export default FeedbackErrorBoundary;
