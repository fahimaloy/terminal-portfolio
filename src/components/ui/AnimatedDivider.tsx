'use client';

import React from 'react';

interface AnimatedDividerProps {
  className?: string;
  color?: string;
  animated?: boolean;
}

export default function AnimatedDivider({
  className = '',
  color = 'currentColor',
  animated = true,
}: AnimatedDividerProps) {
  return (
    <div className={`relative py-8 ${className}`} aria-hidden="true">
      <svg
        className="w-full h-8"
        viewBox="0 0 1200 32"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Main line */}
        <line
          x1="0"
          y1="16"
          x2="1200"
          y2="16"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.3"
        />
        {/* Animated center diamond */}
        {animated && (
          <>
            <rect
              x="584"
              y="8"
              width="32"
              height="16"
              fill={color}
              fillOpacity="0.2"
              stroke={color}
              strokeWidth="1"
              strokeOpacity="0.6"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 600 16"
                to="360 600 16"
                dur="8s"
                repeatCount="indefinite"
              />
            </rect>
            {/* Pulsing dots */}
            <circle cx="500" cy="16" r="3" fill={color} fillOpacity="0.6">
              <animate
                attributeName="r"
                values="2;4;2"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;1;0.4"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="700" cy="16" r="3" fill={color} fillOpacity="0.6">
              <animate
                attributeName="r"
                values="2;4;2"
                dur="2s"
                repeatCount="indefinite"
                begin="0.5s"
              />
              <animate
                attributeName="opacity"
                values="0.4;1;0.4"
                dur="2s"
                repeatCount="indefinite"
                begin="0.5s"
              />
            </circle>
          </>
        )}
      </svg>
    </div>
  );
}
