/**
 * BootSequence — the Aurora Nocturne brand splash.
 *
 * One vector mark, one lockup, one timeline. Everything is inline SVG drawn
 * from `tokens.css`; there is no raster image, no canvas and no WebGL here, so
 * the splash can never be the reason a page fails to paint.
 *
 * THE MARK — "the observatory dial"
 *   A 400×400 viewBox centred on (200,200) holding a circular instrument:
 *     · 44 deterministic stars, radius 52–192, from `makeRng(0x41555249)`
 *     · three hairline circles at r 150 / 118 / 86
 *     · two 300° arcs at r 150, opening 60° apart, marking where the needle
 *       will travel and where it will stop
 *     · a 60-tick ring (every fifth tick reaching further out) collapsed into
 *       two single subpaths so the whole ring *draws* as one stroke
 *     · a needle that sweeps −120° → 250° behind a 300° progress arc at r 176
 *     · a hexagonal core with a rotated inner ring and a lit centre dot
 *     · three aurora ribbons on a cyan→violet→coral gradient, on three
 *       different axes so it never reads as three parallel lines
 *     · four corner brackets framing the whole box
 *   The needle landing at 250° is the only "meaningful" position: it rests on
 *   the coral arc, and that is where the mark holds before it dissolves.
 *
 * WHY THE END STATE LIVES IN JSX
 *   Every element is authored at its FINISHED value. Animation supplies the
 *   `from` half (`opacity: [0, 1]`, `draw: ['0 0','1 0']`, `scale: [0.35, 1]`).
 *   Two consequences, both deliberate:
 *     1. The reduced-motion path costs zero JS — the composed frame is already
 *        in the markup, so a visitor with `prefers-reduced-motion` sees a
 *        legible, fully-composed still and is handed off one `enter` beat later.
 *     2. `scope.revert()` always lands on that composed frame. Nothing can be
 *        stranded invisible. (The previous build set `opacity: 0` in JS and
 *        relied on every path to restore it; a missed restore once hid the
 *        hero's quick-command cards. Do not reintroduce "set it invisible".)
 *
 * TIMING
 *   Positions are multiples of one act (`durations.splashAct`), so retiming
 *   `--dur-splash-act` retimes the whole choreography. Total authored runtime
 *   is ~6.8s, inside `HARD_CEILING_MS`. Every duration and easing comes from
 *   `src/config/animations.ts` (generated from `tokens.css`); there is not one
 *   `duration:` or `ease:` literal in this file.
 *
 * COMPLETION CONTRACT (added P3.2, preserved verbatim)
 *   `onComplete(reason)` fires exactly once on every removal path — full run,
 *   skip, reduced-motion short circuit, hard ceiling — and always *before* the
 *   splash unmounts. `notified` is the single-fire guard. `src/pages/_app.tsx`
 *   records the signal as `BOOT_DONE_ATTR` and re-broadcasts
 *   `BOOT_COMPLETE_EVENT`; `src/components/home/HeroSection.tsx` listens. The
 *   root is already at opacity 0 by the time `onComplete` runs, so the hero
 *   reveal starts on the frame the splash disappears — no flash, and the hero's
 *   reveal animation is the only thing that ever animates it, so it cannot
 *   double-fire. This component never decides *whether* it runs; `_app.tsx`
 *   only mounts it on the homepage.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  createDrawable,
  createScope,
  createTimeline,
  spring,
  splitText,
  stagger,
  type TextSplitter,
} from 'animejs';
import {
  durations,
  easings,
  isReducedMotion,
  springs,
} from '../../config/animations';
import { FALLBACK_HANDLE, FALLBACK_NAME } from '../../config/identity';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { useSceneQuality } from '../../hooks/useSceneQuality';
import AuroraMesh from './graphics/primitives/AuroraMesh';
import { makeRng } from './graphics/seededRandom';

/** How long before the skip affordance is offered. */
const SKIPPABLE_AFTER_MS = 1200;

/**
 * Absolute maximum the splash may stay on screen, regardless of whether the
 * timeline fired its own completion. It never truncates a healthy run — it only
 * intervenes when the animation has failed (interrupted, backgrounded, or
 * something thrown mid-play), which used to leave the splash covering the page
 * indefinitely.
 */
const HARD_CEILING_MS = 8000;

const CX = 200;
const CY = 200;

