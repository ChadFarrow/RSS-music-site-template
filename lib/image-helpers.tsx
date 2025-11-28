'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Helper component for placeholder album art image
 * Tries multiple formats: .webp, .png, .jpg, .jpeg (in that order)
 */
export function PlaceholderAlbumArtImage({ 
  alt = 'Placeholder Album Art', 
  className = '',
  ...props 
}: { 
  alt?: string; 
  className?: string;
  [key: string]: any;
}) {
  const [hasError, setHasError] = useState(false);
  const [currentFormat, setCurrentFormat] = useState(0);
  
  const formats = ['/placeholder-album-art.webp', '/placeholder-album-art.png', '/placeholder-album-art.jpg', '/placeholder-album-art.jpeg'];
  const imageSrc = formats[currentFormat];
  
  if (hasError) {
    return null; // Don't render image if all formats failed
  }
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => {
        // Try next format
        if (currentFormat < formats.length - 1) {
          setCurrentFormat(currentFormat + 1);
        } else {
          setHasError(true);
        }
      }}
      {...props}
    />
  );
}

/**
 * Logo component that tries multiple formats: .webp, .png, .jpg, .jpeg (in that order)
 * Returns null if no logo file exists (completely optional - won't display if missing)
 */
export function SiteLogo({ 
  alt = 'Site Logo', 
  className = '',
  width = 120,
  height = 40,
  ...props 
}: { 
  alt?: string; 
  className?: string;
  width?: number;
  height?: number;
  [key: string]: any;
}) {
  const [hasError, setHasError] = useState(false);
  const [currentFormat, setCurrentFormat] = useState(0);
  
  const formats = ['/logo.webp', '/logo.png', '/logo.jpg', '/logo.jpeg'];
  const imageSrc = formats[currentFormat];
  
  // Don't render anything if all formats failed (logo doesn't exist)
  if (hasError) {
    return null;
  }
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={(e) => {
        // Suppress error logging for missing images
        e.currentTarget.style.display = 'none';
        // Prevent error from bubbling
        e.stopPropagation();
        // Try next format
        if (currentFormat < formats.length - 1) {
          setCurrentFormat(currentFormat + 1);
        } else {
          // All formats failed - logo doesn't exist, hide component
          setHasError(true);
        }
      }}
      unoptimized={false}
      {...props}
    />
  );
}

