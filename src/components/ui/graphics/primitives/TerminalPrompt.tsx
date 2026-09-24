import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface TerminalPromptProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * TerminalPrompt — blinking terminal cursor >_
 * Selectors: .grat-terminal, .grat-stroke, .grat-cursor
 */
export default function TerminalPrompt({
  accent = 'green',
  size,
  className,
  style,
}: TerminalPromptProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;
  const centerX = 50;
  const centerY = 50;

  return (
    <svg
      width={size ?? 120}
      height={size ?? 120}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...dim, ...style }}
      data-graphic="grat-terminal"
    >
      <g className="grat-terminal" data-graphic="grat-terminal">
        {/* Prompt symbol > */}
        <path
          className="grat-stroke grat-prompt"
          data-graphic="grat-stroke"
          d="M 30 50 L 42 50 L 36 44 M 42 50 L 36 56"
          stroke={stroke}
          strokeWidth="1.5"
          strokeOpacity={0.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1000}
        />
        {/* Underscore cursor - animated via CSS */}
        <rect
          className="grat-cursor"
          data-graphic="grat-cursor"
          x={44}
          y={38}
          width={8}
          height={18}
          fill={stroke}
          fillOpacity={0.9}
          rx={1}
        />
        {/* Optional: typing indicator dots */}
        <g className="grat-typing-indicator" opacity="0.5">
          <circle cx={58} cy={50} r={1.5} fill={stroke}>
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.4s"
              repeatCount="indefinite"
              begin="0s"
            />
          </circle>
          <circle cx={64} cy={50} r={1.5} fill={stroke}>
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.4s"
              repeatCount="indefinite"
              begin="0.2s"
            />
          </circle>
          <circle cx={70} cy={50} r={1.5} fill={stroke}>
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.4s"
              repeatCount="indefinite"
              begin="0.4s"
            />
          </circle>
        </g>
      </g>
      <style jsx>{`
        .grat-cursor {
          animation: cursor-blink 1s step-end infinite;
        }
        @keyframes cursor-blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </svg>
  );
}
