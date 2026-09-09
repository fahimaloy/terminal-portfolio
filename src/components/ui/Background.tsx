// src/components/ui/Background.tsx
/* Warm ambient background — soft washes, scroll-scrubbed morph dekor, no neon zones.
   Aurora mesh layer (var(--aurora-*), blur 40-80px, 0.06-0.12) drifts with spring
   easing behind morph shapes; TronGrid/ParticleField softened for hero readability. */

import React, { useEffect, useRef } from 'react';
import {
  animate,
  createScope,
  createTimeline,
  createDrawable,
  morphTo,
  onScroll,
  spring,
  stagger,
} from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  drawPreset,
  morphPreset,
  durations,
  easings,
  springs,
} from '../../config/animations';
import TronGrid from './TronGrid';
import ScanlineOverlay from './ScanlineOverlay';
import ParticleField from './ParticleField';

export type BackgroundVariant = 'default' | 'hero' | 'blog';

const MORPH_PATHS = [
  'M50,10 C80,10 90,30 90,50 C90,70 80,90 50,90 C20,90 10,70 10,50 C10,30 20,10 50,10',
  'M50,5 C90,15 95,50 85,80 C75,95 40,95 20,80 C5,65 5,35 15,20 C25,10 40,5 50,5',
  'M50,15 C75,15 85,35 85,55 C85,75 70,85 50,85 C30,85 15,70 15,50 C15,30 30,15 50,15',
];

type BackgroundProps = {
  variant?: BackgroundVariant;
};

