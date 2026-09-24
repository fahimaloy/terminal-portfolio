import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface GitBranchProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * GitBranch — animated git branching visualization
 * Main line with feature branches merging back
 * Selectors: .grat-git, .grat-stroke, .grat-node
 */
export default function GitBranch({
  accent = 'magenta',
  size,
  className,
  style,
}: GitBranchProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;
  const centerX = 50;
  const centerY = 50;

  // Main trunk path (vertical)
  const trunkPath = `M ${centerX} 15 L ${centerX} 85`;

  // Feature branches - each branches out and merges back
  const branches = [
    // Feature branch 1 (left side, merges at ~35%)
    {
      path: `M ${centerX} 30 
             C ${centerX - 18} 30 
               ${centerX - 22} 40 
               ${centerX - 18} 50 
             C ${centerX - 14} 60 
               ${centerX - 8} 65 
               ${centerX} 70`,
      nodeY: 30,
      mergeY: 70,
      delay: 0,
    },
    // Feature branch 2 (right side, merges at ~55%)
    {
      path: `M ${centerX} 45 
             C ${centerX + 18} 45 
               ${centerX + 22} 55 
               ${centerX + 18} 65 
             C ${centerX + 14} 75 
               ${centerX + 8} 80 
               ${centerX} 85`,
      nodeY: 45,
      mergeY: 85,
      delay: 1,
    },
    // Feature branch 3 (left side, short, merges at ~80%)
    {
      path: `M ${centerX} 65 
             C ${centerX - 14} 65 
               ${centerX - 16} 72 
               ${centerX - 12} 78 
             C ${centerX - 8} 82 
               ${centerX - 4} 84 
               ${centerX} 85`,
      nodeY: 65,
      mergeY: 85,
      delay: 2,
    },
  ];

  // Commit nodes on trunk
  const commitNodes = [20, 35, 50, 70, 80].map((y, idx) => ({
    y,
    isMerge: [35, 70, 85].includes(y),
    delay: idx * 0.15,
  }));

  return (
    <svg
      width={size ?? 120}
      height={size ?? 120}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...dim, ...style }}
      data-graphic="grat-git"
    >
      <g className="grat-git" data-graphic="grat-git">
        {/* Main trunk */}
        <path
          className="grat-stroke grat-trunk"
          data-graphic="grat-stroke"
          d={trunkPath}
          stroke={stroke}
          strokeWidth="1.2"
          strokeOpacity={0.7}
          strokeLinecap="round"
          pathLength={1000}
        />

        {/* Feature branches */}
        {branches.map(({ path, nodeY, mergeY, delay }, idx) => (
          <React.Fragment key={idx}>
            <path
              className="grat-stroke grat-branch"
              data-graphic="grat-stroke"
              data-branch={idx}
              d={path}
              stroke={stroke}
              strokeWidth="1"
              strokeOpacity={0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 3"
              pathLength={1000}
              style={
                { animationDelay: `${delay * 200}ms` } as React.CSSProperties
              }
            />
            {/* Branch origin node */}
            <circle
              className="grat-node grat-branch-node"
              data-graphic="grat-node"
              cx={centerX}
              cy={nodeY}
              r={2.5}
              fill={stroke}
              fillOpacity={0.8}
              style={
                {
                  animationDelay: `${delay * 200 + 300}ms`,
                } as React.CSSProperties
              }
            >
              <animate
                attributeName="r"
                values="0;2.5;2.5"
                dur="0.6s"
                begin={`${delay * 0.2 + 0.3}s`}
                fill="freeze"
              />
            </circle>
            {/* Merge node */}
            <circle
              className="grat-node grat-merge-node"
              data-graphic="grat-node"
              cx={centerX}
              cy={mergeY}
              r={3}
              fill={stroke}
              fillOpacity={0.9}
              style={
                {
                  animationDelay: `${delay * 200 + 500}ms`,
                } as React.CSSProperties
              }
            >
              <animate
                attributeName="r"
                values="0;3;3"
                dur="0.5s"
                begin={`${delay * 0.2 + 0.5}s`}
                fill="freeze"
              />
              <animate
                attributeName="fill-opacity"
                values="0.9;0.3;0.9"
                dur="1.5s"
                begin={`${delay * 0.2 + 0.5}s`}
                repeatCount="indefinite"
              />
            </circle>
          </React.Fragment>
        ))}

        {/* Trunk commit nodes */}
        {commitNodes.map(({ y, isMerge, delay }, idx) => (
          <circle
            key={idx}
            className="grat-node grat-commit-node"
            data-graphic="grat-node"
            cx={centerX}
            cy={y}
            r={isMerge ? 3.5 : 2}
            fill={stroke}
            fillOpacity={isMerge ? 0.95 : 0.7}
            style={
              { animationDelay: `${delay * 1000}ms` } as React.CSSProperties
            }
          >
            <animate
              attributeName="r"
              values="0;{isMerge ? 3.5 : 2};{isMerge ? 3.5 : 2}"
              dur="0.4s"
              begin={`${delay}s`}
              fill="freeze"
            />
            {isMerge && (
              <animate
                attributeName="fill-opacity"
                values="0.95;0.4;0.95"
                dur="2s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        ))}
      </g>
    </svg>
  );
}
