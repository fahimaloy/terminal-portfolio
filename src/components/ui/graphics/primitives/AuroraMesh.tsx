import React from 'react';

export interface AuroraMeshProps {
  variant?: 'hero' | 'subtle';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * AuroraMesh — large blurred radial mesh via absolutely positioned circles.
 * Uses var(--aurora-1..4) with blur(40-80px) and low opacity (0.06-0.12).
 * Static only, no anime.js.
 */
export default function AuroraMesh({
  variant,
  className,
  style,
}: AuroraMeshProps) {
  const isHero = variant === 'hero';
  const isSubtle = variant === 'subtle';

  // Opacity tuned per variant within 0.06-0.12 spec
  const baseOpacity = isHero ? 0.11 : isSubtle ? 0.06 : 0.09;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Top-left wash */}
      <div
        style={{
          position: 'absolute',
          top: isHero ? '-10%' : '-6%',
          left: isHero ? '-6%' : '-2%',
          width: isHero ? '58%' : '48%',
          height: isHero ? '62%' : '52%',
          borderRadius: '9999px',
          background:
            'radial-gradient(ellipse at center, var(--aurora-1) 0%, transparent 72%)',
          filter: isHero ? 'blur(64px)' : 'blur(48px)',
          opacity: baseOpacity,
        }}
      />
      {/* Top-right wash */}
      <div
        style={{
          position: 'absolute',
          top: isHero ? '-8%' : '-4%',
          right: isHero ? '-8%' : '-4%',
          width: isHero ? '52%' : '42%',
          height: isHero ? '56%' : '44%',
          borderRadius: '9999px',
          background:
            'radial-gradient(ellipse at center, var(--aurora-2) 0%, transparent 72%)',
          filter: isHero ? 'blur(72px)' : 'blur(56px)',
          opacity: isSubtle ? 0.06 : 0.08,
        }}
      />
      {/* Bottom-left wash */}
      <div
        style={{
          position: 'absolute',
          bottom: isHero ? '-12%' : '-8%',
          left: isHero ? '8%' : '12%',
          width: isHero ? '60%' : '46%',
          height: isHero ? '54%' : '40%',
          borderRadius: '9999px',
          background:
            'radial-gradient(ellipse at center, var(--aurora-3) 0%, transparent 72%)',
          filter: isHero ? 'blur(80px)' : 'blur(40px)',
          opacity: isSubtle ? 0.06 : 0.07,
        }}
      />
      {/* Bottom-right wash */}
      <div
        style={{
          position: 'absolute',
          bottom: isHero ? '-10%' : '-6%',
          right: isHero ? '6%' : '10%',
          width: isHero ? '48%' : '38%',
          height: isHero ? '48%' : '36%',
          borderRadius: '9999px',
          background:
            'radial-gradient(ellipse at center, var(--aurora-4) 0%, transparent 72%)',
          filter: isHero ? 'blur(56px)' : 'blur(48px)',
          opacity: isHero ? 0.09 : 0.06,
        }}
      />
    </div>
  );
}
