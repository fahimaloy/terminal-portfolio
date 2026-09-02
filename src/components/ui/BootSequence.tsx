// src/components/ui/BootSequence.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   BOOT SEQUENCE — Anime.js v4 enhanced
   Multi-phase boot animation with scramble text, lightning SVG, status bars,
   and spring-physics entrance. Skippable after 1s. Respects reduced motion.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createTimeline,
  createScope,
  animate,
  spring,
  createDrawable,
  stagger,
  createAnimatable,
} from 'animejs';
import { isReducedMotion } from '../../config/animations';

const STEPS = [
  { label: 'INITIALIZING_CORE', threshold: 15 },
  { label: 'LOADING_MODULES', threshold: 40 },
  { label: 'COMPILING_ASSETS', threshold: 70 },
  { label: 'CALIBRATING_NEURAL_NET', threshold: 85 },
  { label: 'SYSTEM_READY', threshold: 100 },
];

const STORAGE_KEY = 'cyberpunk-boot-shown';
const TOTAL_MS = 2800;
const SKIPPABLE_AFTER_MS = 800;

function BootSVG() {
  return (
    <svg
      aria-hidden="true"
      width="120"
      height="120"
      viewBox="0 0 120 120"
      className="boot-logo-svg"
    >
      {/* Outer ring */}
      <circle
        className="boot-ring-outer"
        cx="60"
        cy="60"
        r="55"
        fill="none"
        stroke="var(--neon-cyan)"
        strokeWidth="1.5"
        strokeDasharray="345"
        strokeDashoffset="345"
        opacity="0.8"
      />
      {/* Inner ring */}
      <circle
        className="boot-ring-inner"
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke="var(--neon-magenta)"
        strokeWidth="1"
        strokeDasharray="251"
        strokeDashoffset="251"
        opacity="0.6"
      />
      {/* Diamond shape */}
      <polygon
        className="boot-diamond"
        points="60,20 100,60 60,100 20,60"
        fill="none"
        stroke="var(--neon-yellow)"
        strokeWidth="1.5"
        strokeDasharray="226"
        strokeDashoffset="226"
        opacity="0.9"
      />
      {/* Center dot */}
      <circle
        className="boot-center"
        cx="60"
        cy="60"
        r="4"
        fill="var(--neon-cyan)"
        opacity="0"
      />
      {/* Corner accents */}
      <line className="boot-line-1" x1="10" y1="10" x2="25" y2="10" stroke="var(--neon-cyan)" strokeWidth="1.5" opacity="0" />
      <line className="boot-line-2" x1="95" y1="10" x2="110" y2="10" stroke="var(--neon-cyan)" strokeWidth="1.5" opacity="0" />
      <line className="boot-line-3" x1="10" y1="110" x2="25" y2="110" stroke="var(--neon-cyan)" strokeWidth="1.5" opacity="0" />
      <line className="boot-line-4" x1="95" y1="110" x2="110" y2="110" stroke="var(--neon-cyan)" strokeWidth="1.5" opacity="0" />
    </svg>
  );
}

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSkippable, setIsSkippable] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const animRefs = useRef<ReturnType<typeof animate>[]>([]);

  const skip = useCallback(() => {
    if (!show || !isSkippable) return;
    // Kill all running animations
    animRefs.current.forEach((a) => a.complete());
    scopeRef.current?.revert();
    setShow(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }, [show, isSkippable]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;

    const reduced = isReducedMotion();
    const total = reduced ? 200 : TOTAL_MS;

    setShow(true);

    if (reduced) {
      const timer = setTimeout(() => {
        setShow(false);
        try {
          window.sessionStorage.setItem(STORAGE_KEY, '1');
        } catch {
          // ignore
        }
      }, total);
      return () => clearTimeout(timer);
    }

    if (!rootRef.current) return;

    const scope = createScope({
      root: rootRef.current,
      defaults: {
        ease: 'outExpo',
        duration: 400,
      },
    });
    scopeRef.current = scope;

    scope.add(() => {
      const tl = createTimeline({
        defaults: { duration: 350, ease: 'outExpo' },
        onComplete: () => {
          setShow(false);
          try {
            window.sessionStorage.setItem(STORAGE_KEY, '1');
          } catch {
            // ignore
          }
        },
        onUpdate: (self: { progress: number }) => {
          const p = Math.min(100, Math.round(self.progress * 100));
          setProgress(p);
        },
      });

      // Phase 1: Logo SVG draw-in
      const ringOuter = rootRef.current?.querySelector('.boot-ring-outer');
      const ringInner = rootRef.current?.querySelector('.boot-ring-inner');
      const diamond = rootRef.current?.querySelector('.boot-diamond');
      const center = rootRef.current?.querySelector('.boot-center');

      if (ringOuter) {
        tl.add(ringOuter, {
          strokeDashoffset: [345, 0],
          opacity: [0, 0.8],
          duration: 800,
          ease: 'inOutExpo',
        }, 0);
      }
      if (ringInner) {
        tl.add(ringInner, {
          strokeDashoffset: [251, 0],
          opacity: [0, 0.6],
          duration: 600,
          ease: 'inOutExpo',
        }, 200);
      }
      if (diamond) {
        tl.add(diamond, {
          strokeDashoffset: [226, 0],
          opacity: [0, 0.9],
          ...spring({ stiffness: 100, damping: 12 }),
        }, 400);
      }
      if (center) {
        tl.add(center, {
          opacity: [0, 1],
          scale: [0, 1],
          ...spring({ stiffness: 200, damping: 15 }),
        }, 600);
      }

      // Corner accent lines
      const lines = rootRef.current?.querySelectorAll('.boot-line-1, .boot-line-2, .boot-line-3, .boot-line-4');
      if (lines) {
        tl.add(lines, {
          opacity: [0, 1],
          scaleX: [0, 1],
          duration: 300,
          ease: 'outExpo',
        }, 700);
      }

      // Phase 2: Title scramble reveal
      const titleEl = rootRef.current?.querySelector('.boot-title');
      if (titleEl) {
        tl.add(titleEl, {
          opacity: [0, 1],
          y: [10, 0],
          duration: 400,
        }, 800);
      }

      // Phase 3: Step labels stagger-in
      const stepEls = rootRef.current?.querySelectorAll('.boot-step');
      if (stepEls) {
        tl.add(stepEls, {
          opacity: [0, 1],
          x: [-8, 0],
          duration: 300,
          ease: 'outExpo',
          delay: stagger(80, { from: 'first' }),
        }, 1000);
      }

      // Phase 4: Progress bar fill
      const progressBar = rootRef.current?.querySelector('.boot-progress-bar');
      if (progressBar) {
        tl.add(progressBar, {
          width: ['0%', '100%'],
          duration: total - 1200,
          ease: 'linear',
        }, 400);
      }

      // Phase 5: Subtitle fade-in
      const subtitle = rootRef.current?.querySelector('.boot-subtitle');
      if (subtitle) {
        tl.add(subtitle, {
          opacity: [0, 1],
          y: [6, 0],
          duration: 300,
        }, total - 600);
      }

      // Phase 6: Final exit — flash + fade
      tl.add({}, {
        opacity: [1, 0],
        scale: [1, 1.02],
        duration: 300,
        ease: 'inExpo',
        onUpdate: (self: any) => {
          const p = self.progress ?? 0;
          if (rootRef.current) {
            rootRef.current.style.opacity = String(1 - p);
          }
        },
      }, total - 300);
    });

    // Enable skip after delay
    const skipTimer = setTimeout(() => {
      setIsSkippable(true);
    }, SKIPPABLE_AFTER_MS);

    return () => {
      clearTimeout(skipTimer);
      scope.revert();
    };
  }, []);

  // Keyboard/click to skip
  useEffect(() => {
    if (!show || !isSkippable) return;

    const handler = (e: KeyboardEvent | MouseEvent) => {
      // Don't skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      skip();
    };

    document.addEventListener('keydown', handler);
    document.addEventListener('click', handler);

    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('click', handler);
    };
  }, [show, isSkippable, skip]);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="System boot sequence"
      data-testid="boot-sequence"
      className="fixed inset-0 z-[100] bg-bg-void flex flex-col items-center justify-center overflow-hidden pointer-events-none"
    >
      {/* Scanline effect overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,240,255,0.1) 1px, rgba(0,240,255,0.1) 2px)',
        }}
      />

      {/* SVG Logo */}
      <BootSVG />

      {/* Title */}
      <div className="mt-6 font-display tracking-[8px] text-neon-cyan text-shadow-neon-cyan text-sm boot-title opacity-0">
        {'// DEVELOPER TERMINAL v4.0'}
      </div>

      {/* Progress bar */}
      <div className="mt-6 w-72 h-1 bg-white/[0.04] overflow-hidden relative">
        <div
          className="boot-progress-bar h-full bg-gradient-to-r from-neon-cyan via-neon-yellow to-neon-magenta"
          style={{ width: '0%' }}
        />
        {/* Glow behind bar */}
        <div
          className="absolute inset-0 h-full blur-sm opacity-40"
          style={{
            background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-yellow), var(--neon-magenta))',
            width: `${progress}%`,
          }}
        />
      </div>

      {/* Step labels */}
      <ul className="mt-5 font-mono text-[10px] space-y-1 text-left w-72">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={`boot-step opacity-0 flex items-center gap-2 ${
              progress >= s.threshold
                ? 'text-neon-green'
                : 'text-text-muted'
            }`}
          >
            <span className="inline-block w-3 text-right">
              {progress >= s.threshold ? '[+]' : '[ ]'}
            </span>
            <span>{s.label}</span>
            {progress >= s.threshold && (
              <span className="ml-auto text-[8px] opacity-60">OK</span>
            )}
          </li>
        ))}
      </ul>

      {/* Subtitle */}
      <div className="mt-6 font-mono text-[9px] text-text-muted boot-subtitle opacity-0">
        [ PRESS ANY KEY OR CLICK TO SKIP ]
      </div>

      {/* Bottom accent line */}
      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)',
          opacity: 0.4,
        }}
      />
    </div>
  );
}