/** Tokens are seconds; anime.js wants milliseconds. */
const ms = (seconds: number): number => Math.round(seconds * 1000);

/** Keep generated path data short and stable for snapshot/diff friendliness. */
const f = (n: number): number => Number(n.toFixed(2));

/** Point on the dial at radius `r`, `deg` degrees clockwise from 3 o'clock. */
const polar = (r: number, deg: number): string => {
  const a = (deg * Math.PI) / 180;
  return `${f(CX + r * Math.cos(a))} ${f(CY + r * Math.sin(a))}`;
};

/** Regular polygon, rendered as an SVG `points` string. */
const polygon = (r: number, offsetDeg = 0): string =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((offsetDeg + i * 60) * Math.PI) / 180;
    return `${f(CX + r * Math.cos(a))},${f(CY + r * Math.sin(a))}`;
  }).join(' ');

/** Every rotate/scale target resolves here, so the transform origin is fixed. */
const CENTRE: React.CSSProperties = {
  transformBox: 'view-box',
  transformOrigin: `${CX}px ${CY}px`,
};

/** 44 stars, deterministic so server and client markup are identical. */
const STARS: ReadonlyArray<{ cx: number; cy: number; r: number; o: number }> =
  (() => {
    const rng = makeRng(0x41555249); // "AURORA"
    return Array.from({ length: 44 }, () => {
      const angle = -Math.PI / 2 + rng() * Math.PI * 2;
      const radius = 52 + rng() * 140;
      return {
        cx: f(CX + radius * Math.cos(angle)),
        cy: f(CY + radius * Math.sin(angle)),
        r: f(0.6 + rng() * 1.1),
        o: f(0.3 + rng() * 0.6),
      };
    });
  })();

/**
 * 60 ticks at 6° apart, starting at 12 o'clock. They are emitted as two
 * subpath strings rather than 60 elements: 60 targets would have made a
 * 60ms-staggered exit span 3.6s on its own and blow the hard ceiling, and a
 * tick ring that *draws* reads better than one that pops in tick by tick.
 */
const TICK_MINOR_D = (() => {
  const seg: string[] = [];
  for (let i = 0; i < 60; i += 1) {
    if (i % 5 === 0) continue;
    seg.push(
      `M ${polar(150, (i / 60) * 360 - 90)} L ${polar(158, (i / 60) * 360 - 90)}`,
    );
  }
  return seg.join(' ');
})();

const TICK_MAJOR_D = (() => {
  const seg: string[] = [];
  for (let i = 0; i < 60; i += 5) {
    seg.push(
      `M ${polar(150, (i / 60) * 360 - 90)} L ${polar(166, (i / 60) * 360 - 90)}`,
    );
  }
  return seg.join(' ');
})();

/** 300° arcs, drawn clockwise from 6 o'clock (90°) round to 30°. */
const ARC_A_D = `M ${polar(150, 90)} A 150 150 0 1 1 ${polar(150, 390)}`;
const ARC_B_D = `M ${polar(150, 270)} A 150 150 0 1 1 ${polar(150, 570)}`;
const PROGRESS_D = `M ${polar(176, 90)} A 176 176 0 1 1 ${polar(176, 390)}`;

/** Needle: a slim blade to r 148 and a shorter counterweight to r 68. */
const NEEDLE_D = `M ${CX} ${CY} L 196 ${CY} L ${CX} 52 Z M ${CX} ${CY} L 204 ${CY} L ${CX} 268 Z`;

const HEX_OUTER = polygon(44);
const HEX_INNER = polygon(20, 45);

/** Three ribbons on three different axes — vertical, broad-and-low, high. */
const RIBBONS: ReadonlyArray<{ d: string; w: number; o: number }> = [
  {
    d: 'M -20 268 C 70 214 180 300 300 246 S 380 200 420 214',
    w: 1.4,
    o: 0.85,
  },
  { d: 'M 60 -20 C 132 62 200 44 254 124 S 284 244 320 420', w: 1, o: 0.7 },
  {
    d: 'M -20 132 C 100 108 180 176 268 138 S 356 92 420 118',
    w: 0.8,
    o: 0.55,
  },
];

const CORNERS: ReadonlyArray<string> = [
  'M 8 34 L 8 8 L 34 8',
  'M 366 8 L 392 8 L 392 34',
  'M 392 366 L 392 392 L 366 392',
  'M 34 392 L 8 392 L 8 366',
];

