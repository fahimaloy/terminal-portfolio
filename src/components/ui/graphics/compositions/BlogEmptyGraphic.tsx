import React, { useEffect, useRef } from 'react';
import { createScope, animate, createDrawable, stagger } from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
} from '../../../../config/animations';
import MorphOrb from '../primitives/MorphOrb';
import HairlineDivider from '../primitives/HairlineDivider';
import Bracket from '../primitives/Bracket';

export interface BlogEmptyGraphicProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: 'empty' | 'no-results';
}

/**
 * BlogEmptyGraphic — stacked cards/book + search icon + tiny MorphOrb orb.
 * Uses primitives MorphOrb, HairlineDivider, Bracket via var(--*) tokens only.
 * Exposes grat-* selectors for drawable scopes. Idle createDrawable loop
 * gated by isReducedMotion/canAnimate.
 */
export default function BlogEmptyGraphic({
  className,
  style,
  variant = 'empty',
}: BlogEmptyGraphicProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isNoResults = variant === 'no-results';
  const accent = (isNoResults ? 'cyan' : 'magenta') as
    | 'yellow'
    | 'magenta'
    | 'cyan'
    | 'green'
    | 'purple'
    | 'blue';

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
            delay: stagger(durations.stagger * 1000 * 0.38, { from: 'first' }),
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
          }, durations.draw * 1000 + durations.stagger * 1000 * 3);
        } catch {
          animate(strokes as unknown as HTMLElement[], {
            opacity: [0, 1],
            duration: durations.enter * 1000,
            ease: (easings.smooth as unknown as string) ?? 'linear',
            delay: stagger(durations.stagger * 1000 * 0.3, { from: 'first' }),
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
          delay: stagger(durations.stagger * 1000 * 0.5, { from: 'first' }),
        });
      }

      const searchEls =
        root.querySelectorAll<HTMLElement>('[data-search-icon]');
      if (searchEls.length) {
        animate(searchEls, {
          opacity: [0, 1],
          scale: [0.92, 1],
          duration: durations.enter * 1000 * 0.45,
          ease: (easings.smooth as unknown as string) ?? 'linear',
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
      data-graphic="blog-empty"
      className={className}
      style={style}
    >
      <div className="relative w-full max-w-[360px] mx-auto">
        {/* tiny MorphOrb orb — inset at card corner */}
        <div className="pointer-events-none absolute -top-3 right-4 opacity-60">
          <MorphOrb accent={accent} size={64} />
        </div>
        <div className="pointer-events-none absolute -bottom-2 -left-2 opacity-40">
          <MorphOrb accent={accent} size={44} />
        </div>

        {/* stacked cards/book container */}
        <div
          className="relative rounded-[var(--radius-lg)] border overflow-hidden"
          style={{
            background: 'var(--bg-2)',
            borderColor: 'var(--hairline)',
          }}
        >
          <Bracket
            accent={accent as never}
            className="pointer-events-none absolute inset-0 opacity-40"
            strokeWidth={1}
          />

          <svg
            viewBox="0 0 320 148"
            preserveAspectRatio="xMidYMid meet"
            className="block w-full"
            aria-hidden="true"
          >
            {/* stacked book spine */}
            <rect
              x="14"
              y="18"
              width="10"
              height="112"
              rx="2"
              ry="2"
              fill="var(--bg-3)"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="19"
              y1="28"
              x2="19"
              y2="42"
              stroke="var(--fg-4)"
              strokeWidth={1}
              opacity={0.5}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="19"
              y1="50"
              x2="19"
              y2="66"
              stroke="var(--fg-4)"
              strokeWidth={1}
              opacity={0.32}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />

            {/* stacked cards — bottom */}
            <rect
              x="36"
              y="34"
              width="156"
              height="82"
              rx="7"
              ry="7"
              fill="var(--bg-3)"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-fill grat-stroke"
              data-graphic="grat-stroke"
            />
            {/* middle */}
            <rect
              x="28"
              y="26"
              width="156"
              height="82"
              rx="7"
              ry="7"
              fill="var(--bg-3)"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-fill grat-stroke"
              data-graphic="grat-stroke"
            />
            {/* top — main */}
            <rect
              x="20"
              y="18"
              width="156"
              height="82"
              rx="7"
              ry="7"
              fill="var(--bg-2)"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            {/* top card inner lines */}
            <line
              x1="36"
              y1="38"
              x2="88"
              y2="38"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.9}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="36"
              y1="52"
              x2="148"
              y2="52"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.5}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="36"
              y1="66"
              x2="132"
              y2="66"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.34}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="36"
              y1="80"
              x2="118"
              y2="80"
              stroke="var(--fg-3)"
              strokeWidth={1.2}
              opacity={0.28}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />

            {/* search icon — magnifier overlapping stack */}
            <g data-search-icon>
              <circle
                cx="214"
                cy="64"
                r="26"
                fill="var(--bg-2)"
                stroke="var(--hairline)"
                strokeWidth={1.2}
                className="grat-stroke"
                data-graphic="grat-stroke"
              />
              <circle
                cx="214"
                cy="64"
                r="18"
                fill="none"
                stroke="var(--fg-3)"
                strokeWidth={1.4}
                opacity={0.9}
                className="grat-stroke"
                data-graphic="grat-stroke"
              />
              <line
                x1="228"
                y1="78"
                x2="244"
                y2="94"
                stroke="var(--fg-3)"
                strokeWidth={2.2}
                strokeLinecap="round"
                opacity={0.9}
                className="grat-stroke"
                data-graphic="grat-stroke"
              />
              <line
                x1="204"
                y1="64"
                x2="224"
                y2="64"
                stroke="var(--fg-4)"
                strokeWidth={1}
                opacity={isNoResults ? 0.85 : 0}
                className="grat-stroke"
                data-graphic="grat-stroke"
              />
              <line
                x1="214"
                y1="54"
                x2="214"
                y2="74"
                stroke="var(--fg-4)"
                strokeWidth={1}
                opacity={isNoResults ? 0.85 : 0}
                className="grat-stroke"
                data-graphic="grat-stroke"
              />
              {/* tiny sparkle */}
              <circle
                cx="242"
                cy="38"
                r="2.2"
                fill="var(--fg-4)"
                opacity={0.6}
                className="grat-fill"
                data-graphic="grat-fill"
              />
              <circle
                cx="252"
                cy="48"
                r="1.4"
                fill="var(--fg-4)"
                opacity={0.4}
                className="grat-fill"
                data-graphic="grat-fill"
              />
            </g>

            {/* right-side subtle card wash */}
            <rect
              x="198"
              y="96"
              width="104"
              height="32"
              rx="6"
              ry="6"
              fill="var(--glow-cyan-zone)"
              stroke="var(--hairline)"
              strokeWidth={1}
              className="grat-fill grat-stroke"
              data-graphic="grat-fill"
            />
            <line
              x1="210"
              y1="108"
              x2="288"
              y2="108"
              stroke="var(--fg-4)"
              strokeWidth={1}
              opacity={0.45}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
            <line
              x1="210"
              y1="118"
              x2="272"
              y2="118"
              stroke="var(--fg-4)"
              strokeWidth={1}
              opacity={0.28}
              className="grat-stroke"
              data-graphic="grat-stroke"
            />
          </svg>

          <HairlineDivider accent={accent as never} className="opacity-60" />

          <div className="flex items-center justify-center gap-1.5 px-3 py-2.5">
            <span
              className="inline-block rounded-full border"
              style={{
                width: 6,
                height: 6,
                background: `var(--ring-${accent})`,
                borderColor: 'var(--hairline)',
              }}
              aria-hidden="true"
            />
            <span
              className="font-mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--fg-4)' }}
            >
              {isNoResults ? 'NO MATCHES' : 'STACK EMPTY'}
            </span>
            <span
              className="font-mono text-[10px]"
              style={{ color: 'var(--fg-4)', opacity: 0.5 }}
            >
              ·
            </span>
            <span
              className="font-mono text-[10px] tracking-[0.12em]"
              style={{ color: 'var(--fg-4)' }}
            >
              TRY ANOTHER QUERY
            </span>
          </div>
        </div>
      </div>

      <div
        className="mt-3 text-center font-mono text-[10px] tracking-[0.2em]"
        style={{ color: 'var(--fg-4)' }}
      >
        {isNoResults
          ? 'NO MATCHES — TRY ANOTHER QUERY'
          : 'NO TRANSMISSIONS YET'}
      </div>
    </div>
  );
}
