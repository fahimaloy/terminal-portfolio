import React from 'react';
import type { AccentColor } from '../../../../config/animations';

// Accent vocabulary is owned by the token pipeline; primitives must not
// re-declare it or they drift the moment an accent is retired.
type Accent = AccentColor;

export interface CodeBracketsProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  opacity?: number;
}

/** `{} [] ()` as three concentric pairs — the "code" frame of the lockup. */
const PAIRS: { left: string; right: string }[] = [
  {
    left: 'M 26 16 C 18 16 18 34 26 34 L 22 42 C 10 42 10 34 14 26 C 16 22 16 18 18 16 Z',
    right:
      'M 74 16 C 82 16 82 34 74 34 L 78 42 C 90 42 90 34 86 26 C 84 22 84 18 82 16 Z',
  },
  {
    left: 'M 30 22 L 24 22 L 24 50 L 30 50',
    right: 'M 70 22 L 76 22 L 76 50 L 70 50',
  },
  {
    left: 'M 34 28 C 28 28 28 44 34 44',
    right: 'M 66 28 C 72 28 72 44 66 44',
  },
];

/**
 * CodeBrackets — three concentric bracket pairs.
 *
 * Static geometry only. The timeline draws each `[data-bracket-stroke]` with
 * `createDrawable`, so the brackets lock in sequence instead of looping on a
 * clock the surrounding choreography cannot control.
 */
export default function CodeBrackets({
  accent = 'cyan',
  size,
  className,
  style,
  opacity = 1,
}: CodeBracketsProps) {
  const stroke = `var(--ring-${accent})`;

  return (
    <svg
      width={size ?? 120}
      height={size ?? 120}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        overflow: 'visible',
        opacity,
        ...(size ? { width: size, height: size } : null),
        ...style,
      }}
      data-graphic="grat-brackets"
    >
      <g className="grat-brackets">
        {PAIRS.map(({ left, right }, idx) => (
          <React.Fragment key={idx}>
            <path
              className="grat-stroke"
              data-bracket-stroke={idx}
              d={left}
              fill="none"
              stroke={stroke}
              strokeWidth="1.3"
              strokeOpacity="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1000}
            />
            <path
              className="grat-stroke"
              data-bracket-stroke={idx}
              d={right}
              fill="none"
              stroke={stroke}
              strokeWidth="1.3"
              strokeOpacity="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1000}
            />
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
}
