'use client';

import React from 'react';
import { useLightning } from '@/contexts/LightningContext';
import { toast } from '@/components/Toast';
import { isLightningEnabled as isLightningFeatureEnabled } from '@/lib/feature-flags';

export default function LightningToggle() {
  // Call hooks first (before any conditional returns)
  const { isLightningEnabled, toggleLightning } = useLightning();
  const featureEnabled = isLightningFeatureEnabled();

  // Only show toggle if Lightning feature is enabled via environment variable
  if (!featureEnabled) {
    return null;
  }

  const handleToggle = () => {
    toggleLightning();
    if (!isLightningEnabled) {
      toast.success('⚡ Lightning features enabled! You can now send boosts to artists.');
    } else {
      toast.info('Lightning features disabled');
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border-t border-white/20 bg-transparent">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
        </svg>
        <span className="text-sm font-medium text-gray-200 drop-shadow-sm">Lightning</span>
      </div>
      
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
          isLightningEnabled ? 'bg-yellow-500' : 'bg-gray-300'
        }`}
        aria-pressed={isLightningEnabled}
        aria-label="Toggle Lightning features"
        type="button"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
            isLightningEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
          style={{
            transform: isLightningEnabled ? 'translateX(1.5rem)' : 'translateX(0.25rem)',
          }}
        />
      </button>
    </div>
  );
}