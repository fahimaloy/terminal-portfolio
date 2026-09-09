import React from 'react';

type Accent = 'yellow' | 'magenta' | 'cyan' | 'green' | 'purple' | 'blue';

export interface MorphOrbProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MorphOrb — decorative organic blob with two overlapping paths.
 * Outer soft fill + inner hairline stroke. Static SVG, no motion yet.
 * - fill: var(--glow-*-zone) when accent is set, otherwise var(--aurora-1)
 * - stroke: var(--hairline)
 * Selectors for future anime scopes: .grat-orb, .grat-fill, .grat-stroke
 */
export default function MorphOrb({
  accent,
  size,
  className,
  style,
}: MorphOrbProps) {
  const fill = accent ? `var(--glow-${accent}-zone)` : 'var(--aurora-1)';
  const dimension = size ? { width: size, height: size } : undefined;

  return (
    <svg
      width={size ?? '100%'}
      height={size ?? '100%'}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...dimension, ...style }}
    >
      <g className="grat-orb" data-graphic="grat-orb">
        {/* Outer organic blob — soft wash fill */}
        <path
          className="grat-fill"
          data-graphic="grat-fill"
          d="M 50 8 C 72 10 88 24 88 48 C 88 72 72 90 50 90 C 28 90 12 72 12 48 C 12 24 28 6 50 8 Z"
          fill={fill}
          stroke="var(--hairline)"
          strokeWidth={0.8}
          strokeOpacity={0.9}
        />
        {/* Inner offset blob — hairline outline, lighter fill */}
        <path
          className="grat-stroke"
          data-graphic="grat-stroke"
          d="M 50 18 C 66 19 77 30 77 48 C 77 66 66 80 50 80 C 34 80 23 66 23 48 C 23 30 34 17 50 18 Z"
          fill={fill}
          fillOpacity={0.55}
          stroke="var(--hairline)"
          strokeWidth={1}
        />
      </g>
    </svg>
  );
}