export default function Background({ variant = 'default' }: BackgroundProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const isHero = variant === 'hero';
  const isBlog = variant === 'blog';

  useEffect(() => {
    if (!bgRef.current) return;
    if (isReducedMotion() || !canAnimate()) return;

    const scope = createScope({ root: bgRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const shapes =
        bgRef.current!.querySelectorAll<SVGPathElement>('.bg-morph-shape');
      if (shapes.length !== 0) {
        const tl = createTimeline({
          defaults: { ease: drawPreset.ease },
        });

        const drawables = createDrawable('.bg-morph-shape');
        tl.add(
          drawables,
          {
            draw: ['0 0', drawPreset.draw],
            duration: durations.draw * 1000,
            ease: drawPreset.ease,
            delay: stagger(durations.stagger * 1000, { from: 'first' }),
          },
          0,
        );

        // Scroll-scrubbed morph — warm washes, not neon zones (preserve shapes[3] logic)
        shapes.forEach((shape, i) => {
          tl.add(
            shape,
            {
              d: morphTo(`#bg-morph-target-${(i + 1) % MORPH_PATHS.length}`),
              duration: durations.morph * 1000,
              ease: morphPreset.ease,
              autoplay: onScroll({ sync: true }),
            } as any,
            0,
          );
        });
      }

      // Aurora spring drift — gated: skip when prefers-reduced-motion or blog (muted)
      if (!isBlog) {
        const auroras =
          bgRef.current!.querySelectorAll<HTMLElement>('.bg-aurora-blob');
        if (auroras.length !== 0) {
          const driftEase = spring(springs.soft) as unknown as string;
          auroras.forEach((el, i) => {
            const dx = i % 2 === 0 ? 18 : -16;
            const dy = i % 2 === 0 ? -14 : 16;
            animate(el, {
              translateX: [0, dx, 0],
              translateY: [0, dy, 0],
              duration: 16000 + i * 1400,
              loop: true,
              alternate: true,
              ease: driftEase ?? easings.smooth,
              delay: i * 180,
            });
          });
        }
      }
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [variant]);

  // Whether aurora drift is active — blog is muted/static to reduce motion + composite cost
  const driftActive = !isBlog;

  // Opacities kept 0.06-0.12 spec; hero slightly higher, blog more muted
  const auroraOpacities = isHero
    ? { a1: 0.12, a2: 0.1, a3: 0.09, a4: 0.09 }
    : isBlog
    ? { a1: 0.06, a2: 0.05, a3: 0.05, a4: 0.04 }
    : { a1: 0.09, a2: 0.08, a3: 0.07, a4: 0.06 };

  const auroraBlurs = isHero
    ? { b1: '64px', b2: '72px', b3: '80px', b4: '56px' }
    : isBlog
    ? { b1: '40px', b2: '48px', b3: '40px', b4: '40px' }
    : { b1: '48px', b2: '56px', b3: '40px', b4: '48px' };

  return (
    <div ref={bgRef} className="fixed inset-0 z-0" aria-hidden="true">
      {/* Base — warm charcoal washes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--bg-2) 0%, var(--bg-1) 62%, var(--bg-1) 100%)',
        }}
      />
      {/* Subtle warm vignette wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 18%, var(--bg-3) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 80% 85%, var(--overlay-white-015) 0%, transparent 60%)',
        }}
      />

      {/* Aurora mesh — premium depth washes behind morph shapes (blur 40-80px, token-only) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="bg-aurora-blob absolute rounded-full"
          style={{
            top: isHero ? '-10%' : '-6%',
            left: isHero ? '-6%' : '-2%',
            width: isHero ? '58%' : '48%',
            height: isHero ? '62%' : '52%',
            borderRadius: '9999px',
            background:
              'radial-gradient(ellipse at center, var(--aurora-1) 0%, transparent 72%)',
            filter: `blur(${auroraBlurs.b1})`,
            opacity: auroraOpacities.a1,
            willChange: driftActive ? 'transform' : undefined,
          }}
        />
        <div
          className="bg-aurora-blob absolute rounded-full"
          style={{
            top: isHero ? '-8%' : '-4%',
            right: isHero ? '-8%' : '-4%',
            width: isHero ? '52%' : '42%',
            height: isHero ? '56%' : '44%',
            borderRadius: '9999px',
            background:
              'radial-gradient(ellipse at center, var(--aurora-2) 0%, transparent 72%)',
            filter: `blur(${auroraBlurs.b2})`,
            opacity: auroraOpacities.a2,
            willChange: driftActive ? 'transform' : undefined,
          }}
        />
        <div
          className="bg-aurora-blob absolute rounded-full"
          style={{
            bottom: isHero ? '-12%' : '-8%',
            left: isHero ? '8%' : '12%',
            width: isHero ? '60%' : '46%',
            height: isHero ? '54%' : '40%',
            borderRadius: '9999px',
            background:
              'radial-gradient(ellipse at center, var(--aurora-3) 0%, transparent 72%)',
            filter: `blur(${auroraBlurs.b3})`,
            opacity: auroraOpacities.a3,
            willChange: driftActive ? 'transform' : undefined,
          }}
        />
        <div
          className="bg-aurora-blob absolute rounded-full"
          style={{
            bottom: isHero ? '-10%' : '-6%',
            right: isHero ? '6%' : '10%',
            width: isHero ? '48%' : '38%',
            height: isHero ? '48%' : '36%',
            borderRadius: '9999px',
            background:
              'radial-gradient(ellipse at center, var(--aurora-4) 0%, transparent 72%)',
            filter: `blur(${auroraBlurs.b4})`,
            opacity: auroraOpacities.a4,
            willChange: driftActive ? 'transform' : undefined,
          }}
        />
      </div>

      {/* Morphing SVG shapes — warm border-subtle, very low opacity */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient
            id="bg-shape-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--border-subtle)" />
            <stop offset="100%" stopColor="var(--fg-3)" />
          </linearGradient>
          {MORPH_PATHS.map((d, i) => (
            <path
              key={`bg-morph-target-${i}`}
              id={`bg-morph-target-${i}`}
              d={d}
              fill="none"
              stroke="none"
            />
          ))}
        </defs>
        <path
          className="bg-morph-shape"
          d={MORPH_PATHS[0]}
          fill="none"
          stroke="url(#bg-shape-grad)"
          strokeWidth="0.5"
          transform="translate(100, 100) scale(1.5)"
        />
        <path
          className="bg-morph-shape"
          d={MORPH_PATHS[1]}
          fill="none"
          stroke="url(#bg-shape-grad)"
          strokeWidth="0.5"
          transform="translate(600, 300) scale(2)"
        />
        <path
          className="bg-morph-shape"
          d={MORPH_PATHS[2]}
          fill="none"
          stroke="url(#bg-shape-grad)"
          strokeWidth="0.5"
          transform="translate(300, 600) scale(1.8)"
        />
      </svg>

      <TronGrid />
      <ParticleField />
      <ScanlineOverlay />

      {/* Vignette — warm */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 42%, var(--overlay-60) 92%)',
        }}
      />
    </div>
  );
}
