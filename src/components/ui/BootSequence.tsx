// src/components/ui/BootSequence.tsx
/* Premium Workspace Reveal Splash — 4s fixed, shows every refresh.
   Three.js Canvas background (desk/monitor/keyboard) + SVG foreground (tech graphics).
   Timeline: aurora glow → screen boot → keyboard lights → tech graphics → code stream → wordmark → username → rail → exit.
   No sessionStorage — always runs. Respects prefers-reduced-motion.
*/

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
import CodeBrackets from './graphics/primitives/CodeBrackets';
import TerminalPrompt from './graphics/primitives/TerminalPrompt';
import GitBranch from './graphics/primitives/GitBranch';
import FileTree from './graphics/primitives/FileTree';
import CircuitTraces from './graphics/primitives/CircuitTraces';
import BinaryRain from './graphics/primitives/BinaryRain';
import WorkspaceCanvas from './WorkspaceCanvas';

const TOTAL_MS = 4000;
const SKIPPABLE_AFTER_MS = 1000;

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
  }, []);

  const skip = useCallback(() => {
    if (!show) return;
    if (Date.now() - mountTime.current < SKIPPABLE_AFTER_MS) return;
    finish();
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
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [finish]);

  // Cinematic workspace reveal sequence
  useEffect(() => {
    if (!show || !rootRef.current || isReducedMotion()) return;
    const root = rootRef.current;
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { duration: durations.enter * 1000, ease: easings.outExpo },
    } as Parameters<typeof createScope>[0]);
    scopeRef.current = scope as unknown as BootScopeHandle;

    let wordSplitter: ReturnType<typeof splitText> | null = null;
    let usernameSplitter: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const inner = root.querySelector<HTMLElement>('.boot-inner');
      const aurora = root.querySelector<HTMLElement>('.boot-aurora');
      const screenGlow = root.querySelector<HTMLElement>('.boot-screen-glow');
      const wordmark = root.querySelector<HTMLElement>('.boot-wordmark');
      const username = root.querySelector<HTMLElement>('.boot-username');
      const railFill = root.querySelector<HTMLElement>('.boot-rail-fill');
      const rulePath =
        root.querySelector<SVGGeometryElement>('.boot-rule-path');
      const status = root.querySelector<HTMLElement>('.boot-status');
      const confettiDots =
        root.querySelectorAll<HTMLElement>('.boot-confetti-dot');
      const keyboardKeys = root.querySelectorAll<HTMLElement>('.boot-key');
      const codeLines = root.querySelectorAll<HTMLElement>('.boot-code-line');

      // Tech graphics elements
      const binaryRain = root.querySelector<HTMLElement>('.grat-binary');
      const circuitTraces = root.querySelector<HTMLElement>('.grat-circuit');
      const codeBrackets = root.querySelector<HTMLElement>('.grat-brackets');
      const terminalPrompt = root.querySelector<HTMLElement>('.grat-terminal');
      const gitBranch = root.querySelector<HTMLElement>('.grat-git');
      const fileTree = root.querySelector<HTMLElement>('.grat-filetree');

      if (inner) inner.style.opacity = '0';
      if (railFill) railFill.style.transform = 'scaleX(0)';

      // Initial fade-in to hide flicker (overlay was opacity 0)
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

      // Aurora background fade in
      if (aurora) {
        animate(aurora, {
          opacity: [0, 0.9],
          duration: durations.enter * 1000 * 0.55,
          ease: easings.smooth,
        });
      }

      // Screen glow effect
      if (screenGlow) {
        animate(screenGlow, {
          opacity: [0, 1],
          duration: durations.enter * 1000 * 0.4,
          ease: easings.smooth,
          delay: 200,
        });
      }

      // Tech graphics entrance sequence
      const techGraphics = [
        { el: binaryRain, delay: 300, duration: 800 },
        { el: circuitTraces, delay: 500, duration: 1000 },
        { el: codeBrackets, delay: 700, duration: 900 },
        { el: terminalPrompt, delay: 900, duration: 600 },
        { el: gitBranch, delay: 1100, duration: 800 },
        { el: fileTree, delay: 1300, duration: 800 },
      ];

      techGraphics.forEach(({ el, delay, duration }) => {
        if (el) {
          animate(el, {
            opacity: [0, 1],
            scale: [0.9, 1],
            duration,
            ease: spring(
              springs.soft as unknown as Record<string, number>,
            ) as unknown as string,
            delay,
          });
        }
      });

      // Keyboard keys ripple entrance
      if (keyboardKeys.length) {
        animate(keyboardKeys, {
          opacity: [0, 1],
          scale: [0.8, 1],
          backgroundColor: ['rgba(38, 242, 213, 0.3)', 'rgba(52, 51, 50, 0.8)'],
          duration: 400,
          ease: easings.outExpo,
          delay: stagger(40, { from: 'first' }),
        });
      }

      // Code lines typewriter effect
      if (codeLines.length) {
        animate(codeLines, {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 500,
          ease: easings.outExpo,
          delay: stagger(600, { from: 'first' }),
        });
      }

      // Wordmark splitText
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
            words: { wrap: 'clip' },
          });
        }
      } catch {}

      const wordChars = (wordSplitter?.chars as unknown as HTMLElement[]) ?? [];
      const usernameChars =
        (usernameSplitter?.chars as unknown as HTMLElement[]) ?? [];

      const tl = createTimeline({ defaults: { ease: easings.outExpo } });

      tl.label('tech', 0);
      tl.label('keyboard', 600);
      tl.label('code', 1000);
      tl.label('wordmark', 1600);
      tl.label('username', 1800);
      tl.label('rule', 2200);
      tl.label('rail', 2400);
      tl.label('status', 2600);
      tl.label('hold', 3000);
      tl.label('exit', 3200);

      // Rule line draw
      if (rulePath) {
        const ruleDrawables = createDrawable('.boot-rule-path', 0, 0);
        if (ruleDrawables.length) {
          tl.add(
            ruleDrawables as unknown as HTMLElement[],
            {
              draw: ['0 0', '0 1'],
              duration: durations.draw * 1000,
              ease: easings.smooth,
            },
            'rule',
          );
        }
      }

      // Wordmark chars clip cascade
      if (wordChars.length) {
        tl.add(
          wordChars,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.52,
            ease: easings.expoOut ?? 'outExpo',
            delay: stagger(18, { from: 'first' }),
          },
          'wordmark',
        );
      } else if (wordmark) {
        tl.add(
          wordmark,
          { opacity: [0, 1], y: [10, 0], duration: 400 },
          'wordmark',
        );
      }

      // Username chars clip cascade
      if (usernameChars.length) {
        tl.add(
          usernameChars,
          {
            y: ['100%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.4,
            ease: easings.expoOut ?? 'outExpo',
            delay: stagger(16, { from: 'first' }),
          },
          'username',
        );
      } else if (username) {
        tl.add(
          username,
          { opacity: [0, 1], y: [6, 0], duration: 350 },
          'username',
        );
      }

      // Rail fill
      if (railFill) {
        tl.add(
          railFill,
          {
            scaleX: [0, 1],
            opacity: [0.55, 1],
            duration: durations.enter * 1000 * 0.6,
            ease: easings.smooth,
          },
          'rail',
        );
      }

      // Status text
      if (status) {
        tl.add(status, { opacity: [0, 1], y: [6, 0], duration: 350 }, 'status');
      }

      // Auto-exit after TOTAL_MS
      const exitDelay = Math.max(80, TOTAL_MS - 320);
      const autoId = window.setTimeout(() => {
        if (inner) {
          animate(inner, {
            scale: [1, 0.985],
            opacity: [1, 0],
            duration: 420,
            ease: spring(
              springs.gentle as unknown as Record<string, number>,
            ) as unknown as string,
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
              ease: spring(
                springs.bouncy as unknown as Record<string, number>,
              ) as unknown as string,
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
        usernameSplitter?.revert();
      } catch {}
      scope.revert();
      scopeRef.current = null;
      if (root) root.style.opacity = '';
    };
  }, [show, finish]);

  // Skip on any key/click after SKIPPABLE_AFTER_MS
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
      aria-label="Loading workspace"
      data-testid="boot-sequence"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'var(--bg-1)',
        color: 'var(--fg-1)',
        opacity: 0,
      }}
    >
      {/* Three.js Workspace Canvas — behind everything */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <WorkspaceCanvas />
      </div>

      {/* Aurora gradient background */}
      <div
        className="boot-aurora pointer-events-none absolute inset-0 opacity-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 72% 54% at 50% 16%, var(--aurora-1) 0%, transparent 58%), radial-gradient(ellipse 54% 44% at 78% 80%, var(--aurora-2) 0%, transparent 60%), radial-gradient(ellipse 48% 42% at 14% 82%, var(--aurora-3) 0%, transparent 62%)',
        }}
      />

      {/* Screen glow effect (monitor turning on) */}
      <div
        className="boot-screen-glow pointer-events-none absolute inset-0 opacity-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(38, 242, 213, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="boot-inner relative flex flex-col items-center opacity-0 w-full max-w-[480px] px-6">
        {/* Tech graphics stack — layered with staggered entrance */}
        <div
          className="relative flex items-center justify-center mb-3"
          style={{ height: 140 }}
        >
          {/* Binary rain background */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <BinaryRain accent="green" size={140} />
          </div>

          {/* Circuit traces */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.4 }}
          >
            <CircuitTraces accent="yellow" size={140} />
          </div>

          {/* Code brackets — center focus */}
          <div
            className="relative flex items-center justify-center"
            style={{ zIndex: 10 }}
          >
            <CodeBrackets accent="cyan" size={104} />
          </div>

          {/* Terminal prompt — lower */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            style={{ zIndex: 5 }}
          >
            <TerminalPrompt accent="green" size={80} />
          </div>

          {/* Git branch — upper right */}
          <div className="absolute top-4 right-4" style={{ zIndex: 5 }}>
            <GitBranch accent="magenta" size={72} />
          </div>

          {/* File tree — upper left */}
          <div className="absolute top-4 left-4" style={{ zIndex: 5 }}>
            <FileTree accent="blue" size={72} />
          </div>

          {/* Confetti dots (exit burst) */}
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

        {/* Keyboard visualization with per-key ripple */}
        <div
          className="boot-keyboard flex items-center justify-center gap-1 mb-3 p-2 rounded-lg"
          style={{
            background: 'rgba(37, 36, 35, 0.6)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(8px)',
          }}
          aria-hidden="true"
        >
          {['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(
            (k, idx) => (
              <span
                key={k}
                className="boot-key font-mono text-[9px] px-1.5 py-0.5 rounded"
                style={{
                  color: 'var(--fg-3)',
                  background: 'rgba(52, 51, 50, 0.8)',
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {k}
              </span>
            ),
          )}
        </div>

        {/* Code streaming on screen — typewriter effect */}
        <div
          className="boot-code-container font-mono text-[11px] leading-relaxed mb-3 text-left w-full max-w-[380px]"
          style={{
            color: 'var(--neon-cyan)',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            minHeight: '4.5em',
            background: 'rgba(37, 36, 35, 0.4)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          <div className="boot-code-line" style={{ opacity: 0 }}>
            <span style={{ color: 'var(--neon-green)' }}>const</span> developer
            ={' '}
            <span style={{ color: 'var(--neon-yellow)' }}>
              &apos;Fahim Ahmed&apos;
            </span>
            ;
          </div>
          <div className="boot-code-line" style={{ opacity: 0 }}>
            <span style={{ color: 'var(--neon-green)' }}>const</span> username ={' '}
            <span style={{ color: 'var(--neon-yellow)' }}>
              &apos;@fahimaloy&apos;
            </span>
            ;
          </div>
          <div className="boot-code-line" style={{ opacity: 0 }}>
            <span style={{ color: 'var(--neon-magenta)' }}>developer</span>
            .initialize();
          </div>
        </div>

        {/* Wordmark — full name with splitText animation */}
        <div
          className="boot-wordmark font-display mt-2 text-3xl md:text-4xl tracking-[0.18em] text-center"
          style={{ color: 'var(--fg-1)' }}
        >
          Fahim Ahmed
        </div>

        {/* Username sub */}
        <div
          className="boot-username font-mono text-[12px] tracking-[0.16em] text-center mt-1"
          style={{ color: 'var(--neon-cyan)' }}
        >
          @fahimaloy
        </div>

        {/* Rule line */}
        <div className="boot-rule mt-3 flex justify-center w-full">
          <svg
            width="140"
            height="1"
            viewBox="0 0 140 1"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="overflow-visible w-full max-w-[140px]"
          >
            <path
              className="boot-rule-path"
              d="M 0 0.5 H 140"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeLinecap="square"
              opacity="1"
            />
          </svg>
        </div>

        {/* Loading rail */}
        <div
          className="mt-3 w-full max-w-[200px] h-[2px] overflow-hidden rounded-full"
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
          className="boot-status mt-2 font-mono text-[10px] tracking-[0.18em] text-center"
          style={{ color: 'var(--fg-4)' }}
        >
          INITIALIZING WORKSPACE — SYSTEMS ONLINE
        </div>
      </div>
    </div>
  );
}
