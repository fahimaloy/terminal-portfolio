/* Premium Workspace Reveal Splash — 4s fixed, shows every refresh.
   Premium SVG vector graphics + anime.js v4 cinematic sequence.
   No Three.js — pure SVG/Canvas for reliability in all environments.
   Timeline: aurora fade → scope rings draw → code stream → module grid →
   workspace build → wordmark stagger → username → rail fill → exit burst. */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  animate,
  createScope,
  createTimeline,
  createDrawable,
  stagger,
  spring,
  onScroll,
} from 'animejs';
import { splitText } from 'animejs';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';
import ScopeRings from './graphics/primitives/ScopeRings';
import AuroraMesh from './graphics/primitives/AuroraMesh';
import MorphOrb from './graphics/primitives/MorphOrb';
import SignalTicks from './graphics/primitives/SignalTicks';

const TOTAL_MS = 4000;
const SKIPPABLE_AFTER_MS = 1000;

// Premium color palette from tokens
const ACCENT_COLORS = [
  'var(--ring-cyan)',
  'var(--ring-magenta)',
  'var(--ring-violet)',
  'var(--ring-amber)',
  'var(--ring-rose)',
] as const;

interface BootScopeHandle {
  revert: () => void;
  add: (fn: () => void | Promise<void>) => void;
}

// Floating module data
const MODULES = [
  { label: 'API', pos: 'top-left' },
  { label: 'DB', pos: 'top-right' },
  { label: 'UI', pos: 'bottom-left' },
  { label: 'UX', pos: 'bottom-right' },
] as const;

