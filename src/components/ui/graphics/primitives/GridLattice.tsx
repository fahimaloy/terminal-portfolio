import React from 'react';

export interface GridLatticeProps {
  className?: string;
  style?: React.CSSProperties;
  opacity?: number;
  color?: string;
}

/**
 * GridLattice — subtle HUD grid for card backs / chat well.
 * 4x4 grid of hairline lines at 0.04-0.06 opacity, token-driven.
 */
export default function GridLattice({
  className,
  style,
  opacity = 0.06,
  color = 'var(--grid-1)',
}: GridLatticeProps) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', opacity, ...style }}
      data-graphic="grat-lattice"
    >
      <g className="grat-lattice" data-graphic="grat-lattice" opacity={opacity}>
        {/* vertical */}
        <line
          x1={25}
          y1={0}
          x2={25}
          y2={100}
          stroke={color}
          strokeWidth={0.4}
        />
        <line
          x1={50}
          y1={0}
          x2={50}
          y2={100}
          stroke={color}
          strokeWidth={0.4}
        />
        <line
          x1={75}
          y1={0}
          x2={75}
          y2={100}
          stroke={color}
          strokeWidth={0.4}
        />
        {/* horizontal */}
        <line
          x1={0}
          y1={25}
          x2={100}
          y2={25}
          stroke={color}
          strokeWidth={0.4}
        />
        <line
          x1={0}
          y1={50}
          x2={100}
          y2={50}
          stroke={color}
          strokeWidth={0.4}
        />
        <line
          x1={0}
          y1={75}
          x2={100}
          y2={75}
          stroke={color}
          strokeWidth={0.4}
        />
        {/* dots at intersections */}
        <circle cx={25} cy={25} r={0.7} fill={color} />
        <circle cx={50} cy={25} r={0.7} fill={color} />
        <circle cx={75} cy={25} r={0.7} fill={color} />
        <circle cx={25} cy={50} r={0.7} fill={color} />
        <circle cx={50} cy={50} r={0.9} fill={color} opacity={0.9} />
        <circle cx={75} cy={50} r={0.7} fill={color} />
        <circle cx={25} cy={75} r={0.7} fill={color} />
        <circle cx={50} cy={75} r={0.7} fill={color} />
        <circle cx={75} cy={75} r={0.7} fill={color} />
      </g>
    </svg>
  );
}
