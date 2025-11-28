'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function LazyImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  sizes,
  priority = false,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const imageProps = {
    src,
    alt,
    className: `transition-opacity duration-300 ${
      isLoading ? 'opacity-0' : 'opacity-100'
    } ${className}`,
    onLoad: handleLoad,
    onError: handleError,
    priority,
    sizes,
    ...(fill 
      ? { fill: true } 
      : { width: width || 300, height: height || 300 }
    )
  };

  return (
    <div className="relative">
      {/* Loading skeleton */}
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-600 animate-pulse ${
          fill ? '' : 'w-full h-full'
        }`} />
      )}
      
      {/* Error state */}
      {hasError ? (
        <div 
          className={`flex items-center justify-center bg-gray-800 text-gray-400 ${
            fill ? 'absolute inset-0' : `w-[${width}px] h-[${height}px]`
          } ${className}`}
          aria-label={`Failed to load image: ${alt}`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ) : (
        <Image {...imageProps} alt={alt} />
      )}
    </div>
  );
}