/** The couplet. Two lines, five words each, both true of this codebase. */
const CAPTION_A = 'ONE NIGHT SKY · SIX ACCENTS';
const CAPTION_B = 'EVERY COLOUR FROM ONE TOKEN FILE';

const U = ms(durations.splashAct);

/** Act positions, all multiples of one act so the whole mark retimes together. */
const AT = {
  ignite: 0,
  field: Math.round(U * 0.5),
  dial: Math.round(U * 0.9),
  ticks: Math.round(U * 1.3),
  aurora: Math.round(U * 2.1),
  needle: Math.round(U * 2.6),
  progress: Math.round(U * 0.5),
  wordmark: Math.round(U * 4.3),
  captionA: Math.round(U * 4.6),
  captionB: Math.round(U * 5.1),
  handle: Math.round(U * 5.7),
  rule: Math.round(U * 6.0),
  bloom: Math.round(U * 6.3),
  dissolveGraphic: Math.round(U * 6.7),
  dissolveType: Math.round(U * 8.0),
  exit: Math.round(U * 9.1),
} as const;

/** Stagger steps. All derived from `durations.stagger`; never a bare number. */
const S = ms(durations.stagger);
const S2 = S * 2;
const S_HALF = Math.round(S * 0.5);

/** Reverting twice is harmless in practice but not guaranteed — never throw in cleanup. */
const safely = (fn: () => void): void => {
  try {
    fn();
  } catch {
    /* already reverted */
  }
};

export type BootCompletionReason =
  'complete' | 'skipped' | 'not-rendered' | 'timeout';

export const BOOT_COMPLETE_EVENT = 'portfolio:boot-complete';
export const BOOT_DONE_ATTR = 'data-boot-done';

