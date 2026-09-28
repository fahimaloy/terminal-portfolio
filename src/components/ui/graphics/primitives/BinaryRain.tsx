import React from 'react';
import type { AccentColor } from '../../../../config/animations';
import { makeRng } from '../seededRandom';

// Accent vocabulary is owned by the token pipeline; primitives must not
// re-declare it or they drift the moment an accent is retired.
type Accent = AccentColor;

export interface BinaryRainProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  columns?: number;
  rows?: number;
  /** Fixed so SSR and client render the same glyphs. */
  seed?: number;
  opacity?: number;
}

/**
 * BinaryRain — a matrix of falling binary glyphs.
 *
 * Static geometry only: no SMIL, no CSS animation, no Math.random(). The
 * splash timeline owns the motion via `createDrawable` / `animate` on
 * `[data-rain-glyph]`, which is the only way a sequence can be paused,
 * reversed and reverted with the rest of the choreography.
 */
export default function BinaryRain({
  accent = 'lime',
  size,
  className,
  style,
  columns = 12,
  rows = 16,
  seed = 0x5eed,
  opacity = 1,
}: BinaryRainProps) {
  const stroke = `var(--ring-${accent})`;
  const rand = makeRng(seed);
  const cellW = 100 / columns;
  const cellH = 100 / rows;
  const fontSize = cellW * 0.62;

  const glyphs = Array.from({ length: columns * rows }, (_, idx) => {
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    return {
      col,
      row,
      x: col * cellW + cellW / 2,
      y: row * cellH + cellH / 2,
      value: rand() > 0.5 ? '1' : '0',
      // Per-glyph phase so a stagger reads as a diagonal cascade.
      phase: rand(),
    };
  });

  return (
    <svg
      width={size ?? 120}
      height={size ?? 220}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        overflow: 'visible',
        opacity,
        ...(size ? { width: size, height: size * 1.8 } : null),
        ...style,
      }}
      data-graphic="grat-binary"
    >
      <g className="grat-binary">
        {glyphs.map(({ col, row, x, y, value, phase }) => (
          <text
            key={`${col}-${row}`}
            className="grat-glyph"
            data-rain-glyph={col}
            data-phase={phase.toFixed(4)}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono)"
            fontSize={fontSize}
            fontWeight="500"
            fill={stroke}
            opacity={0}
          >
            {value}
          </text>
        ))}
      </g>
    </svg>
  );
}
