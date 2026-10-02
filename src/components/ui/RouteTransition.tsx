// src/components/ui/RouteTransition.tsx
/* Site-wide navigation grammar: a horizontal phosphor sweep that doubles as
 * the occluder hiding React throwing one page away and building another. */

import React, { useEffect, useRef } from 'react';
import { createScope, createTimeline } from 'animejs';
import type { Scope, Timeline } from 'animejs';
import type { NextRouter } from 'next/router';
import {
  durations,
  easings,
  isReducedMotion,
  type AccentColor,
} from '../../config/animations';

/* ── TIMING ────────────────────────────────────────────────────────────────
   One token owns the whole budget, because one number should own it.
   `durations.transition` is the token that already means "a change of
   state"; four fractions of it place the four beats, so retiming the token
   in tokens.css retimes every navigation in the site.

     cover  ~217ms  occluder sweeps in, leaving view slides out
     hold    ~35ms  a beat of guaranteed full occlusion
     lift   ~245ms  occluder sweeps out, arriving view slides in
                     (the enter runs under the lift, ~280ms)
                     ──────────── ~532ms all told
   ─────────────────────────────────────────────────────────────────────────── */
const COVER_MS = durations.transition * 1000 * 0.62;
const EXIT_MS = durations.transition * 1000 * 0.6;
const HOLD_MS = durations.transition * 1000 * 0.1;
const LIFT_MS = durations.transition * 1000 * 0.7;
const ENTER_MS = durations.transition * 1000 * 0.8;

/** Peak opacity of the phosphor layer. The occluder itself reaches 1. */
const SCAN_PEAK = 0.62;

/* ── GEOMETRY ────────────────────────────────────────────────────────────────
   Pixels, not a duration token, so these are deliberately plain numbers.
   The content slide is a proportion of the viewport rather than a fixed
   offset: 18px is a nudge on a phone, 48px is a nudge on a 4K panel, and 3%
   reads as "the same distance" at every size in between. ──────────────── */
const SHIFT_RATIO = 0.03;
const SHIFT_MIN_PX = 18;
const SHIFT_MAX_PX = 48;

const shiftFor = (width: number): number =>
  Math.round(
    Math.min(SHIFT_MAX_PX, Math.max(SHIFT_MIN_PX, width * SHIFT_RATIO)),
  );

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `createScope` reads `window.matchMedia` for every query it is handed, with
 * no guard of its own. This repo's jsdom harness does not define it at all —
 * see the note in `src/__tests__/pages/_app.test.tsx` — and a primitive that
 * `_app.tsx` mounts site-wide has no business throwing inside the app tree
 * over a missing browser API. Without the query the scope still works; it
 * only loses the live "user flipped the OS setting mid-navigation" switch.
 */
const supportsMatchMedia = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const safely = (fn: () => void): void => {
  try {
    fn();
  } catch {
    /* anime already tore this timer down; nothing left to restore */
  }
};

/**
 * The one discriminator that separates "pushed forward" from "popped back".
 * Next mints a fresh `history.state.key` on every `pushState` and preserves
 * it across `replaceState` and `popstate` (`changeState()` in `router.js`),
 * and it runs `changeState()` *after* `routeChangeStart` fires — so at the
 * moment we are called a push still reads the previous key while a pop
 * already reads a different one. Null whenever the key is absent (server, an
 * exotic embedding, a router that never wrote one), and a null on either side
 * means "do not guess": the transition stays on the forward vector.
 */
const historyKey = (): string | null => {
  if (typeof window === 'undefined' || !window.history) return null;
  const state = window.history.state as { key?: unknown } | null;
  return typeof state?.key === 'string' ? state.key : null;
};

interface RouteTransitionProps {
  /**
   * Just the event emitter, which is all this component ever touches. Taking
   * the narrowest shape that works keeps the dependency honest and makes the
   * primitive trivially mountable against a stub.
   */
  router: Pick<NextRouter, 'events'>;
  /**
   * Gate. While false the sheet sits at its rest state and every router event
   * is ignored. `_app.tsx` wires this to the boot latch so the splash owns
   * the first paint and the two never overlap.
   */
  enabled?: boolean;
  /** Which accent the sweep burns in. */
  accent?: AccentColor;
  children: React.ReactNode;
}

/**
 * Everything in a sweep travels the X axis in exactly one direction. Forward
 * means right: the occluder grows from the left edge, pushes the leaving
 * view rightwards, and the arriving view slides in from the left afterwards.
 * Back is the precise mirror.
 *
 * The occluder keeps a single `transform-origin: left` and is steered with
 * `scaleX` plus an offset, so one static origin serves both directions: at
 * scale `s` and offset `tx` the field spans `[tx, tx + s·w]`, which is how
 * "grows from the left" and "grows from the right" become the same tween
 * with different endpoints.
 */
type Vector = { forward: boolean; width: number; shift: number };