// Code lines for stream effect
const CODE_LINES = [
  { text: 'const workspace = new CyberDeck();', color: '--neon-lime' },
  { text: "await workspace.boot({ kernel: 'neural' });", color: '--neon-cyan' },
  { text: '// Initializing subsystems...', color: '--fg-3' },
  { text: '✓ Neural link established', color: '--neon-magenta' },
  { text: '✓ Render pipeline online', color: '--neon-amber' },
];

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<BootScopeHandle | null>(null);
  const mountTime = useRef<number>(Date.now());
  const timersRef = useRef<number[]>([]);

  const finish = useCallback(() => {
    setShow(false);
  }, []);

  const skip = useCallback(() => {
    if (show && Date.now() - mountTime.current > SKIPPABLE_AFTER_MS) {
      finish();
    }
  }, [show, finish]);

  // Always mount — no sessionStorage guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = isReducedMotion();
    setShow(true);
    mountTime.current = Date.now();
    if (reduced) {
      const t = window.setTimeout(finish, 140);
      timersRef.current.push(t as unknown as number);
      return () => window.clearTimeout(t as unknown as number);
    }
  }, [finish]);

  // Skip on any key/click after SKIPPABLE_AFTER_MS
  useEffect(() => {
    if (!show) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        skip();
      }
    };
    const onClick = () => skip();

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    window.addEventListener('touchstart', onClick);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('touchstart', onClick);
    };
  }, [show, skip]);

  // Cinematic premium splash sequence
  useEffect(() => {
    if (!show || !rootRef.current || isReducedMotion()) return;

    const root = rootRef.current;
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: durations.enter * 1000,
        ease: easings.smooth,
      },
    } as Parameters<typeof createScope>[0]);
    scopeRef.current = scope as unknown as BootScopeHandle;

    let wordSplitter: ReturnType<typeof splitText> | null = null;
    let usernameSplitter: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const inner = root.querySelector<HTMLElement>('.splash-inner');
      const aurora = root.querySelector<HTMLElement>('.splash-aurora');
      const scopeRings = root.querySelectorAll<HTMLElement>('.splash-scope');
      const morphOrbs = root.querySelectorAll<HTMLElement>('.splash-orb');
      const signalTicks = root.querySelectorAll<HTMLElement>('.splash-tick');
      const moduleCards = root.querySelectorAll<HTMLElement>('.splash-module');
      const codeLines = root.querySelectorAll<HTMLElement>('.splash-code-line');
      const wordmark = root.querySelector<HTMLElement>('.splash-wordmark');
      const username = root.querySelector<HTMLElement>('.splash-username');
      const railFill = root.querySelector<HTMLElement>('.splash-rail-fill');
      const statusText = root.querySelector<HTMLElement>('.splash-status');
      const gridLines =
        root.querySelectorAll<SVGGeometryElement>('.splash-grid-line');
      const confettiDots =
        root.querySelectorAll<HTMLElement>('.splash-confetti');

      // Initial state
      if (inner) inner.style.opacity = '0';
      if (railFill) railFill.style.transform = 'scaleX(0)';
      if (aurora) aurora.style.opacity = '0';

      // Initial fade-in
      animate(root, {
        opacity: [0, 1],
        duration: 200,
        ease: easings.smooth,
      });

      if (inner) {
        animate(inner, {
          opacity: [0, 1],
          duration: 240,
          ease: easings.smooth,
        });
      }

      // Aurora fade-in
      if (aurora) {
        animate(aurora, {
          opacity: [0, 1],
          duration: durations.enter * 1000 * 0.5,
          ease: easings.smooth,
        });
      }

      // Signal ticks — draw sequentially (staircase)
      if (signalTicks.length) {
        animate(signalTicks, {
          opacity: [0, 1],
          scale: [0.6, 1],
          duration: 200,
          ease: easings.outExpo,
          delay: stagger(80, { from: 'first' }),
        });
      }

      // Scope rings — draw with line-draw effect
      if (scopeRings.length) {
        const drawables: ReturnType<typeof createDrawable>[0][] = [];
        scopeRings.forEach((el) => {
          const d = createDrawable(el, 0, 0);
          if (d.length) drawables.push(...d);
        });
        if (drawables.length) {
          animate(drawables as unknown as HTMLElement[], {
            draw: ['0 0', '0 1'],
            duration: durations.draw * 1000,
            ease: easings.smooth,
            delay: stagger(200, { from: 'first' }),
          });
        }
        // After draw, pulse glow
        setTimeout(() => {
          scopeRings.forEach((el) => {
            const stroke = el.style.stroke || 'var(--ring-cyan)';
            animate(el, {
              opacity: [{ from: 0.8 }, { to: 1 }],
              duration: durations.pulse * 1000,
              loop: 2,
              direction: 'alternate',
              ease: 'easeInOut',
              delay: stagger(300),
            });
          });
        }, durations.draw * 1000 + 300);
      }

      // Morph orbs — gentle float
      if (morphOrbs.length) {
        morphOrbs.forEach((orb) => {
          animate(orb, {
            y: [0, -8, 0],
            x: [0, 4, 0],
            rotate: [0, 4, 0, -4, 0],
            duration: 4000,
            loop: true,
            direction: 'alternate',
            ease: 'easeInOut',
            delay: Math.random() * 400,
          });
        });
      }

      // Grid lines — draw in sequence
      if (gridLines.length) {
        const gridDraw = createDrawable('.splash-grid-line', 0, 0);
        animate(gridDraw as unknown as HTMLElement[], {
          draw: ['0 0', '0 1'],
          duration: durations.draw * 1000 * 0.8,
          ease: easings.smooth,
          delay: stagger(100, { from: 'first' }),
        });
      }

      // Module cards — spring entrance from edges
      if (moduleCards.length) {
        animate(moduleCards, {
          opacity: [0, 1],
          translateY: [24, 0],
          scale: [0.92, 1],
          duration: durations.enter * 1000 * 0.6,
          ease: spring(
            springs.card as unknown as Record<string, number>,
          ) as unknown as string,
          delay: stagger(80, { from: 'first' }),
        });
      }

      // Code lines — typewriter reveal
      if (codeLines.length) {
        codeLines.forEach((line, i) => {
          line.style.opacity = '0';
          line.style.transform = 'translateY(8px)';
        });
        animate(codeLines, {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 240,
          ease: easings.smooth,
          delay: stagger(500, { from: 'first' }),
        });
      }

      // Timeline for centered elements
      const tl = createTimeline({
        defaults: { ease: easings.outExpo },
      });

      tl.label('wordmark', 2000);
      tl.label('username', 2200);
      tl.label('rail', 2400);
      tl.label('status', 2550);
      tl.label('hold', 2800);
      tl.label('exit', 3200);

      // Wordmark splitText — char cascade from center
      try {
        if (wordmark) {
          wordSplitter = splitText(wordmark, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {}

      try {
        if (username) {
          usernameSplitter = splitText(username, {
            chars: true,
          });
        }
      } catch {}

      const wordChars = (wordSplitter?.chars as unknown as HTMLElement[]) ?? [];
      const usernameChars =
        (usernameSplitter?.chars as unknown as HTMLElement[]) ?? [];

      if (wordChars.length) {
        tl.add(
          wordChars,
          {
            y: ['80%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.5,
            ease: easings.expoOut,
            delay: stagger(16, { from: 'center' }),
          },
          'wordmark',
        );
      } else if (wordmark) {
        tl.add(
          wordmark,
          { opacity: [0, 1], y: [12, 0], duration: 400 },
          'wordmark',
        );
      }

      if (usernameChars.length) {
        tl.add(
          usernameChars,
          {
            y: ['100%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.35,
            ease: easings.expoOut,
            delay: stagger(14, { from: 'first' }),
          },
          'username',
        );
      } else if (username) {
        tl.add(
          username,
          { opacity: [0, 1], y: [8, 0], duration: 350 },
          'username',
        );
      }

      // Rail fill — spring scale
      if (railFill) {
        tl.add(
          railFill,
          {
            scaleX: [0, 1],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.6,
            ease: easings.smooth,
          },
          'rail',
        );
      }

      // Status text — typewriter cursor effect
      if (statusText) {
        tl.add(
          statusText,
          { opacity: [0, 1], y: [6, 0], duration: 300 },
          'status',
        );
      }

      // Auto-exit after TOTAL_MS
      const exitDelay = Math.max(80, TOTAL_MS - 3200);
      const autoId = window.setTimeout(() => {
        if (inner) {
          animate(inner, {
            scale: [1, 0.96],
            opacity: [1, 0],
            duration: 480,
            ease: spring(
              springs.gentle as unknown as Record<string, number>,
            ) as unknown as string,
          });
        }
        animate(root, {
          opacity: [1, 0],
          duration: 360,
          ease: easings.smooth,
        }).then(() => finish());

        // Confetti burst
        if (confettiDots.length) {
          const burst = [
            { x: -32, y: -20 },
            { x: 28, y: -24 },
            { x: -20, y: 22 },
            { x: 22, y: 18 },
            { x: -8, y: -32 },
            { x: 32, y: 6 },
          ];
          confettiDots.forEach((dot, i) => {
            const b = burst[i % burst.length];
            dot.style.opacity = '1';
            dot.style.transform = 'translate(0, 0) scale(0.6)';
            animate(dot, {
              x: [0, b.x],
              y: [0, b.y],
              scale: [0.6, 1.1],
              opacity: [1, 0],
              duration: 620,
              ease: spring(
                springs.bouncy as unknown as Record<string, number>,
              ) as unknown as string,
              delay: stagger(12, { from: 'center' }),
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
        usernameSplitter?.revert();
      } catch {}
      scope.revert();
      scopeRef.current = null;
      if (root) root.style.opacity = '';
    };
  }, [show, finish]);

  if (!show) return null;

  // Generate grid path data
  const gridPath = (x1: number, y1: number, x2: number, y2: number) =>
    `M ${x1} ${y1} L ${x2} ${y2}`;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Loading workspace"
      data-testid="boot-sequence"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'var(--bg-void)',
        color: 'var(--fg-1)',
        opacity: 0,
      }}
    >
      {/* Static aurora mesh background */}
      <AuroraMesh variant="hero" className="splash-aurora" />

      {/* SVG overlay — scope rings, grid, morph orbs, signal ticks */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ overflow: 'visible' }}
        >
          {/* Grid lines — premium circuit pattern */}
          <g
            className="splash-grid"
            stroke="var(--border-subtle)"
            strokeWidth={0.5}
            opacity={0.3}
          >
            <path className="splash-grid-line" d={gridPath(15, 15, 85, 15)} />
            <path className="splash-grid-line" d={gridPath(15, 85, 85, 85)} />
            <path className="splash-grid-line" d={gridPath(15, 15, 15, 85)} />
            <path className="splash-grid-line" d={gridPath(85, 15, 85, 85)} />
            <path className="splash-grid-line" d={gridPath(50, 15, 50, 85)} />
            <path className="splash-grid-line" d={gridPath(15, 50, 85, 50)} />
            <path className="splash-grid-line" d={gridPath(30, 30, 70, 30)} />
            <path className="splash-grid-line" d={gridPath(30, 70, 70, 70)} />
            <path className="splash-grid-line" d={gridPath(30, 30, 30, 70)} />
            <path className="splash-grid-line" d={gridPath(70, 30, 70, 70)} />
          </g>
        </svg>

        {/* Scope rings — center */}
        <div className="splash-scope absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <ScopeRings accent="cyan" size={160} />
        </div>

        {/* Morph orbs — scattered */}
        <div className="splash-orb absolute left-[20%] top-[25%]">
          <MorphOrb accent="violet" size={120} />
        </div>
        <div className="splash-orb absolute right-[15%] top-[30%]">
          <MorphOrb accent="magenta" size={100} />
        </div>
        <div className="splash-orb absolute left-[10%] bottom-[25%]">
          <MorphOrb accent="amber" size={90} />
        </div>

        {/* Signal ticks — corner indicators */}
        <div className="splash-tick absolute left-[12%] top-[12%]">
          <SignalTicks accent="cyan" size={40} />
        </div>
        <div className="splash-tick absolute right-[12%] top-[12%]">
          <SignalTicks accent="magenta" size={40} />
        </div>
        <div className="splash-tick absolute left-[12%] bottom-[12%]">
          <SignalTicks accent="violet" size={40} />
        </div>
        <div className="splash-tick absolute right-[12%] bottom-[12%]">
          <SignalTicks accent="amber" size={40} />
        </div>
      </div>

      <div className="splash-inner relative flex flex-col items-center w-full max-w-[520px] px-6">
        {/* Code stream display */}
        <div
          className="splash-code-container font-mono text-[11px] leading-relaxed mb-4 w-full max-w-[400px]"
          style={{
            color: 'var(--fg-3)',
            background: 'var(--glass-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'var(--glass-blur)',
          }}
          aria-hidden="true"
        >
          {CODE_LINES.map((line, i) => (
            <div
              key={i}
              className="splash-code-line"
              style={{ opacity: 0, marginBottom: '2px' }}
            >
              <span style={{ color: `var(--${line.color})` }}>
                {line.text.split(' ').slice(0, 4).join(' ')}
              </span>{' '}
              {line.text.split(' ').slice(4).join(' ') &&
                line.text.split(' ').slice(4).join(' ')}
            </div>
          ))}
        </div>

        {/* Module cards — floating HUD elements */}
        <div className="splash-modules absolute inset-0 pointer-events-none">
          <div
            className="splash-module absolute top-[12%] left-[8%]"
            style={{ opacity: 0 }}
          >
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'var(--glass-blur)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--neon-cyan)',
              }}
            >
              API
            </div>
          </div>
          <div
            className="splash-module absolute top-[12%] right-[8%]"
            style={{ opacity: 0 }}
          >
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'var(--glass-blur)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--neon-magenta)',
              }}
            >
              DB
            </div>
          </div>
          <div
            className="splash-module absolute bottom-[12%] left-[8%]"
            style={{ opacity: 0 }}
          >
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'var(--glass-blur)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--neon-violet)',
              }}
            >
              UI
            </div>
          </div>
          <div
            className="splash-module absolute bottom-[12%] right-[8%]"
            style={{ opacity: 0 }}
          >
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'var(--glass-blur)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--neon-amber)',
              }}
            >
              UX
            </div>
          </div>
        </div>

        {/* Wordmark — premium typography with display font */}
        <div
          className="splash-wordmark font-display text-5xl md:text-6xl tracking-[0.1em] text-center"
          style={{
            color: 'var(--fg-1)',
            textShadow:
              '0 0 20px var(--glow-cyan), 0 0 40px var(--glow-magenta)',
          }}
        >
          Fahim Ahmed
        </div>

        {/* Username sub */}
        <div
          className="splash-username font-mono text-[13px] tracking-[0.14em] text-center mt-1"
          style={{
            color: 'var(--neon-cyan)',
            opacity: 0.8,
          }}
        >
          @fahimaloy
        </div>

        {/* Rule line — drawn */}
        <div className="splash-rule mt-3 flex justify-center w-full">
          <svg
            width="160"
            height="1"
            viewBox="0 0 160 1"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="overflow-visible w-full max-w-[160px]"
          >
            <path
              className="splash-rule-path"
              d="M 0 0.5 H 160"
              stroke="var(--neon-cyan)"
              strokeWidth="1"
              strokeLinecap="square"
              opacity="1"
            />
          </svg>
        </div>

        {/* Loading rail */}
        <div
          className="mt-3 w-full max-w-[220px] h-[2px] overflow-hidden rounded-full"
          style={{ background: 'var(--border-subtle)' }}
          aria-hidden="true"
        >
          <div
            className="splash-rail-fill h-full w-full origin-left"
            style={{
              background: 'var(--gradient-cyan-magenta)',
              transform: 'scaleX(0)',
              opacity: 0.9,
            }}
          />
        </div>

        {/* Status text */}
        <div
          className="splash-status mt-2 font-mono text-[10px] tracking-[0.16em] text-center"
          style={{ color: 'var(--fg-3)' }}
        >
          INITIALIZING WORKSPACE — SYSTEMS ONLINE
        </div>
      </div>

      {/* Confetti dots (exit burst) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
        aria-hidden="true"
      >
        {ACCENT_COLORS.map((c, i) => (
          <span
            key={c}
            className="splash-confetti absolute block rounded-full opacity-0"
            style={{
              width: '5px',
              height: '5px',
              left: '-2.5px',
              top: '-2.5px',
              background: c,
              boxShadow: `0 0 8px ${c}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
