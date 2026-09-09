import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface SignalTicksProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  count?: number;
  radius?: number;
}

/**
 * SignalTicks — 12 radial ticks around a circle, like a loading scope.
 * Each tick is a short line from r-inner to r-outer.
 * For drawable stagger: delay stagger(40,{from:'first'})
 */
export default function SignalTicks({
  accent = 'cyan',
  size,
  className,
  style,
  count = 12,
  radius = 42,
}: SignalTicksProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;
  const cx = 50;
  const cy = 50;
  const inner = radius - 6;
  const outer = radius;

  const ticks = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;
    const isMajor = i % 3 === 0;
    return { x1, y1, x2, y2, isMajor, idx: i };
  });

  return (
    <svg
      width={size ?? 120}
      height={size ?? 120}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...dim, ...style }}
      data-graphic="grat-ticks"
    >
      <g className="grat-ticks" data-graphic="grat-ticks">
        {ticks.map(({ x1, y1, x2, y2, isMajor, idx }) => (
          <line
            key={idx}
            className="grat-stroke grat-tick"
            data-graphic="grat-stroke"
            data-tick={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth={isMajor ? 1.1 : 0.7}
            strokeOpacity={isMajor ? 0.85 : 0.45}
            strokeLinecap="round"
            pathLength={1000}
          />
        ))}
      </g>
    </svg>
  );
}
