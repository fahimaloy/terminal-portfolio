'use client';

import React from 'react';

interface AnimatedDividerProps {
  className?: string;
  color?: string;
  animated?: boolean;
}

export default function AnimatedDivider({
  className = '',
  color = 'var(--border-subtle)',
  animated = false,
}: AnimatedDividerProps) {
  return (
    <div className={`relative py-6 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-4">
        <div
          className="flex-1 h-px"
          style={{ background: color, opacity: 0.6 }}
        />
        {animated ? (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: 'var(--fg-4)', opacity: 0.5 }}
          />
        ) : null}
        <div
          className="flex-1 h-px"
          style={{ background: color, opacity: 0.6 }}
        />
      </div>
    </div>
  );
}
