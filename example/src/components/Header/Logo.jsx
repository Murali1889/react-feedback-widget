import React from 'react';

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
        <span className="text-2xl">🎯</span>
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight">FeedbackHub</h1>
        <p className="text-xs text-white/70">Visual Feedback Tool</p>
      </div>
    </div>
  );
}

Logo.displayName = 'Logo';