export type BootSequenceProps = {
  onComplete?: (reason: BootCompletionReason) => void;
};

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const fadeRef = useRef<ReturnType<typeof animate> | null>(null);
  const mountTime = useRef(0);
  const notified = useRef(false);

  const [show, setShow] = useState(false);
  const [skippable, setSkippable] = useState(false);
  const [lite, setLite] = useState(false);

  const { reduced } = useMotionPreference();
  const { detectedTier, unsupported } = useSceneQuality();

  // Held in a ref, deliberately not a dependency: re-running `finish` when the
  // parent hands over a new callback would be a no-op anyway, because
  // `notified` already fired.
  const notifyRef = useRef(onComplete);
  notifyRef.current = onComplete;

  /**
   * Notify exactly once, then unmount. The ordering is the contract: the hero
   * reveal is told to start *before* the overlay leaves the DOM, so the frame
   * the splash disappears on is the frame the hero begins to appear.
   */
  const finish = useCallback((reason: BootCompletionReason = 'complete') => {
    if (!notified.current) {
      notified.current = true;
      notifyRef.current?.(reason);
    }
    setShow(false);
  }, []);

  /**
   * Returns whether the press was consumed, so the caller only calls
   * `preventDefault()` when it actually handled the key.
   */
  const skip = useCallback((): boolean => {
    if (notified.current) return false;
    if (Date.now() - mountTime.current < SKIPPABLE_AFTER_MS) return false;

    timelineRef.current?.pause();

    const root = rootRef.current;
    if (root && !isReducedMotion()) {
      safely(() => fadeRef.current?.revert());
      fadeRef.current = animate(root, {
        opacity: 0,
        duration: ms(durations.exit),
        ease: easings.inCubic,
        onComplete: () => finish('skipped'),
      });
      return true;
    }

    finish('skipped');
    return true;
  }, [finish]);

  // Mount: stamp the clock, reveal, and arm the fail-open ceiling.
  useEffect(() => {
    mountTime.current = Date.now();
    setShow(true);
    const ceiling = window.setTimeout(() => finish('timeout'), HARD_CEILING_MS);
    return () => window.clearTimeout(ceiling);
  }, [finish]);

  // The affordance is driven by state rather than by the timeline, so it also
  // appears on the reduced-motion path where no timeline ever runs.
  useEffect(() => {
    if (!show) return undefined;
    const t = window.setTimeout(() => setSkippable(true), SKIPPABLE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [show]);

  useEffect(() => {
    if (!show) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (skip()) event.preventDefault();
        return;
      }
      if (event.key === ' ') {
        // A focused skip button owns Space: the browser's own activation wins.
        // Swallowing it here would double-fire and break the control.
        if (document.activeElement === skipRef.current) return;
        if (skip()) event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show, skip]);

  /**
   * Low-power / no-WebGL. This is decoration only: the aurora mesh and the
   * bloom filter are the expensive parts, and neither is an animation target,
   * so the timeline is never rebuilt and no running tween loses an element.
   * `useSceneQuality` fails closed and never throws, and this file never calls
   * `detectWebGL` itself.
   */
  useEffect(() => {
    if (unsupported || detectedTier === 'low') setLite(true);
  }, [unsupported, detectedTier]);

  useEffect(() => {
    const root = rootRef.current;
    if (!show || !root) return undefined;

    // Reduced motion: the end state is authored in JSX, so there is nothing to
    // build. `isReducedMotion()` is the live media-query read, so it is correct
    // on the very first client effect even before the hook adopts its value.
    if (reduced || isReducedMotion()) {
      const t = window.setTimeout(
        () => finish('complete'),
        ms(durations.enter),
      );
      return () => window.clearTimeout(t);
    }

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { ease: easings.smooth },
    });

    const splitters: TextSplitter[] = [];
    const drawables: SVGGeometryElement[] = [];

    scope.add(() => {
      const q = <T extends Element>(selector: string): T[] =>
        Array.from(root.querySelectorAll<T>(selector));

      const dialStrokes = q<SVGGeometryElement>('[data-draw]');
      const tickRing = q<SVGGeometryElement>('[data-tickring]');
      const stars = q<SVGCircleElement>('[data-star]');
      const ribbons = q<SVGPathElement>('[data-ribbon]');
      const corners = q<SVGPathElement>('[data-corner]');

      const dial = root.querySelector<SVGGElement>('[data-dial]');
      const needle = root.querySelector<SVGGElement>('[data-needle]');
      const core = root.querySelector<SVGGElement>('[data-core]');
      const coreDot = root.querySelector<SVGCircleElement>('[data-core-dot]');
      const progress = root.querySelector<SVGPathElement>('[data-progress]');
      const rule = root.querySelector<HTMLElement>('[data-rule]');
      const wordmark = root.querySelector<HTMLElement>('[data-wordmark]');
      const handle = root.querySelector<HTMLElement>('[data-handle]');
      const captionA = root.querySelector<HTMLElement>('[data-caption-a]');
      const captionB = root.querySelector<HTMLElement>('[data-caption-b]');

      if (
        !dial ||
        !needle ||
        !core ||
        !coreDot ||
        !progress ||
        !rule ||
        !wordmark ||
        !handle ||
        !captionA ||
        !captionB
      ) {
        return;
      }

      const drawDial = createDrawable(dialStrokes);
      const drawTicks = createDrawable(tickRing);
      const drawProgress = createDrawable(progress);
      drawables.push(...drawDial, ...drawTicks, ...drawProgress);

      const nameSplit = splitText(wordmark, { chars: true });
      const handleSplit = splitText(handle, { chars: true });
      const captionASplit = splitText(captionA, { words: true });
      const captionBSplit = splitText(captionB, { words: true });
      splitters.push(nameSplit, handleSplit, captionASplit, captionBSplit);

      const tl = createTimeline({
        defaults: { ease: easings.smooth },
        onComplete: () => finish('complete'),
      });
      timelineRef.current = tl;

      // ── IGNITE ───────────────────────────────────────────────────────────
      tl.add(
        root,
        { opacity: [0, 1], duration: ms(durations['300']) },
        AT.ignite,
      );
      tl.add(
        core,
        { scale: [0.35, 1], ease: spring(springs.gentle) },
        AT.ignite,
      );
      tl.add(
        coreDot,
        { scale: [0, 1], ease: spring(springs.bouncy) },
        AT.ignite,
      );

      // ── FIELD ────────────────────────────────────────────────────────────
      tl.add(
        stars,
        {
          opacity: [0, 0.9],
          duration: ms(durations.enter),
          delay: stagger(S, { from: 'center' }),
        },
        AT.field,
      );

      // ── DIAL ─────────────────────────────────────────────────────────────
      tl.add(
        drawDial,
        {
          draw: ['0 0', '1 0'],
          duration: ms(durations.draw),
          delay: stagger(S2, { from: 'first' }),
        },
        AT.dial,
      );
      tl.add(
        drawTicks,
        {
          draw: ['0 0', '1 0'],
          duration: ms(durations.draw),
          delay: stagger(S2, { from: 'first' }),
        },
        AT.ticks,
      );

      // ── AURORA ───────────────────────────────────────────────────────────
      tl.add(
        ribbons,
        {
          draw: ['0 0', '1 0'],
          duration: ms(durations.morph),
          delay: stagger(S2, { from: 'first' }),
        },
        AT.aurora,
      );

      // ── SWEEP ────────────────────────────────────────────────────────────
      // The needle runs the dial for the whole of the middle act; the progress
      // arc is the same 300° travel, so the two land together.
      tl.add(
        needle,
        {
          rotate: [-120, 250],
          duration: ms(durations.counter),
          ease: easings.expoInOut,
        },
        AT.needle,
      );
      tl.add(
        drawProgress,
        {
          draw: ['0 0', '1 0'],
          duration: ms(durations.splashFull),
          ease: easings.linear,
        },
        AT.progress,
      );

      // ── NAME ─────────────────────────────────────────────────────────────
      tl.add(
        nameSplit.chars,
        {
          y: ['0.34em', '0em'],
          opacity: [0, 1],
          duration: ms(durations.enter),
          delay: stagger(S2, { from: 'first' }),
        },
        AT.wordmark,
      );
      tl.add(
        captionASplit.words,
        {
          y: ['0.4em', '0em'],
          opacity: [0, 1],
          duration: ms(durations['300']),
          delay: stagger(S, { from: 'first' }),
        },
        AT.captionA,
      );
      tl.add(
        captionBSplit.words,
        {
          y: ['0.4em', '0em'],
          opacity: [0, 1],
          duration: ms(durations['300']),
          delay: stagger(S, { from: 'first' }),
        },
        AT.captionB,
      );
      tl.add(
        handleSplit.chars,
        {
          y: ['0.4em', '0em'],
          opacity: [0, 1],
          duration: ms(durations.enter),
          delay: stagger(S, { from: 'first' }),
        },
        AT.handle,
      );
      tl.add(
        rule,
        {
          scaleX: [0, 1],
          duration: ms(durations['500']),
          ease: easings.expoOut,
        },
        AT.rule,
      );

      // One quiet breath on the core, so the mark lands rather than stops.
      tl.add(
        core,
        {
          scale: 1.07,
          duration: ms(durations['500']),
          ease: easings.sineInOut,
        },
        AT.bloom,
      );

      // ── DISSOLVE ─────────────────────────────────────────────────────────
      tl.add(
        ribbons,
        {
          opacity: 0,
          scale: 1.06,
          duration: ms(durations.exit),
          delay: stagger(S, { from: 'first' }),
        },
        AT.dissolveGraphic,
      );
      tl.add(
        dial,
        {
          opacity: 0,
          scale: 0.94,
          duration: ms(durations.exit),
          delay: stagger(S, { from: 'center' }),
        },
        AT.dissolveGraphic,
      );
      tl.add(
        needle,
        {
          opacity: 0,
          rotate: '+=210',
          duration: ms(durations.exit),
          delay: stagger(S, { from: 'first' }),
        },
        AT.dissolveGraphic,
      );
      tl.add(
        core,
        {
          opacity: 0,
          scale: 0.8,
          duration: ms(durations.exit),
          delay: stagger(S, { from: 'center' }),
        },
        AT.dissolveGraphic,
      );
      tl.add(
        stars,
        {
          opacity: 0,
          duration: ms(durations.exit),
          delay: stagger(S_HALF, { from: 'center' }),
        },
        AT.dissolveGraphic,
      );
      tl.add(
        corners,
        {
          opacity: 0,
          duration: ms(durations.exit),
          delay: stagger(S, { from: 'first' }),
        },
        AT.dissolveGraphic,
      );

      tl.add(
        nameSplit.chars,
        {
          y: '-0.35em',
          opacity: 0,
          duration: ms(durations.exit),
          delay: stagger(S_HALF, { from: 'first' }),
        },
        AT.dissolveType,
      );
      tl.add(
        handleSplit.chars,
        {
          y: '-0.3em',
          opacity: 0,
          duration: ms(durations.exit),
          delay: stagger(S_HALF, { from: 'first' }),
        },
        AT.dissolveType,
      );
      tl.add(
        [...captionASplit.words, ...captionBSplit.words],
        {
          opacity: 0,
          duration: ms(durations.exit),
          delay: stagger(S, { from: 'first' }),
        },
        AT.dissolveType,
      );
      tl.add(
        rule,
        { scaleX: 0, opacity: 0, duration: ms(durations.exit) },
        AT.dissolveType,
      );
      tl.add(
        drawProgress,
        { opacity: 0, duration: ms(durations.exit) },
        AT.dissolveType,
      );

      // ── HANDOFF ──────────────────────────────────────────────────────────
      // Last child. Its end IS the timeline end, so when `onComplete` fires the
      // root is already fully transparent and the hero reveal starts clean.
      tl.add(
        root,
        { opacity: 0, duration: ms(durations.exit), ease: easings.inCubic },
        AT.exit,
      );
    });

    return () => {
      timelineRef.current = null;
      safely(() => fadeRef.current?.revert());
      fadeRef.current = null;
      safely(() => scope.revert());
      splitters.forEach((splitter) => safely(() => splitter.revert()));
      // `createDrawable` writes dash attributes, not inline styles, so
      // `scope.revert()` does not own them.
      drawables.forEach((el) =>
        safely(() => {
          el.removeAttribute('stroke-dasharray');
          el.removeAttribute('stroke-dashoffset');
        }),
      );
    };
  }, [show, reduced, finish]);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      data-testid="boot-sequence"
      data-lite={lite ? 'true' : 'false'}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6"
      style={{ background: 'var(--bg-void)', color: 'var(--fg-1)' }}
    >
      {!lite && <AuroraMesh variant="hero" className="absolute inset-0" />}

      <div
        aria-hidden="true"
        className="pointer-events-none flex w-full flex-col items-center"
      >
        <svg
          viewBox="0 0 400 400"
          className="w-[min(86vw,460px)] max-w-full"
          role="presentation"
          focusable="false"
        >
          <defs>
            <linearGradient id="boot-aurora" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                style={{ stopColor: 'var(--neon-cyan)', stopOpacity: 0 }}
              />
              <stop offset="22%" style={{ stopColor: 'var(--neon-cyan)' }} />
              <stop offset="58%" style={{ stopColor: 'var(--neon-violet)' }} />
              <stop offset="86%" style={{ stopColor: 'var(--neon-coral)' }} />
              <stop
                offset="100%"
                style={{ stopColor: 'var(--neon-coral)', stopOpacity: 0.1 }}
              />
            </linearGradient>
            <filter
              id="boot-bloom"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation={2.6} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stars first, so the dial draws over them. */}
          <g data-stars>
            {STARS.map((star, i) => (
              <circle
                key={i}
                data-star
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="var(--neon-ice)"
                opacity={star.o}
              />
            ))}
          </g>

          <g data-ribbon-group filter={lite ? undefined : 'url(#boot-bloom)'}>
            {RIBBONS.map((ribbon) => (
              <path
                key={ribbon.d}
                data-ribbon
                d={ribbon.d}
                pathLength={1000}
                fill="none"
                stroke="url(#boot-aurora)"
                strokeWidth={ribbon.w}
                opacity={ribbon.o}
              />
            ))}
          </g>

          <g data-needle style={CENTRE}>
            <path d={NEEDLE_D} fill="var(--neon-cyan)" opacity={0.8} />
          </g>

          <g data-dial style={CENTRE}>
            <circle
              data-draw
              cx={CX}
              cy={CY}
              r={150}
              pathLength={1000}
              fill="none"
              stroke="var(--neon-cyan)"
              strokeWidth={0.6}
              opacity={0.5}
            />
            <circle
              data-draw
              cx={CX}
              cy={CY}
              r={118}
              pathLength={1000}
              fill="none"
              stroke="var(--neon-violet)"
              strokeWidth={0.5}
              opacity={0.38}
            />
            <circle
              data-draw
              cx={CX}
              cy={CY}
              r={86}
              pathLength={1000}
              fill="none"
              stroke="var(--neon-ice)"
              strokeWidth={0.4}
              opacity={0.3}
            />
            <path
              data-draw
              d={ARC_A_D}
              pathLength={1000}
              fill="none"
              stroke="var(--neon-amber)"
              strokeWidth={0.8}
              opacity={0.45}
            />
            <path
              data-draw
              d={ARC_B_D}
              pathLength={1000}
              fill="none"
              stroke="var(--neon-amber)"
              strokeWidth={0.8}
              opacity={0.45}
            />
            <path
              data-tickring
              d={TICK_MINOR_D}
              pathLength={1000}
              fill="none"
              stroke="var(--neon-cyan)"
              strokeWidth={0.4}
              opacity={0.3}
            />
            <path
              data-tickring
              d={TICK_MAJOR_D}
              pathLength={1000}
              fill="none"
              stroke="var(--neon-cyan)"
              strokeWidth={0.8}
              opacity={0.55}
            />
          </g>

          <g data-core style={CENTRE}>
            <polygon
              points={HEX_OUTER}
              fill="none"
              stroke="var(--neon-violet)"
              strokeWidth={0.8}
              opacity={0.75}
            />
            <polygon
              points={HEX_INNER}
              fill="none"
              stroke="var(--neon-ice)"
              strokeWidth={0.5}
              opacity={0.5}
            />
            <circle
              data-core-dot
              cx={CX}
              cy={CY}
              r={3.5}
              fill="var(--neon-cyan)"
              style={{ filter: 'drop-shadow(0 0 6px var(--glow-cyan))' }}
            />
          </g>

          <path
            data-progress
            d={PROGRESS_D}
            pathLength={1000}
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth={1.2}
            opacity={0.8}
          />

          <g data-corners>
            {CORNERS.map((corner) => (
              <path
                key={corner}
                data-corner
                d={corner}
                fill="none"
                stroke="var(--neon-cyan)"
                strokeWidth={0.8}
                opacity={0.5}
              />
            ))}
          </g>
        </svg>

        <div className="mt-8 flex w-[min(86vw,460px)] max-w-full flex-col items-center gap-3">
          {/* A <p>, not an <h1>: the hero owns the document's single heading.
              `whitespace-nowrap` matters here: a per-char stagger on a name
              that wraps reads as scattered type, not as an entrance. The clamp
              is sized so the longest realistic name stays on one line. */}
          <p
            data-wordmark
            className="whitespace-nowrap text-center font-display text-[clamp(1.05rem,5.4vw,2.55rem)] font-bold uppercase leading-none tracking-[0.06em]"
            style={{
              color: 'var(--fg-1)',
              textShadow: '0 0 48px var(--glow-cyan-zone)',
            }}
          >
            {FALLBACK_NAME}
          </p>

          <div
            data-rule
            className="h-px w-full max-w-[260px]"
            style={{
              background: 'var(--gradient-cyan-violet)',
              transformOrigin: '50% 50%',
            }}
          />

          <p
            data-handle
            className="font-mono text-[clamp(0.7rem,2.2vw,0.85rem)] tracking-[0.32em]"
            style={{ color: 'var(--neon-cyan)' }}
          >
            @{FALLBACK_HANDLE}
          </p>

          <p
            data-caption-a
            className="text-center font-mono text-[0.68rem] tracking-[0.26em]"
            style={{ color: 'var(--fg-3)' }}
          >
            {CAPTION_A}
          </p>
          <p
            data-caption-b
            className="text-center font-mono text-[0.62rem] tracking-[0.26em]"
            style={{ color: 'var(--fg-3)' }}
          >
            {CAPTION_B}
          </p>
        </div>
      </div>

      {/* One live region for the whole splash, rather than a noisy root label. */}
      <p className="sr-only" role="status" aria-live="polite">
        Loading {FALLBACK_NAME}&rsquo;s portfolio.
      </p>

      <button
        ref={skipRef}
        type="button"
        onClick={skip}
        tabIndex={skippable ? 0 : -1}
        aria-keyshortcuts="Escape"
        className={`absolute bottom-6 right-6 z-20 inline-flex min-h-11 min-w-11 items-center gap-2 border px-4 font-mono text-[0.7rem] uppercase tracking-[0.24em] transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--neon-cyan)] ${
          skippable ? 'opacity-100' : 'pointer-events-none invisible opacity-0'
        }`}
        style={{
          background: 'var(--bg-1)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--fg-2)',
        }}
      >
        Skip <span style={{ color: 'var(--fg-3)' }}>esc</span>
      </button>
    </div>
  );
}
