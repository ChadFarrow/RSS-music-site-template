'use client';

import { useEffect, useRef, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for a swipe
  velocityThreshold?: number; // Minimum velocity for a swipe
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 0.3
}: SwipeGestureOptions) {
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setTouchEnd(null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = touchEnd.time - touchStart.time;
    
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    const velocity = Math.max(distanceX, distanceY) / deltaTime;

    // Check if swipe meets threshold requirements
    if (velocity < velocityThreshold && Math.max(distanceX, distanceY) < threshold) {
      return;
    }

    // Determine swipe direction based on the larger distance
    if (distanceX > distanceY) {
      // Horizontal swipe
      if (deltaX > threshold && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < -threshold && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > threshold && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < -threshold && onSwipeUp) {
        onSwipeUp();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold]);

  return elementRef;
}