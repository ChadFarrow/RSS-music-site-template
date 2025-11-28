'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  imageLoadTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    imageLoadTime: 0,
    apiResponseTime: 0,
    cacheHitRate: 0
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only show in development and after client hydration
    if (process.env.NODE_ENV !== 'development' || !isClient) return;

    const startTime = performance.now();

    // Monitor page load time
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, loadTime }));
    };

    // Monitor image load times
    const monitorImages = () => {
      const images = document.querySelectorAll('img');
      let totalImageTime = 0;
      let loadedImages = 0;

      images.forEach(img => {
        const imgStartTime = performance.now();
        
        img.addEventListener('load', () => {
          const imgLoadTime = performance.now() - imgStartTime;
          totalImageTime += imgLoadTime;
          loadedImages++;
          
          if (loadedImages === images.length) {
            setMetrics(prev => ({ 
              ...prev, 
              imageLoadTime: totalImageTime / loadedImages 
            }));
          }
        });
      });
    };

    // Monitor API response times
    const originalFetch = window.fetch;
    let totalApiTime = 0;
    let apiCalls = 0;

    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await originalFetch(...args);
      const end = performance.now();
      
      totalApiTime += (end - start);
      apiCalls++;
      
      setMetrics(prev => ({ 
        ...prev, 
        apiResponseTime: totalApiTime / apiCalls 
      }));
      
      return response;
    };

    window.addEventListener('load', handleLoad);
    monitorImages();

    return () => {
      window.removeEventListener('load', handleLoad);
      window.fetch = originalFetch;
    };
  }, [isClient]);

  // Only render in development and after client hydration
  if (process.env.NODE_ENV !== 'development' || !isClient) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="mb-2 font-bold">Performance Metrics</div>
      <div>Load: {metrics.loadTime.toFixed(0)}ms</div>
      <div>Images: {metrics.imageLoadTime.toFixed(0)}ms</div>
      <div>API: {metrics.apiResponseTime.toFixed(0)}ms</div>
      <div>Cache: {metrics.cacheHitRate.toFixed(1)}%</div>
    </div>
  );
}