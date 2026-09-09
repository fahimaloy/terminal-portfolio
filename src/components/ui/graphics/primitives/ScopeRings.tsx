import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface ScopeRingsProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ScopeRings — HUD vector scope loader: 3 concentric rings + crosshair.
 * All strokes hairline, pathLength 1000 for createDrawable.
 * Selectors: .grat-scope, .grat-stroke, .grat-fill
 */
export default function ScopeRings({
  accent = 'cyan',
  size,
  className,
  style,
}: ScopeRingsProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;

  return (
    <svg
      width={size ?? 120}
      height={size ?? 120}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...dim, ...style }}
      data-graphic="grat-scope"
    >
      <g className="grat-scope" data-graphic="grat-scope">
        {/* outer ring — primary scope */}
        <circle
          className="grat-stroke"
          data-graphic="grat-stroke"
          cx={50}
          cy={50}
          r={44}
          fill="none"
          stroke={stroke}
          strokeWidth={0.9}
          strokeOpacity={0.9}
          pathLength={1000}
        />
        {/* middle ring — dashed */}
        <circle
          className="grat-stroke"
          data-graphic="grat-stroke"
          cx={50}
          cy={50}
          r={32}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={0.7}
          strokeOpacity={0.7}
          strokeDasharray="3 4"
          pathLength={1000}
        />
        {/* inner ring — accent wash fill */}
        <circle
          className="grat-fill grat-stroke"
          data-graphic="grat-fill"
          cx={50}
          cy={50}
          r={18}
          fill={`var(--wash-${accent})`}
          stroke={stroke}
          strokeWidth={1}
          strokeOpacity={0.5}
          pathLength={1000}
        />
        {/* crosshair */}
        <line
          className="grat-stroke"
          data-graphic="grat-stroke"
          x1={50}
          y1={6}
          x2={50}
          y2={18}
          stroke={stroke}
          strokeWidth={1}
          strokeOpacity={0.6}
          pathLength={1000}
        />
        <line
          className="grat-stroke"
          data-graphic="grat-stroke"
          x1={50}
          y1={82}
          x2={50}
          y2={94}
          stroke={stroke}
          strokeWidth={1}
          strokeOpacity={0.6}
          pathLength={1000}
        />
        <line
          className="grat-stroke"
          data-graphic="grat-stroke"
          x1={6}
          y1={50}
          x2={18}
          y2={50}
          stroke={stroke}
          strokeWidth={1}
          strokeOpacity={0.6}
          pathLength={1000}
        />
        <line
          className="grat-stroke"
          data-graphic="grat-stroke"
          x1={82}
          y1={50}
          x2={94}
          y2={50}
          stroke={stroke}
          strokeWidth={1}
          strokeOpacity={0.6}
          pathLength={1000}
        />
        {/* center dot */}
        <circle cx={50} cy={50} r={1.5} fill={stroke} opacity={0.9} />
      </g>
    </svg>
  );
}
