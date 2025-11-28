'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Optimized dynamic import - remove SSR to reduce initial bundle
const AlbumCard = dynamic(() => import('./AlbumCard'), {
  loading: () => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 animate-pulse h-64">
      <div className="aspect-square bg-gray-800/50 rounded-lg mb-3"></div>
      <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
      <div className="h-3 bg-gray-700/50 rounded w-2/3"></div>
    </div>
  ),
  ssr: false // Reduce initial bundle size
});

interface AlbumCardLazyProps {
  album: any;
  onPlay: (album: any, e: any) => void;
}

export default function AlbumCardLazy(props: AlbumCardLazyProps) {
  return (
    <Suspense fallback={
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 animate-pulse">
        <div className="aspect-square bg-gray-800/50 rounded-lg mb-3"></div>
        <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
        <div className="h-3 bg-gray-700/50 rounded w-2/3"></div>
      </div>
    }>
      <AlbumCard {...props} />
    </Suspense>
  );
}