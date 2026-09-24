import React from 'react';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface CircuitTracesProps {
  accent?: Accent;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CircuitTraces — animated PCB-style circuit traces
 * Lines with nodes/capacitors/resistors drawing in sequence
 * Selectors: .grat-circuit, .grat-stroke, .grat-node
 */
export default function CircuitTraces({
  accent = 'yellow',
  size,
  className,
  style,
}: CircuitTracesProps) {
  const stroke = `var(--ring-${accent})`;
  const dim = size ? { width: size, height: size } : undefined;
  const centerX = 50;
  const centerY = 50;

  // Circuit paths - main horizontal + vertical traces with branches
  const traces = [
    // Main horizontal trace
    {
      path: `M 10 ${centerY} L 90 ${centerY}`,
      delay: 0,
      nodes: [
        { x: 25, y: centerY, type: 'chip' },
        { x: 50, y: centerY, type: 'via' },
        { x: 75, y: centerY, type: 'chip' },
      ],
    },
    // Upper horizontal trace
    {
      path: `M 15 ${centerY - 20} L 85 ${centerY - 20}`,
      delay: 1,
      nodes: [
        { x: 30, y: centerY - 20, type: 'capacitor' },
        { x: 70, y: centerY - 20, type: 'resistor' },
      ],
    },
    // Lower horizontal trace
    {
      path: `M 15 ${centerY + 20} L 85 ${centerY + 20}`,
      delay: 2,
      nodes: [
        { x: 30, y: centerY + 20, type: 'resistor' },
        { x: 70, y: centerY + 20, type: 'capacitor' },
      ],
    },
    // Vertical interconnects
    {
      path: `M 25 ${centerY - 20} L 25 ${centerY}`,
      delay: 3,
      nodes: [],
    },
    {
      path: `M 50 ${centerY - 20} L 50 ${centerY + 20}`,
      delay: 4,
      nodes: [{ x: 50, y: centerY, type: 'via' }],
    },
    {
      path: `M 75 ${centerY} L 75 ${centerY + 20}`,
      delay: 5,
      nodes: [],
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
      data-graphic="grat-circuit"
    >
      <g className="grat-circuit" data-graphic="grat-circuit">
        {/* Traces */}
        {traces.map(({ path, delay, nodes }, traceIdx) => (
          <React.Fragment key={traceIdx}>
            <path
              className="grat-stroke grat-trace"
              data-graphic="grat-stroke"
              data-trace={traceIdx}
              d={path}
              stroke={stroke}
              strokeWidth="1"
              strokeOpacity={0.7}
              strokeLinecap="round"
              pathLength={1000}
              style={
                { animationDelay: `${delay * 150}ms` } as React.CSSProperties
              }
            >
              <animate
                attributeName="stroke-dashoffset"
                from="1000"
                to="0"
                dur="0.6s"
                begin={`${delay * 0.15}s`}
                fill="freeze"
              />
            </path>

            {/* Nodes on this trace */}
            {nodes.map(({ x, y, type }, nodeIdx) => (
              <React.Fragment key={nodeIdx}>
                {type === 'chip' && (
                  <g
                    className="grat-node grat-chip"
                    data-graphic="grat-node"
                    style={
                      {
                        animationDelay: `${
                          delay * 150 + 500 + nodeIdx * 100
                        }ms`,
                      } as React.CSSProperties
                    }
                  >
                    <rect
                      x={x - 6}
                      y={y - 4}
                      width={12}
                      height={8}
                      fill="none"
                      stroke={stroke}
                      strokeWidth="1"
                      strokeOpacity={0.8}
                      rx={1}
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="1000"
                        to="0"
                        dur="0.3s"
                        begin={`${delay * 0.15 + 0.5 + nodeIdx * 0.1}s`}
                        fill="freeze"
                      />
                    </rect>
                    {/* Chip pins */}
                    <line
                      x1={x - 6}
                      y1={y - 6}
                      x2={x - 6}
                      y2={y - 10}
                      stroke={stroke}
                      strokeWidth="0.6"
                      strokeOpacity={0.6}
                    />
                    <line
                      x1={x + 6}
                      y1={y - 6}
                      x2={x + 6}
                      y2={y - 10}
                      stroke={stroke}
                      strokeWidth="0.6"
                      strokeOpacity={0.6}
                    />
                    <line
                      x1={x - 6}
                      y1={y + 6}
                      x2={x - 6}
                      y2={y + 10}
                      stroke={stroke}
                      strokeWidth="0.6"
                      strokeOpacity={0.6}
                    />
                    <line
                      x1={x + 6}
                      y1={y + 6}
                      x2={x + 6}
                      y2={y + 10}
                      stroke={stroke}
                      strokeWidth="0.6"
                      strokeOpacity={0.6}
                    />
                  </g>
                )}
                {type === 'via' && (
                  <circle
                    className="grat-node grat-via"
                    data-graphic="grat-node"
                    cx={x}
                    cy={y}
                    r={2.5}
                    fill={stroke}
                    fillOpacity={0.9}
                    style={
                      {
                        animationDelay: `${
                          delay * 150 + 500 + nodeIdx * 100
                        }ms`,
                      } as React.CSSProperties
                    }
                  >
                    <animate
                      attributeName="r"
                      values="0;2.5;2.5"
                      dur="0.3s"
                      begin={`${delay * 0.15 + 0.5 + nodeIdx * 0.1}s`}
                      fill="freeze"
                    />
                    <animate
                      attributeName="fill-opacity"
                      values="0.9;0.3;0.9"
                      dur="1.5s"
                      begin={`${delay * 0.15 + 0.5 + nodeIdx * 0.1}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {type === 'capacitor' && (
                  <g
                    className="grat-node grat-capacitor"
                    data-graphic="grat-node"
                    style={
                      {
                        animationDelay: `${
                          delay * 150 + 500 + nodeIdx * 100
                        }ms`,
                      } as React.CSSProperties
                    }
                  >
                    <line
                      x1={x - 4}
                      y1={y - 6}
                      x2={x - 4}
                      y2={y + 6}
                      stroke={stroke}
                      strokeWidth="1.2"
                      strokeOpacity={0.8}
                    />
                    <line
                      x1={x + 4}
                      y1={y - 6}
                      x2={x + 4}
                      y2={y + 6}
                      stroke={stroke}
                      strokeWidth="1.2"
                      strokeOpacity={0.8}
                    />
                    <line
                      x1={x - 6}
                      y1={y}
                      x2={x + 6}
                      y2={y}
                      stroke={stroke}
                      strokeWidth="0.6"
                      strokeOpacity={0.5}
                      strokeDasharray="2 1"
                    />
                  </g>
                )}
                {type === 'resistor' && (
                  <path
                    className="grat-node grat-resistor"
                    data-graphic="grat-node"
                    d={`M ${x - 6} ${y} 
                       L ${x - 3} ${y}
                       Q ${x - 2} ${y - 4} ${x - 1} ${y}
                       Q ${x} ${y + 4} ${x + 1} ${y}
                       Q ${x + 2} ${y - 4} ${x + 3} ${y}
                       L ${x + 6} ${y}`}
                    stroke={stroke}
                    strokeWidth="1"
                    strokeOpacity={0.8}
                    fill="none"
                    pathLength={1000}
                    style={
                      {
                        animationDelay: `${
                          delay * 150 + 500 + nodeIdx * 100
                        }ms`,
                      } as React.CSSProperties
                    }
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="1000"
                      to="0"
                      dur="0.4s"
                      begin={`${delay * 0.15 + 0.5 + nodeIdx * 0.1}s`}
                      fill="freeze"
                    />
                  </path>
                )}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
}
