/**
 * BootSequence — "Developer Deck": a five-act vector boot sequence.
 *
 * Act 0  Cold start        0 → 600ms    point ignites, perspective floor draws outward
 * Act 1  Signal acquire   600 → 1900ms  circuit fan propagates, nodes pop, binary rain falls
 * Act 2  Systems online  1900 → 3000ms  rings lock, brackets snap, telemetry opens, chips land
 * Act 3  Identity lock   3000 → 3900ms  rule draws, wordmark sets, handle glints, rail fills
 * Act 4  Dissolve        3900 → 4700ms  strokes fade, particles burst, cross-fade to the page
 *
 * Two rules the previous version broke:
 *   1. The exit is a timeline label, never a `setTimeout`. It used to fire at
 *      `TOTAL_MS - 3200` (800ms), unmounting the splash before the wordmark
 *      phase at 2000ms ever played.
 *   2. Every animated element starts at `opacity: 0` set in JS. A Tailwind
 *      `opacity-0` class survives `scope.revert()` and strands the element
 *      invisible — the bug that hid the hero's quick-command cards.
 *
 * All motion is anime.js v4 on one timeline. The SVG primitives are static
 * geometry with `data-*` hooks; none of them run SMIL or CSS loops.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createScope,
  createTimeline,
  createDrawable,
  stagger,
  spring,
  splitText,
  type TextSplitter,
} from 'animejs';
import { easings, springs, isReducedMotion } from '../../config/animations';
import { FALLBACK_HANDLE, FALLBACK_NAME } from '../../config/identity';
import AuroraMesh from './graphics/primitives/AuroraMesh';
import BinaryRain from './graphics/primitives/BinaryRain';
import CircuitTraces from './graphics/primitives/CircuitTraces';
import CodeBrackets from './graphics/primitives/CodeBrackets';
import FileTree from './graphics/primitives/FileTree';
import TerminalPrompt from './graphics/primitives/TerminalPrompt';

const SKIPPABLE_AFTER_MS = 1200;

/**
 * Absolute maximum the splash may stay on screen, regardless of whether the
 * exit timeline fired its own completion. The sequence ends around 4.6s, so
 * this is nearly double: it never truncates a healthy run, and only intervenes
 * when the timeline has failed — an interrupted animation, a backgrounded tab,
 * or anything thrown mid-play used to leave the splash covering the page
 * indefinitely.
 */
const HARD_CEILING_MS = 8000;

/** Act boundaries. Every phase in the sequence resolves against these. */
const ACT = {
  ignite: 0,
  floor: 120,
  fan: 600,
  rain: 900,
  rings: 1900,
  brackets: 2150,
  telemetry: 2350,
  chips: 2500,
  rule: 3000,
  wordmark: 3120,
  handle: 3300,
  status: 3450,
  hold: 3900,
  dissolve: 4300,
} as const;

const MODULES = [
  { label: 'API', pos: 'top-[14%] left-[7%]', accent: 'var(--neon-cyan)' },
  { label: 'DB', pos: 'top-[14%] right-[7%]', accent: 'var(--neon-coral)' },
  { label: 'UI', pos: 'bottom-[14%] left-[7%]', accent: 'var(--neon-violet)' },
  { label: 'UX', pos: 'bottom-[14%] right-[7%]', accent: 'var(--neon-amber)' },
] as const;

const BURST = [
  { x: -46, y: -30 },
  { x: 40, y: -36 },
  { x: -30, y: 32 },
  { x: 32, y: 26 },
  { x: -12, y: -46 },
  { x: 48, y: 8 },
  { x: -48, y: 6 },
  { x: 12, y: 44 },
] as const;

const ACCENT_COLORS = [
  'var(--neon-cyan)',
  'var(--neon-violet)',
  'var(--neon-coral)',
  'var(--neon-amber)',
  'var(--neon-lime)',
] as const;

/** Corner brackets for act 2 — four L-shapes framing the stage. */
const BRACKETS = [
  'M 0 18 L 0 0 L 18 0',
  'M 82 0 L 100 0 L 100 18',
  'M 100 82 L 100 100 L 82 100',
  'M 18 100 L 0 100 L 0 82',
] as const;

