'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isLightningEnabled as isLightningFeatureEnabled } from '@/lib/feature-flags';

interface LightningContextType {
  isLightningEnabled: boolean;
  toggleLightning: () => void;
  setLightningEnabled: (enabled: boolean) => void;
}

const LightningContext = createContext<LightningContextType | undefined>(undefined);

export function LightningProvider({ children }: { children: ReactNode }) {
  const [isLightningEnabled, setIsLightningEnabled] = useState(false);
  const featureEnabled = isLightningFeatureEnabled();

  // Load Lightning setting from localStorage on mount, but only if feature is enabled
  useEffect(() => {
    if (!featureEnabled) {
      // If feature flag is disabled, force Lightning to be disabled
      setIsLightningEnabled(false);
      return;
    }

    const saved = localStorage.getItem('lightning_enabled');
    if (saved !== null) {
      setIsLightningEnabled(saved === 'true');
    }
    // If no saved preference exists, Lightning stays disabled by default
  }, [featureEnabled]);

  // Save to localStorage when setting changes
  useEffect(() => {
    localStorage.setItem('lightning_enabled', isLightningEnabled.toString());
  }, [isLightningEnabled]);

  const toggleLightning = () => {
    // Only allow toggling if feature flag is enabled
    if (!featureEnabled) {
      return;
    }
    setIsLightningEnabled(prev => !prev);
  };

  const setLightningEnabled = (enabled: boolean) => {
    // Only allow enabling if feature flag is enabled
    if (!featureEnabled && enabled) {
      return;
    }
    setIsLightningEnabled(enabled);
  };

  return (
    <LightningContext.Provider value={{
      isLightningEnabled,
      toggleLightning,
      setLightningEnabled
    }}>
      {children}
    </LightningContext.Provider>
  );
}

export function useLightning() {
  const context = useContext(LightningContext);
  if (context === undefined) {
    throw new Error('useLightning must be used within a LightningProvider');
  }
  return context;
}