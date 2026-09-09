import React, { useEffect, useRef } from 'react';
import { createScope, animate, createDrawable, stagger } from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
} from '../../../../config/animations';
import MorphOrb from '../primitives/MorphOrb';
import Bracket from '../primitives/Bracket';
import HairlineDivider from '../primitives/HairlineDivider';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface HeroEmptyGraphicProps {
  className?: string;
  style?: React.CSSProperties;
  accent?: Accent;
}

/**
 * HeroEmptyGraphic — wireframe terminal + floating chips + mini morph orb.
 * Uses primitives MorphOrb, HairlineDivider, Bracket via var(--*) tokens only.
 * Exposes data-graphic selectors 'grat-stroke' / 'grat-fill' for drawables.
 * Static SVG first; subtle createDrawable idle loop gated by isReducedMotion.
 */
export default function HeroEmptyGraphic({
  className,
  style,
  accent = 'cyan',
}: HeroEmptyGraphicProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (isReducedMotion() || !canAnimate()) return;

    const scope = createScope({ root });
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    scope.add(() => {
      const strokes = root.querySelectorAll<SVGGeometryElement>(
        '[data-graphic="grat-stroke"]',
      );
      if (strokes.length) {
        try {
          const drawables = createDrawable('[data-graphic="grat-stroke"]');
          animate(drawables, {
            draw: ['0 0', '0 1'],
            duration: durations.draw * 1000,
            ease: (easings.smooth as unknown as string) ?? 'linear',
            delay: stagger(durations.stagger * 1000 * 0.45, { from: 'first' }),
          });
          idleTimer = setTimeout(() => {
            try {
              animate(drawables, {
                draw: ['0 1', '0.02 0.98', '0 1'],
                duration: durations.pulse * 1000,
                ease: (easings.smooth as unknown as string) ?? 'linear',
                loop: true,
                alternate: true,
              });
            } catch {
              // ignore idle loop failure
            }
          }, durations.draw * 1000 + durations.stagger * 1000 * 5);
        } catch {
          animate(strokes as unknown as HTMLElement[], {
            opacity: [0, 1],
            duration: durations.enter * 1000,
            ease: (easings.smooth as unknown as string) ?? 'linear',
            delay: stagger(durations.stagger * 1000 * 0.38, { from: 'first' }),
          });
        }
      }

      const fills = root.querySelectorAll<HTMLElement>(
        '[data-graphic="grat-fill"]',
      );
      if (fills.length) {
        animate(fills, {
          opacity: [0, 1],
          duration: durations.enter * 1000 * 0.5,
          ease: (easings.smooth as unknown as string) ?? 'linear',
          delay: stagger(durations.stagger * 1000 * 0.62, { from: 'first' }),
        });
      }

      const chips = root.querySelectorAll<HTMLElement>('[data-chip]');
      if (chips.length) {
        animate(chips, {
          opacity: [0, 1],
          y: [6, 0],
          scale: [0.96, 1],
          duration: durations.enter * 1000 * 0.45,
          ease: (easings.smooth as unknown as string) ?? 'linear',
          delay: stagger(durations.stagger * 1000 * 0.62, { from: 'first' }),
        });
      }
    });

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      scope.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-graphic="hero-empty"
      className={className}
      style={style}
    >
      <div className="relative w-full max-w-[360px] mx-auto">
        {/* mini morph orb behind terminal */}
        <div className="pointer-events-none absolute -top-6 right-0 opacity-70">
          <MorphOrb accent={accent as never} size={92} />
        </div>

        {/* terminal card */}
        <div
          className="relative rounded-[var(--radius-lg)] border overflow-hidden"
          style={{
            background: 'var(--bg-2)',
            borderColor: 'var(--hairline)',
          }}
        >
          <Bracket
            accent={accent as never}
            className="pointer-events-none absolute inset-0 opacity-60"
            strokeWidth={1.1}
          />

          <svg
            viewBox="0 0 320 148"
            preserveAspectRatio="xMidYMid meet"
            className="block w-full"
            aria-hidden="true"
          >
            {/* outer frame */}
            <rect
              x="12"
              y="10"
              width="296"
              height="126"
              rx="8"
              ry="8"
              fill="var(--bg-2)"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            {/* title bar divider */}
            <line
              x1="12"
              y1="34"
              x2="308"
              y2="34"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            {/* window dots - static fills */}
            <circle cx="28" cy="22" r="4.5" fill="var(--fg-4)" opacity={0.9} />
            <circle cx="42" cy="22" r="4.5" fill="var(--fg-4)" opacity={0.55} />
            <circle cx="56" cy="22" r="4.5" fill="var(--fg-4)" opacity={0.28} />
            {/* code lines */}
            <line
              x1="22"
              y1="54"
              x2="74"
              y2="54"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.95}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="22"
              y1="68"
              x2="148"
              y2="68"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.55}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="22"
              y1="82"
              x2="132"
              y2="82"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.38}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="22"
              y1="96"
              x2="168"
              y2="96"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.45}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="22"
              y1="110"
              x2="96"
              y2="110"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.3}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            {/* right panel wash */}
            <rect
              x="188"
              y="46"
              width="112"
              height="68"
              rx="6"
              ry="6"
              fill="var(--glow-cyan-zone)"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-fill grat-stroke"
              data-graphic="grat-fill"
            />
            <rect
              x="188"
              y="46"
              width="112"
              height="68"
              rx="6"
              ry="6"
              fill="none"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="198"
              y1="62"
              x2="288"
              y2="62"
              stroke="var(--fg-4)"
              strokeWidth={1}
              opacity={0.6}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="198"
              y1="76"
              x2="272"
              y2="76"
              stroke="var(--fg-4)"
              strokeWidth={1}
              opacity={0.35}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="198"
              y1="90"
              x2="284"
              y2="90"
              stroke="var(--fg-4)"
              strokeWidth={1}
              opacity={0.42}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            {/* cursor */}
            <rect
              x="74"
              y="48"
              width="7"
              height="10"
              rx="1"
              fill="var(--fg-1)"
              opacity={0.9}
              className="grat-fill"
              data-graphic="grat-fill"
            />
          </svg>

          <HairlineDivider accent={accent as never} className="opacity-70" />

          <div className="flex items-center justify-center gap-2 px-3 py-3">
            <div
              data-chip
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em]"
              style={{
                background: 'var(--bg-3)',
                borderColor: 'var(--hairline)',
                color: 'var(--fg-3)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '9999px',
                  background: 'var(--ring-cyan)',
                  display: 'inline-block',
                }}
              />
              config
            </div>
            <div
              data-chip
              className="inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em]"
              style={{
                background: 'var(--bg-3)',
                borderColor: 'var(--hairline)',
                color: 'var(--fg-3)',
              }}
            >
              npm run dev
            </div>
            <div
              data-chip
              className="inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em]"
              style={{
                background: 'var(--bg-3)',
                borderColor: 'var(--hairline)',
                color: 'var(--fg-3)',
              }}
            >
              0 → 1
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-3 text-center font-mono text-[10px] tracking-[0.2em]"
        style={{ color: 'var(--fg-4)' }}
      >
        READY — ASK ANYTHING
      </div>
    </div>
  );
}