/** Perspective floor: lines converging on the centre as they recede. */
const FLOOR_LINES = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12;
  const inset = 4 + t * 34;
  return { inset, opacity: 0.05 + t * 0.12, key: `h${i}` };
});
const FLOOR_RAYS = Array.from({ length: 9 }, (_, i) => ({
  key: `v${i}`,
  x: 4 + (i / 8) * 92,
}));

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const [skippable, setSkippable] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mountTime = useRef<number>(0);
  const telemetryRef = useRef<HTMLSpanElement>(null);

  const finish = useCallback(() => setShow(false), []);

  const skip = useCallback(() => {
    if (Date.now() - mountTime.current > SKIPPABLE_AFTER_MS) finish();
  }, [finish]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    mountTime.current = Date.now();
    setShow(true);
    if (isReducedMotion()) {
      const t = window.setTimeout(finish, 420);
      return () => window.clearTimeout(t);
    }

    // Hard ceiling. The exit is driven by an anime.js timeline `onComplete`,
    // which never fires if the timeline is interrupted, the tab is backgrounded
    // mid-run, or anything throws while it plays — and the splash then covers
    // the page indefinitely. This is independent of that path, so the splash
    // cannot outlive its own sequence. Deliberately longer than the timeline so
    // it never cuts the animation short on a normal load.
    const ceiling = window.setTimeout(finish, HARD_CEILING_MS);
    return () => window.clearTimeout(ceiling);
  }, [finish]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => setSkippable(true), SKIPPABLE_AFTER_MS);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [show, skip]);

  useEffect(() => {
    if (!show || !rootRef.current || isReducedMotion()) return;
    const root = rootRef.current;

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { ease: easings.smooth },
    } as Parameters<typeof createScope>[0]);

    let wordSplitter: TextSplitter | null = null;
    const softSpring = spring(
      springs.soft as unknown as Record<string, number>,
    ) as unknown as string;
    const snapSpring = spring(
      springs.snappy as unknown as Record<string, number>,
    ) as unknown as string;

    scope.add(() => {
      const q = <T extends Element>(sel: string) =>
        Array.from(root.querySelectorAll<T>(sel));

      const floorLines = q<SVGGeometryElement>('[data-floor-line]');
      const floorRays = q<SVGGeometryElement>('[data-floor-ray]');
      const ignite = root.querySelector<HTMLElement>('[data-act="ignite"]');
      const fan = q<SVGGeometryElement>('[data-trace-path]');
      const fanNodes = q<HTMLElement>('[data-trace-node]');
      const rain = q<SVGElement>('[data-rain-glyph]');
      const rainColumns = q<SVGElement>('[data-rain-column]');
      const ringStrokes = q<SVGGeometryElement>('[data-ring-stroke]');
      const brackets = q<SVGGeometryElement>('[data-bracket]');
      const coreGlyph = q<SVGGeometryElement>('[data-core-glyph]');
      const treeRows = q<SVGElement>('[data-tree-row]');
      const promptChars = q<SVGElement>('[data-prompt-char]');
      const caret = root.querySelector<SVGElement>('[data-prompt-caret]');
      const chips = q<HTMLElement>('[data-module]');
      const rule = root.querySelector<SVGGeometryElement>('[data-rule-path]');
      const wordmark = root.querySelector<HTMLElement>('[data-wordmark]');
      const handle = root.querySelector<HTMLElement>('[data-handle]');
      const rail = root.querySelector<HTMLElement>('[data-rail-fill]');
      const status = root.querySelector<HTMLElement>('[data-status]');
      const burst = q<HTMLElement>('[data-burst]');
      const codeLines = q<HTMLElement>('[data-code-line]');

      // Everything that animates starts hidden — set here, never in a class.
      const hidden: (HTMLElement | SVGElement | null)[] = [
        ...fanNodes,
        ...rain,
        ...ringStrokes,
        ...brackets,
        ...coreGlyph,
        ...treeRows,
        ...promptChars,
        caret,
        ...chips,
        ...codeLines,
        rule,
        wordmark,
        handle,
        status,
        ...burst,
      ];
      hidden.forEach((el) => {
        if (el) el.style.opacity = '0';
      });
      if (rail) rail.style.transform = 'scaleX(0)';

      const tl = createTimeline({ defaults: { ease: easings.smooth } });

      // The root is authored at opacity 0. Without this tween it never becomes
      // visible and the whole sequence plays behind an invisible overlay.
      tl.add(
        root,
        { opacity: [0, 1], duration: 220, ease: easings.smooth },
        ACT.ignite,
      );

      // ── Act 0 · Cold start ────────────────────────────────────────────────
      if (ignite) {
        tl.add(
          ignite,
          {
            scale: [0, 1],
            opacity: [0, 1],
            duration: 320,
            ease: easings.outExpo,
          },
          ACT.ignite,
        );
      }
      if (floorRays.length) {
        const draw = createDrawable(floorRays);
        if ((draw as unknown as HTMLElement[]).length) {
          tl.add(
            draw as unknown as HTMLElement[],
            {
              draw: ['0 0', '0 1'],
              duration: 620,
              ease: easings.smooth,
              delay: stagger(28, { from: 'center' }),
            },
            ACT.floor,
          );
        }
      }
      if (floorLines.length) {
        tl.add(
          floorLines,
          {
            opacity: [0, 0.14],
            duration: 420,
            delay: stagger(24, { from: 'center' }),
          },
          ACT.floor,
        );
      }

      // ── Act 1 · Signal acquisition ────────────────────────────────────────
      if (fan.length) {
        const draw = createDrawable(fan);
        if ((draw as unknown as HTMLElement[]).length) {
          tl.add(
            draw as unknown as HTMLElement[],
            {
              draw: ['0 0', '0 1'],
              duration: 460,
              ease: easings.outExpo,
              delay: stagger(55, { from: 'first' }),
            },
            ACT.fan,
          );
        }
      }
      if (fanNodes.length) {
        tl.add(
          fanNodes,
          {
            scale: [0, 1],
            opacity: [0, 1],
            duration: 420,
            ease: snapSpring,
            delay: stagger(40, { from: 'first' }),
          },
          ACT.fan + 260,
        );
      }
      if (rainColumns.length) {
        tl.add(
          rainColumns,
          { opacity: [0, 0.5], y: [-12, 0], duration: 520, delay: stagger(90) },
          ACT.rain,
        );
      }
      if (rain.length) {
        tl.add(
          rain,
          {
            opacity: [0, 0.7],
            duration: 90,
            delay: stagger(9, { from: 'first' }),
          },
          ACT.rain + 180,
        );
        // One downward pass, then settle — never an endless loop on screen.
        tl.add(
          rain,
          {
            y: ['-100%', '100%'],
            duration: 1400,
            ease: easings.smooth,
            delay: stagger(6),
          },
          ACT.rain + 260,
        );
        tl.add(rain, { y: '0%', duration: 1 }, ACT.rain + 1700);
        tl.add(rain, { opacity: 0, duration: 1 }, ACT.rain + 1700);
      }

      // ── Act 2 · Systems online ────────────────────────────────────────────
      if (coreGlyph.length) {
        tl.add(
          coreGlyph,
          {
            scale: [0.4, 1],
            opacity: [0, 0.8],
            rotate: [-25, 0],
            duration: 620,
            ease: snapSpring,
          },
          ACT.rings,
        );
      }
      if (ringStrokes.length) {
        const draw = createDrawable(ringStrokes);
        if ((draw as unknown as HTMLElement[]).length) {
          tl.add(
            draw as unknown as HTMLElement[],
            {
              draw: ['0 0', '0 1'],
              duration: 520,
              ease: easings.outExpo,
              delay: stagger(120, { from: 'first' }),
            },
            ACT.rings,
          );
        }
        tl.add(
          ringStrokes,
          {
            scale: [1.08, 1],
            duration: 620,
            ease: softSpring,
            delay: stagger(120),
          },
          ACT.rings + 300,
        );
        tl.add(
          ringStrokes,
          { opacity: [0, 1], duration: 320, delay: stagger(120) },
          ACT.rings,
        );
      }
      if (brackets.length) {
        const draw = createDrawable(brackets);
        if ((draw as unknown as HTMLElement[]).length) {
          tl.add(
            draw as unknown as HTMLElement[],
            {
              draw: ['0 0', '0 1'],
              duration: 340,
              ease: easings.outExpo,
              delay: stagger(90),
            },
            ACT.brackets,
          );
        }
        tl.add(brackets, { opacity: [0, 1], duration: 200 }, ACT.brackets);
      }
      if (treeRows.length) {
        tl.add(
          treeRows,
          {
            x: [-8, 0],
            opacity: [0, 1],
            duration: 300,
            ease: easings.outExpo,
            delay: stagger(45, { from: 'first' }),
          },
          ACT.telemetry,
        );
      }
      if (promptChars.length) {
        tl.add(
          promptChars,
          { opacity: [0, 0.85], duration: 40, delay: stagger(28) },
          ACT.telemetry + 120,
        );
        if (caret) {
          tl.add(
            caret,
            { opacity: [0, 0.9], duration: 60 },
            ACT.telemetry + 200,
          );
        }
      }
      if (chips.length) {
        tl.add(
          chips,
          {
            scale: [0.7, 1],
            y: [14, 0],
            opacity: [0, 1],
            duration: 520,
            ease: snapSpring,
            delay: stagger(90),
          },
          ACT.chips,
        );
      }
      if (codeLines.length) {
        tl.add(
          codeLines,
          {
            x: [-10, 0],
            opacity: [0, 1],
            duration: 260,
            ease: easings.outExpo,
            delay: stagger(90),
          },
          ACT.telemetry,
        );
      }
      // Telemetry counter — a plain object tweened on the timeline, written
      // straight to the DOM so 40 ticks never re-render React.
      if (telemetryRef.current) {
        const counter = { v: 0 };
        tl.add(
          counter,
          {
            v: 100,
            duration: 1100,
            ease: easings.smooth,
            onUpdate: () => {
              if (telemetryRef.current) {
                telemetryRef.current.textContent = String(
                  Math.round(counter.v),
                ).padStart(3, '0');
              }
            },
          },
          ACT.rings,
        );
      }

      // ── Act 3 · Identity lock ─────────────────────────────────────────────
      if (rule) {
        const draw = createDrawable(rule, 0, 0);
        if ((draw as unknown as HTMLElement[]).length) {
          tl.add(
            draw as unknown as HTMLElement[],
            { draw: ['0 0', '1 0'], duration: 380, ease: easings.outExpo },
            ACT.rule,
          );
        }
        tl.add(rule, { opacity: [0, 0.8], duration: 1 }, ACT.rule);
      }
      if (wordmark) {
        try {
          wordSplitter = splitText(wordmark, {
            chars: true,
            words: { wrap: 'clip' },
          });
        } catch {
          wordSplitter = null;
        }
        const words = (wordSplitter?.words as unknown as HTMLElement[]) ?? [];
        const chars = (wordSplitter?.chars as unknown as HTMLElement[]) ?? [];
        words.forEach((w) => {
          w.style.paddingBottom = '0.14em';
        });
        if (words.length) {
          tl.add(
            words,
            {
              y: ['0.7em', '0em'],
              duration: 460,
              ease: easings.outExpo,
              delay: stagger(70),
            },
            ACT.wordmark,
          );
        }
        if (chars.length) {
          tl.add(chars, { opacity: [0, 1], duration: 300 }, ACT.wordmark + 40);
        }
        tl.add(wordmark, { opacity: [0, 1], duration: 1 }, ACT.wordmark);
      }
      if (handle) {
        tl.add(
          handle,
          {
            opacity: [0, 0.85],
            y: [8, 0],
            duration: 380,
            ease: easings.outExpo,
          },
          ACT.handle,
        );
      }
      if (rail) {
        tl.add(
          rail,
          { opacity: [0, 1], duration: 1, ease: 'linear' },
          ACT.ignite,
        );
        tl.add(
          rail,
          { scaleX: [0, 1], ease: 'linear', duration: ACT.hold },
          ACT.ignite,
        );
      }
      if (status) {
        tl.add(
          status,
          { opacity: [0, 1], y: [6, 0], duration: 320, ease: easings.outExpo },
          ACT.status,
        );
      }

      // ── Act 4 · Dissolve ──────────────────────────────────────────────────
      const dissolveTargets = [
        ...fan,
        ...fanNodes,
        ...ringStrokes,
        ...brackets,
        ...coreGlyph,
        ...treeRows,
        ...chips,
        ...codeLines,
        rule,
      ].filter(Boolean) as (SVGElement | HTMLElement)[];

      if (dissolveTargets.length) {
        tl.add(
          dissolveTargets,
          {
            opacity: 0,
            scale: 0.94,
            duration: 420,
            ease: easings.smooth,
            delay: stagger(14),
          },
          ACT.dissolve,
        );
      }
      if (burst.length) {
        burst.forEach((dot, i) => {
          const b = BURST[i % BURST.length];
          dot.style.opacity = '1';
          tl.add(
            dot,
            {
              x: [0, b.x],
              y: [0, b.y],
              scale: [0.4, 1.2],
              opacity: [1, 0],
              duration: 560,
              ease: spring(
                springs.bouncy as unknown as Record<string, number>,
              ) as unknown as string,
              delay: stagger(26),
            },
            ACT.dissolve + 80,
          );
        });
      }
      if (wordmark) {
        tl.add(
          wordmark,
          { opacity: 0, y: -14, duration: 380, ease: easings.smooth },
          ACT.hold,
        );
      }
      tl.add(
        root,
        { opacity: [1, 0], duration: 420, ease: easings.smooth },
        ACT.hold + 380,
      );

      tl.then(() => finish());
    });

    return () => {
      try {
        scope.revert();
      } catch {
        /* scope already gone */
      }
      try {
        wordSplitter?.revert();
      } catch {
        /* splitter already reverted */
      }
      if (root) root.style.opacity = '';
    };
  }, [show, finish]);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Initialising workspace"
      data-testid="boot-sequence"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-void)', color: 'var(--fg-1)', opacity: 0 }}
    >
      <AuroraMesh variant="hero" className="absolute inset-0" />

      {/* Act 0 — perspective floor */}
      <svg
        className="absolute inset-x-0 bottom-0 h-1/2 w-full"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        aria-hidden="true"
        data-layer-group
      >
        {FLOOR_RAYS.map((r) => (
          <line
            key={r.key}
            data-floor-ray
            x1={r.x}
            y1={50}
            x2={50 + (r.x - 50) * 0.06}
            y2={0}
            stroke="var(--neon-cyan)"
            strokeWidth="0.08"
            strokeOpacity="0.3"
            pathLength={1000}
          />
        ))}
        {FLOOR_LINES.map((l) => (
          <line
            key={l.key}
            data-floor-line
            x1={l.inset}
            y1={50 - l.inset * 0.42}
            x2={100 - l.inset}
            y2={50 - l.inset * 0.42}
            stroke="var(--neon-cyan)"
            strokeWidth="0.06"
            strokeOpacity={l.opacity}
            opacity={0}
            pathLength={1000}
          />
        ))}
      </svg>

      {/* Act 1 — binary rain margins */}
      <div
        data-rain-column
        className="absolute left-[3%] top-[14%] hidden sm:block"
      >
        <BinaryRain accent="lime" size={54} seed={0xa11ce} />
      </div>
      <div
        data-rain-column
        className="absolute right-[3%] top-[22%] hidden sm:block"
      >
        <BinaryRain accent="ice" size={54} seed={0xb0b} />
      </div>

      {/* Act 1/2 — circuit fan, core, rings, brackets */}
      <div
        data-layer-group
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="relative grid place-items-center">
          <div className="relative grid place-items-center">
            <svg viewBox="0 0 400 400" className="w-[400px] h-[400px] -z-10">
              {[
                { r: 150, o: 0.5, w: 0.7 },
                { r: 118, o: 0.35, w: 0.6 },
                { r: 88, o: 0.22, w: 0.5 },
              ].map((ring, i) => (
                <circle
                  key={ring.r}
                  data-ring-stroke
                  cx="200"
                  cy="200"
                  r={ring.r}
                  fill="none"
                  stroke="var(--neon-cyan)"
                  strokeWidth={ring.w}
                  strokeOpacity={ring.o}
                  pathLength={1000}
                  opacity={0}
                />
              ))}
              <polygon
                data-core-glyph
                points="200,168 224,200 200,232 176,200"
                fill="none"
                stroke="var(--neon-violet)"
                strokeWidth="1.2"
                strokeOpacity="0.85"
                opacity={0}
              />
            </svg>

            <div className="absolute">
              <CircuitTraces accent="cyan" size={330} />
            </div>
            <div className="absolute">
              <CodeBrackets accent="violet" size={190} opacity={0.55} />
            </div>
          </div>
        </div>
      </div>

      {/* Act 2 — corner brackets */}
      <svg
        data-layer-group
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(78vw,760px)] h-[min(78vw,760px)]"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {BRACKETS.map((d, i) => (
          <path
            key={d}
            data-bracket
            d={d}
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth="0.4"
            pathLength={1000}
            opacity={0}
          />
        ))}
      </svg>

      {/* Act 2 — module chips */}
      <div className="absolute inset-0 pointer-events-none">
        {MODULES.map((m) => (
          <div
            key={m.label}
            data-module
            className={`absolute ${m.pos}`}
            style={{ opacity: 0 }}
          >
            <span
              className="inline-block font-mono text-[10px] tracking-[0.18em] px-2.5 py-1 rounded-[var(--radius-sm)]"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-1)',
                color: m.accent,
              }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* Act 0 ignite point */}
      <div
        data-act="ignite"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ opacity: 0 }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: 'var(--neon-cyan)',
            boxShadow: '0 0 24px var(--glow-cyan)',
          }}
        />
      </div>

      {/* Centre stack */}
      <div className="relative flex flex-col items-center w-full max-w-3xl px-6 z-10">
        {/* Act 2 — telemetry: build log + project tree + terminal */}
        <div
          data-layer-group
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8"
        >
          <div
            className="rounded-[var(--radius-lg)] border p-4"
            style={{
              background: 'var(--bg-1)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="font-mono text-[9px] tracking-[0.24em] mb-2"
              style={{ color: 'var(--fg-3)' }}
            >
              {'// BUILD'}
            </div>
            {[
              { t: 'resolving modules', c: 'var(--neon-cyan)' },
              { t: 'compiling shaders', c: 'var(--neon-violet)' },
              { t: 'seeding particles', c: 'var(--neon-lime)' },
              { t: 'linking entrypoints', c: 'var(--neon-amber)' },
            ].map((l) => (
              <div
                key={l.t}
                data-code-line
                className="font-mono text-[10px] leading-relaxed"
                style={{ opacity: 0 }}
              >
                <span style={{ color: l.c }}>✓</span>{' '}
                <span style={{ color: 'var(--fg-3)' }}>{l.t}</span>
              </div>
            ))}
            <div
              className="font-mono text-[10px] mt-2 flex items-baseline gap-1.5"
              style={{ color: 'var(--fg-3)' }}
            >
              <span
                data-code-line
                style={{ color: 'var(--neon-cyan)', opacity: 0 }}
              >
                READY
              </span>
              <span
                ref={telemetryRef}
                className="tabular-nums"
                style={{ color: 'var(--fg-2)' }}
              >
                000
              </span>
              <span style={{ color: 'var(--fg-3)' }}>ms</span>
            </div>
          </div>

          <div
            className="rounded-[var(--radius-lg)] border p-4"
            style={{
              background: 'var(--bg-1)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="font-mono text-[9px] tracking-[0.24em] mb-2"
              style={{ color: 'var(--fg-3)' }}
            >
              {'// WORKSPACE'}
            </div>
            <FileTree accent="ice" />
            <div className="mt-2">
              <TerminalPrompt accent="lime" />
            </div>
          </div>
        </div>

        {/* Act 3 — lockup */}
        <div
          data-wordmark
          className="font-display font-bold uppercase whitespace-nowrap text-[clamp(1.75rem,6vw,3.75rem)] leading-[1.05] tracking-[0.03em] text-center"
          style={{
            color: 'var(--fg-1)',
            textShadow: '0 0 48px var(--glow-cyan-zone)',
            opacity: 0,
          }}
        >
          {FALLBACK_NAME}
        </div>

        <div
          data-handle
          className="font-mono text-[12px] tracking-[0.18em] mt-2"
          style={{ color: 'var(--neon-cyan)', opacity: 0 }}
        >
          @{FALLBACK_HANDLE}
        </div>

        <div
          className="mt-5 w-full max-w-[220px] h-[2px] overflow-hidden rounded-full"
          style={{ background: 'var(--border-subtle)' }}
          aria-hidden="true"
        >
          <div
            data-rail-fill
            className="h-full w-full origin-left"
            style={{ background: 'var(--gradient-cyan-violet)', opacity: 0 }}
          />
        </div>

        <div
          data-status
          className="mt-3 font-mono text-[10px] tracking-[0.2em] text-center"
          style={{ color: 'var(--fg-3)', opacity: 0 }}
        >
          INITIALISING WORKSPACE
        </div>
      </div>

      {/* Act 4 — burst */}
      <div
        className="absolute left-1/2 top-1/2 h-0 w-0 pointer-events-none"
        aria-hidden="true"
      >
        {ACCENT_COLORS.map((c) => (
          <span
            key={c}
            data-burst
            className="absolute block rounded-full"
            style={{
              width: '5px',
              height: '5px',
              left: '-2.5px',
              top: '-2.5px',
              background: c,
              boxShadow: `0 0 10px ${c}`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {skippable && (
        <button
          type="button"
          onClick={skip}
          className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] transition-colors"
          style={{
            background: 'var(--bg-1)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--fg-2)',
          }}
        >
          SKIP <span style={{ color: 'var(--fg-3)' }}>ESC</span>
        </button>
      )}
    </div>
  );
}
