// src/components/ui/BootSequence.tsx
/* Premium HUD boot — ScopeRings + SignalTicks vector loader, wordmark split, loading rail, spring exit + confetti. */
/* Stable overlay: single createScope at rootRef, timeline labels scope→rings→wordmark→rule→status→exit.
   Flicker-free: overlay mounts hidden (opacity 0) and fades to 1 before timeline; sessionStorage check before mount. */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  animate,
  createScope,
  createTimeline,
  createDrawable,
  stagger,
  spring,
} from 'animejs';
import { splitText } from 'animejs';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
} from '../../config/animations';
import ScopeRings from './graphics/primitives/ScopeRings';
import SignalTicks from './graphics/primitives/SignalTicks';

const STORAGE_KEY = 'cyberpunk-boot-shown';
const TOTAL_MS = 860;
const SKIPPABLE_AFTER_MS = 150;

const CONFETTI_COLORS = [
  'var(--ring-yellow)',
  'var(--ring-cyan)',
  'var(--ring-magenta)',
  'var(--ring-green)',
  'var(--ring-purple)',
] as const;

interface BootScopeHandle {
  revert: () => void;
  add: (fn: () => void | Promise<void>) => void;
}

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<BootScopeHandle | null>(null);
  const mountTime = useRef<number>(Date.now());
  const timersRef = useRef<number[]>([]);

  const finish = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    scopeRef.current?.revert();
    scopeRef.current = null;
    if (rootRef.current) rootRef.current.style.opacity = '';
    setShow(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  }, []);

  const skip = useCallback(() => {
    if (!show) return;
    if (Date.now() - mountTime.current < SKIPPABLE_AFTER_MS) return;
    finish();
  }, [show, finish]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // storage blocked — still show once
    }

    const reduced = isReducedMotion();
    setShow(true);
    mountTime.current = Date.now();

    if (reduced) {
      const t = window.setTimeout(finish, 140);
      timersRef.current.push(t as unknown as number);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [finish]);

  // Cinematic sequence once overlay is mounted
  useEffect(() => {
    if (!show || !rootRef.current || isReducedMotion()) return;
    const root = rootRef.current;
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { duration: durations.exit, ease: easings.outExpo },
    } as Parameters<typeof createScope>[0]);
    scopeRef.current = scope as unknown as BootScopeHandle;

    let wordSplitter: ReturnType<typeof splitText> | null = null;
    let subSplitter: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const inner = root.querySelector<HTMLElement>('.boot-inner');
      const scopeRingStrokes = root.querySelectorAll<SVGGeometryElement>(
        '.boot-scope-ring .grat-stroke',
      );
      const scopeFill = root.querySelector<HTMLElement>(
        '.boot-scope-ring .grat-fill',
      );
      const tickLines = root.querySelectorAll<HTMLElement>(
        '.boot-ticks .grat-tick',
      );
      const wordmark = root.querySelector<HTMLElement>('.boot-wordmark');
      const sub = root.querySelector<HTMLElement>('.boot-sub');
      const railFill = root.querySelector<HTMLElement>('.boot-rail-fill');
      const rulePath =
        root.querySelector<SVGGeometryElement>('.boot-rule-path');
      const status = root.querySelector<HTMLElement>('.boot-status');
      const confettiDots =
        root.querySelectorAll<HTMLElement>('.boot-confetti-dot');
      const aurora = root.querySelector<HTMLElement>('.boot-aurora');

      if (inner) inner.style.opacity = '0';
      if (railFill) railFill.style.transform = 'scaleX(0)';
      if (scopeFill) (scopeFill as HTMLElement).style.opacity = '0';

      // Aurora in
      if (aurora) {
        animate(aurora, {
          opacity: [0, 0.9],
          duration: durations.enter * 1000 * 0.55,
          ease: easings.smooth,
        });
      }

      // Root fade-in to hide flicker (overlay was opacity 0)
      animate(root, {
        opacity: [0, 1],
        duration: 120,
        ease: easings.smooth,
      });

      if (inner) {
        animate(inner, {
          opacity: [0, 1],
          duration: 140,
          ease: easings.smooth,
        });
      }

      const ringDrawables =
        scopeRingStrokes.length > 0
          ? createDrawable('.boot-scope-ring .grat-stroke', 0, 0)
          : [];
      const ruleDrawables = rulePath
        ? createDrawable('.boot-rule-path', 0, 0)
        : [];

      try {
        if (wordmark) {
          wordSplitter = splitText(wordmark, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {}
      try {
        if (sub) {
          subSplitter = splitText(sub, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {}

      const tl = createTimeline({
        defaults: { ease: easings.smooth },
      });

      tl.label('scope', 0);
      tl.label('rings', 60);
      tl.label('wordmark', 120);
      tl.label('rule', 280);
      tl.label('status', 340);
      tl.label('rail', 360);
      tl.label('hold', 560);
      tl.label('exit', 560);

      // Scope rings — draw outer → inner
      if (ringDrawables.length) {
        tl.add(
          ringDrawables as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: durations.draw * 1000 * 0.42,
            ease: easings.smooth,
            delay: stagger(18, { from: 'center' }),
          },
          'scope',
        );
      }
      if (scopeRingStrokes.length) {
        tl.add(
          scopeRingStrokes as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: 80,
            ease: easings.smooth,
          },
          'scope',
        );
      }
      if (scopeFill) {
        tl.add(
          scopeFill as unknown as HTMLElement,
          {
            opacity: [0, 1],
            scale: [0.92, 1],
            duration: durations.enter * 1000 * 0.32,
            ease: spring(springs.gentle) as unknown as string,
          },
          'rings',
        );
      }
      if (tickLines.length) {
        tl.add(
          tickLines as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            scale: [0.7, 1],
            duration: durations.enter * 1000 * 0.28,
            ease: easings.smooth,
            delay: stagger(14, { from: 'first' }),
          },
          'rings',
        );
        // gentle rotation of tick container for life
        const tickWrap = root.querySelector<HTMLElement>('.boot-ticks');
        if (tickWrap) {
          animate(tickWrap, {
            rotate: [0, 12],
            duration: 2600,
            ease: 'linear',
            loop: true,
            alternate: true,
          });
        }
      }

      const wordChars = (wordSplitter?.chars as unknown as HTMLElement[]) ?? [];
      if (wordChars.length) {
        tl.add(
          wordChars,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.5,
            ease: easings.smooth,
            delay: stagger(22, { from: 'first' }),
          },
          'wordmark',
        );
      } else if (wordmark) {
        tl.add(
          wordmark,
          {
            opacity: [0, 1],
            y: [10, 0],
            duration: durations.enter * 1000 * 0.45,
            ease: easings.smooth,
          },
          'wordmark',
        );
      }

      const subChars = (subSplitter?.chars as unknown as HTMLElement[]) ?? [];
      if (subChars.length) {
        tl.add(
          subChars,
          {
            y: ['100%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.38,
            ease: easings.smooth,
            delay: stagger(16, { from: 'first' }),
          },
          'wordmark+=60',
        );
      } else if (sub) {
        tl.add(
          sub,
          {
            opacity: [0, 1],
            y: [6, 0],
            duration: durations.enter * 1000 * 0.35,
            ease: easings.smooth,
          },
          'wordmark+=60',
        );
      }

      if (ruleDrawables.length) {
        tl.add(
          ruleDrawables as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: durations.hover * 1000,
            ease: easings.smooth,
          },
          'rule',
        );
      } else {
        const fallbackRule = root.querySelector<HTMLElement>('.boot-rule');
        if (fallbackRule) {
          tl.add(
            fallbackRule,
            {
              scaleX: [0, 1],
              opacity: [0, 1],
              duration: durations.hover * 1000,
              ease: easings.smooth,
            },
            'rule',
          );
        }
      }

      const statusEl = status;
      if (statusEl) {
        tl.add(
          statusEl,
          {
            opacity: [0, 1],
            y: [6, 0],
            duration: durations.enter * 1000 * 0.36,
            ease: easings.smooth,
          },
          'status',
        );
      }

      if (railFill) {
        tl.add(
          railFill,
          {
            scaleX: [0, 1],
            opacity: [0.55, 1],
            duration: durations.enter * 1000 * 0.48,
            ease: easings.smooth,
          },
          'rail',
        );
      }

      const exitDelay = Math.max(80, TOTAL_MS - 320);
      const autoId = window.setTimeout(() => {
        if (inner) {
          animate(inner, {
            scale: [1, 0.985],
            opacity: [1, 0],
            duration: 420,
            ease: spring(springs.gentle) as unknown as string,
          });
        }
        animate(root, {
          opacity: [1, 0],
          duration: 320,
          ease: easings.smooth,
        }).then(() => finish());

        if (confettiDots.length) {
          const burst = [
            { x: -28, y: -18 },
            { x: 26, y: -22 },
            { x: -18, y: 20 },
            { x: 20, y: 16 },
            { x: 0, y: -30 },
          ];
          confettiDots.forEach((dot, i) => {
            const b = burst[i % burst.length];
            dot.style.opacity = '1';
            dot.style.transform = 'translate(0, 0) scale(0.6)';
            animate(dot, {
              x: [0, b.x],
              y: [0, b.y],
              scale: [0.6, 1],
              opacity: [1, 0],
              duration: 520,
              ease: spring(springs.bouncy) as unknown as string,
              delay: stagger(14, { from: 'center' }),
            });
          });
        }
      }, exitDelay);
      timersRef.current.push(autoId as unknown as number);
    });

    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      try {
        wordSplitter?.revert();
      } catch {}
      try {
        subSplitter?.revert();
      } catch {}
      scope.revert();
      scopeRef.current = null;
      if (root) root.style.opacity = '';
    };
  }, [show, finish]);

  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent | MouseEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      skip();
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('click', handler);
    };
  }, [show, skip]);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      data-testid="boot-sequence"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'var(--bg-1)',
        color: 'var(--fg-1)',
        opacity: 0,
      }}
    >
      <div
        className="boot-aurora pointer-events-none absolute inset-0 opacity-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 72% 54% at 50% 16%, var(--aurora-1) 0%, transparent 58%), radial-gradient(ellipse 54% 44% at 78% 80%, var(--aurora-2) 0%, transparent 60%), radial-gradient(ellipse 48% 42% at 14% 82%, var(--aurora-3) 0%, transparent 62%)',
        }}
      />

      <div className="boot-inner relative flex flex-col items-center opacity-0 w-full max-w-[420px] px-6">
        <div className="relative flex items-center justify-center mb-1">
          <div
            className="boot-scope-ring relative"
            style={{ width: 96, height: 96 }}
          >
            <ScopeRings accent="cyan" size={96} />
            <div className="boot-ticks absolute inset-0">
              <SignalTicks accent="cyan" size={96} />
            </div>
          </div>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
            aria-hidden="true"
          >
            {CONFETTI_COLORS.map((c) => (
              <span
                key={c}
                className="boot-confetti-dot absolute block rounded-full opacity-0"
                style={{
                  width: c === 'var(--ring-purple)' ? '5px' : '4px',
                  height: c === 'var(--ring-purple)' ? '5px' : '4px',
                  left: '-2px',
                  top: '-2px',
                  background: c,
                }}
              />
            ))}
          </div>
        </div>

        <div
          className="boot-wordmark font-display mt-4 text-3xl md:text-4xl tracking-[0.18em] text-center"
          style={{ color: 'var(--fg-1)' }}
        >
          FAHIM
        </div>

        <div
          className="boot-sub font-mono text-[10px] tracking-[0.24em] text-center uppercase mt-1"
          style={{ color: 'var(--fg-3)' }}
        >
          PORTFOLIO
        </div>

        <div className="boot-rule mt-4 flex justify-center w-full">
          <svg
            width="120"
            height="1"
            viewBox="0 0 120 1"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="overflow-visible w-full max-w-[120px]"
          >
            <path
              className="boot-rule-path"
              d="M 0 0.5 H 120"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeLinecap="square"
              opacity="1"
            />
          </svg>
        </div>

        {/* loading rail */}
        <div
          className="mt-4 w-full max-w-[180px] h-[2px] overflow-hidden rounded-full"
          style={{ background: 'var(--border-subtle)' }}
          aria-hidden="true"
        >
          <div
            className="boot-rail-fill h-full w-full origin-left"
            style={{
              background: 'var(--neon-cyan)',
              transform: 'scaleX(0)',
              opacity: 0.9,
            }}
          />
        </div>

        <div
          className="boot-status mt-3 font-mono text-[10px] tracking-[0.18em] text-center"
          style={{ color: 'var(--fg-4)' }}
        >
          INITIALIZING — SYSTEMS ONLINE
        </div>
      </div>
    </div>
  );
}
