import React from 'react';

type Accent = 'yellow' | 'magenta' | 'cyan' | 'green' | 'purple' | 'blue';

export interface HairlineDividerProps {
  accent?: Accent;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * HairlineDivider — horizontal 1px hairline rule.
 * Stroke uses var(--hairline) by default, or var(--ring-*) when accent is set.
 * Static SVG only, no motion yet.
 */
export default function HairlineDivider({
  accent,
  className,
  style,
}: HairlineDividerProps) {
  const stroke = accent ? `var(--ring-${accent})` : 'var(--hairline)';

  return (
    <div
      role="separator"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <svg
        width="100%"
        height="1"
        viewBox="0 0 100 1"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <line
          x1="0"
          y1="0.5"
          x2="100"
          y2="0.5"
          stroke={stroke}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          shapeRendering="crispEdges"
        />
      </svg>
    </div>
  );
}
