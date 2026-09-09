import React from 'react';

type Accent = 'yellow' | 'magenta' | 'cyan' | 'green' | 'purple' | 'blue';

export interface BracketProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

/**
 * Bracket — corner bracket frame (four L-shaped corners).
 * Stroke uses var(--hairline) by default, or var(--ring-*) when accent is set.
 * Static SVG, no motion yet.
 * Selectors: data-graphic grat-bracket, strokes grat-stroke
 */
export default function Bracket({
  accent,
  size,
  className,
  style,
  strokeWidth = 1.25,
}: BracketProps) {
  const stroke = accent ? `var(--ring-${accent})` : 'var(--hairline)';
  const sw = Math.min(1.5, Math.max(1, strokeWidth));
  const dim = size ? { width: size, height: size } : undefined;

  // Four L corners inset from edges; each arm ~28% of viewBox, inset 6 units
  return (
    <svg
      width={size ?? '100%'}
      height={size ?? '100%'}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...dim, ...style }}
      data-graphic="grat-bracket"
    >
      <g className="grat-bracket" data-graphic="grat-bracket">
        {/* Top-left */}
        <path
          className="grat-stroke"
          data-graphic="grat-stroke"
          d="M 6 28 L 6 6 L 28 6"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Top-right */}
        <path
          className="grat-stroke"
          data-graphic="grat-stroke"
          d="M 72 6 L 94 6 L 94 28"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Bottom-right */}
        <path
          className="grat-stroke"
          data-graphic="grat-stroke"
          d="M 94 72 L 94 94 L 72 94"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Bottom-left */}
        <path
          className="grat-stroke"
          data-graphic="grat-stroke"
          d="M 28 94 L 6 94 L 6 72"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>
    </svg>
  );
}
