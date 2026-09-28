import React from 'react';
import type { AccentColor } from '../../../../config/animations';

// Accent vocabulary is owned by the token pipeline; primitives must not
// re-declare it or they drift the moment an accent is retired.
type Accent = AccentColor;

export interface TerminalPromptProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Text to sit after the prompt. Kept short — it is a graphic, not a UI. */
  command?: string;
  opacity?: number;
}

const DEFAULT_COMMAND = 'npm run dev --turbo';

/**
 * TerminalPrompt — a prompt, a command, and a caret.
 *
 * Static geometry only. The timeline reveals the label per character via
 * `[data-prompt-char]` and blinks `[data-prompt-caret]`, so typing is a beat of
 * the boot sequence rather than a CSS loop.
 */
export default function TerminalPrompt({
  accent = 'lime',
  size,
  className,
  style,
  command = DEFAULT_COMMAND,
  opacity = 1,
}: TerminalPromptProps) {
  const stroke = `var(--ring-${accent})`;
  const chars = command.split('');

  return (
    <svg
      width={size ?? 200}
      height={size ? (size / 220) * 40 : 40}
      viewBox="0 0 220 40"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        overflow: 'visible',
        opacity,
        ...(size ? { width: size, height: (size / 220) * 40 } : null),
        ...style,
      }}
      data-graphic="grat-prompt"
    >
      <g className="grat-prompt">
        {/* Frame */}
        <rect
          x="1"
          y="1"
          width="218"
          height="38"
          rx="3"
          fill="none"
          stroke={stroke}
          strokeWidth="0.5"
          strokeOpacity="0.28"
        />
        {/* Title bar */}
        <line
          x1="1"
          y1="12"
          x2="219"
          y2="12"
          stroke={stroke}
          strokeWidth="0.4"
          strokeOpacity="0.2"
        />
        {[10, 17, 24].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy="6.5"
            r="1.4"
            fill={stroke}
            fillOpacity="0.35"
          />
        ))}

        {/* Prompt line */}
        <text x="8" y="28" fontSize="9" fontFamily="var(--font-mono)">
          <tspan fill={stroke} fillOpacity="0.9">
            {'$ '}
          </tspan>
          {chars.map((c, i) => (
            <tspan
              key={`${c}-${i}`}
              data-prompt-char={i}
              fill={stroke}
              fillOpacity="0.75"
              opacity={0}
            >
              {c === ' ' ? ' ' : c}
            </tspan>
          ))}
        </text>

        <rect
          data-prompt-caret
          x={12 + chars.length * 5.4}
          y="20"
          width="5"
          height="10"
          fill={stroke}
          opacity={0.9}
        />
      </g>
    </svg>
  );
}
