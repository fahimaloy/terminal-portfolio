import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface CodeBracketsProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CodeBrackets — animated code bracket pairs: {} [] ()
 * Each pair draws in sequence via createDrawable stagger
 * Selectors: .grat-brackets, .grat-stroke
 */
export default function CodeBrackets({
  accent = 'cyan',
  size,
  className,
  style,
}: CodeBracketsProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;
  const centerX = 50;
  const centerY = 50;
  const pairSpacing = 22;

  const brackets = [
    // { } - curly braces
    {
      left: `M ${centerX - pairSpacing} ${centerY - 18} 
             C ${centerX - pairSpacing - 8} ${centerY - 18} 
               ${centerX - pairSpacing - 8} ${centerY + 18} 
               ${centerX - pairSpacing} ${centerY + 18}`,
      right: `M ${centerX + pairSpacing} ${centerY - 18} 
              C ${centerX + pairSpacing + 8} ${centerY - 18} 
                ${centerX + pairSpacing + 8} ${centerY + 18} 
                ${centerX + pairSpacing} ${centerY + 18}`,
      delay: 0,
    },
    // [ ] - square brackets
    {
      left: `M ${centerX - pairSpacing} ${centerY - 14} 
             L ${centerX - pairSpacing - 6} ${centerY - 14} 
             L ${centerX - pairSpacing - 6} ${centerY + 14} 
             L ${centerX - pairSpacing} ${centerY + 14}`,
      right: `M ${centerX + pairSpacing} ${centerY - 14} 
              L ${centerX + pairSpacing + 6} ${centerY - 14} 
              L ${centerX + pairSpacing + 6} ${centerY + 14} 
              L ${centerX + pairSpacing} ${centerY + 14}`,
      delay: 1,
    },
    // ( ) - parentheses
    {
      left: `M ${centerX - pairSpacing} ${centerY - 10} 
             C ${centerX - pairSpacing - 5} ${centerY - 10} 
               ${centerX - pairSpacing - 5} ${centerY + 10} 
               ${centerX - pairSpacing} ${centerY + 10}`,
      right: `M ${centerX + pairSpacing} ${centerY - 10} 
              C ${centerX + pairSpacing + 5} ${centerY - 10} 
                ${centerX + pairSpacing + 5} ${centerY + 10} 
                ${centerX + pairSpacing} ${centerY + 10}`,
      delay: 2,
    },
  ];

  return (
    <svg
      width={size ?? 120}
      height={size ?? 120}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...dim, ...style }}
      data-graphic="grat-brackets"
    >
      <g className="grat-brackets" data-graphic="grat-brackets">
        {brackets.map(({ left, right, delay }, idx) => (
          <React.Fragment key={idx}>
            <path
              className="grat-stroke grat-bracket"
              data-graphic="grat-stroke"
              data-bracket={idx}
              d={left}
              stroke={stroke}
              strokeWidth="1.2"
              strokeOpacity={0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1000}
              style={
                { animationDelay: `${delay * 150}ms` } as React.CSSProperties
              }
            />
            <path
              className="grat-stroke grat-bracket"
              data-graphic="grat-stroke"
              data-bracket={idx}
              d={right}
              stroke={stroke}
              strokeWidth="1.2"
              strokeOpacity={0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1000}
              style={
                {
                  animationDelay: `${delay * 150 + 50}ms`,
                } as React.CSSProperties
              }
            />
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
}
