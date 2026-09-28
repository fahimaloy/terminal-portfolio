import React from 'react';
import type { AccentColor } from '../../../../config/animations';

// Accent vocabulary is owned by the token pipeline; primitives must not
// re-declare it or they drift the moment an accent is retired.
type Accent = AccentColor;

export interface CircuitTracesProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  opacity?: number;
}

type NodeKind = 'chip' | 'via' | 'capacitor' | 'resistor';
type Trace = { d: string; nodes: { x: number; y: number; kind: NodeKind }[] };

// Orthogonal PCB traces radiating from the centre. Static geometry — the
// timeline draws them with `createDrawable` and pops the nodes with `spring`.
const TRACES: Trace[] = [
  {
    d: 'M 50 50 L 50 14',
    nodes: [
      { x: 50, y: 14, kind: 'chip' },
      { x: 50, y: 32, kind: 'via' },
    ],
  },
  {
    d: 'M 50 50 L 86 50',
    nodes: [
      { x: 86, y: 50, kind: 'resistor' },
      { x: 68, y: 50, kind: 'via' },
    ],
  },
  {
    d: 'M 50 50 L 50 86',
    nodes: [
      { x: 50, y: 86, kind: 'capacitor' },
      { x: 50, y: 68, kind: 'via' },
    ],
  },
  {
    d: 'M 50 50 L 14 50',
    nodes: [
      { x: 14, y: 50, kind: 'via' },
      { x: 32, y: 50, kind: 'chip' },
    ],
  },
  {
    d: 'M 50 50 L 78 22',
    nodes: [{ x: 78, y: 22, kind: 'via' }],
  },
  {
    d: 'M 50 50 L 22 78',
    nodes: [{ x: 22, y: 78, kind: 'capacitor' }],
  },
  {
    d: 'M 50 50 L 22 22',
    nodes: [{ x: 22, y: 22, kind: 'via' }],
  },
  {
    d: 'M 50 50 L 78 78',
    nodes: [{ x: 78, y: 78, kind: 'resistor' }],
  },
];

/**
 * CircuitTraces — a PCB-style trace fan radiating from the core.
 *
 * Static geometry only: no SMIL, no CSS animation. The splash timeline draws
 * each `[data-trace-path]` with `createDrawable` and pops `[data-trace-node]`
 * with `spring`, so the fan is one beat of a larger sequence rather than a
 * self-running loop that can never be paused or reverted.
 */
export default function CircuitTraces({
  accent = 'amber',
  size,
  className,
  style,
  opacity = 1,
}: CircuitTracesProps) {
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
      data-graphic="grat-circuit"
    >
      <g className="grat-circuit">
        {TRACES.map(({ d, nodes }, traceIdx) => (
          <React.Fragment key={d}>
            <path
              className="grat-stroke"
              data-trace-path={traceIdx}
              d={d}
              stroke={stroke}
              strokeWidth="1.1"
              strokeOpacity="0.65"
              strokeLinecap="round"
              pathLength={1000}
            />
            {nodes.map(({ x, y, kind }, nodeIdx) => (
              <g
                key={`${x}-${y}`}
                className="grat-node"
                data-trace-node={traceIdx}
                data-kind={kind}
                opacity={0}
              >
                {kind === 'via' && (
                  <circle cx={x} cy={y} r="2.2" fill={stroke} />
                )}
                {kind === 'chip' && (
                  <rect
                    x={x - 5}
                    y={y - 3.5}
                    width={10}
                    height={7}
                    rx={1}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1"
                  />
                )}
                {kind === 'capacitor' && (
                  <g stroke={stroke} strokeWidth="1.1" strokeLinecap="round">
                    <line x1={x - 3} y1={y - 5} x2={x - 3} y2={y + 5} />
                    <line x1={x + 3} y1={y - 5} x2={x + 3} y2={y + 5} />
                  </g>
                )}
                {kind === 'resistor' && (
                  <path
                    d={`M ${x - 5} ${y} L ${x - 2.5} ${y} L ${x - 1} ${y - 3.4} L ${x + 1} ${y + 3.4} L ${x + 2.5} ${y} L ${x + 5} ${y}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <title>{`${kind} ${nodeIdx}`}</title>
              </g>
            ))}
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
}
