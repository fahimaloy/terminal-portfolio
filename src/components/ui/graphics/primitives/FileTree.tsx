import React from 'react';
import type { AccentColor } from '../../../../config/animations';

// Accent vocabulary is owned by the token pipeline; primitives must not
// re-declare it or they drift the moment an accent is retired.
type Accent = AccentColor;

export interface FileTreeProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  opacity?: number;
}

/**
 * A small directory tree: root → two directories → three files.
 * Rows are listed with their indent depth and connector geometry.
 */
const ROWS: { label: string; depth: number; kind: 'dir' | 'file' }[] = [
  { label: 'src', depth: 0, kind: 'dir' },
  { label: 'components', depth: 1, kind: 'dir' },
  { label: 'scene', depth: 2, kind: 'dir' },
  { label: 'ParticleField.tsx', depth: 3, kind: 'file' },
  { label: 'FloorGrid.tsx', depth: 3, kind: 'file' },
  { label: 'CoreObject.tsx', depth: 3, kind: 'file' },
  { label: 'utils', depth: 1, kind: 'dir' },
  { label: 'api.ts', depth: 2, kind: 'file' },
  { label: 'identity.ts', depth: 2, kind: 'file' },
];

const ROW_H = 10;
const X0 = 8;
const INDENT = 11;

/**
 * FileTree — a project tree, rendered as static vector geometry.
 *
 * The timeline draws each `[data-tree-row]` connector and fades the label, so
 * the tree "opens" as one beat of the boot sequence rather than running on a
 * CSS clock of its own.
 */
export default function FileTree({
  accent = 'ice',
  size,
  className,
  style,
  opacity = 1,
}: FileTreeProps) {
  const stroke = `var(--ring-${accent})`;
  const height = ROWS.length * ROW_H + 8;
  const top = 4;

  return (
    <svg
      width={size ?? 160}
      height={size ? (size / 100) * height : height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        overflow: 'visible',
        opacity,
        ...(size ? { width: size, height: (size / 100) * height } : null),
        ...style,
      }}
      data-graphic="grat-filetree"
    >
      <g className="grat-filetree" fontFamily="var(--font-mono)">
        {ROWS.map((row, i) => {
          const y = top + i * ROW_H;
          const x = X0 + row.depth * INDENT;
          // Elbow connector: down the previous level, then across.
          const connector =
            row.depth === 0
              ? ''
              : `M ${x - INDENT / 2} ${y - ROW_H + 3} L ${
                  x - INDENT / 2
                } ${y - 2} L ${x - 2.5} ${y - 2}`;
          return (
            <g key={row.label} data-tree-row={i} opacity={0}>
              {connector && (
                <path
                  d={connector}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="0.5"
                  strokeOpacity="0.5"
                  pathLength={1000}
                />
              )}
              {row.kind === 'dir' ? (
                <path
                  d={`M ${x} ${y - 4} L ${x + 6} ${y - 4} L ${x + 6} ${y - 0.5} L ${x} ${y - 0.5} Z`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="0.6"
                  strokeOpacity="0.85"
                />
              ) : (
                <>
                  <rect
                    x={x}
                    y={y - 4}
                    width="5"
                    height="4"
                    rx="0.5"
                    fill="none"
                    stroke={stroke}
                    strokeWidth="0.5"
                    strokeOpacity="0.6"
                  />
                  <line
                    x1={x + 1.2}
                    y1={y - 2.4}
                    x2={x + 3.8}
                    y2={y - 2.4}
                    stroke={stroke}
                    strokeWidth="0.4"
                    strokeOpacity="0.5"
                  />
                  <line
                    x1={x + 1.2}
                    y1={y - 1.2}
                    x2={x + 3.8}
                    y2={y - 1.2}
                    stroke={stroke}
                    strokeWidth="0.4"
                    strokeOpacity="0.5"
                  />
                </>
              )}
              <text
                x={x + 9}
                y={y + 0.5}
                fontSize="4.4"
                fill={stroke}
                fillOpacity={row.kind === 'dir' ? 0.9 : 0.6}
              >
                {row.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
