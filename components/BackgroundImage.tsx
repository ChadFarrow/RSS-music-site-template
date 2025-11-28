'use client';

import { useImageFormatFallback } from '@/lib/hooks/useImageFormatFallback';

/**
 * Background image component with error handling
 * Tries multiple formats: .webp, .png, .jpg, .jpeg (in that order)
 * Uses regular img tag to avoid Next.js Image optimization issues with missing files
 */
export default function BackgroundImage() {
  const { imagePaths, loadedFormat, hasError, isLoading, handleError, handleLoad } = useImageFormatFallback('background', ['webp', 'png', 'jpg', 'jpeg'], false);
  
  // Only show the image if one has successfully loaded
  if (hasError) {
    return null; // All formats failed
  }
  
  // Render all formats but only show the one that loads successfully
  // This allows the browser to try all formats in parallel for faster loading
  return (
    <>
      {imagePaths.map((format, index) => {
        const isLoaded = loadedFormat === index;
        // Show first format while loading, or the successfully loaded format
        const shouldShow = isLoaded || (isLoading && loadedFormat === null && index === 0);
        
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={format}
            src={format}
            alt="Site Background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              display: shouldShow ? 'block' : 'none',
              zIndex: 0,
              opacity: isLoaded ? 1 : (shouldShow ? 0.8 : 0),
              transition: isLoaded ? 'opacity 0.5s ease-in-out' : 'none'
            }}
            onError={(e) => {
              e.stopPropagation(); // Prevent error from bubbling to console
              handleError(index);
            }}
            onLoad={() => {
              handleLoad(index);
            }}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        );
      })}
    </>
  );
}

