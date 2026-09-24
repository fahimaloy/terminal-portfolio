import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface FileTreeProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * FileTree — animated directory/file tree structure
 * Expands from root with stagger
 * Selectors: .grat-filetree, .grat-stroke, .grat-node
 */
export default function FileTree({
  accent = 'blue',
  size,
  className,
  style,
}: FileTreeProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;
  const startX = 20;
  const startY = 20;
  const rowHeight = 12;
  const indent = 14;

  const tree = [
    { name: 'src', depth: 0, isDir: true, delay: 0 },
    { name: 'components', depth: 1, isDir: true, delay: 1 },
    { name: 'ui', depth: 2, isDir: true, delay: 2 },
    { name: 'Button.tsx', depth: 3, isDir: false, delay: 3 },
    { name: 'Card.tsx', depth: 3, isDir: false, delay: 4 },
    { name: 'home', depth: 2, isDir: true, delay: 5 },
    { name: 'HeroSection.tsx', depth: 3, isDir: false, delay: 6 },
    { name: 'HeroChat.tsx', depth: 3, isDir: false, delay: 7 },
    { name: 'hooks', depth: 1, isDir: true, delay: 8 },
    { name: 'useScrollAnimation.ts', depth: 2, isDir: false, delay: 9 },
    { name: 'utils', depth: 1, isDir: true, delay: 10 },
    { name: 'api.ts', depth: 2, isDir: false, delay: 11 },
    { name: 'config', depth: 1, isDir: true, delay: 12 },
    { name: 'animations.ts', depth: 2, isDir: false, delay: 13 },
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
      data-graphic="grat-filetree"
    >
      <g className="grat-filetree" data-graphic="grat-filetree">
        {tree.map(({ name, depth, isDir, delay }, idx) => {
          const x = startX + depth * indent;
          const y = startY + idx * rowHeight;
          const isLast = idx === tree.length - 1;
          const nextDepth = isLast ? 0 : tree[idx + 1]?.depth ?? 0;
          const showVertical = depth > 0 && nextDepth >= depth;

          return (
            <React.Fragment key={idx}>
              {/* Vertical connector line */}
              {depth > 0 && (
                <line
                  className="grat-stroke grat-connector"
                  data-graphic="grat-stroke"
                  x1={startX + (depth - 0.5) * indent}
                  y1={y - rowHeight}
                  x2={startX + (depth - 0.5) * indent}
                  y2={y}
                  stroke={stroke}
                  strokeWidth="0.8"
                  strokeOpacity={0.4}
                  style={
                    { animationDelay: `${delay * 80}ms` } as React.CSSProperties
                  }
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="1000"
                    to="0"
                    dur="0.3s"
                    begin={`${delay * 0.08}s`}
                    fill="freeze"
                  />
                </line>
              )}

              {/* Horizontal connector */}
              {depth > 0 && (
                <line
                  className="grat-stroke grat-connector-h"
                  data-graphic="grat-stroke"
                  x1={startX + (depth - 0.5) * indent}
                  y1={y}
                  x2={x - 4}
                  y2={y}
                  stroke={stroke}
                  strokeWidth="0.8"
                  strokeOpacity={0.5}
                  style={
                    {
                      animationDelay: `${delay * 80 + 100}ms`,
                    } as React.CSSProperties
                  }
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="1000"
                    to="0"
                    dur="0.2s"
                    begin={`${delay * 0.08 + 0.1}s`}
                    fill="freeze"
                  />
                </line>
              )}

              {/* Directory/File icon */}
              {isDir ? (
                <React.Fragment>
                  {/* Folder icon */}
                  <path
                    className="grat-stroke grat-folder"
                    data-graphic="grat-stroke"
                    d={`M ${x} ${y - 6} 
                       L ${x + 10} ${y - 6} 
                       L ${x + 10} ${y + 6} 
                       L ${x} ${y + 6} 
                       Z
                       M ${x + 1} ${y - 6} 
                       L ${x + 3} ${y - 10} 
                       L ${x + 9} ${y - 10} 
                       L ${x + 9} ${y - 6}`}
                    stroke={stroke}
                    strokeWidth="0.9"
                    strokeOpacity={0.8}
                    fill="none"
                    pathLength={1000}
                    style={
                      {
                        animationDelay: `${delay * 80 + 150}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="1000"
                      to="0"
                      dur="0.4s"
                      begin={`${delay * 0.08 + 0.15}s`}
                      fill="freeze"
                    />
                  </path>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  {/* File icon */}
                  <path
                    className="grat-stroke grat-file"
                    data-graphic="grat-stroke"
                    d={`M ${x} ${y - 6} 
                       L ${x + 8} ${y - 6} 
                       L ${x + 8} ${y + 6} 
                       L ${x} ${y + 6} 
                       Z
                       M ${x + 5} ${y - 6} 
                       L ${x + 5} ${y - 2} 
                       L ${x + 8} ${y - 2}`}
                    stroke={stroke}
                    strokeWidth="0.9"
                    strokeOpacity={0.7}
                    fill="none"
                    pathLength={1000}
                    style={
                      {
                        animationDelay: `${delay * 80 + 150}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="1000"
                      to="0"
                      dur="0.3s"
                      begin={`${delay * 0.08 + 0.15}s`}
                      fill="freeze"
                    />
                  </path>
                </React.Fragment>
              )}

              {/* Expand/collapse indicator for dirs */}
              {isDir && (
                <polygon
                  className="grat-node grat-expand"
                  data-graphic="grat-node"
                  points={`${x + 10},${y - 2} ${x + 14},${y + 2} ${x + 10},${
                    y + 6
                  }`}
                  fill={stroke}
                  fillOpacity={0.6}
                  style={
                    {
                      animationDelay: `${delay * 80 + 200}ms`,
                    } as React.CSSProperties
                  }
                >
                  <animate
                    attributeName="opacity"
                    values="0;0.6;0.6"
                    dur="0.2s"
                    begin={`${delay * 0.08 + 0.2}s`}
                    fill="freeze"
                  />
                </polygon>
              )}
            </React.Fragment>
          );
        })}
      </g>
    </svg>
  );
}
