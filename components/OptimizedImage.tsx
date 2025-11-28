'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  onError?: () => void;
  onLoad?: () => void;
  fallbackSrc?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  sizes,
  onError,
  onLoad,
  fallbackSrc,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);

  // Simple image optimization - use proxy for external images
  const getOptimizedSrc = (originalSrc: string) => {
    // If it's already optimized or internal, return as-is
    if (originalSrc.includes('/api/') || originalSrc.startsWith('/')) {
      return originalSrc;
    }
    
    // For external images, use proxy for better performance
    return `/api/proxy-image?url=${encodeURIComponent(originalSrc)}`;
  };

  const handleError = () => {
    setIsLoading(false);
    
    // Try fallback if available and not already tried
    if (retryCount === 0 && fallbackSrc && fallbackSrc !== imageSrc) {
      setImageSrc(fallbackSrc);
      setIsLoading(true);
      setRetryCount(1);
      return;
    }
    
    // Try original URL if we're using proxy
    if (retryCount === 1 && imageSrc.includes('/api/proxy-image')) {
      setImageSrc(src);
      setIsLoading(true);
      setRetryCount(2);
      return;
    }
    
    // All attempts failed
    setHasError(true);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  // Reset state when src changes
  useEffect(() => {
    if (!src) return;
    
    const optimizedSrc = getOptimizedSrc(src);
    setImageSrc(optimizedSrc);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  return (
    <div className={`relative ${className || ''}`} ref={imageRef}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800/50 animate-pulse rounded flex items-center justify-center">
          <div className="w-4 h-4 bg-white/20 rounded-full animate-spin"></div>
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-800/50 rounded flex items-center justify-center">
          <div className="text-white/60 text-sm">Image unavailable</div>
        </div>
      )}
      
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        priority={priority}
        quality={quality}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  );
}
