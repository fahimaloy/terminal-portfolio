import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface BinaryRainProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  columns?: number;
  rows?: number;
}

/**
 * BinaryRain — matrix-style falling binary glyphs (0/1)
 * Continuous loop animation via SMIL
 * Selectors: .grat-binary, .grat-glyph
 */
export default function BinaryRain({
  accent = 'green',
  size,
  className,
  style,
  columns = 12,
  rows = 8,
}: BinaryRainProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;
  const cellW = 100 / columns;
  const cellH = 100 / rows;

  const glyphs = Array.from({ length: columns * rows }, (_, idx) => {
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const x = col * cellW + cellW / 2;
    const y = row * cellH + cellH / 2;
    const value = Math.random() > 0.5 ? '1' : '0';
    const delay = (col * 0.15 + row * 0.08 + Math.random() * 0.5) % 2;
    const duration = 2 + Math.random() * 2;
    const fontSize = cellW * 0.6;

    return { x, y, value, delay, duration, fontSize };
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
      data-graphic="grat-binary"
    >
      <g className="grat-binary" data-graphic="grat-binary">
        {glyphs.map(({ x, y, value, delay, duration, fontSize }, idx) => (
          <text
            key={idx}
            className="grat-glyph"
            data-graphic="grat-glyph"
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="'JetBrains Mono', 'Fira Code', monospace"
            fontSize={fontSize}
            fontWeight="500"
            fill={stroke}
            fillOpacity={0.6}
            style={{ animationDelay: `${delay}s` } as React.CSSProperties}
          >
            {value}
            <animate
              attributeName="fill-opacity"
              values="0;0.6;0.9;0.6;0"
              dur={`${duration}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              from={y}
              to={y + 100}
              dur={`${duration * 1.5}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="fill-opacity"
              values="0;0.6;0.9;0.6;0"
              dur={`${duration}s`}
              begin={`${delay + duration * 1.5}s`}
              repeatCount="indefinite"
            />
          </text>
        ))}
      </g>
    </svg>
  );
}
