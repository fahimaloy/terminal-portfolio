'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { animate } from 'animejs';
import { isReducedMotion } from '../../config/animations';

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

  const handleEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setShow(true);
      if (tooltipRef.current && !isReducedMotion()) {
        animate(tooltipRef.current, {
          opacity: [0, 1],
          y: position === 'top' ? [4, 0] : position === 'bottom' ? [-4, 0] : [0, 0],
          x: position === 'left' ? [4, 0] : position === 'right' ? [-4, 0] : [0, 0],
          duration: 200,
          ease: 'outExpo',
        });
      }
    }, delay);
  }, [delay, position]);

  const handleLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
    if (tooltipRef.current && !isReducedMotion()) {
      animate(tooltipRef.current, {
        opacity: 0,
        duration: 150,
        ease: 'outQuad',
      });
    }
    setTimeout(() => setIsVisible(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
          className={`absolute z-50 px-2 py-1 text-xs font-body text-text-primary bg-bg-smoke border border-white/10 rounded-lg shadow-lg whitespace-nowrap pointer-events-none ${positionClasses[position]}`}
          style={{ opacity: 0 }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
