'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Temporarily disable Service Worker to fix refresh loop
    console.log('🚫 Service Worker temporarily disabled - investigating refresh loop');
    // Service worker registration code disabled
  }, []); 

  // Service worker disabled - no update handling needed
  return null;
}