/**
 * The resting state is authored in JSX, not produced by an animation: the
 * occluder layers are `opacity-0` and the stage carries no transform until a
 * navigation happens. So `revert()` — from a scope teardown, a rapid second
 * click, or a cancelled route — always lands on a legible still, and reduced
 * motion costs nothing because there is no end state to undo.
 */
export default function RouteTransition({
  router,
  enabled = true,
  accent = 'cyan',
  children,
}: RouteTransitionProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);

  const scopeRef = useRef<Scope | null>(null);
  const runningRef = useRef<Timeline[]>([]);
  const vectorRef = useRef<Vector | null>(null);
  const settledKeyRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  // 1. The scope. Declared first so it exists before effect 2 subscribes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scope = createScope({
      root,
      mediaQueries: supportsMatchMedia()
        ? { reduceMotion: REDUCE_MOTION_QUERY }
        : undefined,
      defaults: { ease: easings.expoOut },
    });
    scopeRef.current = scope;

    return () => {
      scopeRef.current = null;
      runningRef.current = [];
      safely(() => scope.revert());
    };
  }, []);

  // 2. Router events. Nothing else happens in this effect, so unsubscribing
  //    and resubscribing — on a router identity change, or on the boot latch
  //    tripping — can never disturb a transition that is already in flight.
  useEffect(() => {
    const resetLayers = () => {
      // Belt and braces alongside `revert()`: a leftover `transform` on the
      // stage would keep it the containing block for every `position: fixed`
      // descendant in the page (reading progress, chat overlay, drawers) for
      // the rest of the session. Never leave one behind.
      [fieldRef, scanRef, edgeRef, stageRef].forEach((r) => {
        r.current?.style.removeProperty('transform');
        r.current?.style.removeProperty('opacity');
      });
    };

    const abort = () => {
      const timers = runningRef.current;
      timers.forEach((t) => safely(() => t.revert()));
      timers.length = 0;
      vectorRef.current = null;
      resetLayers();
    };

    const parts = () => {
      const scope = scopeRef.current;
      const root = rootRef.current;
      const field = fieldRef.current;
      const scan = scanRef.current;
      const edge = edgeRef.current;
      const stage = stageRef.current;
      if (!scope || !root || !field || !scan || !edge || !stage) return null;

      const width = root.clientWidth || window.innerWidth;
      return { scope, field, scan, edge, stage, width, shift: shiftFor(width) };
    };

    const onRouteChangeStart = (_url: string, opts?: { shallow?: boolean }) => {
      // A shallow route re-renders the same tree in place: nothing is thrown
      // away, so there is nothing to occlude and nothing to hide.
      if (!enabled || opts?.shallow) return;
      // Reduced motion means instant and correct. No timeline is built at
      // all, and because the rest state is authored in JSX the content is
      // already in its final place — there is nothing to undo afterwards.
      if (isReducedMotion()) return;

      const p = parts();
      if (!p) return;

      const now = historyKey();
      const settled = settledKeyRef.current;
      const forward = !(now !== null && settled !== null && now !== settled);
      const v: Vector = { forward, width: p.width, shift: p.shift };
      vectorRef.current = v;

      // A second navigation landing mid-sweep: drop whatever is running so
      // this one always starts from the authored rest state rather than from
      // wherever the last one was interrupted.
      abort();
      vectorRef.current = v;

      const anchor = forward ? 0 : p.width;

      const tl = p.scope.execute(() =>
        createTimeline({ defaults: { ease: easings.expoOut } }),
      );

      tl.add(
        p.field,
        {
          scaleX: [0, 1],
          x: [anchor, 0],
          opacity: [0, 1],
          duration: COVER_MS,
        },
        0,
      );
      tl.add(
        p.scan,
        {
          scaleX: [0, 1],
          x: [anchor, 0],
          opacity: [0, SCAN_PEAK],
          duration: COVER_MS,
        },
        0,
      );
      // The sweep line is a sibling of the occluder rather than a child of
      // it: a rule inside a `scaleX` element is scaled too, so it would thin
      // to nothing while the sweep is still young. Driven in pixels it stays
      // a crisp 2px, and it rides whichever boundary is moving — the
      // occluder's leading edge on the way in, its trailing edge on the way
      // out — which is the same expression in all four cases.
      tl.add(
        p.edge,
        {
          x: [anchor, forward ? p.width : 0],
          opacity: [0, 1],
          duration: COVER_MS,
        },
        0,
      );
      tl.add(
        p.stage,
        {
          x: [0, forward ? p.shift : -p.shift],
          opacity: [1, 0],
          duration: EXIT_MS,
        },
        0,
      );

      runningRef.current = [tl];
      // No `onComplete` here on purpose. The sweep deliberately stays closed
      // after this beat: the swap is not finished until `routeChangeComplete`
      // says so, and a slow route must never reveal a half-built page.
    };

    const onRouteChangeComplete = () => {
      settledKeyRef.current = historyKey() ?? settledKeyRef.current;
      if (!enabled || isReducedMotion()) return;

      const p = parts();
      const v = vectorRef.current;
      if (!p || !v) return;
      const pending = runningRef.current;
      const cover = pending[pending.length - 1];
      // No sweep in flight: either we never started one, or it was already
      // interrupted and cleaned up. Either way, nothing to reveal.
      if (!cover || cover.completed) return;

      // The tree has swapped and React has committed. We may be only a few
      // frames into the cover, so snap it shut first — the swap has to happen
      // behind a fully closed occluder or the whole point is lost.
      safely(() => cover.complete());

      const lift = p.scope.execute(() =>
        createTimeline({
          delay: HOLD_MS,
          defaults: { ease: easings.expoOut },
          onComplete: () => abort(),
        }),
      );

      // Forward: the field retreats rightwards, so its *left* edge travels
      // rightwards — the same direction the right edge travelled on the way
      // in, and the same direction the arriving view is sliding. Back is the
      // exact mirror on every layer.
      const retreat = v.forward ? v.width : 0;
      lift.add(
        p.field,
        {
          scaleX: [1, 0],
          x: [0, retreat],
          opacity: [1, 0],
          duration: LIFT_MS,
        },
        0,
      );
      lift.add(
        p.scan,
        {
          scaleX: [1, 0],
          x: [0, retreat],
          opacity: [SCAN_PEAK, 0],
          duration: LIFT_MS,
        },
        0,
      );
      lift.add(
        p.edge,
        {
          x: [v.forward ? 0 : v.width, v.forward ? v.width : 0],
          opacity: [1, 0],
          duration: LIFT_MS,
        },
        0,
      );
      lift.add(
        p.stage,
        {
          x: [v.forward ? -v.shift : v.shift, 0],
          opacity: [0, 1],
          duration: ENTER_MS,
        },
        0,
      );

      runningRef.current = [lift];
    };

    const onRouteChangeError = () => {
      settledKeyRef.current = historyKey() ?? settledKeyRef.current;
      // A failed navigation must not leave the reader behind a closed sheet.
      abort();
    };

    router.events.on('routeChangeStart', onRouteChangeStart);
    router.events.on('routeChangeComplete', onRouteChangeComplete);
    router.events.on('routeChangeError', onRouteChangeError);

    if (!seededRef.current) {
      seededRef.current = true;
      settledKeyRef.current = historyKey();
    }

    return () => {
      router.events.off('routeChangeStart', onRouteChangeStart);
      router.events.off('routeChangeComplete', onRouteChangeComplete);
      router.events.off('routeChangeError', onRouteChangeError);
    };
  }, [router, enabled]);

  return (
    <>
      <div ref={stageRef} className="rt-stage relative z-10">
        {children}
      </div>

      {/*
        Above the scene, not below it. `SceneLayer` is a `fixed inset-0 z-0`
        sibling, so anything at or under z-0 would be painted behind it and
        never seen. What makes sitting on top affordable is that the occluder
        is not a black wall: it feathers to `--overlay-void-50` at both ends
        and holds `--overlay-void-97` through the body, so the WebGL field
        keeps glowing through the sweep's soft edges while the middle stays
        opaque enough to hide the swap. The phosphor layer is screened over
        it, which adds light rather than replacing it.
      */}
      <div
        ref={rootRef}
        aria-hidden="true"
        data-accent={accent}
        className="rt-root fixed inset-0 z-[85] pointer-events-none overflow-hidden"
      >
        <div
          ref={fieldRef}
          className="rt-field absolute inset-0 origin-left opacity-0"
          style={{
            background:
              'linear-gradient(90deg, var(--overlay-void-50) 0%, var(--overlay-void-97) 16%, var(--overlay-void-97) 84%, var(--overlay-void-50) 100%)',
          }}
        />
        <div
          ref={scanRef}
          className="rt-scan absolute inset-0 origin-left opacity-0"
          style={{
            mixBlendMode: 'screen',
            backgroundImage: [
              // Vertical hairlines. They live inside the scaled occluder, so
              // the sweep compresses them toward its origin and they read as
              // a raster being re-scanned rather than a texture being slid.
              'repeating-linear-gradient(90deg, var(--grid-2) 0px, var(--grid-2) 1px, transparent 1px, transparent 6px)',
              'linear-gradient(90deg, transparent 45%, var(--accent-wash) 100%)',
            ].join(', '),
            backgroundSize: 'auto, 100% 100%',
          }}
        />
        <div
          ref={edgeRef}
          className="rt-edge absolute inset-y-0 left-0 w-[2px] opacity-0"
          style={{
            background: 'var(--accent-color)',
            boxShadow:
              '0 0 8px 0 var(--accent-glow), 0 0 28px 4px var(--accent-glow)',
          }}
        />
      </div>
    </>
  );
}
