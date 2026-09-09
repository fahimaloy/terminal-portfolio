import React from 'react';
import MorphOrb from '../primitives/MorphOrb';
import Bracket from '../primitives/Bracket';

export interface NotFoundGraphicProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * NotFoundGraphic — small morph orb behind glitch text + bracket drawable frame.
 * Token-only: colors via var(--*) (var(--ring-*), var(--aurora-*), var(--border-subtle), var(--fg-*)).
 * Exposes data-graphic grat-stroke / grat-fill selectors via MorphOrb + Bracket.
 * Props: className? style? No raw hex/rgba.
 * Keep simple: absolute positioned container with MorphOrb (accent magenta/cyan) at center-behind,
 * Bracket frame around edges with grat-stroke. Parent should be relative; this fills it when inset-0.
 */
export default function NotFoundGraphic({
  className,
  style,
}: NotFoundGraphicProps) {
  return (
    <div
      aria-hidden="true"
      data-graphic="notfound-graphic"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        ...style,
      }}
    >
      {/* Aurora wash behind orb — token-only var(--aurora-*) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 280,
          height: 280,
          background: 'var(--aurora-1)',
          filter: 'blur(48px)',
          opacity: 0.07,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 220,
          height: 220,
          background: 'var(--aurora-2)',
          filter: 'blur(44px)',
          opacity: 0.06,
        }}
      />
      {/* Center-behind morph orb — accent magenta (primary) + subtle cyan offset for depth */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-55">
        <MorphOrb accent="magenta" size={220} />
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 translate-x-4 translate-y-3">
        <MorphOrb accent="cyan" size={148} />
      </div>
      {/* Bracket drawable frame — strokes are grat-stroke via Bracket's data-graphic */}
      <Bracket
        className="notfound-bracket absolute inset-0 opacity-60"
        strokeWidth={1.15}
      />
    </div>
  );
}
