// src/components/ui/BootSequence.tsx
/* Cinematic editorial boot — emblem line-draw, wordmark split, rule + status cascade, spring exit + confetti. */

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

const STORAGE_KEY = 'cyberpunk-boot-shown';
const TOTAL_MS = 820;
const SKIPPABLE_AFTER_MS = 150;

const CONFETTI_COLORS = [
  'var(--ring-yellow)',
  'var(--ring-cyan)',
  'var(--ring-magenta)',
  'var(--ring-green)',
  'var(--ring-purple)',
] as const;

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
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
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;

    const reduced = isReducedMotion();
    setShow(true);
    mountTime.current = Date.now();

    if (reduced) {
      const t = window.setTimeout(finish, 120);
      timersRef.current.push(t as unknown as number);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [finish]);

  // Cinematic sequence once overlay is mounted
  useEffect(() => {
    if (!show || !rootRef.current || isReducedMotion()) return;
    const root = rootRef.current;
    const scope = createScope({ root });
    scopeRef.current = scope;

    let wordSplitter: ReturnType<typeof splitText> | null = null;
    let statusSplitter: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const inner = root.querySelector<HTMLElement>('.boot-inner');
      const emblemPaths =
        root.querySelectorAll<SVGGeometryElement>('.boot-emblem-path');
      const rulePath =
        root.querySelector<SVGGeometryElement>('.boot-rule-path');
      const wordmark = root.querySelector<HTMLElement>('.boot-wordmark');
      const status = root.querySelector<HTMLElement>('.boot-status');
      const confettiDots =
        root.querySelectorAll<HTMLElement>('.boot-confetti-dot');
      const aurora = root.querySelector<HTMLElement>('.boot-aurora');

      if (inner) inner.style.opacity = '1';
      if (aurora) {
        animate(aurora, {
          opacity: [0, 1],
          duration: durations.enter * 1000 * 0.6,
          ease: easings.smooth,
        } as any);
      }

      const emblemDrawables =
        emblemPaths.length > 0 ? createDrawable('.boot-emblem-path', 0, 0) : [];
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
        if (status) {
          statusSplitter = splitText(status, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {}

      const tl = createTimeline({
        defaults: { ease: easings.expoOut },
      } as any);

      tl.label('emblem', 0);
      tl.label('wordmark', 90);
      tl.label('rule', 220);
      tl.label('status', 310);
      tl.label('hold', 520);
      tl.label('exit', 520);

      if (emblemDrawables.length) {
        tl.add(
          emblemDrawables as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: durations.slide * 1000,
            ease: easings.smooth,
            delay: stagger(28, { from: 'center' }),
          } as any,
          'emblem',
        );
        tl.add(
          emblemPaths as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: 60,
            ease: easings.smooth,
          } as any,
          'emblem',
        );
      } else if (emblemPaths.length) {
        tl.add(
          emblemPaths as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.35,
            ease: easings.smooth,
          } as any,
          'emblem',
        );
      }

      const wordChars = (wordSplitter?.chars as unknown as HTMLElement[]) ?? [];
      if (wordChars.length) {
        tl.add(
          wordChars,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.52,
            ease: easings.expoOut,
            delay: stagger(22, { from: 'first' }),
          } as any,
          'wordmark',
        );
      } else if (wordmark) {
        tl.add(
          wordmark,
          {
            opacity: [0, 1],
            y: [10, 0],
            duration: durations.enter * 1000 * 0.5,
            ease: easings.expoOut,
          } as any,
          'wordmark',
        );
      }

      if (ruleDrawables.length) {
        tl.add(
          ruleDrawables as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: durations.hover * 1000,
            ease: easings.smooth,
          } as any,
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
            } as any,
            'rule',
          );
        }
      }

      const statusChars =
        (statusSplitter?.chars as unknown as HTMLElement[]) ?? [];
      if (statusChars.length) {
        tl.add(
          statusChars,
          {
            y: ['100%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.42,
            ease: easings.expoOut,
            delay: stagger(18, { from: 'first' }),
          } as any,
          'status',
        );
        tl.add(
          status as unknown as HTMLElement,
          {
            opacity: [0.7, 1],
            duration: durations.enter * 1000 * 0.3,
            ease: easings.smooth,
          } as any,
          'status',
        );
      } else if (status) {
        tl.add(
          status,
          {
            opacity: [0, 1],
            y: [6, 0],
            duration: durations.enter * 1000 * 0.42,
            ease: easings.expoOut,
          } as any,
          'status',
        );
      }

      const exitDelay = Math.max(80, TOTAL_MS - 320);
      const autoId = window.setTimeout(() => {
        if (inner) {
          animate(inner, {
            scale: [1, 0.96],
            opacity: [1, 0],
            duration: 420,
            ease: spring(springs.soft as any),
          } as any);
        }
        animate(root, {
          opacity: [1, 0],
          duration: 360,
          ease: easings.expoIn,
        } as any).then(() => finish());

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
              ease: spring(springs.bouncy as any),
              delay: stagger(14, { from: 'center' }),
            } as any);
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
        statusSplitter?.revert();
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
      style={{ background: 'var(--bg-1)', color: 'var(--fg-1)' }}
    >
      <div
        className="boot-aurora pointer-events-none absolute inset-0 opacity-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 52% at 50% 18%, var(--aurora-1) 0%, transparent 58%), radial-gradient(ellipse 52% 44% at 78% 78%, var(--aurora-2) 0%, transparent 60%), radial-gradient(ellipse 48% 42% at 14% 82%, var(--aurora-3) 0%, transparent 62%)',
        }}
      />

      <div className="boot-inner relative flex flex-col items-center opacity-0">
        <div className="relative flex items-center justify-center">
          <svg
            width="56"
            height="56"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            className="boot-emblem overflow-visible"
          >
            <path
              className="boot-emblem-path"
              d="M 5 16 L 5 5 L 16 5"
              stroke="var(--border-subtle)"
              strokeWidth="1.2"
              strokeLinecap="square"
              strokeLinejoin="miter"
              opacity="0"
            />
            <path
              className="boot-emblem-path"
              d="M 32 5 L 43 5 L 43 16"
              stroke="var(--border-subtle)"
              strokeWidth="1.2"
              strokeLinecap="square"
              strokeLinejoin="miter"
              opacity="0"
            />
            <path
              className="boot-emblem-path"
              d="M 43 32 L 43 43 L 32 43"
              stroke="var(--border-subtle)"
              strokeWidth="1.2"
              strokeLinecap="square"
              strokeLinejoin="miter"
              opacity="0"
            />
            <path
              className="boot-emblem-path"
              d="M 16 43 L 5 43 L 5 32"
              stroke="var(--border-subtle)"
              strokeWidth="1.2"
              strokeLinecap="square"
              strokeLinejoin="miter"
              opacity="0"
            />
            <path
              className="boot-emblem-path"
              d="M 18 24 H 30"
              stroke="var(--fg-3)"
              strokeWidth="0.85"
              strokeLinecap="square"
              opacity="0"
            />
            <path
              className="boot-emblem-path"
              d="M 24 18 V 30"
              stroke="var(--fg-3)"
              strokeWidth="0.85"
              strokeLinecap="square"
              opacity="0"
            />
          </svg>

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
          className="boot-wordmark font-display mt-5 text-3xl md:text-4xl tracking-[0.18em] text-center"
          style={{ color: 'var(--fg-1)' }}
        >
          FAHIM
        </div>

        <div className="boot-rule mt-3 flex justify-center">
          <svg
            width="96"
            height="1"
            viewBox="0 0 96 1"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="overflow-visible"
          >
            <path
              className="boot-rule-path"
              d="M 0 0.5 H 96"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeLinecap="square"
              opacity="1"
            />
          </svg>
        </div>

        <div
          className="boot-status mt-3 font-mono text-[10px] tracking-[0.22em] text-center uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
          Portfolio
        </div>
      </div>
    </div>
  );
}
