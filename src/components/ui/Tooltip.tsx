'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { animate } from 'animejs';
import { isReducedMotion, durations, easings } from '../../config/animations';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const cancelAnim = useCallback(() => {
    animRef.current?.cancel();
    animRef.current = null;
  }, []);

  const handleEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setShow(true);
      if (tooltipRef.current && !isReducedMotion()) {
        cancelAnim();
        animRef.current = animate(tooltipRef.current, {
          opacity: [0, 1],
          y:
            position === 'top'
              ? [4, 0]
              : position === 'bottom'
              ? [-4, 0]
              : [0, 0],
          x:
            position === 'left'
              ? [4, 0]
              : position === 'right'
              ? [-4, 0]
              : [0, 0],
          duration: durations.hover * 1000,
          ease: easings.expoOut,
        });
      }
    }, delay);
  }, [delay, position, cancelAnim]);

  const handleLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
    if (tooltipRef.current && !isReducedMotion()) {
      cancelAnim();
      animRef.current = animate(tooltipRef.current, {
        opacity: 0,
        duration: durations.tap * 1000 + 30,
        ease: easings.quadOut,
      });
    }
    setTimeout(() => setIsVisible(false), 150);
  }, [cancelAnim]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      cancelAnim();
    };
  }, [cancelAnim]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-xs font-body whitespace-nowrap pointer-events-none ${positionClasses[position]}`}
          style={{
            opacity: 0,
            background: 'var(--bg-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--fg-1)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
