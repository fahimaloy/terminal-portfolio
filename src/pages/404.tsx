// src/pages/404.tsx
/* 404 — premium with splitText + scrambleText + drawable bracket + morph orb */

import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { HudPanel, NeonButton, StatBar } from '../components/ui';
import {
  createScope,
  createTimeline,
  stagger,
  createDrawable,
  spring,
} from 'animejs';
import { splitText, scrambleText } from 'animejs';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../config/animations';
import MorphOrb from '../components/ui/graphics/primitives/MorphOrb';
import Bracket from '../components/ui/graphics/primitives/Bracket';

export default function NotFoundPage() {
  const router = useRouter();
  const [glitchText] = useState('404');
  const [particles, setParticles] = useState<
    { x: number; y: number; dur: number; delay: number; color: string }[]
  >([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const targetMsg =
    "THE PAGE YOU'RE LOOKING FOR ISN'T IN THE LOCAL NETWORK. THE ROUTE MAY HAVE BEEN DECOMMISSIONED OR NEVER EXISTED.";

  // Particles — reduced 20 -> 12, token-only colors
  useEffect(() => {
    const colors = [
      'var(--fg-3)',
      'var(--fg-4)',
      'var(--border-subtle)',
      'var(--border-strong)',
    ];
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        dur: 3 + Math.random() * 4,
        delay: Math.random() * 3,
        color: colors[i % 4],
      })),
    );
  }, []);

  // Premium motion: splitText cascades + bracket drawable + diag stagger + scrambleText
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const reduced = isReducedMotion() || !canAnimate();

    // Reduced-motion static fallback: show all content, static subtitle
    if (reduced) {
      if (subtitleRef.current) subtitleRef.current.textContent = targetMsg;
      const staticEls = root.querySelectorAll<HTMLElement>(
        '.diag-item, .notfound-btn',
      );
      staticEls.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      const headers = root.querySelectorAll<HTMLElement>(
        '[data-notfound="404"], [data-notfound="signal"], [data-notfound="notfound"]',
      );
      headers.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      // Clear any splitText char/word wrappers that may have been left from a
      // prior render / HMR to avoid flash of opacity-0 clipped chars
      const splitArtifacts = root.querySelectorAll<HTMLElement>(
        '[data-notfound="404"] span, [data-notfound="signal"] span, [data-notfound="notfound"] span',
      );
      splitArtifacts.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      const bracketStrokes = root.querySelectorAll<HTMLElement>(
        '.notfound-bracket [data-graphic="grat-stroke"]',
      );
      bracketStrokes.forEach((el) => {
        (el as unknown as SVGGeometryElement).style.opacity = '1';
      });
      return;
    }

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: durations.enter * 1000,
        ease: easings.expoOut,
      },
    } as Parameters<typeof createScope>[0]);
    scopeRef.current = scope;

    let splitter404: ReturnType<typeof splitText> | null = null;
    let splitterSignal: ReturnType<typeof splitText> | null = null;
    let splitterNotfound: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const el404 = root.querySelector<HTMLElement>('[data-notfound="404"]');
      const elSignal = root.querySelector<HTMLElement>(
        '[data-notfound="signal"]',
      );
      const elNotfound = root.querySelector<HTMLElement>(
        '[data-notfound="notfound"]',
      );
      const subtitleEl = subtitleRef.current;

      // Try splitText for cascades
      try {
        if (el404) {
          splitter404 = splitText(el404, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        splitter404 = null;
      }
      try {
        if (elSignal) {
          splitterSignal = splitText(elSignal, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        splitterSignal = null;
      }
      try {
        if (elNotfound) {
          splitterNotfound = splitText(elNotfound, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        splitterNotfound = null;
      }

      const chars404 = (splitter404?.chars as unknown as HTMLElement[]) ?? [];
      const charsSignal =
        (splitterSignal?.chars as unknown as HTMLElement[]) ?? [];
      const charsNotfound =
        (splitterNotfound?.chars as unknown as HTMLElement[]) ?? [];

      const bracketStrokes = root.querySelectorAll<SVGGeometryElement>(
        '.notfound-bracket [data-graphic="grat-stroke"]',
      );
      let bracketDrawables: unknown = [];
      try {
        if (bracketStrokes.length) {
          bracketDrawables = createDrawable(
            '.notfound-bracket [data-graphic="grat-stroke"]',
          );
        }
      } catch {
        bracketDrawables = [];
      }

      const diagItems = root.querySelectorAll<HTMLElement>('.diag-item');
      const btns = root.querySelectorAll<HTMLElement>('.notfound-btn');

      const tl = createTimeline({
        defaults: { ease: easings.expoOut },
      });

      // Bracket drawable frame — draw ['0 0','0 1']
      if (
        bracketDrawables &&
        (bracketDrawables as unknown as unknown[]).length !== 0
      ) {
        tl.add(
          bracketDrawables as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: durations.draw * 1000,
            ease: (easings.smooth as unknown as string) ?? 'linear',
          } as any,
          0,
        );
      } else if (bracketStrokes.length) {
        tl.add(
          bracketStrokes as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.45,
            delay: stagger(durations.stagger * 1000, { from: 'first' }),
          } as any,
          0,
        );
      }

      // 404 cascade — chars y clip stagger
      if (chars404.length) {
        tl.add(
          chars404,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.52,
            ease: easings.expoOut,
            delay: stagger(18, { from: 'first' }),
          } as any,
          stagger(70),
        );
      } else if (el404) {
        tl.add(el404, { y: [14, 0], opacity: [0, 1] }, stagger(70));
      }

      // SIGNAL_LOST cascade — from center
      if (charsSignal.length) {
        tl.add(
          charsSignal,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.46,
            ease: easings.expoOut,
            delay: stagger(20, { from: 'center' }),
          } as any,
          stagger(70),
        );
      } else if (elSignal) {
        tl.add(elSignal, { y: [12, 0], opacity: [0, 1] }, stagger(70));
      }

      // NOT_FOUND cascade — from first
      if (charsNotfound.length) {
        tl.add(
          charsNotfound,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.42,
            ease: easings.expoOut,
            delay: stagger(16, { from: 'first' }),
          } as any,
          stagger(60),
        );
      } else if (elNotfound) {
        tl.add(elNotfound, { y: [10, 0], opacity: [0, 1] }, stagger(60));
      }

      // Diagnostic items stagger
      if (diagItems.length) {
        tl.add(
          diagItems,
          {
            opacity: [0, 1],
            x: [-10, 0],
            duration: durations.enter * 1000 * 0.45,
            ease: easings.expoOut,
            delay: stagger(durations.stagger * 1000 * 0.45, {
              from: 'first',
            }),
          } as any,
          stagger(70),
        );
      }

      // Buttons spring
      if (btns.length) {
        const btnSpring = spring(
          springs.soft as unknown as Record<string, number>,
        ) as unknown as string;
        tl.add(
          btns,
          {
            opacity: [0, 1],
            y: [20, 0],
            scale: [0.9, 1],
            duration: durations.enter * 1000 * 0.42,
            ease: btnSpring ?? easings.expoOut,
            delay: stagger(22, { from: 'first' }),
          } as any,
          stagger(60, { from: 'first' }),
        );
      }

      // ScrambleText for subtitle — sequenced via tl to preserve stagger after headers
      if (subtitleEl) {
        const hasScramble = typeof scrambleText === 'function';
        if (hasScramble) {
          try {
            // Ensure starting content is the target so scramble knows end state
            subtitleEl.textContent = targetMsg;
            tl.add(
              subtitleEl,
              {
                innerHTML: scrambleText({
                  text: targetMsg,
                  chars: 'upper',
                  duration: durations.scramble * 1000,
                  ease: easings.expoOut,
                  from: 'left',
                  revealRate: 60,
                  settleDuration: 300,
                }),
                duration: durations.scramble * 1000,
                ease: easings.expoOut,
              } as any,
              stagger(70),
            );
          } catch {
            // Fallback to static if scramble fails
            subtitleEl.textContent = targetMsg;
          }
        } else {
          // Fallback interval (guarded, but scramble should be available)
          let index = 0;
          const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
          const interval = setInterval(() => {
            let result = '';
            for (let i = 0; i < targetMsg.length; i++) {
              if (i < index || targetMsg[i] === ' ') result += targetMsg[i];
              else result += chars[Math.floor(Math.random() * chars.length)];
            }
            subtitleEl.textContent = result;
            index++;
            if (index > targetMsg.length) clearInterval(interval);
          }, 20);
        }
      }
    });

    return () => {
      try {
        splitter404?.revert();
      } catch {}
      try {
        splitterSignal?.revert();
      } catch {}
      try {
        splitterNotfound?.revert();
      } catch {}
      scope.revert();
      scopeRef.current = null;
    };
  }, [targetMsg]);

  return (
    <>
      <Head>
        <title>404 // SIGNAL_LOST | Fahimaloy Portfolio</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div
        ref={pageRef}
        className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      >
        {/* Floating particles — 12 dots */}
        <div
          ref={particlesRef}
          className="absolute inset-0 pointer-events-none"
        >
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full opacity-40"
              style={{
                background: p.color,
                left: `${p.x}%`,
                top: `${p.y}%`,
                animation: `float ${p.dur}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="w-full max-w-2xl space-y-6 relative z-10">
          {/* Header with morph orb behind glitch text */}
          <div className="text-center relative">
            {/* Morph orb behind glitch text — token-only via var(--*) */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%] opacity-55"
              aria-hidden="true"
            >
              <MorphOrb accent="magenta" size={220} />
            </div>
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%] opacity-30 translate-x-3 translate-y-2"
              aria-hidden="true"
            >
              <MorphOrb accent="cyan" size={146} />
            </div>
            {/* Aurora wash behind orb — var(--aurora-*) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 280,
                height: 280,
                background: 'var(--aurora-1)',
                filter: 'blur(48px)',
                opacity: 0.07,
              }}
            />

            <div
              className="text-[10px] font-display tracking-[6px] mb-3 diag-item opacity-0"
              style={{ color: 'var(--fg-4)' }}
            >
              {'// ERROR // 404'}
            </div>
            {/* 404 — splitText target */}
            <h1
              data-notfound="404"
              className="font-display tracking-wide text-7xl md:text-9xl"
              style={{ color: 'var(--fg-1)' }}
            >
              {glitchText}
            </h1>
            <div
              data-notfound="signal"
              className="font-display tracking-[4px] mt-4 diag-item opacity-0"
              style={{ color: 'var(--fg-2)' }}
            >
              SIGNAL_LOST
            </div>
            {/* Scramble subtitle — innerHTML driven by scrambleText */}
            <div
              ref={subtitleRef}
              data-notfound="subtitle"
              className="font-body text-sm mt-3 max-w-md mx-auto diag-item opacity-0 min-h-[3rem]"
              style={{ color: 'var(--fg-3)' }}
            >
              {targetMsg}
            </div>
          </div>

          {/* Diagnostic — HudPanel wrapped in bracket drawable frame */}
          <div className="relative notfound-diagnostic">
            <Bracket className="notfound-bracket pointer-events-none absolute inset-0 opacity-60" />
            <HudPanel
              accent="red"
              notch="md"
              title="// DIAGNOSTIC_LOG"
              className="p-4 space-y-3 relative"
            >
              <div className="diag-item opacity-0">
                <StatBar label="UPLINK" value={0} accent="red" />
              </div>
              <div className="diag-item opacity-0">
                <StatBar label="ROUTE_INTEGRITY" value={12} accent="magenta" />
              </div>
              <div className="diag-item opacity-0">
                <StatBar label="SIGNAL_STRENGTH" value={5} accent="yellow" />
              </div>
              <div className="text-[10px] font-mono space-y-1">
                <div
                  data-notfound="notfound"
                  className="diag-item opacity-0"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {'>'} STATUS: NOT_FOUND
                </div>
                <div
                  className="diag-item opacity-0"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {'>'} PATH: {router.asPath || '/'}
                </div>
                <div
                  className="diag-item opacity-0"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {'>'} SUGGESTION: RETURN TO ROOT
                </div>
              </div>
            </HudPanel>
          </div>

          <div className="flex justify-center gap-3">
            <NeonButton
              accent="yellow"
              onClick={() => router.push('/')}
              className="notfound-btn opacity-0"
            >
              RETURN TO ROOT
            </NeonButton>
            <NeonButton
              accent="cyan"
              variant="outline"
              onClick={() => router.back()}
              className="notfound-btn opacity-0"
            >
              GO BACK
            </NeonButton>
          </div>
        </div>
      </div>
    </>
  );
}
